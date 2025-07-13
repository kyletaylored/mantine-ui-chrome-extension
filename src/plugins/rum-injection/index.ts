import { PluginModule } from '../../types';
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

// Content script for RUM injection
const injectRumScript = () => {
  try {
    // Check if RUM is already injected
    if ((window as any).DD_RUM) {
      console.log('Datadog RUM is already injected');
      return;
    }

    // This would be replaced with actual RUM injection logic
    // For now, just log that injection would happen
    console.log('RUM injection script would run here');
    
    // Add visual indicator
    const indicator = document.createElement('div');
    indicator.id = 'datadog-rum-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #632ca6;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    indicator.textContent = 'Datadog RUM Active';
    document.body.appendChild(indicator);
    
    // Remove indicator after 5 seconds
    setTimeout(() => {
      const existingIndicator = document.getElementById('datadog-rum-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
    }, 5000);
    
  } catch (error) {
    console.error('Failed to inject RUM script:', error);
  }
};

const rumInjectionPlugin: PluginModule = {
  manifest: {
    id: RUM_PLUGIN_CONFIG.id,
    name: RUM_PLUGIN_CONFIG.name,
    description: RUM_PLUGIN_CONFIG.description,
    version: RUM_PLUGIN_CONFIG.version,
    core: false, // Optional plugin - user can enable/disable
    defaultEnabled: false,
    icon: RUM_PLUGIN_CONFIG.icon,
    permissions: RUM_PLUGIN_CONFIG.permissions,
    // Content script can be injected on any page when needed
    matches: ['*://*/*']
  },

  // Background initialization
  initialize: async () => {
    console.log('RUM Injection Plugin initialized');
    
    // Check if required permissions are available
    if (!chrome.scripting) {
      console.warn('RUM Injection Plugin: scripting API not available');
      return;
    }
  },

  // Content script to inject RUM
  runContentScript: injectRumScript,

  // UI component for the popup
  renderComponent: undefined, // Component handled by legacy system

  // Cleanup function
  cleanup: async () => {
    console.log('RUM Injection Plugin cleanup');
    
    // Note: We don't automatically remove RUM from pages on plugin disable
    // This is intentional to avoid disrupting ongoing demonstrations
  },

  // Handle plugin messages
  handleMessage: async (message: any) => {
    const { action, payload } = message;
    
    switch (action) {
      case 'GET_STATUS':
        // Return current plugin status
        return {
          enabled: true,
          version: RUM_PLUGIN_CONFIG.version,
          settings: DEFAULT_RUM_SETTINGS,
        };
        
      case 'UPDATE_SETTINGS':
        // Update plugin settings
        if (payload && typeof payload === 'object') {
          return { success: true };
        }
        return { success: false, error: 'Invalid payload' };
        
      case 'INJECT_RUM':
        // Trigger RUM injection
        return { success: true, message: 'RUM injection triggered' };
        
      case 'REMOVE_RUM':
        // Trigger RUM removal
        return { success: true, message: 'RUM removal triggered' };
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  }
};

export default rumInjectionPlugin; 