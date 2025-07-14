/**
 * RUM Viewer Plugin - Background Script
 * Handles communication between popup and content scripts for RUM data collection
 */

import { getPluginSettings, setPluginSettings } from '@/shared/storage';
import { sendMessage } from '@/shared/messages';
import { NotificationService } from '@/shared/notifications';
import { createLogger } from '@/shared/logger';
import { RumDataCollector } from './rum-data-collector';

const rumViewerBackground = {
  // Plugin services
  collector: null,
  notifications: null,
  logger: null,
  
  // Plugin state
  settings: {},
  
  /**
   * Initialize background functionality
   */
  initialize: async (settings) => {
    rumViewerBackground.logger = createLogger('RumViewer:Background');
    rumViewerBackground.notifications = NotificationService.getInstance();
    rumViewerBackground.collector = new RumDataCollector('rum-viewer');
    
    rumViewerBackground.logger.info('Initializing RUM Viewer Background');
    
    try {
      // Load settings from storage or use provided settings
      rumViewerBackground.settings = settings || await getPluginSettings('rum-viewer');
      
      // Initialize collector
      await rumViewerBackground.collector.initialize();
      
      // Set up tab listeners for cache management
      rumViewerBackground.setupTabListeners();
      
      rumViewerBackground.logger.info('RUM Viewer background initialized', { settings: rumViewerBackground.settings });
    } catch (error) {
      rumViewerBackground.logger.error('Failed to initialize RUM Viewer Background', error);
      throw error;
    }
  },
  
  /**
   * Cleanup background functionality
   */
  cleanup: async () => {
    rumViewerBackground.logger.info('Cleaning up RUM Viewer Background');
    
    if (rumViewerBackground.collector) {
      await rumViewerBackground.collector.cleanup();
    }
  },
  
  /**
   * Handle messages from popup and options contexts
   */
  handleMessage: async (action, payload, sender) => {
    rumViewerBackground.logger.debug(`Received message: ${action}`, payload);
    
    try {
      switch (action) {
        case 'GET_RUM_DATA':
          const rumData = await rumViewerBackground.collector.collectFromActiveTab();
          return { success: true, data: rumData };
          
        case 'GET_RUM_DATA_FOR_TAB':
          const tabId = payload?.tabId;
          if (!tabId) {
            return { success: false, error: 'Tab ID required' };
          }
          const tabRumData = await rumViewerBackground.collector.collectFromTab(tabId);
          return { success: true, data: tabRumData };
          
        case 'REFRESH_RUM_DATA':
          const refreshTabId = payload?.tabId;
          await rumViewerBackground.collector.clearCache(refreshTabId);
          const refreshedData = refreshTabId 
            ? await rumViewerBackground.collector.collectFromTab(refreshTabId)
            : await rumViewerBackground.collector.collectFromActiveTab();
          return { success: true, data: refreshedData };
          
        case 'GET_STATUS':
          return {
            success: true,
            data: {
              enabled: true,
              version: '1.0.0',
              settings: rumViewerBackground.settings,
              cacheStatus: rumViewerBackground.collector.getCacheStatus(),
              initialized: rumViewerBackground.collector.initialized
            }
          };
          
        case 'UPDATE_SETTINGS':
          if (payload && typeof payload === 'object') {
            const oldSettings = { ...rumViewerBackground.settings };
            rumViewerBackground.settings = { ...rumViewerBackground.settings, ...payload };
            
            // Update settings in storage
            await setPluginSettings('rum-viewer', rumViewerBackground.settings);
            
            // Update collector settings
            await rumViewerBackground.collector.updateSettings(rumViewerBackground.settings);
            
            rumViewerBackground.logger.info('Settings updated', {
              old: oldSettings,
              new: rumViewerBackground.settings
            });
            
            return { success: true };
          }
          return { success: false, error: 'Invalid settings payload' };
          
        case 'CLEAR_CACHE':
          await rumViewerBackground.collector.clearCache();
          rumViewerBackground.logger.info('RUM data cache cleared');
          return { success: true };
          
        case 'GET_CACHE_STATUS':
          const cacheStatus = rumViewerBackground.collector.getCacheStatus();
          return { success: true, cacheStatus };
          
        case 'CHECK_RUM_AVAILABILITY':
          const availabilityTabId = payload?.tabId;
          if (!availabilityTabId) {
            return { success: false, error: 'Tab ID required' };
          }
          const available = await rumViewerBackground.collector.checkRumAvailability(availabilityTabId);
          return { success: true, available };
          
        default:
          rumViewerBackground.logger.warn(`Unknown action: ${action}`);
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      rumViewerBackground.logger.error(`Error handling message ${action}:`, error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Inject content script into tab if not already present
   */
  injectContentScript: async (tabId) => {
    try {
      rumViewerBackground.logger.debug(`Injecting RUM Viewer content script into tab ${tabId}`);
      
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['plugins/rum-viewer/content.js']
      });
      
      rumViewerBackground.logger.info(`Content script injected into tab ${tabId}`);
    } catch (error) {
      rumViewerBackground.logger.error(`Failed to inject content script into tab ${tabId}`, error);
      throw error;
    }
  },
  
  /**
   * Set up tab listeners to manage cache
   */
  setupTabListeners: () => {
    // Clear cache when tab is updated (page refresh/navigation)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading') {
        rumViewerBackground.collector.clearCache(tabId);
        rumViewerBackground.logger.debug(`Cleared cache for tab ${tabId} due to navigation`);
      }
    });
    
    // Clear cache when tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      rumViewerBackground.collector.clearCache(tabId);
      rumViewerBackground.logger.debug(`Cleared cache for closed tab ${tabId}`);
    });
    
    rumViewerBackground.logger.debug('Tab listeners set up for cache management');
  },
  
  /**
   * Handle tab updates for auto-injection
   */
  onTabUpdated: (tabId, changeInfo, tab) => {
    // Only auto-inject if the plugin is enabled and page is complete
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
      rumViewerBackground.logger.debug(`Tab ${tabId} updated: ${tab.url}`);
      
      // Auto-inject content script for RUM detection
      rumViewerBackground.injectContentScript(tabId).catch(error => {
        rumViewerBackground.logger.debug(`Auto-injection failed for tab ${tabId}: ${error.message}`);
      });
    }
  },
  
  /**
   * Get all cached RUM data (for debugging)
   */
  getAllCachedData: () => {
    return rumViewerBackground.collector.getCacheStatus();
  }
};

export default rumViewerBackground;