#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`)
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt function
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Validate icon exists in our pre-imported icon map
function validateIcon(iconName) {
  if (!iconName) return false;

  // Icons available in our pre-imported map
  const availableIcons = [
    'Puzzle', 'Eye', 'Code', 'Bell', 'Settings', 'Database', 'Upload', 'Download',
    'Shield', 'World', 'Chart', 'Cloud', 'Lock', 'Robot', 'Speedboat', 'Activity',
    'AlertCircle', 'Archive', 'ArrowRight', 'BarChart', 'Book', 'Bug', 'Camera',
    'Check', 'Circle', 'Copy', 'Edit', 'File', 'Folder', 'Globe', 'Hash', 'Home',
    'Info', 'Mail', 'Menu', 'Notification', 'Package', 'Phone', 'Plus', 'Refresh',
    'Send', 'Server', 'Share', 'Terminal', 'Trash', 'Users', 'Wifi', 'X'
  ];

  return availableIcons.includes(iconName);
}

// Get icon suggestions
function getIconSuggestions() {
  return [
    'Eye - Monitoring, viewing, inspection',
    'Code - Development, scripting, technical features',
    'Bell - Notifications, alerts, monitoring',
    'Settings - Configuration, preferences',
    'Database - Data management, storage',
    'Upload - Data injection, importing',
    'Download - Data extraction, exporting',
    'Shield - Security, protection features',
    'Speedboat - Fast operations, performance',
    'Robot - Automation, AI features',
    'Chart - Analytics, reporting',
    'Cloud - Cloud services, APIs',
    'Lock - Security, authentication',
    'Puzzle - Generic plugin (default fallback)'
  ];
}

// Validate plugin ID
function validatePluginId(id) {
  if (!id) return 'Plugin ID is required';
  if (!/^[a-z0-9-]+$/.test(id)) return 'Plugin ID must contain only lowercase letters, numbers, and hyphens';
  if (id.length < 3) return 'Plugin ID must be at least 3 characters';
  if (id.length > 50) return 'Plugin ID must be less than 50 characters';
  return null;
}

// Convert kebab-case to PascalCase
function toPascalCase(str) {
  return str.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

// Convert kebab-case to camelCase
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// Generate plugin files
function generatePluginFiles(config) {
  const pluginDir = path.join('src', 'plugins', config.id);

  // Create plugin directory
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
    log.success(`Created plugin directory: ${pluginDir}`);
  } else {
    log.warning(`Plugin directory already exists: ${pluginDir}`);
  }

  // Generate manifest.json
  const manifestContent = generateManifestFile(config);
  fs.writeFileSync(path.join(pluginDir, 'manifest.json'), manifestContent);
  log.success('Generated manifest.json');

  // Generate index.js
  const indexContent = generateIndexFile(config);
  fs.writeFileSync(path.join(pluginDir, 'index.js'), indexContent);
  log.success('Generated index.js');

  // Generate README.md
  const readmeContent = generateReadmeFile(config);
  fs.writeFileSync(path.join(pluginDir, 'README.md'), readmeContent);
  log.success('Generated README.md');

  // Generate content.js if needed
  if (config.needsContentScript) {
    const contentContent = generateContentFile(config);
    fs.writeFileSync(path.join(pluginDir, 'content.js'), contentContent);
    log.success('Generated content.js');
  }
}

function generateManifestFile(config) {
  const configSchema = generateConfigSchema(config);

  // Transform configSchema properties to settings format for manifest
  // (They are essentially the same, but we want to be explicit)
  const settings = configSchema.properties;

  const manifest = {
    id: config.id,
    name: config.name,
    description: config.description,
    version: '1.0.0',
    author: 'Datadog Sales Engineering Team',
    category: config.category,
    icon: config.icon,
    permissions: config.permissions.filter(p => p.trim()),
    contexts: {
      background: true,
      content: config.needsContentScript,
      options: true
    },
    matches: config.matches,
    core: config.isCore,
    defaultEnabled: config.isCore || config.defaultEnabled,
    settings: settings
  };

  return JSON.stringify(manifest, null, 2);
}

