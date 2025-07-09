import { RumInjectionSettings, getRumScriptUrl, generateRumInitScript } from './config';
import './types';

export interface RumInjectionResult {
  success: boolean;
  message: string;
  injectedAt?: number;
  url?: string;
  error?: string;
}

export class RumInjector {
  private settings: RumInjectionSettings;
  private site: string;
  private isInjected = false;

  constructor(settings: RumInjectionSettings, site: string) {
    this.settings = settings;
    this.site = site;
  }

  /**
   * Inject RUM script into the current active tab
   */
  async injectRum(): Promise<RumInjectionResult> {
    try {
      // Validate settings
      if (!this.settings.applicationId || !this.settings.clientToken) {
        return {
          success: false,
          message: 'Missing required RUM configuration (Application ID or Client Token)',
          error: 'MISSING_CONFIG'
        };
      }

      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return {
          success: false,
          message: 'No active tab found',
          error: 'NO_ACTIVE_TAB'
        };
      }

      const tab = tabs[0];
      const tabId = tab.id!;

      // Check if RUM is already injected
      const isAlreadyInjected = await this.checkIfRumInjected(tabId);
      if (isAlreadyInjected) {
        return {
          success: false,
          message: 'RUM is already injected in this tab',
          error: 'ALREADY_INJECTED'
        };
      }

      // Inject the RUM script
      const rumScriptUrl = getRumScriptUrl(this.site);
      const initScript = generateRumInitScript(this.settings, this.site);

      // First, inject the RUM library
      await chrome.scripting.executeScript({
        target: { tabId },
        func: this.injectRumLibrary,
        args: [rumScriptUrl]
      });

      // Wait a bit for the library to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then initialize RUM
      await chrome.scripting.executeScript({
        target: { tabId },
        func: this.initializeRum,
        args: [initScript]
      });

      // Mark as injected
      this.isInjected = true;

      return {
        success: true,
        message: `RUM successfully injected into ${tab.url}`,
        injectedAt: Date.now(),
        url: tab.url
      };

    } catch (error) {
      console.error('RUM injection error:', error);
      return {
        success: false,
        message: 'Failed to inject RUM script',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Remove RUM from the current active tab
   */
  async removeRum(): Promise<RumInjectionResult> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return {
          success: false,
          message: 'No active tab found',
          error: 'NO_ACTIVE_TAB'
        };
      }

      const tabId = tabs[0].id!;

      // Remove RUM
      await chrome.scripting.executeScript({
        target: { tabId },
        func: this.removeRumScript
      });

      this.isInjected = false;

      return {
        success: true,
        message: 'RUM successfully removed',
        url: tabs[0].url
      };

    } catch (error) {
      console.error('RUM removal error:', error);
      return {
        success: false,
        message: 'Failed to remove RUM script',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Check if RUM is already injected in the tab
   */
  private async checkIfRumInjected(tabId: number): Promise<boolean> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return typeof window.DD_RUM !== 'undefined';
        }
      });
      return results[0]?.result || false;
    } catch {
      return false;
    }
  }

  /**
   * Function to inject RUM library (executed in page context)
   */
  private injectRumLibrary(rumScriptUrl: string): void {
    // Remove existing RUM script if present
    const existingScript = document.querySelector('script[src*="datadog-rum"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Create and inject new RUM script
    const script = document.createElement('script');
    script.src = rumScriptUrl;
    script.type = 'text/javascript';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      console.log('Datadog RUM library loaded successfully');
    };
    script.onerror = (error) => {
      console.error('Failed to load Datadog RUM library:', error);
    };

    document.head.appendChild(script);
  }

  /**
   * Function to initialize RUM (executed in page context)
   */
  private initializeRum(initScript: string): void {
    try {
      // Execute the initialization script
      eval(initScript);
      
      // Add a visual indicator that RUM is active
      const indicator = document.createElement('div');
      indicator.id = 'datadog-rum-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #632ca6;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      indicator.textContent = '📊 Datadog RUM Active';
      document.body.appendChild(indicator);

      // Send a custom event to indicate RUM is active
      if (window.DD_RUM) {
        window.DD_RUM.addAction('rum_injected_by_extension', {
          injected_at: new Date().toISOString(),
          source: 'datadog_sales_toolkit'
        });
      }

      console.log('Datadog RUM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Datadog RUM:', error);
    }
  }

  /**
   * Function to remove RUM script (executed in page context)
   */
  private removeRumScript(): void {
    try {
      // Remove RUM script
      const rumScript = document.querySelector('script[src*="datadog-rum"]');
      if (rumScript) {
        rumScript.remove();
      }

      // Remove indicator
      const indicator = document.getElementById('datadog-rum-indicator');
      if (indicator) {
        indicator.remove();
      }

      // Clear RUM global
      if (window.DD_RUM) {
        delete window.DD_RUM;
      }

      console.log('Datadog RUM removed successfully');
    } catch (error) {
      console.error('Failed to remove Datadog RUM:', error);
    }
  }

  /**
   * Get current RUM status
   */
  async getRumStatus(): Promise<{
    isInjected: boolean;
    hasRumGlobal: boolean;
    currentUrl?: string;
  }> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]) {
        return { isInjected: false, hasRumGlobal: false };
      }

      const tabId = tabs[0].id!;
      const hasRumGlobal = await this.checkIfRumInjected(tabId);

      return {
        isInjected: this.isInjected,
        hasRumGlobal,
        currentUrl: tabs[0].url
      };
    } catch {
      return { isInjected: false, hasRumGlobal: false };
    }
  }
}

/**
 * Factory function to create RUM injector instance
 */
export const createRumInjector = (settings: RumInjectionSettings, site: string): RumInjector => {
  return new RumInjector(settings, site);
}; 