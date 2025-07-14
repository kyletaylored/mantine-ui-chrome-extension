/**
 * Content Script Manager
 * Manages plugin injection and lifecycle in content script contexts
 */

import { pluginLoaderV2, PLUGIN_CONTEXTS } from '@/shared/plugin-loader-v2';
import { createLogger } from '@/shared/logger';

const logger = createLogger('ContentScriptManager');

class ContentScriptManager {
  constructor() {
    this.injectedTabs = new Set();
    this.initialized = false;
  }

  /**
   * Initialize content script manager (called from background)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Content Script Manager');
      
      // Register with plugin loader
      pluginLoaderV2.registerContextManager(PLUGIN_CONTEXTS.CONTENT, this);
      
      // Set up tab listeners for automatic injection
      this.setupTabListeners();
      
      this.initialized = true;
      logger.info('Content script manager initialized');
    } catch (error) {
      logger.error('Failed to initialize content script manager:', error);
      throw error;
    }
  }

  /**
   * Set up tab listeners for automatic plugin injection
   */
  setupTabListeners() {
    // Listen for tab updates to inject plugins
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        await this.injectPluginsIntoTab(tabId, tab.url);
      }
    });

    logger.debug('Tab listeners set up for content script injection');
  }

  /**
   * Inject all applicable plugins into a tab
   */
  async injectPluginsIntoTab(tabId, url) {
    try {
      const plugins = pluginLoaderV2.getPluginsForContext(PLUGIN_CONTEXTS.CONTENT);
      
      for (const plugin of plugins) {
        if (plugin.isEnabled() && plugin.shouldInjectForUrl(url)) {
          await this.injectPluginIntoTab(tabId, plugin.id, url);
        }
      }
    } catch (error) {
      logger.error(`Failed to inject plugins into tab ${tabId}:`, error);
    }
  }

  /**
   * Inject a specific plugin into a tab
   */
  async injectPluginIntoTab(tabId, pluginId, url) {
    try {
      // Check permissions first
      const hasPermissions = await pluginLoaderV2.requestPluginPermissions(pluginId);
      if (!hasPermissions) {
        logger.warn(`Permission denied for plugin injection: ${pluginId}`);
        return;
      }

      // Inject the plugin's content script file directly
      const scriptPath = `plugins/${pluginId}/content.js`;
      
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptPath]
      });

      // Track injection
      this.injectedTabs.add(`${tabId}:${pluginId}`);
      
      logger.debug(`Injected plugin ${pluginId} into tab ${tabId}`);
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        logger.debug(`No content script for plugin: ${pluginId}`);
      } else {
        logger.error(`Failed to inject plugin ${pluginId} into tab ${tabId}:`, error);
      }
    }
  }

  /**
   * Send message to content plugin in specific tab
   */
  async sendMessageToContentPlugin(tabId, pluginId, action, payload) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'PLUGIN_MESSAGE',
        pluginId,
        context: PLUGIN_CONTEXTS.CONTENT,
        action,
        payload
      });

      return response;
    } catch (error) {
      logger.error(`Failed to send message to content plugin ${pluginId} in tab ${tabId}:`, error);
      throw error;
    }
  }

  /**
   * Manually inject plugin into current active tab
   */
  async injectPluginIntoActiveTab(pluginId) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      const plugin = pluginLoaderV2.getPluginsForContext(PLUGIN_CONTEXTS.CONTENT)
        .find(p => p.id === pluginId);
      
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} does not support content scripts`);
      }

      if (!plugin.shouldInjectForUrl(tab.url)) {
        throw new Error(`Plugin ${pluginId} cannot be injected into ${tab.url}`);
      }

      await this.injectPluginIntoTab(tab.id, pluginId, tab.url);
      
      logger.info(`Manually injected plugin ${pluginId} into active tab`);
    } catch (error) {
      logger.error(`Failed to inject plugin ${pluginId} into active tab:`, error);
      throw error;
    }
  }

  /**
   * Get all tabs with injected plugins
   */
  getInjectedTabs() {
    return Array.from(this.injectedTabs);
  }
}

// Export singleton instance
export const contentScriptManager = new ContentScriptManager();
export default contentScriptManager;