function generateConfigSchema(config) {
  const schema = {
    type: 'object',
    properties: {},
    required: []
  };

  // Always include enable option for optional plugins
  if (!config.isCore) {
    schema.properties.enabled = {
      type: 'boolean',
      title: 'Enable Plugin',
      description: `Enable or disable the ${config.name} plugin`,
      default: false
    };
  }

  // Add category-specific settings
  if (config.category === 'monitoring') {
    schema.properties.refreshInterval = {
      type: 'number',
      title: 'Refresh Interval (seconds)',
      description: 'How often to refresh data',
      default: 30,
      minimum: 5,
      maximum: 300
    };
    schema.properties.autoRefresh = {
      type: 'boolean',
      title: 'Auto Refresh',
      description: 'Automatically refresh data',
      default: true
    };
  }

  if (config.category === 'injection') {
    schema.properties.autoInject = {
      type: 'boolean',
      title: 'Auto Inject',
      description: 'Automatically inject scripts when pages load',
      default: false
    };
    schema.properties.targetDomains = {
      type: 'array',
      title: 'Target Domains',
      description: 'Domains to inject scripts into',
      items: { type: 'string' },
      default: ['*']
    };
  }

  if (config.category === 'utility') {
    schema.properties.debugMode = {
      type: 'boolean',
      title: 'Debug Mode',
      description: 'Enable debug logging',
      default: false
    };
  }

  // Add example API endpoint setting
  schema.properties.apiEndpoint = {
    type: 'string',
    title: 'API Endpoint',
    description: 'Custom API endpoint URL',
    default: 'https://api.datadoghq.com'
  };

  return schema;
}

