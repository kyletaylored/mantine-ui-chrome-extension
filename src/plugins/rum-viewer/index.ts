import { PluginModule } from '../../types';
import { RumExtractionComponent } from './component';
import { RUM_EXTRACTION_PLUGIN_CONFIG } from './config';

/**
 * RUM Session Extraction Plugin
 * 
 * This is a CORE plugin that extracts RUM session data from pages that already 
 * have Datadog RUM running. Unlike the RUM Injection plugin which injects RUM
 * scripts, this plugin reads existing session data for display in the popup.
 * 
 * This plugin is marked as core=true, meaning it cannot be disabled by users
 * as it provides essential functionality for the popup's RUM Session tab.
 * 
 * Features:
 * - Extract session ID, user ID, and user information
 * - Display session replay links when available
 * - Auto-refresh session data
 * - Configurable display options
 * - Real-time session status monitoring
 */

// Content script to extract RUM data
const extractRumData = () => {
  try {
    // Check if Datadog RUM is available
    if (typeof window !== 'undefined' && (window as any).DD_RUM) {
      const rum = (window as any).DD_RUM;
      
      // Extract session data
      const sessionData = {
        sessionId: rum.getSessionId?.() || null,
        userId: rum.getUser?.()?.id || null,
        userInfo: rum.getUser?.() || null,
        timestamp: Date.now(),
        url: window.location.href,
        title: document.title
      };
      
      // Store in session storage for popup access
      sessionStorage.setItem('datadog_rum_session', JSON.stringify(sessionData));
      
      console.log('Datadog RUM session data extracted:', sessionData);
    }
  } catch (error) {
    console.error('Failed to extract RUM data:', error);
  }
};

const rumExtractionPlugin: PluginModule = {
  manifest: {
    id: RUM_EXTRACTION_PLUGIN_CONFIG.id,
    name: RUM_EXTRACTION_PLUGIN_CONFIG.name,
    description: RUM_EXTRACTION_PLUGIN_CONFIG.description,
    version: RUM_EXTRACTION_PLUGIN_CONFIG.version,
    core: true, // Cannot be disabled by users
    defaultEnabled: true,
    icon: RUM_EXTRACTION_PLUGIN_CONFIG.icon,
    permissions: RUM_EXTRACTION_PLUGIN_CONFIG.permissions,
    matches: ['*://*/*'] // Run on all websites to extract RUM data
  },
  
  // Background initialization
  initialize: async () => {
    console.log('RUM Extraction Plugin initialized (core plugin)');
  },
  
  // Content script to run in web pages
  runContentScript: extractRumData,
  
  // UI component for the popup
  renderComponent: RumExtractionComponent,
  
  // Cleanup function
  cleanup: async () => {
    console.log('RUM Extraction Plugin cleanup (core plugin cannot be disabled)');
  },
  
  // Handle plugin messages
  handleMessage: async (message: any) => {
    const { action } = message;
    
    switch (action) {
      case 'GET_RUM_SESSION_DATA':
        return { success: true, message: 'RUM session data request forwarded' };
        
      case 'REFRESH_RUM_DATA':
        return { success: true, message: 'RUM data refresh triggered' };
        
      default:
        console.warn('RUM Extraction Plugin: Unknown action:', action);
        return { success: false, error: 'Unknown action' };
    }
  }
};

export default rumExtractionPlugin; 