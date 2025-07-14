// RUM Injection Plugin - JavaScript version

const rumInjectionPlugin = {
  manifest: {
    id: 'rum-injection',
    name: 'RUM Injection',
    description: 'Inject Datadog RUM SDK into web pages',
    version: '1.0.0',
    core: false,
    defaultEnabled: false,
    icon: 'Upload',
    permissions: ['tabs', 'storage', 'scripting'],
    
    // Configuration schema
    configSchema: {
      type: 'object',
      properties: {
        applicationId: {
          type: 'string',
          title: 'Application ID',
          description: 'Datadog RUM Application ID',
          default: '',
          minLength: 1
        },
        clientToken: {
          type: 'string',
          title: 'Client Token',
          description: 'Datadog RUM Client Token',
          default: '',
          minLength: 1
        },
        autoInject: {
          type: 'boolean',
          title: 'Auto Inject',
          description: 'Automatically inject RUM when pages load',
          default: false
        },
        sampleRate: {
          type: 'number',
          title: 'Sample Rate (%)',
          description: 'Percentage of sessions to track',
          default: 100,
          minimum: 0,
          maximum: 100
        },
        environment: {
          type: 'string',
          title: 'Environment',
          description: 'Deployment environment',
          enum: ['development', 'staging', 'production'],
          enumNames: ['Development', 'Staging', 'Production'],
          default: 'development'
        },
        targetDomains: {
          type: 'array',
          title: 'Target Domains',
          description: 'Domains to inject RUM into (use * for all)',
          items: { type: 'string' },
          default: ['*']
        },
        customAttributes: {
          type: 'array',
          title: 'Custom Attributes',
          description: 'Custom key-value attributes to add to RUM data',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' }
            }
          },
          default: []
        },
        debugMode: {
          type: 'boolean',
          title: 'Debug Mode',
          description: 'Enable verbose logging for debugging',
          default: false
        }
      },
      required: ['applicationId', 'clientToken']
    }
  },

  settings: {},

  initialize: async () => {
    console.log('RUM Injection Plugin initialized');
    
    // Load settings
    rumInjectionPlugin.settings = await rumInjectionPlugin.getSettings();
    
    // Set up auto-injection if enabled
    if (rumInjectionPlugin.settings.autoInject) {
      rumInjectionPlugin.setupAutoInjection();
    }
  },

  renderComponent: undefined,

  cleanup: async () => {
    console.log('RUM Injection Plugin cleanup');
    rumInjectionPlugin.removeAutoInjection();
  },

  handleMessage: async (message) => {
    const { action, payload } = message;
    
    switch (action) {
      case 'GET_STATUS':
        return {
          success: true,
          data: {
            enabled: true,
            version: rumInjectionPlugin.manifest.version,
            settings: rumInjectionPlugin.settings
          }
        };
        
      case 'UPDATE_SETTINGS':
        if (payload && typeof payload === 'object') {
          const oldSettings = { ...rumInjectionPlugin.settings };
          rumInjectionPlugin.settings = { ...rumInjectionPlugin.settings, ...payload };
          
          // Handle auto-injection setting changes
          if (oldSettings.autoInject !== rumInjectionPlugin.settings.autoInject) {
            if (rumInjectionPlugin.settings.autoInject) {
              rumInjectionPlugin.setupAutoInjection();
            } else {
              rumInjectionPlugin.removeAutoInjection();
            }
          }
          
          return { success: true };
        }
        return { success: false, error: 'Invalid settings payload' };
        
      case 'INJECT_RUM':
        // Manual injection trigger
        const tabId = payload?.tabId;
        if (tabId) {
          await rumInjectionPlugin.injectRUM(tabId);
          return { success: true };
        }
        return { success: false, error: 'Tab ID required' };
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  },

  getSettings: async () => {
    // Return defaults from schema
    const defaults = {};
    const schema = rumInjectionPlugin.manifest.configSchema;
    
    if (schema?.properties) {
      Object.keys(schema.properties).forEach(key => {
        defaults[key] = schema.properties[key].default;
      });
    }
    
    return defaults;
  },

  setupAutoInjection: () => {
    // Implementation would set up tab listeners for auto-injection
    console.log('Setting up RUM auto-injection');
  },

  removeAutoInjection: () => {
    // Implementation would remove tab listeners
    console.log('Removing RUM auto-injection');
  },

  injectRUM: async (tabId) => {
    // Implementation would inject RUM script into the specified tab
    console.log(`Injecting RUM into tab ${tabId} with settings:`, rumInjectionPlugin.settings);
  }
};

export default rumInjectionPlugin;