function generateIndexFile(config) {
  const pascalName = toPascalCase(config.id);

  return `// ${config.name} Plugin - JavaScript implementation
// ${config.description}

import manifest from './manifest.json';

const ${toCamelCase(config.id)}Plugin = {
  manifest: {
    ...manifest,
    // Ensure configSchema is available for the plugin loader
    configSchema: {
      type: 'object',
      properties: manifest.settings
    }
  },

  // Plugin state
  settings: {},
  initialized: false,

  // Initialize the plugin
  initialize: async () => {
    console.log('${config.name} Plugin initialized');
    
    try {
      // Load plugin settings
      ${toCamelCase(config.id)}Plugin.settings = await ${toCamelCase(config.id)}Plugin.getSettings();
      ${toCamelCase(config.id)}Plugin.initialized = true;
      
      ${config.category === 'monitoring' ? `
      // Start monitoring if auto-refresh is enabled
      if (${toCamelCase(config.id)}Plugin.settings.autoRefresh) {
        ${toCamelCase(config.id)}Plugin.startMonitoring();
      }` : ''}
      
      ${config.category === 'injection' ? `
      // Set up injection listeners if auto-inject is enabled
      if (${toCamelCase(config.id)}Plugin.settings.autoInject) {
        ${toCamelCase(config.id)}Plugin.setupInjectionListeners();
      }` : ''}
      
      ${toCamelCase(config.id)}Plugin.log('info', 'Plugin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ${config.name} Plugin:', error);
    }
  },

  // Cleanup when plugin is disabled
  cleanup: async () => {
    console.log('${config.name} Plugin cleanup');
    
    try {
      ${config.category === 'monitoring' ? `
      if (${toCamelCase(config.id)}Plugin.monitoringInterval) {
        clearInterval(${toCamelCase(config.id)}Plugin.monitoringInterval);
        ${toCamelCase(config.id)}Plugin.monitoringInterval = null;
      }` : ''}
      
      ${toCamelCase(config.id)}Plugin.initialized = false;
      ${toCamelCase(config.id)}Plugin.log('info', 'Plugin cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup ${config.name} Plugin:', error);
    }
  },

  // Handle messages from other parts of the extension
  handleMessage: async (message) => {
    const { action, payload } = message;
    
    ${toCamelCase(config.id)}Plugin.log('debug', \`Received message: \${action}\`, payload);
    
    try {
      switch (action) {
        case 'GET_STATUS':
          return {
            success: true,
            data: {
              enabled: ${toCamelCase(config.id)}Plugin.initialized,
              version: ${toCamelCase(config.id)}Plugin.manifest.version,
              settings: ${toCamelCase(config.id)}Plugin.settings
            }
          };
          
        case 'UPDATE_SETTINGS':
          if (payload && typeof payload === 'object') {
            const oldSettings = { ...${toCamelCase(config.id)}Plugin.settings };
            ${toCamelCase(config.id)}Plugin.settings = { ...${toCamelCase(config.id)}Plugin.settings, ...payload };
            
            ${toCamelCase(config.id)}Plugin.log('info', 'Settings updated', {
              old: oldSettings,
              new: ${toCamelCase(config.id)}Plugin.settings
            });
            
            // Apply settings changes
            await ${toCamelCase(config.id)}Plugin.applySettings(oldSettings);
            
            return { success: true };
          }
          return { success: false, error: 'Invalid settings payload' };
          
        case 'EXECUTE_ACTION':
          // TODO: Implement your main plugin action
          ${toCamelCase(config.id)}Plugin.log('info', 'Executing main action');
          return { 
            success: true, 
            message: '${config.name} action executed successfully',
            timestamp: Date.now()
          };
          
        case 'GET_DATA':
          // TODO: Implement data retrieval logic
          return {
            success: true,
            data: {
              pluginId: '${config.id}',
              timestamp: Date.now(),
              status: 'active',
              sampleData: 'This is sample data from ${config.name}'
            }
          };
          
        default:
          ${toCamelCase(config.id)}Plugin.log('warn', \`Unknown action: \${action}\`);
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      ${toCamelCase(config.id)}Plugin.log('error', 'Error handling message', error);
      return { success: false, error: error.message };
    }
  },

  // Content script runner (if needed)
  runContentScript: async (settings) => {
    // TODO: Implement content script logic
    ${toCamelCase(config.id)}Plugin.log('info', 'Running content script with settings', settings);
  },

  // Helper methods
  getSettings: async () => {
    // In real implementation, this would load from storage
    // For now, return defaults from config schema
    const defaults = {};
    const schema = ${toCamelCase(config.id)}Plugin.manifest.configSchema;
    
    if (schema && schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        defaults[key] = schema.properties[key].default;
      });
    }
    
    return defaults;
  },

  applySettings: async (oldSettings) => {
    ${config.category === 'monitoring' ? `
    // Handle monitoring settings changes
    if (oldSettings.autoRefresh !== ${toCamelCase(config.id)}Plugin.settings.autoRefresh ||
        oldSettings.refreshInterval !== ${toCamelCase(config.id)}Plugin.settings.refreshInterval) {
      if (${toCamelCase(config.id)}Plugin.settings.autoRefresh) {
        ${toCamelCase(config.id)}Plugin.startMonitoring();
      } else {
        ${toCamelCase(config.id)}Plugin.stopMonitoring();
      }
    }` : ''}
    
    ${config.category === 'injection' ? `
    // Handle injection settings changes
    if (oldSettings.autoInject !== ${toCamelCase(config.id)}Plugin.settings.autoInject) {
      if (${toCamelCase(config.id)}Plugin.settings.autoInject) {
        ${toCamelCase(config.id)}Plugin.setupInjectionListeners();
      } else {
        ${toCamelCase(config.id)}Plugin.removeInjectionListeners();
      }
    }` : ''}
  },

  log: (level, message, data = null) => {
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const currentLevel = ${toCamelCase(config.id)}Plugin.settings.debugMode ? 'debug' : 'info';
    const currentLevelIndex = logLevels.indexOf(currentLevel);
    const messageLevelIndex = logLevels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = \`[\${timestamp}] [${pascalName}] [\${level.toUpperCase()}] \${message}\`;
      
      if (data) {
        console[level](logMessage, data);
      } else {
        console[level](logMessage);
      }
    }
  }${config.category === 'monitoring' ? `,

  // Monitoring-specific methods
  monitoringInterval: null,
  
  startMonitoring: () => {
    if (${toCamelCase(config.id)}Plugin.monitoringInterval) {
      clearInterval(${toCamelCase(config.id)}Plugin.monitoringInterval);
    }
    
    const intervalMs = (${toCamelCase(config.id)}Plugin.settings.refreshInterval || 30) * 1000;
    ${toCamelCase(config.id)}Plugin.monitoringInterval = setInterval(() => {
      ${toCamelCase(config.id)}Plugin.performMonitoring();
    }, intervalMs);
    
    ${toCamelCase(config.id)}Plugin.log('info', \`Monitoring started (interval: \${intervalMs}ms)\`);
  },
  
  stopMonitoring: () => {
    if (${toCamelCase(config.id)}Plugin.monitoringInterval) {
      clearInterval(${toCamelCase(config.id)}Plugin.monitoringInterval);
      ${toCamelCase(config.id)}Plugin.monitoringInterval = null;
      ${toCamelCase(config.id)}Plugin.log('info', 'Monitoring stopped');
    }
  },
  
  performMonitoring: async () => {
    try {
      // TODO: Implement your monitoring logic here
      ${toCamelCase(config.id)}Plugin.log('debug', 'Performing monitoring check');
      
      // Example: Check API status
      const response = await fetch(${toCamelCase(config.id)}Plugin.settings.apiEndpoint + '/health');
      const data = await response.json();
      
      ${toCamelCase(config.id)}Plugin.log('info', 'Monitoring check completed', data);
    } catch (error) {
      ${toCamelCase(config.id)}Plugin.log('error', 'Monitoring check failed', error);
    }
  }` : ''}${config.category === 'injection' ? `,

  // Injection-specific methods
  injectionListeners: [],
  
  setupInjectionListeners: () => {
    // TODO: Set up tab listeners for automatic injection
    ${toCamelCase(config.id)}Plugin.log('info', 'Setting up injection listeners');
    
    // Example: Listen for tab updates
    const listener = (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        ${toCamelCase(config.id)}Plugin.checkAndInject(tab);
      }
    };
    
    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener(listener);
      ${toCamelCase(config.id)}Plugin.injectionListeners.push(listener);
    }
  },
  
  removeInjectionListeners: () => {
    ${toCamelCase(config.id)}Plugin.injectionListeners.forEach(listener => {
      if (chrome.tabs && chrome.tabs.onUpdated) {
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
    ${toCamelCase(config.id)}Plugin.injectionListeners = [];
    ${toCamelCase(config.id)}Plugin.log('info', 'Injection listeners removed');
  },
  
  checkAndInject: async (tab) => {
    try {
      const targetDomains = ${toCamelCase(config.id)}Plugin.settings.targetDomains || ['*'];
      const url = new URL(tab.url);
      
      // Check if domain matches target domains
      const shouldInject = targetDomains.some(domain => 
        domain === '*' || url.hostname.includes(domain)
      );
      
      if (shouldInject) {
        ${toCamelCase(config.id)}Plugin.log('info', \`Injecting into tab: \${tab.url}\`);
        await ${toCamelCase(config.id)}Plugin.performInjection(tab.id);
      }
    } catch (error) {
      ${toCamelCase(config.id)}Plugin.log('error', 'Injection check failed', error);
    }
  },
  
  performInjection: async (tabId) => {
    try {
      // TODO: Implement your injection logic here
      const script = \`
        console.log('${config.name} Plugin: Script injected');
        // Add your injection code here
      \`;
      
      await chrome.scripting.executeScript({
        target: { tabId },
        func: new Function(script)
      });
      
      ${toCamelCase(config.id)}Plugin.log('info', \`Script injected into tab \${tabId}\`);
    } catch (error) {
      ${toCamelCase(config.id)}Plugin.log('error', 'Script injection failed', error);
    }
  }` : ''}
};

export default ${toCamelCase(config.id)}Plugin;`;
}

function generateContentFile(config) {
  const pascalName = toPascalCase(config.id);

  return `// ${config.name} Plugin - Content Script
// ${config.description}

import { createLogger } from '@/shared/logger';

const logger = createLogger('${pascalName}Content');

const ${toCamelCase(config.id)}Content = {
  // Initialize content script
  initialize: async () => {
    logger.info('${config.name} content script initialized');
    // Add your content script logic here
  }
};

export default ${toCamelCase(config.id)}Content;
`;
}

function generateReadmeFile(config) {
  return `# ${config.name} Plugin

${config.description}

## Overview

This plugin provides ${config.name.toLowerCase()} functionality for the Datadog Sales Engineering Toolkit. ${config.isCore ? 'It is a **core plugin** that cannot be disabled as it provides essential functionality.' : 'It is an **optional plugin** that can be enabled or disabled by users.'}

## Features

- 🔧 **Feature 1**: TODO - Describe your main feature
- 📊 **Feature 2**: TODO - Describe another feature  
- 🚀 **Feature 3**: TODO - Describe additional features

## Configuration

### Settings Schema

This plugin supports the following configuration options:

\`\`\`javascript
{
  ${!config.isCore ? `"enabled": {
    "type": "boolean",
    "title": "Enable Plugin",
    "description": "Enable or disable the ${config.name} plugin",
    "default": false
  },` : ''}
  ${config.category === 'monitoring' ? `"refreshInterval": {
    "type": "number", 
    "title": "Refresh Interval (seconds)",
    "description": "How often to refresh data",
    "default": 30,
    "minimum": 5,
    "maximum": 300
  },
  "autoRefresh": {
    "type": "boolean",
    "title": "Auto Refresh", 
    "description": "Automatically refresh data",
    "default": true
  },` : ''}
  ${config.category === 'injection' ? `"autoInject": {
    "type": "boolean",
    "title": "Auto Inject",
    "description": "Automatically inject scripts when pages load", 
    "default": false
  },
  "targetDomains": {
    "type": "array",
    "title": "Target Domains",
    "description": "Domains to inject scripts into",
    "items": { "type": "string" },
    "default": ["*"]
  },` : ''}
  "apiEndpoint": {
    "type": "string",
    "title": "API Endpoint",
    "description": "Custom API endpoint URL",
    "default": "https://api.datadoghq.com"
  },
  "debugMode": {
    "type": "boolean",
    "title": "Debug Mode", 
    "description": "Enable debug logging",
    "default": false
  }
}
\`\`\`

### Permissions

This plugin requires the following Chrome extension permissions:

${config.permissions.filter(p => p.trim()).map(p => `- \`${p}\``).join('\n')}

