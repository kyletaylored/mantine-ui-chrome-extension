import { Plugin } from '../../types';
import { APMTracingComponent } from './component';
import { APM_PLUGIN_CONFIG, DEFAULT_APM_SETTINGS } from './config';

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

export const apmTracingPlugin: Plugin = {
  id: APM_PLUGIN_CONFIG.id,
  name: APM_PLUGIN_CONFIG.name,
  description: APM_PLUGIN_CONFIG.description,
  version: APM_PLUGIN_CONFIG.version,
  enabled: true, // Always enabled (core plugin)
  isCore: true, // Cannot be disabled by users - required for popup APM tab
  icon: APM_PLUGIN_CONFIG.icon,
  component: APMTracingComponent,
  settings: DEFAULT_APM_SETTINGS,
  permissions: APM_PLUGIN_CONFIG.permissions,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Plugin registration function
 * Called by the extension to register this plugin
 */
export const registerPlugin = (): Plugin => {
  return apmTracingPlugin;
};

/**
 * Plugin initialization function
 * Called when the plugin is first loaded or enabled
 */
export const initializePlugin = async (context: any): Promise<void> => {
  console.log('APM Tracing Plugin initialized');
  
  // Check if required permissions are available
  if (!chrome.webRequest) {
    console.warn('APM Tracing Plugin: webRequest API not available');
    return;
  }
  
  // Initialize network monitoring
  try {
    await chrome.runtime.sendMessage({
      type: 'INIT_APM_MONITORING',
      settings: DEFAULT_APM_SETTINGS,
    });
  } catch (error) {
    console.error('Failed to initialize APM monitoring:', error);
  }
  
  // Initialize with default settings if none exist
  try {
    const plugins = context.storage?.plugins || [];
    const existingPlugin = plugins.find((p: Plugin) => p.id === apmTracingPlugin.id);
    
    if (!existingPlugin) {
      console.log('APM Tracing Plugin: Adding to plugin list');
      const updatedPlugins = [...plugins, apmTracingPlugin];
      await context.updateStorage?.({ plugins: updatedPlugins });
    }
  } catch (error) {
    console.error('APM Tracing Plugin: Failed to initialize:', error);
  }
};

/**
 * Plugin cleanup function
 * Called when the plugin is disabled or unloaded
 */
export const cleanupPlugin = async (): Promise<void> => {
  console.log('APM Tracing Plugin cleanup');
  
  // Stop network monitoring
  try {
    await chrome.runtime.sendMessage({
      type: 'STOP_APM_MONITORING',
    });
  } catch (error) {
    console.error('Failed to stop APM monitoring:', error);
  }
};

/**
 * Plugin message handler
 * Handle messages sent to this plugin from other parts of the extension
 */
export const handlePluginMessage = async (message: any): Promise<any> => {
  const { action, payload } = message;
  
  switch (action) {
    case 'GET_STATUS':
      // Return current plugin status
      return {
        enabled: apmTracingPlugin.enabled,
        version: apmTracingPlugin.version,
        settings: apmTracingPlugin.settings,
      };
      
    case 'UPDATE_SETTINGS':
      // Update plugin settings
      if (payload && typeof payload === 'object') {
        apmTracingPlugin.settings = { ...apmTracingPlugin.settings, ...payload };
        apmTracingPlugin.updatedAt = Date.now();
        
        // Update network monitoring settings
        try {
          await chrome.runtime.sendMessage({
            type: 'UPDATE_APM_SETTINGS',
            settings: apmTracingPlugin.settings,
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
        const response = await chrome.runtime.sendMessage({
          type: 'GET_APM_TRACES',
          filter: payload?.filter || 'all',
        });
        return response;
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
    case 'CLEAR_TRACES':
      // Clear all traces
      try {
        await chrome.runtime.sendMessage({ type: 'CLEAR_APM_TRACES' });
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
    case 'START_MONITORING':
      // Start monitoring
      try {
        await chrome.runtime.sendMessage({
          type: 'START_APM_MONITORING',
          settings: apmTracingPlugin.settings,
        });
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
    case 'STOP_MONITORING':
      // Stop monitoring
      try {
        await chrome.runtime.sendMessage({ type: 'STOP_APM_MONITORING' });
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      
    default:
      return { success: false, error: 'Unknown action' };
  }
};

export default apmTracingPlugin; 