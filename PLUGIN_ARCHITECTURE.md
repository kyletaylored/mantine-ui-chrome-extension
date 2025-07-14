# Plugin Architecture Strategy

## Overview

This document outlines the comprehensive plugin architecture that separates concerns between different Chrome extension execution contexts while maintaining a clean, standardized structure.

## Plugin Structure

### Directory Layout
```
src/plugins/{plugin-id}/
├── manifest.json          # Plugin metadata, permissions, and configuration schema
├── index.js              # Main plugin controller (options/popup context)
├── background.js         # Background script logic (optional)
├── content.js            # Content script logic (optional) 
├── component.jsx         # UI component for popup/options (optional)
├── config.js             # Configuration defaults and constants
└── README.md             # Plugin documentation
```

### Execution Contexts

#### 1. **Options/Popup Context** (`index.js`)
- **Purpose**: Plugin lifecycle management, settings handling, UI coordination
- **Access**: Full Chrome APIs, storage, other plugins
- **Responsibilities**:
  - Initialize/cleanup plugin
  - Handle settings changes
  - Coordinate with background/content scripts
  - Provide UI component interface

#### 2. **Background Context** (`background.js`)
- **Purpose**: Persistent background tasks, API calls, inter-tab communication
- **Access**: Full Chrome APIs, network requests, alarms, notifications
- **Responsibilities**:
  - Listen for browser events
  - Handle cross-tab communication
  - Perform background data processing
  - Manage persistent state

#### 3. **Content Context** (`content.js`)
- **Purpose**: Page interaction, DOM manipulation, data extraction
- **Access**: DOM, limited Chrome APIs, message passing
- **Responsibilities**:
  - Extract data from web pages
  - Inject scripts or modify DOM
  - Listen for page events
  - Communicate with background scripts

## Manifest Schema

### Standard Properties
```json
{
  "id": "plugin-unique-id",
  "name": "Human Readable Name",
  "description": "Brief description of plugin functionality",
  "version": "1.0.0",
  "author": "Plugin Author",
  "core": false,
  "defaultEnabled": false,
  "category": "monitoring|injection|utility|viewer",
  "icon": "IconName",
  "permissions": ["storage", "activeTab", "webRequest"],
  "matches": ["*://*/*"],
  "contexts": {
    "background": true,
    "content": true,
    "popup": false
  },
  "configSchema": { /* JSON Schema for configuration */ }
}
```

### Context-Specific Properties

#### Background Context
```json
{
  "contexts": {
    "background": true
  },
  "permissions": [
    "background",
    "alarms",
    "notifications",
    "webRequest",
    "storage"
  ]
}
```

#### Content Context  
```json
{
  "contexts": {
    "content": true
  },
  "permissions": [
    "activeTab",
    "scripting"
  ],
  "matches": [
    "*://*.example.com/*",
    "*://localhost:*/*"
  ]
}
```

## Plugin Loader Architecture

### 1. **Plugin Discovery & Loading**
```javascript
class PluginLoader {
  async discoverPlugins() {
    // Scan plugin directories
    // Load manifests
    // Validate contexts and permissions
    // Register plugins by context
  }
  
  async loadPluginForContext(pluginId, context) {
    const manifest = this.getManifest(pluginId);
    
    if (!manifest.contexts[context]) {
      return null; // Plugin doesn't support this context
    }
    
    switch (context) {
      case 'background':
        return await import(`../plugins/${pluginId}/background.js`);
      case 'content':
        return await import(`../plugins/${pluginId}/content.js`);
      case 'options':
      default:
        return await import(`../plugins/${pluginId}/index.js`);
    }
  }
}
```

### 2. **Context-Specific Initialization**

#### Background Script Manager
```javascript
// src/background/plugin-manager.js
class BackgroundPluginManager {
  async initializePlugins() {
    const plugins = await pluginLoader.getPluginsForContext('background');
    
    for (const plugin of plugins) {
      if (plugin.isEnabled()) {
        await this.initializeBackgroundPlugin(plugin);
      }
    }
  }
  
  async initializeBackgroundPlugin(plugin) {
    const module = await pluginLoader.loadPluginForContext(plugin.id, 'background');
    
    if (module?.initialize) {
      await module.initialize(plugin.settings);
    }
    
    // Register message handlers
    if (module?.handleMessage) {
      this.registerMessageHandler(plugin.id, module.handleMessage);
    }
  }
}
```

#### Content Script Manager
```javascript
// src/shared/content-script-manager.js
class ContentScriptManager {
  async injectPluginScripts(tabId, url) {
    const plugins = await pluginLoader.getPluginsForContext('content');
    
    for (const plugin of plugins) {
      if (plugin.shouldInjectForUrl(url) && plugin.isEnabled()) {
        await this.injectContentScript(tabId, plugin);
      }
    }
  }
  
  async injectContentScript(tabId, plugin) {
    const scriptPath = `plugins/${plugin.id}/content.js`;
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptPath]
    });
  }
}
```

## Message Passing Architecture

### 1. **Inter-Context Communication**
```javascript
// Plugin message format
const message = {
  type: 'PLUGIN_MESSAGE',
  pluginId: 'plugin-id',
  context: 'content|background|options',
  action: 'ACTION_NAME',
  payload: { /* action-specific data */ }
};
```

