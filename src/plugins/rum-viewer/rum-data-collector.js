/**
 * RUM Data Collector - Class-based utility for collecting and managing RUM data
 * Uses abstracted libraries for storage, messages, and notifications
 */

import { getPluginStorage, getPluginSettings, setPluginSettings } from '@/shared/storage';
import { sendMessage } from '@/shared/messages';
import { NotificationService } from '@/shared/notifications';
import { createLogger } from '@/shared/logger';

export class RumDataCollector {
  constructor(pluginId = 'rum-viewer') {
    this.pluginId = pluginId;
    this.storage = getPluginStorage(pluginId);
    this.notifications = NotificationService.getInstance();
    this.logger = createLogger(`RumDataCollector:${pluginId}`);
    this.cachedData = new Map();
    this.settings = {};
    this.initialized = false;
  }

  /**
   * Initialize the collector with settings
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.settings = await getPluginSettings(this.pluginId);
      
      // Merge with defaults
      this.settings = {
        maxWaitTime: 10000,
        pollingInterval: 100,
        enableCaching: true,
        cacheExpiration: 5 * 60 * 1000, // 5 minutes
        enableNotifications: true,
        enableLogging: false,
        ...this.settings
      };

      // Load cached data from storage
      await this.loadCachedData();
      
      this.initialized = true;
      this.logger.info('RUM Data Collector initialized', { settings: this.settings });
    } catch (error) {
      this.logger.error('Failed to initialize RUM Data Collector', error);
      throw error;
    }
  }

  /**
   * Update settings and persist them
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await setPluginSettings(this.pluginId, this.settings);
    this.logger.info('Settings updated', this.settings);
  }

  /**
   * Collect RUM data from active tab
   */
  async collectFromActiveTab() {
    try {
      const tab = await this.getActiveTab();
      if (!tab) {
        throw new Error('No active tab found');
      }

      return await this.collectFromTab(tab.id);
    } catch (error) {
      this.logger.error('Failed to collect from active tab', error);
      
      if (this.settings.enableNotifications) {
        await this.notifications.create({
          title: 'RUM Data Collection Failed',
          message: 'Could not collect RUM data from active tab',
          tag: 'rum-collection-error',
          data: { error: error.message }
        });
      }
      
      throw error;
    }
  }

  /**
   * Collect RUM data from specific tab
   */
  async collectFromTab(tabId) {
    const cacheKey = `tab-${tabId}`;
    
    try {
      // Check cache first
      if (this.settings.enableCaching && this.cachedData.has(cacheKey)) {
        const cached = this.cachedData.get(cacheKey);
        if (!this.isCacheExpired(cached)) {
          this.logger.debug(`Returning cached data for tab ${tabId}`);
          return { ...cached.data, source: 'cache' };
        }
      }

      // Collect fresh data
      this.logger.debug(`Collecting fresh RUM data from tab ${tabId}`);
      
      const rumData = await this.sendMessageToTab(tabId, 'GET_RUM_DATA', {
        maxWaitTime: this.settings.maxWaitTime,
        pollingInterval: this.settings.pollingInterval
      });

      // Cache the result
      if (this.settings.enableCaching && rumData.success) {
        this.cachedData.set(cacheKey, {
          data: rumData.data,
          timestamp: Date.now(),
          tabId: tabId
        });
        
        // Persist to storage
        await this.persistCachedData();
      }

      // Send notification for successful collection
      if (this.settings.enableNotifications && rumData.success && rumData.data.available) {
        await this.notifications.create({
          title: 'RUM Data Collected',
          message: `Session data available for ${rumData.data.domain}`,
          tag: 'rum-collection-success',
          data: {
            tabId,
            domain: rumData.data.domain,
            hasSessionReplay: !!rumData.data.sessionReplayLink
          }
        });
      }

      return { ...rumData.data, source: 'fresh' };
    } catch (error) {
      this.logger.error(`Failed to collect RUM data from tab ${tabId}`, error);
      
      if (this.settings.enableNotifications) {
        await this.notifications.create({
          title: 'RUM Collection Error',
          message: `Failed to collect data from tab ${tabId}`,
          tag: 'rum-collection-error',
          data: { tabId, error: error.message }
        });
      }
      
      throw error;
    }
  }

  /**
   * Clear cache for specific tab or all tabs
   */
  async clearCache(tabId = null) {
    if (tabId) {
      this.cachedData.delete(`tab-${tabId}`);
      this.logger.debug(`Cleared cache for tab ${tabId}`);
    } else {
      this.cachedData.clear();
      this.logger.debug('Cleared all cached data');
    }
    
    await this.persistCachedData();
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      size: this.cachedData.size,
      entries: Array.from(this.cachedData.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp,
        expired: this.isCacheExpired(value)
      }))
    };
  }

  /**
   * Check if RUM is available on tab
   */
  async checkRumAvailability(tabId) {
    try {
      const response = await this.sendMessageToTab(tabId, 'CHECK_RUM_AVAILABILITY');
      return response.available;
    } catch (error) {
      this.logger.warn(`Failed to check RUM availability for tab ${tabId}`, error);
      return false;
    }
  }

  /**
   * Get page info from tab
   */
  async getPageInfo(tabId) {
    try {
      const response = await this.sendMessageToTab(tabId, 'GET_PAGE_INFO');
      return response.data;
    } catch (error) {
      this.logger.warn(`Failed to get page info for tab ${tabId}`, error);
      return null;
    }
  }

  /**
   * Private: Get active tab
   */
  async getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  /**
   * Private: Send message to tab with plugin context
   */
  async sendMessageToTab(tabId, action, payload = {}) {
    return await chrome.tabs.sendMessage(tabId, {
      type: 'PLUGIN_MESSAGE',
      pluginId: this.pluginId,
      context: 'content',
      action,
      payload
    });
  }

  /**
   * Private: Check if cache is expired
   */
  isCacheExpired(cached) {
    return Date.now() - cached.timestamp > this.settings.cacheExpiration;
  }

  /**
   * Private: Load cached data from storage
   */
  async loadCachedData() {
    try {
      const stored = await this.storage.get('cachedData');
      if (stored) {
        // Convert stored data back to Map
        this.cachedData = new Map(stored);
        this.logger.debug('Loaded cached data from storage', { entries: this.cachedData.size });
      }
    } catch (error) {
      this.logger.warn('Failed to load cached data from storage', error);
    }
  }

  /**
   * Private: Persist cached data to storage
   */
  async persistCachedData() {
    try {
      // Convert Map to array for storage
      const dataArray = Array.from(this.cachedData.entries());
      await this.storage.set('cachedData', dataArray);
      this.logger.debug('Persisted cached data to storage');
    } catch (error) {
      this.logger.warn('Failed to persist cached data to storage', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.persistCachedData();
    this.cachedData.clear();
    this.initialized = false;
    this.logger.info('RUM Data Collector cleaned up');
  }
}