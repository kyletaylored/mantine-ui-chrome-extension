// RUM Injector - JavaScript version

export class RumInjector {
  constructor() {
    this.isInjected = false;
  }

  async inject(tabId, settings) {
    console.log('Injecting RUM SDK into tab:', tabId, settings);
    
    const rumScript = this.generateRumScript(settings);
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (script) => {
          const scriptElement = document.createElement('script');
          scriptElement.textContent = script;
          document.head.appendChild(scriptElement);
        },
        args: [rumScript]
      });
      
      this.isInjected = true;
      return { success: true };
    } catch (error) {
      console.error('Failed to inject RUM SDK:', error);
      return { success: false, error: error.message };
    }
  }

  generateRumScript(settings) {
    return `
      (function() {
        window.DD_RUM && window.DD_RUM.init({
          applicationId: '${settings.applicationId}',
          clientToken: '${settings.clientToken}',
          site: '${settings.site}',
          service: '${settings.service}',
          env: '${settings.env}',
          version: '${settings.version}',
          sessionSampleRate: ${settings.sessionSampleRate},
          sessionReplaySampleRate: ${settings.sessionReplaySampleRate},
          trackUserInteractions: ${settings.trackUserInteractions},
          trackResources: ${settings.trackResources},
          trackLongTasks: ${settings.trackLongTasks},
          allowedTracingUrls: ${JSON.stringify(settings.allowedTracingUrls)}
        });
      })();
    `;
  }
}

export const rumInjector = new RumInjector();