### 2. **Message Routing**
```javascript
// Background script message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PLUGIN_MESSAGE') {
    const plugin = backgroundPluginManager.getPlugin(message.pluginId);
    
    if (plugin?.handleMessage) {
      plugin.handleMessage(message.action, message.payload, sender)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      return true; // Keep channel open for async response
    }
  }
});
```

## Permission Management

### 1. **Dynamic Permission Requests**
```javascript
// Plugin loader validates and requests permissions
async function validatePluginPermissions(manifest) {
  const requiredPermissions = manifest.permissions || [];
  const hasPermissions = await chrome.permissions.contains({
    permissions: requiredPermissions,
    origins: manifest.matches || []
  });
  
  if (!hasPermissions) {
    // Request permissions when plugin is enabled
    await chrome.permissions.request({
      permissions: requiredPermissions,
      origins: manifest.matches || []
    });
  }
}
```

### 2. **Context-Specific Permission Validation**
```javascript
const CONTEXT_PERMISSIONS = {
  background: ['background', 'alarms', 'notifications'],
  content: ['activeTab', 'scripting'],
  options: ['storage']
};

function validateContextPermissions(manifest, context) {
  const allowedPermissions = CONTEXT_PERMISSIONS[context] || [];
  const requestedPermissions = manifest.permissions || [];
  
  const invalidPermissions = requestedPermissions.filter(
    perm => !allowedPermissions.includes(perm) && !perm.startsWith('*://')
  );
  
  if (invalidPermissions.length > 0) {
    throw new Error(`Invalid permissions for ${context}: ${invalidPermissions.join(', ')}`);
  }
}
```

## Plugin Interface Standards

### 1. **Background Script Interface**
```javascript
// src/plugins/example/background.js
export default {
  // Initialize background functionality
  initialize: async (settings) => {
    // Set up listeners, alarms, etc.
  },
  
  // Cleanup on disable
  cleanup: async () => {
    // Remove listeners, clear alarms
  },
  
  // Handle messages from other contexts
  handleMessage: async (action, payload, sender) => {
    switch (action) {
      case 'GET_DATA':
        return { success: true, data: await fetchData() };
      default:
        return { success: false, error: 'Unknown action' };
    }
  },
  
  // Background-specific methods
  onTabUpdated: (tabId, changeInfo, tab) => {
    // Handle tab updates
  },
  
  onBeforeRequest: (details) => {
    // Handle network requests
  }
};
```

### 2. **Content Script Interface**
```javascript
// src/plugins/example/content.js
export default {
  // Initialize content script functionality
  initialize: async (settings) => {
    // Set up DOM observers, event listeners
  },
  
  // Cleanup on navigation/disable
  cleanup: async () => {
    // Remove listeners, observers
  },
  
  // Extract data from current page
  extractData: () => {
    return {
      url: window.location.href,
      title: document.title,
      // Plugin-specific extraction
    };
  },
  
  // Inject functionality into page
  inject: (config) => {
    // Inject scripts, modify DOM
  },
  
  // Handle messages from background/options
  handleMessage: async (action, payload) => {
    switch (action) {
      case 'EXTRACT_DATA':
        return { success: true, data: extractData() };
      case 'INJECT_SCRIPT':
        return { success: true, result: inject(payload.config) };
      default:
        return { success: false, error: 'Unknown action' };
    }
  }
};
```

### 3. **Options Script Interface** (Current `index.js`)
```javascript
// src/plugins/example/index.js
export default {
  manifest: {
    // Load from manifest.json
  },
  
  // Initialize plugin in options context
  initialize: async () => {
    // Load settings, set up UI coordination
  },
  
  // Cleanup plugin
  cleanup: async () => {
    // Clean up options-specific state
  },
  
  // Handle settings changes
  onSettingsChange: async (newSettings) => {
    // Notify background/content scripts of settings changes
    await chrome.runtime.sendMessage({
      type: 'PLUGIN_MESSAGE',
      pluginId: manifest.id,
      context: 'background',
      action: 'UPDATE_SETTINGS',
      payload: newSettings
    });
  },
  
  // Render UI component
  renderComponent: (settings, onSettingsChange) => {
    // Return React component for popup/options
  }
};
```

## Migration Strategy

### Phase 1: Manifest Separation
1. Extract inline manifests to `manifest.json` files
2. Update plugin loader to read from files
3. Validate existing plugins against new schema

### Phase 2: Context Separation
1. Split existing plugins into context-specific files
2. Implement context-specific plugin managers
3. Update message routing architecture

### Phase 3: Permission Management
1. Implement dynamic permission validation
2. Add context-specific permission checks
3. Update plugin enable/disable flow

### Phase 4: Advanced Features
1. Plugin dependency management
2. Version compatibility checks
3. Plugin marketplace/discovery

## Benefits

1. **Clear Separation of Concerns**: Each execution context has distinct responsibilities
2. **Proper Permission Management**: Context-specific permission validation
3. **Scalable Architecture**: Easy to add new contexts or extend functionality
4. **Developer Experience**: Clear interfaces and standards for plugin development
5. **Security**: Proper isolation between contexts and permission scoping
6. **Maintainability**: Modular structure makes debugging and updates easier