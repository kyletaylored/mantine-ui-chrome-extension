// Hello World Plugin - Options Context
// This plugin demonstrates the new separated architecture

import manifestData from './manifest.json';

const helloWorldPlugin = {
  // Load manifest from external file
  manifest: manifestData,

  // Plugin state
  settings: {},

  // Initialize the plugin in options context
  initialize: async () => {
    console.log('Hello World Plugin (Options): Initializing');
    
    // Load settings from storage
    helloWorldPlugin.settings = await helloWorldPlugin.getSettings();
    
    console.log('Hello World Plugin (Options): Initialized with settings', helloWorldPlugin.settings);
  },

  // Cleanup when plugin is disabled
  cleanup: async () => {
    console.log('Hello World Plugin (Options): Cleanup');
  },

  // Handle settings changes from the configuration form
  onSettingsChange: async (newSettings) => {
    console.log('Hello World Plugin (Options): Settings changed', newSettings);
    
    helloWorldPlugin.settings = { ...helloWorldPlugin.settings, ...newSettings };
    
    // Notify background script of settings changes
    try {
      await chrome.runtime.sendMessage({
        type: 'PLUGIN_MESSAGE',
        pluginId: 'hello-world',
        context: 'background',
        action: 'UPDATE_SETTINGS',
        payload: newSettings
      });
      
      console.log('Hello World Plugin (Options): Settings sent to background script');
    } catch (error) {
      console.error('Hello World Plugin (Options): Failed to send settings to background:', error);
    }
  },

  // Handle messages (mainly for testing and coordination)
  handleMessage: async (message) => {
    const { action, payload } = message;
    
    switch (action) {
      case 'GET_STATUS':
        return {
          success: true,
          data: {
            context: 'options',
            enabled: true,
            version: helloWorldPlugin.manifest.version,
            settings: helloWorldPlugin.settings
          }
        };
        
      case 'TEST_COMMUNICATION':
        // Test communication with background script
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'PLUGIN_MESSAGE',
            pluginId: 'hello-world',
            context: 'background',
            action: 'SEND_GREETING',
            payload: { customGreeting: 'Test from options context!' }
          });
          
          return { success: true, backgroundResponse: response };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  },

  // Get settings from storage system
  getSettings: async () => {
    try {
      // TODO: Integrate with storage system
      // For now, return defaults from manifest
      const defaults = {};
      if (helloWorldPlugin.manifest.configSchema?.properties) {
        Object.entries(helloWorldPlugin.manifest.configSchema.properties).forEach(([key, prop]) => {
          defaults[key] = prop.default;
        });
      }
      
      return defaults;
    } catch (error) {
      console.error('Hello World Plugin (Options): Failed to get settings:', error);
      return {};
    }
  },

  // Test method to trigger actions in other contexts
  testBackgroundCommunication: async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PLUGIN_MESSAGE',
        pluginId: 'hello-world',
        context: 'background',
        action: 'SEND_GREETING',
        payload: { customGreeting: 'Manual test from options!' }
      });
      
      console.log('Hello World Plugin (Options): Background response:', response);
      return response;
    } catch (error) {
      console.error('Hello World Plugin (Options): Background communication failed:', error);
      throw error;
    }
  },

  // Test method to trigger content script actions
  testContentCommunication: async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'PLUGIN_MESSAGE',
        pluginId: 'hello-world',
        context: 'content',
        action: 'SHOW_GREETING',
        payload: { greeting: 'Test from options context!' }
      });
      
      console.log('Hello World Plugin (Options): Content response:', response);
      return response;
    } catch (error) {
      console.error('Hello World Plugin (Options): Content communication failed:', error);
      throw error;
    }
  }
};

export default helloWorldPlugin;