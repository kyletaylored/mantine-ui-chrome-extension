// Content script manager for handling tab-specific script injection
import { logger, createLogger } from '@/shared/logger';

const managerLogger = createLogger('ContentScriptManager');

/**
 * Content Script Manager
 * Handles injection and management of content scripts across tabs
 */
export class ContentScriptManager {
  constructor() {
    this.activeScripts = new Map(); // tabId -> Set of script identifiers
  }

  /**
   * Execute a script in a specific tab
   */
  async executeScript(tabId, scriptCode, scriptId = null) {
    try {
      managerLogger.debug('Executing script', 'executeScript', { tabId, scriptId });
      
      // Use chrome.scripting API for Manifest V3
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (code) => {
          // Execute the script in page context
          const script = document.createElement('script');
          script.textContent = code;
          (document.head || document.documentElement).appendChild(script);
          script.remove();
        },
        args: [scriptCode]
      });

      // Track active scripts
      if (scriptId) {
        if (!this.activeScripts.has(tabId)) {
          this.activeScripts.set(tabId, new Set());
        }
        this.activeScripts.get(tabId).add(scriptId);
      }

      managerLogger.info('Script executed successfully', { tabId, scriptId });
      return { success: true, results };
    } catch (error) {
      managerLogger.error('Failed to execute script', error, { tabId, scriptId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message to content script in specific tab
   */
  async sendMessage(tabId, message) {
    try {
      managerLogger.debug('Sending message to tab', 'sendMessage', { tabId, messageType: message.type });
      
      const response = await chrome.tabs.sendMessage(tabId, message);
      
      managerLogger.debug('Received response from tab', 'sendMessage', { tabId, response });
      return response;
    } catch (error) {
      managerLogger.error('Failed to send message to tab', error, { tabId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up scripts for a tab (when tab is closed or navigated)
   */
  cleanupTab(tabId) {
    if (this.activeScripts.has(tabId)) {
      managerLogger.info('Cleaning up scripts for tab', { tabId });
      this.activeScripts.delete(tabId);
    }
  }

  /**
   * Get active script count for debugging
   */
  getActiveScriptCount() {
    let total = 0;
    for (const scripts of this.activeScripts.values()) {
      total += scripts.size;
    }
    return total;
  }
}

// Export singleton instance
export const contentScriptManager = new ContentScriptManager();