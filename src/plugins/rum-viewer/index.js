/**
 * RUM Viewer Plugin - Options Context
 * Integrates with the plugin system for settings management and coordination
 */

import manifestData from './manifest.json';
import { getPluginSettings, setPluginSettings } from '@/shared/storage';
import { sendMessage } from '@/shared/messages';
import { NotificationService } from '@/shared/notifications';
import { createLogger } from '@/shared/logger';
import { RumDataCollector } from './rum-data-collector';

const rumViewerPlugin = {
  // Load manifest from external file
  manifest: manifestData,

  // Plugin services
  collector: null,
  notifications: null,
  logger: null,

  // Plugin state
  settings: {},

  /**
   * Initialize the plugin in options context
   */
  initialize: async () => {
    rumViewerPlugin.logger = createLogger('RumViewer:Options');
    rumViewerPlugin.notifications = NotificationService.getInstance();
    rumViewerPlugin.collector = new RumDataCollector('rum-viewer');
    
    rumViewerPlugin.logger.info('Initializing RUM Viewer Plugin (Options)');
    
    try {
      // Load settings from storage
      rumViewerPlugin.settings = await getPluginSettings('rum-viewer');
      
      // Initialize collector
      await rumViewerPlugin.collector.initialize();
      
      rumViewerPlugin.logger.info('RUM Viewer Plugin (Options) initialized', { settings: rumViewerPlugin.settings });
    } catch (error) {
      rumViewerPlugin.logger.error('Failed to initialize RUM Viewer Plugin (Options)', error);
      throw error;
    }
  },

  /**
   * Cleanup when plugin is disabled
   */
  cleanup: async () => {
    rumViewerPlugin.logger.info('Cleaning up RUM Viewer Plugin (Options)');
    
    if (rumViewerPlugin.collector) {
      await rumViewerPlugin.collector.cleanup();
    }
  },

  /**
   * Handle settings changes from the configuration form
   */
  onSettingsChange: async (newSettings) => {
    rumViewerPlugin.logger.info('Settings changed', newSettings);
    
    try {
      // Update settings in storage
      await setPluginSettings('rum-viewer', newSettings);
      rumViewerPlugin.settings = { ...rumViewerPlugin.settings, ...newSettings };
      
      // Update collector settings
      if (rumViewerPlugin.collector) {
        await rumViewerPlugin.collector.updateSettings(newSettings);
      }
      
      // Notify background script of settings changes via message system
      await sendMessage('PLUGIN_SETTINGS_UPDATED', {
        pluginId: 'rum-viewer',
        settings: newSettings
      });
      
      rumViewerPlugin.logger.info('Settings updated successfully');
      
      // Show success notification
      await rumViewerPlugin.notifications.create({
        title: 'Settings Updated',
        message: 'RUM Viewer settings have been updated successfully',
        tag: 'settings-update',
        data: { pluginId: 'rum-viewer' }
      });
      
    } catch (error) {
      rumViewerPlugin.logger.error('Failed to update settings', error);
      
      // Show error notification
      await rumViewerPlugin.notifications.create({
        title: 'Settings Update Failed',
        message: 'Failed to update RUM Viewer settings',
        tag: 'settings-error',
        data: { pluginId: 'rum-viewer', error: error.message }
      });
      
      throw error;
    }
  },

  /**
   * Handle messages (mainly for testing and coordination)
   */
  handleMessage: async (message) => {
    const { action, payload } = message;
    
    switch (action) {
      case 'GET_STATUS':
        return {
          success: true,
          data: {
            context: 'options',
            enabled: true,
            version: rumViewerPlugin.manifest.version,
            settings: rumViewerPlugin.settings,
            cacheStatus: rumViewerPlugin.collector?.getCacheStatus()
          }
        };
        
      case 'TEST_RUM_COLLECTION':
        // Test RUM data collection from active tab
        try {
          const rumData = await rumViewerPlugin.collector.collectFromActiveTab();
          return { success: true, rumData };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      case 'CLEAR_CACHE':
        // Clear RUM data cache
        try {
          await rumViewerPlugin.collector.clearCache();
          return { success: true, cacheCleared: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      case 'GET_CACHE_STATUS':
        // Get cache status
        try {
          const status = rumViewerPlugin.collector.getCacheStatus();
          return { success: true, cacheStatus: status };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  },

  /**
   * Test RUM data collection from active tab
   */
  testRumCollection: async () => {
    try {
      const rumData = await rumViewerPlugin.collector.collectFromActiveTab();
      rumViewerPlugin.logger.info('RUM data collection test result:', rumData);
      return rumData;
    } catch (error) {
      rumViewerPlugin.logger.error('RUM collection test failed:', error);
      throw error;
    }
  },

  /**
   * Get RUM data for specific tab
   */
  getRumDataForTab: async (tabId) => {
    try {
      const rumData = await rumViewerPlugin.collector.collectFromTab(tabId);
      rumViewerPlugin.logger.info(`RUM data for tab ${tabId}:`, rumData);
      return rumData;
    } catch (error) {
      rumViewerPlugin.logger.error(`Failed to get RUM data for tab ${tabId}:`, error);
      throw error;
    }
  },

  /**
   * Refresh RUM data (clear cache and get fresh data)
   */
  refreshRumData: async (tabId = null) => {
    try {
      await rumViewerPlugin.collector.clearCache(tabId);
      const rumData = tabId 
        ? await rumViewerPlugin.collector.collectFromTab(tabId)
        : await rumViewerPlugin.collector.collectFromActiveTab();
      
      rumViewerPlugin.logger.info('RUM data refreshed:', rumData);
      return rumData;
    } catch (error) {
      rumViewerPlugin.logger.error('Failed to refresh RUM data:', error);
      throw error;
    }
  },

  /**
   * Clear RUM data cache
   */
  clearCache: async (tabId = null) => {
    try {
      await rumViewerPlugin.collector.clearCache(tabId);
      rumViewerPlugin.logger.info(`Cache cleared${tabId ? ` for tab ${tabId}` : ''}`);
      return { success: true };
    } catch (error) {
      rumViewerPlugin.logger.error('Failed to clear cache:', error);
      throw error;
    }
  },

  /**
   * Get plugin status including cache information
   */
  getStatus: async () => {
    try {
      return {
        success: true,
        data: {
          context: 'options',
          enabled: true,
          version: rumViewerPlugin.manifest.version,
          settings: rumViewerPlugin.settings,
          cacheStatus: rumViewerPlugin.collector?.getCacheStatus(),
          initialized: !!rumViewerPlugin.collector?.initialized
        }
      };
    } catch (error) {
      rumViewerPlugin.logger.error('Failed to get plugin status:', error);
      return { success: false, error: error.message };
    }
  }
};

export default rumViewerPlugin;