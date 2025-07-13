import { pluginLoader } from './plugin-loader';
import { isPluginEnabled } from './storage';
import { createLogger } from './logger';

const logger = createLogger('ContentScriptManager');

export class ContentScriptManager {
  private static instance: ContentScriptManager | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): ContentScriptManager {
    if (!ContentScriptManager.instance) {
      ContentScriptManager.instance = new ContentScriptManager();
    }
    return ContentScriptManager.instance;
  }

  /**
   * Initialize the content script manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing content script manager');
    
    // Set up event listeners for tab updates
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    chrome.tabs.onCreated.addListener(this.handleTabCreated.bind(this));
    
    // Inject scripts into existing tabs
    await this.injectIntoExistingTabs();
    
    this.initialized = true;
    logger.info('Content script manager initialized');
  }

  /**
   * Handle tab update events
   */
  private async handleTabUpdate(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): Promise<void> {
    // Only process when the tab is completely loaded
    if (changeInfo.status === 'complete' && tab.url) {
      await this.injectScriptsForTab(tab);
    }
  }

  /**
   * Handle tab creation events
   */
  private async handleTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    // Wait a bit for the tab to load
    setTimeout(async () => {
      if (tab.url) {
        await this.injectScriptsForTab(tab);
      }
    }, 1000);
  }

  /**
   * Inject scripts into all existing tabs
   */
  private async injectIntoExistingTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.url && tab.id) {
          await this.injectScriptsForTab(tab);
        }
      }
    } catch (error) {
      logger.error('Failed to inject into existing tabs', error);
    }
  }

  /**
   * Inject appropriate scripts for a specific tab
   */
  private async injectScriptsForTab(tab: chrome.tabs.Tab): Promise<void> {
    if (!tab.id || !tab.url) {
      return;
    }

    // Skip chrome:// and extension:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    try {
      // Get plugins that match this URL
      const matchingPlugins = pluginLoader.getPluginsForUrl(tab.url);
      
      for (const plugin of matchingPlugins) {
        // Check if plugin is enabled
        const enabled = plugin.manifest.core || await isPluginEnabled(plugin.manifest.id);
        
        if (enabled && plugin.runContentScript) {
          logger.debug('Injecting content script', `${plugin.manifest.id} into tab ${tab.id}`);
          
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: plugin.runContentScript,
            world: 'MAIN'
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to inject scripts for tab ${tab.id}`, error);
    }
  }

  /**
   * Manually inject scripts for a specific plugin into a tab
   */
  async injectPluginScript(pluginId: string, tabId: number): Promise<void> {
    const plugin = pluginLoader.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (!plugin.runContentScript) {
      throw new Error(`Plugin ${pluginId} does not have a content script`);
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: plugin.runContentScript,
        world: 'MAIN'
      });
      
      logger.debug('Manually injected content script', `${pluginId} into tab ${tabId}`);
    } catch (error) {
      logger.error(`Failed to inject script for plugin ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Inject scripts for all enabled plugins into a specific tab
   */
  async injectAllEnabledScripts(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url) {
        await this.injectScriptsForTab(tab);
      }
    } catch (error) {
      logger.error(`Failed to inject all scripts for tab ${tabId}`, error);
      throw error;
    }
  }

  /**
   * Remove content scripts from a tab (where possible)
   */
  async removePluginScript(pluginId: string, tabId: number): Promise<void> {
    // Note: Chrome doesn't provide a direct way to remove injected scripts
    // This would require the content script to register cleanup methods
    logger.warn(`Cannot remove content script for plugin ${pluginId} from tab ${tabId} - not supported by Chrome API`);
  }

  /**
   * Get statistics about content script injections
   */
  getStats(): { 
    initialized: boolean; 
    totalPlugins: number; 
    contentScriptPlugins: number; 
  } {
    return {
      initialized: this.initialized,
      totalPlugins: pluginLoader.getPluginCount(),
      contentScriptPlugins: pluginLoader.getContentScriptPlugins().length
    };
  }
}

// Export singleton instance
export const contentScriptManager = ContentScriptManager.getInstance(); 