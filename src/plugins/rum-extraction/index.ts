import { Plugin } from '../../types';
import { RumExtractionComponent } from './component';
import { 
  RUM_EXTRACTION_PLUGIN_CONFIG, 
  DEFAULT_RUM_EXTRACTION_SETTINGS 
} from './config';

/**
 * RUM Session Extraction Plugin
 * 
 * This is a CORE plugin that extracts RUM session data from pages that already 
 * have Datadog RUM running. Unlike the RUM Injection plugin which injects RUM
 * scripts, this plugin reads existing session data for display in the popup.
 * 
 * This plugin is marked as isCore=true, meaning it cannot be disabled by users
 * as it provides essential functionality for the popup's RUM Session tab.
 * 
 * Features:
 * - Extract session ID, user ID, and user information
 * - Display session replay links when available
 * - Auto-refresh session data
 * - Configurable display options
 * - Real-time session status monitoring
 */

export const rumExtractionPlugin: Plugin = {
  id: RUM_EXTRACTION_PLUGIN_CONFIG.id,
  name: RUM_EXTRACTION_PLUGIN_CONFIG.name,
  description: RUM_EXTRACTION_PLUGIN_CONFIG.description,
  version: RUM_EXTRACTION_PLUGIN_CONFIG.version,
  enabled: true, // Always enabled (core plugin)
  isCore: true, // Cannot be disabled by users
  icon: RUM_EXTRACTION_PLUGIN_CONFIG.icon,
  component: RumExtractionComponent,
  settings: DEFAULT_RUM_EXTRACTION_SETTINGS,
  permissions: RUM_EXTRACTION_PLUGIN_CONFIG.permissions,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Plugin registration function
 * Called by the extension to register this plugin
 */
export const registerPlugin = (): Plugin => {
  return rumExtractionPlugin;
};

/**
 * Plugin initialization function
 * Called when the plugin is first loaded
 * For core plugins, this is called on extension startup
 */
export const initializePlugin = async (context: any): Promise<void> => {
  console.log('RUM Extraction Plugin initialized (core plugin)');
  
  // Core plugins are always enabled, so no need to check enabled status
  
  // Initialize with default settings if none exist
  try {
    const plugins = context.storage?.plugins || [];
    const existingPlugin = plugins.find((p: Plugin) => p.id === rumExtractionPlugin.id);
    
    if (!existingPlugin) {
      console.log('RUM Extraction Plugin: Adding to plugin list as core plugin');
      const updatedPlugins = [...plugins, rumExtractionPlugin];
      await context.updateStorage?.({ plugins: updatedPlugins });
    } else if (!existingPlugin.isCore) {
      // Upgrade existing plugin to core status
      console.log('RUM Extraction Plugin: Upgrading to core plugin status');
      const updatedPlugins = plugins.map((p: Plugin) =>
        p.id === rumExtractionPlugin.id 
          ? { ...p, isCore: true, enabled: true, updatedAt: Date.now() }
          : p
      );
      await context.updateStorage?.({ plugins: updatedPlugins });
    }
  } catch (error) {
    console.error('RUM Extraction Plugin: Failed to initialize:', error);
  }
};

/**
 * Plugin cleanup function
 * Called when the extension is disabled/uninstalled
 * Note: Core plugins cannot be individually disabled
 */
export const cleanupPlugin = async (): Promise<void> => {
  console.log('RUM Extraction Plugin: Cleanup (core plugin cannot be disabled)');
  // Core plugins don't need cleanup as they're always active
};

/**
 * Handle plugin-specific messages
 * Called when background script receives plugin messages
 */
export const handlePluginMessage = async (message: any): Promise<any> => {
  const { action } = message;
  
  switch (action) {
    case 'GET_RUM_SESSION_DATA':
      // This is handled by the background script's existing RUM data function
      return { success: true, message: 'RUM session data request forwarded' };
      
    case 'REFRESH_RUM_DATA':
      // Trigger a refresh of RUM session data
      return { success: true, message: 'RUM data refresh triggered' };
      
    default:
      console.warn('RUM Extraction Plugin: Unknown action:', action);
      return { success: false, error: 'Unknown action' };
  }
};

export default rumExtractionPlugin; 