/**
 * Background Script Plugin Manager
 * Manages plugin lifecycle in the background context
 */

import { pluginLoaderV2, PLUGIN_CONTEXTS } from '@/shared/plugin-loader-v2';
import { createLogger } from '@/shared/logger';

const logger = createLogger('BackgroundPluginManager');

class BackgroundPluginManager {
  constructor() {
    this.activePlugins = new Map();
    this.messageHandlers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize background plugin manager
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Background Plugin Manager');
      
      // Register with plugin loader
      pluginLoaderV2.registerContextManager(PLUGIN_CONTEXTS.BACKGROUND, this);
      
      // Set up message routing
      this.setupMessageRouting();
      
      // Initialize plugins
      await this.initializePlugins();
      
      this.initialized = true;
      logger.info(`Background plugin manager initialized with ${this.activePlugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to initialize background plugin manager:', error);
      throw error;
    }
  }

  /**
   * Initialize all enabled background plugins
   */
  async initializePlugins() {
    const plugins = pluginLoaderV2.getPluginsForContext(PLUGIN_CONTEXTS.BACKGROUND);
    
    for (const plugin of plugins) {
      if (plugin.isEnabled()) {
        await this.initializePlugin(plugin.id);
      }
    }
  }

  /**
   * Initialize a specific plugin
   */
  async initializePlugin(pluginId) {
    try {
      // Check if already initialized
      if (this.activePlugins.has(pluginId)) {
        logger.debug(`Plugin ${pluginId} already initialized`);
        return;
      }

      // Request permissions if needed
      const hasPermissions = await pluginLoaderV2.requestPluginPermissions(pluginId);
      if (!hasPermissions) {
        logger.warn(`Permission denied for plugin: ${pluginId}`);
        return;
      }

      // Load plugin module
      const module = await pluginLoaderV2.loadPluginForContext(pluginId, PLUGIN_CONTEXTS.BACKGROUND);
      if (!module) {
        logger.debug(`No background module for plugin: ${pluginId}`);
        return;
      }

      // Get plugin settings
      const settings = await this.getPluginSettings(pluginId);

      // Initialize plugin
      if (module.initialize) {
        await module.initialize(settings);
      }

      // Register message handler
      if (module.handleMessage) {
        this.messageHandlers.set(pluginId, module.handleMessage);
      }

      // Set up Chrome API event handlers
      this.setupPluginEventHandlers(pluginId, module);

      // Store active plugin
      this.activePlugins.set(pluginId, {
        module,
        settings,
        initialized: true
      });

      logger.info(`Initialized background plugin: ${pluginId}`);
    } catch (error) {
      logger.error(`Failed to initialize background plugin ${pluginId}:`, error);
    }
  }

  /**
   * Cleanup and disable a plugin
   */
  async disablePlugin(pluginId) {
    const pluginData = this.activePlugins.get(pluginId);
    if (!pluginData) {
      logger.debug(`Plugin ${pluginId} not active`);
      return;
    }

    try {
      // Call cleanup if available
      if (pluginData.module.cleanup) {
        await pluginData.module.cleanup();
      }

      // Remove message handler
      this.messageHandlers.delete(pluginId);

      // Remove from active plugins
      this.activePlugins.delete(pluginId);

      logger.info(`Disabled background plugin: ${pluginId}`);
    } catch (error) {
      logger.error(`Failed to disable background plugin ${pluginId}:`, error);
    }
  }

  /**
   * Update plugin settings
   */
  async updatePluginSettings(pluginId, newSettings) {
    const pluginData = this.activePlugins.get(pluginId);
    if (!pluginData) {
      logger.debug(`Plugin ${pluginId} not active`);
      return;
    }

    try {
      // Update stored settings
      pluginData.settings = { ...pluginData.settings, ...newSettings };

      // Notify plugin of settings change
      if (pluginData.module.onSettingsChange) {
        await pluginData.module.onSettingsChange(pluginData.settings);
      }

      logger.debug(`Updated settings for plugin: ${pluginId}`);
    } catch (error) {
      logger.error(`Failed to update settings for ${pluginId}:`, error);
    }
  }

  /**
   * Set up message routing for plugins
   */
  setupMessageRouting() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'PLUGIN_MESSAGE' && message.context === PLUGIN_CONTEXTS.BACKGROUND) {
        this.handlePluginMessage(message, sender)
          .then(response => sendResponse(response))
          .catch(error => {
            logger.error('Plugin message handling failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        
        return true; // Keep channel open for async response
      }
    });

    logger.debug('Message routing set up for background plugins');
  }

  /**
   * Handle plugin messages
   */
  async handlePluginMessage(message, sender) {
    const { pluginId, action, payload } = message;
    
    const handler = this.messageHandlers.get(pluginId);
    if (!handler) {
      return { success: false, error: `No message handler for plugin: ${pluginId}` };
    }

    try {
      const response = await handler(action, payload, sender);
      return response || { success: true };
    } catch (error) {
      logger.error(`Plugin ${pluginId} message handling failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up Chrome API event handlers for plugin
   */
  setupPluginEventHandlers(pluginId, module) {
    const manifest = pluginLoaderV2.getManifest(pluginId);
    
    // Set up tab event handlers
    if (manifest.permissions?.includes('tabs')) {
      if (module.onTabUpdated) {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          try {
            module.onTabUpdated(tabId, changeInfo, tab);
          } catch (error) {
            logger.error(`Plugin ${pluginId} tab update handler failed:`, error);
          }
        });
      }

      if (module.onTabCreated) {
        chrome.tabs.onCreated.addListener((tab) => {
          try {
            module.onTabCreated(tab);
          } catch (error) {
            logger.error(`Plugin ${pluginId} tab created handler failed:`, error);
          }
        });
      }
    }

    // Set up web request handlers
    if (manifest.permissions?.includes('webRequest')) {
      if (module.onBeforeRequest) {
        chrome.webRequest.onBeforeRequest.addListener(
          (details) => {
            try {
              return module.onBeforeRequest(details);
            } catch (error) {
              logger.error(`Plugin ${pluginId} before request handler failed:`, error);
            }
          },
          { urls: manifest.matches || ['<all_urls>'] },
          ['requestBody']
        );
      }

      if (module.onCompleted) {
        chrome.webRequest.onCompleted.addListener(
          (details) => {
            try {
              module.onCompleted(details);
            } catch (error) {
              logger.error(`Plugin ${pluginId} request completed handler failed:`, error);
            }
          },
          { urls: manifest.matches || ['<all_urls>'] }
        );
      }
    }

    // Set up alarm handlers
    if (manifest.permissions?.includes('alarms') && module.onAlarm) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name.startsWith(`${pluginId}:`)) {
          try {
            module.onAlarm(alarm);
          } catch (error) {
            logger.error(`Plugin ${pluginId} alarm handler failed:`, error);
          }
        }
      });
    }

    logger.debug(`Set up event handlers for plugin: ${pluginId}`);
  }

  /**
   * Get plugin settings from storage
   */
  async getPluginSettings(pluginId) {
    try {
      // TODO: Integrate with storage system
      const manifest = pluginLoaderV2.getManifest(pluginId);
      
      // Return defaults from manifest for now
      const defaults = {};
      if (manifest.configSchema?.properties) {
        Object.entries(manifest.configSchema.properties).forEach(([key, prop]) => {
          defaults[key] = prop.default;
        });
      }
      
      return defaults;
    } catch (error) {
      logger.error(`Failed to get settings for ${pluginId}:`, error);
      return {};
    }
  }

  /**
   * Get active plugin instance
   */
  getPlugin(pluginId) {
    return this.activePlugins.get(pluginId);
  }

  /**
   * Get all active plugins
   */
  getActivePlugins() {
    return Array.from(this.activePlugins.keys());
  }

  /**
   * Send message to content script
   */
  async sendMessageToContent(tabId, pluginId, action, payload) {
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
      logger.error(`Failed to send message to content script:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const backgroundPluginManager = new BackgroundPluginManager();
export default backgroundPluginManager;