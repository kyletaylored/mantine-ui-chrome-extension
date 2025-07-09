import { Plugin } from '../../types';
import { RumInjectionComponent } from './component';
import { RUM_PLUGIN_CONFIG, DEFAULT_RUM_SETTINGS } from './config';

/**
 * RUM Injection Plugin
 * 
 * This plugin allows sales engineers to inject Datadog Real User Monitoring (RUM)
 * into web pages for demonstration purposes. It provides a user-friendly interface
 * for configuring RUM settings and injecting/removing RUM scripts dynamically.
 * 
 * Features:
 * - Configure RUM Application ID and Client Token
 * - Inject RUM script into current tab
 * - Remove RUM script from current tab
 * - Real-time status monitoring
 * - Configurable tracking options
 * - Visual indicator when RUM is active
 */

export const rumInjectionPlugin: Plugin = {
  id: RUM_PLUGIN_CONFIG.id,
  name: RUM_PLUGIN_CONFIG.name,
  description: RUM_PLUGIN_CONFIG.description,
  version: RUM_PLUGIN_CONFIG.version,
  enabled: false, // Default to disabled, user can enable in settings
  icon: RUM_PLUGIN_CONFIG.icon,
  component: RumInjectionComponent,
  settings: DEFAULT_RUM_SETTINGS,
  permissions: RUM_PLUGIN_CONFIG.permissions,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Plugin registration function
 * Called by the extension to register this plugin
 */
export const registerPlugin = (): Plugin => {
  return rumInjectionPlugin;
};

/**
 * Plugin initialization function
 * Called when the plugin is first loaded or enabled
 */
export const initializePlugin = async (context: any): Promise<void> => {
  console.log('RUM Injection Plugin initialized');
  
  // Any initialization logic can go here
  // For example, setting up event listeners, validating configuration, etc.
  
  // Check if required permissions are available
  if (!chrome.scripting) {
    console.warn('RUM Injection Plugin: scripting API not available');
    return;
  }
  
  // Initialize with default settings if none exist
  try {
    const plugins = context.storage?.plugins || [];
    const existingPlugin = plugins.find((p: Plugin) => p.id === rumInjectionPlugin.id);
    
    if (!existingPlugin) {
      console.log('RUM Injection Plugin: Adding to plugin list');
      const updatedPlugins = [...plugins, rumInjectionPlugin];
      await context.updateStorage?.({ plugins: updatedPlugins });
    }
  } catch (error) {
    console.error('RUM Injection Plugin: Failed to initialize:', error);
  }
};

/**
 * Plugin cleanup function
 * Called when the plugin is disabled or unloaded
 */
export const cleanupPlugin = async (): Promise<void> => {
  console.log('RUM Injection Plugin cleanup');
  
  // Any cleanup logic can go here
  // For example, removing event listeners, clearing timers, etc.
  
  // Note: We don't automatically remove RUM from pages on plugin disable
  // This is intentional to avoid disrupting ongoing demonstrations
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
        enabled: rumInjectionPlugin.enabled,
        version: rumInjectionPlugin.version,
        settings: rumInjectionPlugin.settings,
      };
      
    case 'UPDATE_SETTINGS':
      // Update plugin settings
      if (payload && typeof payload === 'object') {
        rumInjectionPlugin.settings = { ...rumInjectionPlugin.settings, ...payload };
        rumInjectionPlugin.updatedAt = Date.now();
        return { success: true };
      }
      return { success: false, error: 'Invalid payload' };
      
    case 'INJECT_RUM':
      // This would be handled by the component, but can be triggered programmatically
      return { success: true, message: 'RUM injection triggered' };
      
    case 'REMOVE_RUM':
      // This would be handled by the component, but can be triggered programmatically
      return { success: true, message: 'RUM removal triggered' };
      
    default:
      return { success: false, error: 'Unknown action' };
  }
};

export default rumInjectionPlugin; 