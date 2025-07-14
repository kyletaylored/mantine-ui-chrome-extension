import { APM_PLUGIN_CONFIG, DEFAULT_APM_SETTINGS } from './config';
import { sendMessage } from '@/shared/messages';

/**
 * APM Tracing Plugin
 * 
 * This plugin monitors network requests for Datadog trace headers and provides
 * a UI to view and manage APM traces. It enables sales engineers to:
 * - Track network requests with Datadog trace headers
 * - View trace details and metadata
 * - Link directly to traces in Datadog APM
 * - Configure monitoring settings
 * 
 * Features:
 * - Automatic trace header detection
 * - Real-time trace collection
 * - Configurable domain filtering
 * - Trace retention management
 * - Direct links to Datadog APM
 */

const apmTracingPlugin = {
  manifest: {
    id: APM_PLUGIN_CONFIG.id,
    name: APM_PLUGIN_CONFIG.name,
    description: APM_PLUGIN_CONFIG.description,
    version: APM_PLUGIN_CONFIG.version,
    core: true, // Cannot be disabled by users - required for popup APM tab
    defaultEnabled: true,
    icon: APM_PLUGIN_CONFIG.icon,
    permissions: APM_PLUGIN_CONFIG.permissions,
    // No content script matches needed - this is a background-only plugin
  },

  // Background initialization
  initialize: async () => {
    console.log('APM Tracing Plugin initialized');
    
    // Check if required permissions are available
    if (!chrome.webRequest) {
      console.warn('APM Tracing Plugin: webRequest API not available');
      return;
    }
    
    // Initialize network monitoring
    try {
      await sendMessage('INIT_APM_MONITORING', { settings: DEFAULT_APM_SETTINGS });
    } catch (error) {
      console.error('Failed to initialize APM monitoring:', error);
    }
  },

  // UI component for the popup
  renderComponent: undefined, // Component handled by legacy system

  // Cleanup function
  cleanup: async () => {
    console.log('APM Tracing Plugin cleanup');
    
    // Stop network monitoring
    try {
      await sendMessage('STOP_APM_MONITORING');
    } catch (error) {
      console.error('Failed to stop APM monitoring:', error);
    }
  },

  // Handle plugin messages
  handleMessage: async (message) => {
    const { action, payload } = message;
    
    switch (action) {
      case 'GET_STATUS':
        // Return current plugin status
        return {
          enabled: true,
          version: APM_PLUGIN_CONFIG.version,
          settings: DEFAULT_APM_SETTINGS,
        };
        
      case 'UPDATE_SETTINGS':
        // Update plugin settings
        if (payload && typeof payload === 'object') {
          // Update network monitoring settings
          try {
            await sendMessage('UPDATE_APM_SETTINGS', { 
              settings: { ...DEFAULT_APM_SETTINGS, ...payload }
            });
          } catch (error) {
            console.error('Failed to update APM monitoring settings:', error);
          }
          
          return { success: true };
        }
        return { success: false, error: 'Invalid payload' };
        
      case 'GET_TRACES':
        // Get current traces
        try {
          const response = await sendMessage('GET_APM_TRACES', {
            filter: payload?.filter || 'all'
          });
          return response;
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        
      case 'CLEAR_TRACES':
        // Clear all traces
        try {
          await sendMessage('CLEAR_APM_TRACES');
          return { success: true };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        
      case 'START_MONITORING':
        // Start monitoring
        try {
          await sendMessage('START_APM_MONITORING', { settings: DEFAULT_APM_SETTINGS });
          return { success: true };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        
      case 'STOP_MONITORING':
        // Stop monitoring
        try {
          await sendMessage('STOP_APM_MONITORING');
          return { success: true };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  }
};

export default apmTracingPlugin;