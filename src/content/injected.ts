// Injected script that runs in the page context
// This script has access to the page's JavaScript context

(function() {
  'use strict';
  
  // Create a namespace for our toolkit
  (window as any).DatadogToolkit = {
    version: '1.0.0',
    
    // RUM utilities
    rum: {
      isInitialized: () => typeof (window as any).DD_RUM !== 'undefined',
      
      init: (config: any) => {
        if ((window as any).DD_RUM) {
          (window as any).DD_RUM.init(config);
          console.log('Datadog RUM initialized by toolkit');
        }
      },
      
      addAction: (name: string, context?: any) => {
        if ((window as any).DD_RUM) {
          (window as any).DD_RUM.addAction(name, context);
        }
      },
      
      addError: (error: Error, context?: any) => {
        if ((window as any).DD_RUM) {
          (window as any).DD_RUM.addError(error, context);
        }
      },
      
      addTiming: (name: string, time?: number) => {
        if ((window as any).DD_RUM) {
          (window as any).DD_RUM.addTiming(name, time);
        }
      },
      
      setUser: (user: any) => {
        if ((window as any).DD_RUM) {
          (window as any).DD_RUM.setUser(user);
        }
      },
      
      setGlobalContext: (context: any) => {
        if ((window as any).DD_RUM) {
          (window as any).DD_RUM.setGlobalContext(context);
        }
      }
    },
    
    // Logs utilities
    logs: {
      isInitialized: () => typeof (window as any).DD_LOGS !== 'undefined',
      
      init: (config: any) => {
        if ((window as any).DD_LOGS) {
          (window as any).DD_LOGS.init(config);
          console.log('Datadog Logs initialized by toolkit');
        }
      },
      
      logger: {
        debug: (message: string, context?: any) => {
          if ((window as any).DD_LOGS) {
            (window as any).DD_LOGS.logger.debug(message, context);
          }
        },
        
        info: (message: string, context?: any) => {
          if ((window as any).DD_LOGS) {
            (window as any).DD_LOGS.logger.info(message, context);
          }
        },
        
        warn: (message: string, context?: any) => {
          if ((window as any).DD_LOGS) {
            (window as any).DD_LOGS.logger.warn(message, context);
          }
        },
        
        error: (message: string, context?: any) => {
          if ((window as any).DD_LOGS) {
            (window as any).DD_LOGS.logger.error(message, context);
          }
        }
      }
    },
    
    // Performance monitoring
    performance: {
      mark: (name: string) => {
        if (performance.mark) {
          performance.mark(name);
        }
      },
      
      measure: (name: string, startMark?: string, endMark?: string) => {
        if (performance.measure) {
          performance.measure(name, startMark, endMark);
        }
      },
      
      getMetrics: () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        const resources = performance.getEntriesByType('resource');
        
        return {
          navigation: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            totalTime: navigation.loadEventEnd - navigation.fetchStart
          },
          paint: paint.reduce((acc, entry) => {
            acc[entry.name] = entry.startTime;
            return acc;
          }, {} as any),
          resources: resources.length,
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          } : null
        };
      }
    },
    
    // Synthetic testing helpers
    synthetic: {
      startTransaction: (name: string) => {
        console.log(`Starting synthetic transaction: ${name}`);
        (window as any).DatadogToolkit.performance.mark(`transaction-${name}-start`);
      },
      
      endTransaction: (name: string) => {
        console.log(`Ending synthetic transaction: ${name}`);
        (window as any).DatadogToolkit.performance.mark(`transaction-${name}-end`);
        (window as any).DatadogToolkit.performance.measure(
          `transaction-${name}`,
          `transaction-${name}-start`,
          `transaction-${name}-end`
        );
      },
      
      assertElement: (selector: string, timeout = 5000) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
              resolve(element);
            } else if (Date.now() - startTime > timeout) {
              reject(new Error(`Element not found: ${selector}`));
            } else {
              setTimeout(checkElement, 100);
            }
          };
          
          checkElement();
        });
      }
    },
    
    // Utility functions
    utils: {
      generateSessionId: () => {
        return 'session-' + Math.random().toString(36).substr(2, 9);
      },
      
      getUserAgent: () => {
        return navigator.userAgent;
      },
      
      getPageInfo: () => {
        return {
          url: window.location.href,
          title: document.title,
          domain: window.location.hostname,
          timestamp: Date.now()
        };
      },
      
      injectScript: (src: string) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
      },
      
      injectCSS: (css: string) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      }
    }
  };
  
  // Notify that the toolkit is ready
  console.log('Datadog Sales Engineering Toolkit injected script loaded');
  
  // Dispatch a custom event to notify the content script
  window.dispatchEvent(new CustomEvent('datadog-toolkit-ready', {
    detail: { version: '1.0.0' }
  }));
  
})(); 