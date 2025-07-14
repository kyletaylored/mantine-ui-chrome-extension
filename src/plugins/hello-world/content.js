/**
 * Hello World Plugin - Content Script
 * Demonstrates content script functionality with DOM interaction
 */

const helloWorldContent = {
  // Plugin state
  settings: {},
  initialized: false,
  greetingElement: null,
  
  /**
   * Initialize content script functionality
   */
  initialize: async (settings) => {
    console.log('Hello World Content: Initializing with settings', settings);
    
    helloWorldContent.settings = {
      greeting: 'Hello, World!',
      logLevel: 'info',
      enabledFeatures: ['logging'],
      ...settings
    };
    
    // Set up message listener
    chrome.runtime.onMessage.addListener(helloWorldContent.messageHandler);
    
    // Create greeting element
    helloWorldContent.createGreetingElement();
    
    // Set up page observers
    helloWorldContent.setupPageObservers();
    
    helloWorldContent.initialized = true;
    helloWorldContent.log('info', 'Content script initialized successfully');
  },
  
  /**
   * Cleanup content script functionality
   */
  cleanup: async () => {
    console.log('Hello World Content: Cleaning up');
    
    // Remove message listener
    chrome.runtime.onMessage.removeListener(helloWorldContent.messageHandler);
    
    // Remove greeting element
    if (helloWorldContent.greetingElement) {
      helloWorldContent.greetingElement.remove();
      helloWorldContent.greetingElement = null;
    }
    
    helloWorldContent.initialized = false;
    helloWorldContent.log('info', 'Content script cleaned up');
  },
  
  /**
   * Handle messages from background/options
   */
  handleMessage: async (action, payload) => {
    helloWorldContent.log('debug', `Received message: ${action}`, payload);
    
    switch (action) {
      case 'SHOW_GREETING':
        const greeting = payload?.greeting || helloWorldContent.settings.greeting;
        helloWorldContent.showGreeting(greeting);
        return { success: true };
        
      case 'HIDE_GREETING':
        helloWorldContent.hideGreeting();
        return { success: true };
        
      case 'EXTRACT_PAGE_DATA':
        const pageData = helloWorldContent.extractPageData();
        return { success: true, data: pageData };
        
      case 'INJECT_CUSTOM_CSS':
        if (payload?.css) {
          helloWorldContent.injectCustomCSS(payload.css);
          return { success: true };
        }
        return { success: false, error: 'CSS required' };
        
      case 'UPDATE_SETTINGS':
        if (payload && typeof payload === 'object') {
          helloWorldContent.settings = { ...helloWorldContent.settings, ...payload };
          helloWorldContent.log('info', 'Settings updated', helloWorldContent.settings);
          
          // Update greeting element with new settings
          helloWorldContent.updateGreetingElement();
          
          return { success: true };
        }
        return { success: false, error: 'Invalid settings payload' };
        
      default:
        helloWorldContent.log('warn', `Unknown action: ${action}`);
        return { success: false, error: 'Unknown action' };
    }
  },
  
  /**
   * Message handler for Chrome runtime
   */
  messageHandler: (message, sender, sendResponse) => {
    if (message.type === 'PLUGIN_MESSAGE' && 
        message.pluginId === 'hello-world' && 
        message.context === 'content') {
      
      Promise.resolve(helloWorldContent.handleMessage(message.action, message.payload))
        .then(response => sendResponse(response || { success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      return true; // Keep channel open for async response
    }
  },
  
  /**
   * Create greeting element
   */
  createGreetingElement: () => {
    // Remove existing element if present
    if (helloWorldContent.greetingElement) {
      helloWorldContent.greetingElement.remove();
    }
    
    // Create greeting container
    const greetingDiv = document.createElement('div');
    greetingDiv.id = 'hello-world-greeting';
    greetingDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      cursor: pointer;
      transition: transform 0.2s ease, opacity 0.3s ease;
      transform: translateX(100%);
      opacity: 0;
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    greetingDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">🌍</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Hello World Plugin</div>
          <div id="hello-world-message">${helloWorldContent.settings.greeting}</div>
        </div>
        <button id="hello-world-close" style="
          background: none;
          border: none;
          color: white;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          margin-left: auto;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        ">×</button>
      </div>
    `;
    
    // Add click handlers
    greetingDiv.addEventListener('click', (e) => {
      if (e.target.id !== 'hello-world-close') {
        helloWorldContent.onGreetingClick();
      }
    });
    
    greetingDiv.querySelector('#hello-world-close').addEventListener('click', (e) => {
      e.stopPropagation();
      helloWorldContent.hideGreeting();
    });
    
    // Add hover effects
    greetingDiv.addEventListener('mouseenter', () => {
      greetingDiv.style.transform = 'translateX(0) scale(1.02)';
    });
    
    greetingDiv.addEventListener('mouseleave', () => {
      greetingDiv.style.transform = 'translateX(0) scale(1)';
    });
    
    document.body.appendChild(greetingDiv);
    helloWorldContent.greetingElement = greetingDiv;
    
    helloWorldContent.log('debug', 'Greeting element created');
  },
  
  /**
   * Show greeting with animation
   */
  showGreeting: (message) => {
    if (!helloWorldContent.greetingElement) {
      helloWorldContent.createGreetingElement();
    }
    
    // Update message
    const messageElement = helloWorldContent.greetingElement.querySelector('#hello-world-message');
    if (messageElement) {
      messageElement.textContent = message || helloWorldContent.settings.greeting;
    }
    
    // Animate in
    setTimeout(() => {
      helloWorldContent.greetingElement.style.transform = 'translateX(0)';
      helloWorldContent.greetingElement.style.opacity = '1';
    }, 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      helloWorldContent.hideGreeting();
    }, 5000);
    
    helloWorldContent.log('info', `Greeting shown: ${message}`);
  },
  
  /**
   * Hide greeting with animation
   */
  hideGreeting: () => {
    if (helloWorldContent.greetingElement) {
      helloWorldContent.greetingElement.style.transform = 'translateX(100%)';
      helloWorldContent.greetingElement.style.opacity = '0';
      
      setTimeout(() => {
        if (helloWorldContent.greetingElement) {
          helloWorldContent.greetingElement.remove();
          helloWorldContent.greetingElement = null;
        }
      }, 300);
    }
    
    helloWorldContent.log('debug', 'Greeting hidden');
  },
  
  /**
   * Update greeting element with new settings
   */
  updateGreetingElement: () => {
    if (helloWorldContent.greetingElement) {
      const messageElement = helloWorldContent.greetingElement.querySelector('#hello-world-message');
      if (messageElement) {
        messageElement.textContent = helloWorldContent.settings.greeting;
      }
    }
  },
  
  /**
   * Handle greeting click
   */
  onGreetingClick: () => {
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'PLUGIN_MESSAGE',
      pluginId: 'hello-world',
      context: 'background',
      action: 'SEND_GREETING',
      payload: { customGreeting: 'Clicked from content script!' }
    });
    
    helloWorldContent.log('debug', 'Greeting clicked, message sent to background');
  },
  
  /**
   * Extract page data
   */
  extractPageData: () => {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      elements: {
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        forms: document.querySelectorAll('form').length,
        scripts: document.querySelectorAll('script').length
      }
    };
  },
  
  /**
   * Inject custom CSS
   */
  injectCustomCSS: (css) => {
    const styleElement = document.createElement('style');
    styleElement.id = 'hello-world-custom-css';
    styleElement.textContent = css;
    
    // Remove existing custom CSS
    const existing = document.getElementById('hello-world-custom-css');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(styleElement);
    helloWorldContent.log('debug', 'Custom CSS injected');
  },
  
  /**
   * Set up page observers
   */
  setupPageObservers: () => {
    // Observe DOM changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          helloWorldContent.log('debug', 'DOM changes detected');
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        helloWorldContent.log('debug', 'Page became visible');
      } else {
        helloWorldContent.log('debug', 'Page became hidden');
      }
    });
    
    helloWorldContent.log('debug', 'Page observers set up');
  },
  
  /**
   * Logging utility
   */
  log: (level, message, data = null) => {
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = logLevels.indexOf(helloWorldContent.settings.logLevel || 'info');
    const messageLevelIndex = logLevels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [HelloWorld:Content] [${level.toUpperCase()}] ${message}`;
      
      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  }
};

// Auto-initialize if settings are available
if (typeof window !== 'undefined') {
  // Initialize with default settings
  helloWorldContent.initialize().catch(error => {
    console.error('Hello World Content: Failed to initialize:', error);
  });
}

export default helloWorldContent;