## Usage

### Installation

This plugin is ${config.isCore ? 'automatically installed and enabled' : 'available in the plugin directory'} as part of the Datadog Sales Engineering Toolkit.

### Configuration

1. ${config.isCore ? 'The plugin is automatically enabled (core plugin)' : 'Enable the plugin in the Options page under Plugins'}
2. Configure settings by clicking the "Configure" button
3. Adjust settings according to your needs
4. Save configuration

### API Messages

The plugin responds to the following message types:

#### GET_STATUS
Get current plugin status and settings.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: 'PLUGIN_MESSAGE',
  pluginId: '${config.id}',
  action: 'GET_STATUS'
});
\`\`\`

#### UPDATE_SETTINGS
Update plugin settings.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: 'PLUGIN_MESSAGE', 
  pluginId: '${config.id}',
  action: 'UPDATE_SETTINGS',
  payload: { 
    ${config.category === 'monitoring' ? 'refreshInterval: 60,' : ''}
    ${config.category === 'injection' ? 'autoInject: true,' : ''}
    debugMode: true 
  }
});
\`\`\`

#### EXECUTE_ACTION
Execute the main plugin action.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: 'PLUGIN_MESSAGE',
  pluginId: '${config.id}', 
  action: 'EXECUTE_ACTION'
});
\`\`\`

#### GET_DATA
Retrieve plugin data.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: 'PLUGIN_MESSAGE',
  pluginId: '${config.id}',
  action: 'GET_DATA'
});
\`\`\`

## Development

### File Structure

\`\`\`
src/plugins/${config.id}/
├── index.js         # Main plugin implementation
└── README.md        # This documentation
\`\`\`

### Plugin Architecture

This plugin follows the standard plugin architecture:

1. **Manifest**: Defines plugin metadata, permissions, and configuration schema
2. **Lifecycle Methods**: \`initialize()\`, \`cleanup()\`, \`handleMessage()\`
3. **Settings Management**: Dynamic configuration with validation
4. **Logging**: Structured logging with debug levels
${config.category === 'monitoring' ? '5. **Monitoring**: Automatic monitoring with configurable intervals' : ''}
${config.category === 'injection' ? '5. **Injection**: Automatic script injection with domain targeting' : ''}

### Testing

1. Build the extension: \`npm run build\`
2. Load the extension in Chrome developer mode
3. Open the options page and navigate to Plugins
4. ${config.isCore ? 'The plugin should be automatically enabled' : 'Enable the plugin and configure settings'}
5. Test functionality in browser console

### Debugging

- Enable debug mode in plugin settings for verbose logging
- Check browser console for plugin messages
- Use Chrome DevTools to inspect plugin state
- Monitor background script for message handling

## Customization

### Adding New Features

1. Add new message handlers in \`handleMessage()\`
2. Update configuration schema in manifest
3. Implement feature logic in helper methods
4. Update this README with new functionality

### Configuration Options

Add new settings by extending the \`configSchema\` in the manifest:

\`\`\`javascript
configSchema: {
  properties: {
    newSetting: {
      type: 'string',
      title: 'New Setting',
      description: 'Description of new setting',
      default: 'default value'
    }
  }
}
\`\`\`

### Message Handling

Add new message types by extending the \`handleMessage()\` method:

\`\`\`javascript
case 'NEW_ACTION':
  // Implement new action
  return { success: true, result: 'action completed' };
\`\`\`

## Troubleshooting

### Common Issues

**Plugin not loading**
- Check browser console for JavaScript errors
- Verify plugin is properly exported as default
- Ensure manifest is valid

**Configuration not saving**
- Check storage permissions
- Verify settings match schema format
- Look for validation errors in console

**Messages not handled**
- Verify background script is receiving messages
- Check plugin ID matches exactly
- Ensure plugin is initialized

## License

This plugin is part of the Datadog Sales Engineering Toolkit and follows the same license terms.
`;
}

