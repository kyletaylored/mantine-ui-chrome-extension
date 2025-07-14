/**
 * RUM Viewer Plugin - Content Script
 * Extracts DD_RUM data from web pages and provides it to the background script
 */

import { createLogger } from '@/shared/logger';

const rumViewerContent = {
  // Plugin state
  settings: {},
  initialized: false,
  logger: null,
  
  /**
   * Initialize content script functionality
   */
  initialize: async (settings) => {
    rumViewerContent.logger = createLogger('RumViewer:Content');
    rumViewerContent.logger.info('Initializing RUM Viewer content script with settings', settings);
    
    rumViewerContent.settings = {
      maxWaitTime: 10000,
      pollingInterval: 100,
      enableLogging: false,
      ...settings
    };
    
    // Set up message listener
    chrome.runtime.onMessage.addListener(rumViewerContent.messageHandler);
    
    rumViewerContent.initialized = true;
    rumViewerContent.logger.info('RUM Viewer content script initialized');
  },
  
  /**
   * Cleanup content script functionality
   */
  cleanup: async () => {
    rumViewerContent.logger.info('Cleaning up RUM Viewer content script');
    
    // Remove message listener
    chrome.runtime.onMessage.removeListener(rumViewerContent.messageHandler);
    
    rumViewerContent.initialized = false;
    rumViewerContent.logger.info('RUM Viewer content script cleaned up');
  },
  
  /**
   * Handle messages from background script
   */
  handleMessage: async (action, payload) => {
    rumViewerContent.logger.debug(`Received message: ${action}`, payload);
    
    switch (action) {
      case 'GET_RUM_DATA':
        const rumData = await rumViewerContent.getRumData(payload);
        return { success: true, data: rumData };
        
      case 'CHECK_RUM_AVAILABILITY':
        const isAvailable = rumViewerContent.isRumAvailable();
        return { success: true, available: isAvailable };
        
      case 'GET_PAGE_INFO':
        const pageInfo = rumViewerContent.getPageInfo();
        return { success: true, data: pageInfo };
        
      case 'UPDATE_SETTINGS':
        if (payload && typeof payload === 'object') {
          rumViewerContent.settings = { ...rumViewerContent.settings, ...payload };
          rumViewerContent.logger.info('Settings updated', rumViewerContent.settings);
          return { success: true };
        }
        return { success: false, error: 'Invalid settings payload' };
        
      default:
        rumViewerContent.logger.warn(`Unknown action: ${action}`);
        return { success: false, error: 'Unknown action' };
    }
  },
  
  /**
   * Message handler for Chrome runtime
   */
  messageHandler: (message, _sender, sendResponse) => {
    if (message.type === 'PLUGIN_MESSAGE' && 
        message.pluginId === 'rum-viewer' && 
        message.context === 'content') {
      
      Promise.resolve(rumViewerContent.handleMessage(message.action, message.payload))
        .then(response => sendResponse(response || { success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      return true; // Keep channel open for async response
    }
  },
  
  /**
   * Get RUM data from browser, waiting up to maxWaitTime for DD_RUM to become available
   */
  getRumData: async (options = {}) => {
    return new Promise((resolve) => {
      const maxWaitTime = options.maxWaitTime || rumViewerContent.settings.maxWaitTime || 10000;
      const pollingInterval = options.pollingInterval || rumViewerContent.settings.pollingInterval || 100;
      
      let rumData = {
        type: 'DD_RUM_DATA',
        sessionReplayLink: null,
        user: null,
        available: false,
        timestamp: Date.now(),
        url: window.location.href,
        domain: window.location.hostname,
        error: null
      };
      
      let timeElapsed = 0;
      
      rumViewerContent.logger.debug(`Starting RUM data collection (max wait: ${maxWaitTime}ms, interval: ${pollingInterval}ms)`);
      
      const checkRumAvailability = setInterval(() => {
        try {
          // Check if DD_RUM is available and has the required functions
          if (window?.DD_RUM) {
            rumViewerContent.logger.debug('DD_RUM object found, extracting data');
            
            // Extract session replay link
            let sessionReplayLink = null;
            try {
              sessionReplayLink = window.DD_RUM.getSessionReplayLink();
              rumViewerContent.logger.debug('Session replay link:', sessionReplayLink);
            } catch (error) {
              rumViewerContent.logger.warn('Failed to get session replay link:', error.message);
            }
            
            // Extract user data
            let user = null;
            try {
              user = window.DD_RUM.getUser();
              rumViewerContent.logger.debug('User data:', user);
            } catch (error) {
              rumViewerContent.logger.warn('Failed to get user data:', error.message);
            }
            
            // Get additional RUM context if available
            let rumContext = null;
            try {
              // Try to get internal RUM context (may not be publicly available)
              if (typeof window.DD_RUM.getInternalContext === 'function') {
                rumContext = window.DD_RUM.getInternalContext();
              }
            } catch (error) {
              rumViewerContent.logger.debug('Internal context not available:', error.message);
            }
            
            // Update the data with actual RUM information
            rumData = {
              type: 'DD_RUM_DATA',
              sessionReplayLink: sessionReplayLink,
              user: user,
              available: true,
              timestamp: Date.now(),
              url: window.location.href,
              domain: window.location.hostname,
              context: rumContext,
              waitTime: timeElapsed,
              error: null
            };
            
            clearInterval(checkRumAvailability);
            rumViewerContent.logger.info('RUM data successfully collected', rumData);
            resolve(rumData);
          } else if (timeElapsed >= maxWaitTime) {
            // If maximum wait time has been exceeded
            clearInterval(checkRumAvailability);
            
            const errorMsg = `DD_RUM object not available within ${maxWaitTime}ms timeout`;
            rumViewerContent.logger.warn(errorMsg);
            
            rumData.error = errorMsg;
            rumData.waitTime = timeElapsed;
            resolve(rumData);
          }
          
          timeElapsed += pollingInterval;
        } catch (error) {
          clearInterval(checkRumAvailability);
          
          const errorMsg = `Error while checking for DD_RUM: ${error.message}`;
          rumViewerContent.logger.error(errorMsg, error);
          
          rumData.error = errorMsg;
          rumData.waitTime = timeElapsed;
          resolve(rumData);
        }
      }, pollingInterval);
    });
  },
  
  /**
   * Check if DD_RUM is currently available
   */
  isRumAvailable: () => {
    try {
      return !!(window?.DD_RUM && 
                typeof window.DD_RUM.getSessionReplayLink === 'function' &&
                typeof window.DD_RUM.getUser === 'function');
    } catch (error) {
      rumViewerContent.logger.debug('Error checking RUM availability:', error.message);
      return false;
    }
  },
  
  /**
   * Detect RUM-related scripts on the page
   */
  detectRumScripts: () => {
    const scripts = [];
    
    try {
      // Look for Datadog RUM script tags
      const allScripts = document.querySelectorAll('script');
      
      allScripts.forEach(script => {
        const src = script.src;
        const content = script.textContent || script.innerHTML;
        
        // Check for Datadog RUM in script src or content
        if (src && (src.includes('datadoghq') || src.includes('dd-rum'))) {
          scripts.push({
            type: 'external',
            src: src,
            async: script.async,
            defer: script.defer
          });
        } else if (content && (content.includes('DD_RUM') || content.includes('datadoghq'))) {
          scripts.push({
            type: 'inline',
            hasConfig: content.includes('DD_RUM.init'),
            hasStartView: content.includes('startView'),
            length: content.length
          });
        }
      });
      
      // Check for DD_RUM global object
      if (window.DD_RUM) {
        scripts.push({
          type: 'global',
          available: true,
          methods: Object.getOwnPropertyNames(window.DD_RUM).filter(name => 
            typeof window.DD_RUM[name] === 'function'
          )
        });
      }
    } catch (error) {
      rumViewerContent.logger.warn('Error detecting RUM scripts:', error.message);
    }
    
    return scripts;
  },
  
  /**
   * Get detailed RUM status information
   */
  getRumStatus: () => {
    const status = {
      available: false,
      initialized: false,
      version: null,
      config: null,
      methods: [],
      errors: []
    };
    
    try {
      if (window.DD_RUM) {
        status.available = true;
        
        // Get available methods
        status.methods = Object.getOwnPropertyNames(window.DD_RUM)
          .filter(name => typeof window.DD_RUM[name] === 'function');
        
        // Try to determine if initialized
        try {
          window.DD_RUM.getSessionReplayLink();
          status.initialized = true;
        } catch (error) {
          status.errors.push(`getSessionReplayLink failed: ${error.message}`);
        }
        
        // Try to get user data
        try {
          const user = window.DD_RUM.getUser();
          if (user) {
            status.hasUser = true;
          }
        } catch (error) {
          status.errors.push(`getUser failed: ${error.message}`);
        }
      }
    } catch (error) {
      status.errors.push(`General error: ${error.message}`);
    }
    
    return status;
  },
  
};

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  // Initialize with default settings
  rumViewerContent.initialize().catch(error => {
    console.error('RUM Viewer Content: Failed to initialize:', error);
  });
}

export default rumViewerContent;