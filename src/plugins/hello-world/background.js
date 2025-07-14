/**
 * Hello World Plugin - Background Script
 * Demonstrates background context functionality
 */

const helloWorldBackground = {
  // Plugin state
  intervalId: null,
  settings: {},
  
  /**
   * Initialize background functionality
   */
  initialize: async (settings) => {
    console.log('Hello World Background: Initializing with settings', settings);
    
    helloWorldBackground.settings = {
      greeting: 'Hello, World!',
      showNotifications: true,
      notificationInterval: 60,
      logLevel: 'info',
      enabledFeatures: ['logging'],
      pagePatterns: ['*'],
      ...settings
    };
    
    // Start notification timer if enabled
    if (helloWorldBackground.settings.showNotifications) {
      helloWorldBackground.startNotificationTimer();
    }
    
    // Set up alarm for periodic tasks
    await chrome.alarms.create('hello-world:check', {
      periodInMinutes: 5 // Check every 5 minutes
    });
    
    helloWorldBackground.log('info', 'Background plugin initialized successfully');
  },
  
  /**
   * Cleanup background functionality
   */
  cleanup: async () => {
    console.log('Hello World Background: Cleaning up');
    
    if (helloWorldBackground.intervalId) {
      clearInterval(helloWorldBackground.intervalId);
      helloWorldBackground.intervalId = null;
    }
    
    // Clear alarms
    await chrome.alarms.clear('hello-world:check');
    
    helloWorldBackground.log('info', 'Background plugin cleaned up');
  },
  
  /**
   * Handle messages from other contexts
   */
  handleMessage: async (action, payload, sender) => {
    helloWorldBackground.log('debug', `Received message: ${action}`, payload);
    
    switch (action) {
      case 'GET_STATUS':
        return {
          success: true,
          data: {
            enabled: true,
            version: '1.0.0',
            settings: helloWorldBackground.settings,
            intervalActive: !!helloWorldBackground.intervalId
          }
        };
        
      case 'UPDATE_SETTINGS':
        if (payload && typeof payload === 'object') {
          const oldSettings = { ...helloWorldBackground.settings };
          helloWorldBackground.settings = { ...helloWorldBackground.settings, ...payload };
          
          helloWorldBackground.log('info', 'Settings updated', {
            old: oldSettings,
            new: helloWorldBackground.settings
          });
          
          // Restart notification timer if settings changed
          if (oldSettings.notificationInterval !== helloWorldBackground.settings.notificationInterval ||
              oldSettings.showNotifications !== helloWorldBackground.settings.showNotifications) {
            helloWorldBackground.restartNotificationTimer();
          }
          
          return { success: true };
        }
        return { success: false, error: 'Invalid settings payload' };
        
      case 'SEND_GREETING':
        const greeting = payload?.customGreeting || helloWorldBackground.settings.greeting;
        await helloWorldBackground.showNotification('Hello World Plugin', greeting);
        return { success: true, greeting };
        
      case 'INJECT_INTO_TAB':
        const tabId = payload?.tabId;
        if (tabId) {
          await helloWorldBackground.injectIntoTab(tabId);
          return { success: true };
        }
        return { success: false, error: 'Tab ID required' };
        
      default:
        helloWorldBackground.log('warn', `Unknown action: ${action}`);
        return { success: false, error: 'Unknown action' };
    }
  },
  
  /**
   * Handle tab updates
   */
  onTabUpdated: (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      helloWorldBackground.log('debug', `Tab updated: ${tab.url}`);
      
      // Check if we should inject into this tab
      if (helloWorldBackground.shouldInjectIntoUrl(tab.url)) {
        helloWorldBackground.injectIntoTab(tabId);
      }
    }
  },
  
  /**
   * Handle alarms
   */
  onAlarm: (alarm) => {
    if (alarm.name === 'hello-world:check') {
      helloWorldBackground.log('debug', 'Periodic check alarm triggered');
      helloWorldBackground.performPeriodicCheck();
    }
  },
  
  /**
   * Check if should inject into URL
   */
  shouldInjectIntoUrl: (url) => {
    const patterns = helloWorldBackground.settings.pagePatterns || ['*'];
    
    return patterns.some(pattern => {
      if (pattern === '*') return true;
      
      // Simple pattern matching
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\./g, '\\.');
      
      try {
        return new RegExp(regexPattern).test(url);
      } catch {
        return false;
      }
    });
  },
  
  /**
   * Inject plugin into tab
   */
  injectIntoTab: async (tabId) => {
    try {
      // Send message to content script to show greeting
      await chrome.tabs.sendMessage(tabId, {
        type: 'PLUGIN_MESSAGE',
        pluginId: 'hello-world',
        context: 'content',
        action: 'SHOW_GREETING',
        payload: { greeting: helloWorldBackground.settings.greeting }
      });
      
      helloWorldBackground.log('info', `Injected greeting into tab ${tabId}`);
    } catch (error) {
      helloWorldBackground.log('debug', `Failed to inject into tab ${tabId}: ${error.message}`);
    }
  },
  
  /**
   * Show notification
   */
  showNotification: async (title, message) => {
    if (helloWorldBackground.settings.showNotifications) {
      try {
        await chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon48.png',
          title,
          message
        });
        helloWorldBackground.log('debug', `Notification shown: ${title} - ${message}`);
      } catch (error) {
        helloWorldBackground.log('error', 'Failed to show notification', error);
      }
    }
  },
  
  /**
   * Start notification timer
   */
  startNotificationTimer: () => {
    if (helloWorldBackground.intervalId) {
      clearInterval(helloWorldBackground.intervalId);
    }
    
    const intervalMs = helloWorldBackground.settings.notificationInterval * 60 * 1000;
    helloWorldBackground.intervalId = setInterval(() => {
      helloWorldBackground.showNotification(
        'Hello World Plugin',
        helloWorldBackground.settings.greeting
      );
    }, intervalMs);
    
    helloWorldBackground.log('info', `Notification timer started (${helloWorldBackground.settings.notificationInterval} minutes)`);
  },
  
  /**
   * Restart notification timer
   */
  restartNotificationTimer: () => {
    if (helloWorldBackground.settings.showNotifications) {
      helloWorldBackground.startNotificationTimer();
    } else if (helloWorldBackground.intervalId) {
      clearInterval(helloWorldBackground.intervalId);
      helloWorldBackground.intervalId = null;
      helloWorldBackground.log('info', 'Notification timer stopped');
    }
  },
  
  /**
   * Perform periodic check
   */
  performPeriodicCheck: () => {
    helloWorldBackground.log('debug', 'Performing periodic background check');
    
    // Example: Count active tabs
    chrome.tabs.query({}, (tabs) => {
      helloWorldBackground.log('info', `Active tabs: ${tabs.length}`);
    });
  },
  
  /**
   * Logging utility
   */
  log: (level, message, data = null) => {
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = logLevels.indexOf(helloWorldBackground.settings.logLevel || 'info');
    const messageLevelIndex = logLevels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [HelloWorld:Background] [${level.toUpperCase()}] ${message}`;
      
      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  }
};

export default helloWorldBackground;