// Main wizard function
async function runWizard() {
  log.title('🔌 Datadog Plugin Generator (JavaScript)');

  try {
    log.step('Collecting plugin information...');

    // 1. Get Plugin Name first
    const name = await prompt('Plugin Name (e.g., "My Awesome Plugin"): ');
    if (!name.trim()) {
      log.error('Plugin name is required');
      process.exit(1);
    }

    // 2. Derive ID from name
    const derivedId = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // 3. Confirm or override ID
    let pluginId = await prompt(`Plugin ID [${derivedId}]: `);
    pluginId = pluginId.trim() || derivedId;

    // Validate plugin ID
    const validationError = validatePluginId(pluginId);
    if (validationError) {
      log.error(validationError);
      process.exit(1);
    }

    // Check if plugin already exists
    const pluginDir = path.join('src', 'plugins', pluginId);
    if (fs.existsSync(pluginDir)) {
      const overwrite = await prompt(`Plugin "${pluginId}" already exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== 'y') {
        log.info('Cancelled by user');
        process.exit(0);
      }
    }

    // Show icon guidance
    log.info('Icon Reference: Visit https://tabler.io/icons to browse all available icons');
    log.info('Common icon suggestions:');
    getIconSuggestions().forEach(suggestion => {
      log.info(`  ${suggestion}`);
    });

    // Collect remaining details
    // Collect remaining details
    const category = await prompt('Category (monitoring/injection/utility): ') || 'utility';

    let needsContentScript = false;
    let matches = [];

    if (category === 'injection') {
      needsContentScript = true;
    } else {
      const answer = await prompt('Does this plugin need a content script? (y/N): ');
      needsContentScript = answer.toLowerCase() === 'y';
    }

    if (needsContentScript) {
      const matchesInput = await prompt('Target URL patterns (comma-separated, default: <all_urls>): ');
      matches = matchesInput ? matchesInput.split(',').map(m => m.trim()) : ['<all_urls>'];
    }

    const config = {
      id: pluginId,
      name: name,
      description: await prompt('Plugin Description: '),
      category: category,
      needsContentScript: needsContentScript,
      matches: matches,
      icon: await prompt(`Icon name (PascalCase, e.g., "Eye", "Speedboat", default: "Puzzle"): `) || 'Puzzle',
      isCore: (await prompt('Is this a core plugin that cannot be disabled? (y/N): ')).toLowerCase() === 'y',
      defaultEnabled: false,
      permissions: (await prompt('Chrome permissions (comma-separated, e.g., "tabs,storage"): ') || 'storage').split(',')
    };

    // Validate icon against pre-imported icons
    if (config.icon && !validateIcon(config.icon)) {
      log.warning(`Icon "${config.icon}" not found in pre-imported icons.`);
      log.warning(`It will fallback to "Puzzle". To add new icons, see PLUGIN_STANDARDS.md`);
      log.info(`Available icons: Eye, Code, Bell, Settings, Database, Upload, Download, Shield, World, Chart, Cloud, Lock, Robot, Speedboat, and more.`);
    }

    // Set default enabled for core plugins
    if (config.isCore) {
      config.defaultEnabled = true;
    }

    log.step('Generating plugin files...');
    generatePluginFiles(config);

    log.success(`\n🎉 Plugin "${config.name}" generated successfully!`);
    log.info(`\nPlugin Details:`);
    log.info(`- ID: ${config.id}`);
    log.info(`- Name: ${config.name}`);
    log.info(`- Category: ${config.category}`);
    log.info(`- Icon: ${config.icon}`);
    log.info(`- Core Plugin: ${config.isCore ? 'Yes' : 'No'}`);
    log.info(`- Permissions: ${config.permissions.join(', ')}`);

    log.info(`\nNext steps:`);
    log.info(`1. cd src/plugins/${pluginId}`);
    log.info(`2. Review and customize the generated index.js file`);
    log.info(`3. Implement your plugin logic in the appropriate methods`);
    log.info(`4. Test your plugin with: npm run build`);
    log.info(`5. Load the extension and test in Chrome`);
    log.info(`\nSee PLUGIN_STANDARDS.md for detailed development guidelines.`);

  } catch (error) {
    log.error(`Failed to generate plugin: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Check if we're in the right directory
if (!fs.existsSync('package.json') || !fs.existsSync('src/plugins')) {
  log.error('Please run this script from the root of the Chrome extension project');
  process.exit(1);
}

// Run the wizard
runWizard();