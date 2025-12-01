# Shared Messaging APIs Integration

This document describes how the shared messaging system integrates with the plugin-loader-v2 architecture and provides examples of using the messaging APIs in plugins.

## Overview

The shared messaging system provides a standardized way for plugins to communicate between different contexts (background, content, options, popup) using:

- **@extend-chrome/messages**: Type-safe message functions
- **Plugin Message System**: Standardized plugin message format
- **Background Plugin Manager**: Centralized message routing
- **Context-Specific Handlers**: Context-aware message processing

## Messaging Architecture

### Message Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Popup       │    │   Background    │    │   Content       │
│   (Plugin UI)   │    │ (Plugin Manager)│    │  (Page Script)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │   PLUGIN_MESSAGE      │                       │
         │ ──────────────────────▶│                       │
         │                       │   PLUGIN_MESSAGE      │
         │                       │ ──────────────────────▶│
         │                       │                       │
         │                       │ ◀──────────────────────│
         │ ◀──────────────────────│        Response       │
         │      Response         │                       │

┌─────────────────┐    ┌─────────────────┐
│    Options      │    │  Plugin Loader  │
│ (Settings Page) │    │     System      │
└─────────────────┘    └─────────────────┘
         │                       │
         │   Settings Update     │
         │ ──────────────────────▶│
         │                       │
         │ ◀──────────────────────│
         │   Propagate to All    │
```

### Message Types

The system supports several types of messages:

1. **Core Extension Messages**: Pre-defined message types for common operations
2. **Plugin Messages**: Standardized plugin-specific messages
3. **System Messages**: Internal system communication
4. **Custom Messages**: Plugin-defined message types

## Core Extension Messages

Located in `src/shared/messages.js`, these provide typed message functions:

```javascript
import { 
  sendGetActiveTab, 
  sendGetApmTraces, 
  sendMessage 
} from '@/shared/messages';

// Pre-defined message types
const activeTab = await sendGetActiveTab();
const traces = await sendGetApmTraces({ filter: 'errors' });

// Generic send message function
const response = await sendMessage('GET_ACTIVE_TAB', {});
const apmData = await sendMessage('GET_APM_TRACES', { filter: 'all' });
```

### Available Core Messages

| Message Type | Function | Purpose |
|--------------|----------|---------|
| `GET_ACTIVE_TAB` | `sendGetActiveTab()` | Get currently active tab information |
| `GET_RUM_SESSION_DATA` | `sendGetRumSessionData()` | Retrieve RUM session data |
| `GET_APM_TRACES` | `sendGetApmTraces(payload)` | Get APM trace data with filtering |
| `CLEAR_APM_TRACES` | `sendClearApmTraces()` | Clear APM trace cache |
| `INJECT_SCRIPT` | `sendInjectScript(payload)` | Inject script into content context |
| `NOTIFICATION_BUTTON_CLICKED` | `sendNotificationButtonClicked(payload)` | Handle notification interactions |

## Plugin Message System

### Standard Plugin Message Format

All plugin messages use this standardized structure:

```javascript
const pluginMessage = {
  type: 'PLUGIN_MESSAGE',           // Always 'PLUGIN_MESSAGE' for plugin communication
  pluginId: 'your-plugin-id',       // Unique plugin identifier
  context: 'background|content|options|popup',  // Target execution context
  action: 'ACTION_NAME',            // Specific action to perform
  payload: {                        // Action-specific data
    // ... action parameters
  }
};
```

### Sending Plugin Messages

#### From Options/Popup to Background

```javascript
// Example: Update plugin settings
const response = await chrome.runtime.sendMessage({
  type: 'PLUGIN_MESSAGE',
  pluginId: 'analytics-tracker',
  context: 'background',
  action: 'UPDATE_SETTINGS',
  payload: {
    enableTracking: true,
    sampleRate: 75
  }
});

if (response?.success) {
  console.log('Settings updated successfully');
} else {
  console.error('Failed to update settings:', response?.error);
}
```

#### From Background to Content Script

```javascript
// Example: Trigger data collection in content script
const response = await chrome.tabs.sendMessage(tabId, {
  type: 'PLUGIN_MESSAGE',
  pluginId: 'rum-viewer',
  context: 'content',
  action: 'GET_RUM_DATA',
  payload: {
    maxWaitTime: 5000,
    includeUserData: true
  }
});
```

#### From Content to Background (via Options)

```javascript
// Example: Send collected data to options context for processing
await chrome.runtime.sendMessage({
  type: 'PLUGIN_MESSAGE',
  pluginId: 'analytics-tracker',
  context: 'options',
  action: 'PROCESS_EVENT',
  payload: {
    eventType: 'page_view',
    eventData: {
      url: window.location.href,
      timestamp: Date.now()
    }
  }
});
```

## Background Plugin Manager Integration

The background plugin manager (`src/background/plugin-manager.js`) handles message routing:

### Message Handler Registration

```javascript
// Background script automatically registers plugin message handlers
class BackgroundPluginManager {
  async initializePlugin(pluginId, pluginModule) {
    if (pluginModule.handleMessage) {
      this.messageHandlers.set(pluginId, pluginModule.handleMessage);
    }
  }

  // Automatic message routing
  async handlePluginMessage(pluginId, action, payload, sender) {
    const handler = this.messageHandlers.get(pluginId);
    if (handler) {
      return await handler(action, payload, sender);
    }
    throw new Error(`No message handler for plugin: ${pluginId}`);
  }
}
```

### Plugin Message Handler Implementation

In your plugin's background script:

```javascript
// src/plugins/your-plugin/background.js
export default {
  initialize: async (settings) => {
    console.log('Plugin background initialized');
  },

  // Handle messages from other contexts
  handleMessage: async (action, payload, sender) => {
    switch (action) {
      case 'GET_STATUS':
        return {
          success: true,
          data: { status: 'active', version: '1.0.0' }
        };

      case 'PROCESS_DATA':
        try {
          const result = await processData(payload.data);
          return { success: true, result };
        } catch (error) {
          return { success: false, error: error.message };
        }

      case 'UPDATE_SETTINGS':
        await updatePluginSettings(payload);
        return { success: true };

      default:
        return { success: false, error: 'Unknown action' };
    }
  }
};
```

## Plugin-Specific Message Patterns

### Settings Management Pattern

```javascript
// Options context - handle settings changes
onSettingsChange: async (newSettings) => {
  // 1. Update local plugin settings
  await setPluginSettings(pluginId, newSettings);
  
  // 2. Notify background script
  await chrome.runtime.sendMessage({
    type: 'PLUGIN_MESSAGE',
    pluginId: pluginId,
    context: 'background',
    action: 'UPDATE_SETTINGS',
    payload: newSettings
  });
  
  // 3. Notify all content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'PLUGIN_MESSAGE',
        pluginId: pluginId,
        context: 'content',
        action: 'UPDATE_SETTINGS',
        payload: newSettings
      });
    } catch (error) {
      // Content script not available on this tab - ignore
    }
  }
}
```

### Data Collection Pattern

```javascript
// Content script - collect and send data
const collectAndSendData = async () => {
  const data = extractDataFromPage();
  
  // Send to options context for processing
  const response = await chrome.runtime.sendMessage({
    type: 'PLUGIN_MESSAGE',
    pluginId: 'data-collector',
    context: 'options',
    action: 'PROCESS_COLLECTED_DATA',
    payload: {
      data: data,
      timestamp: Date.now(),
      url: window.location.href
    }
  });
  
  if (!response?.success) {
    console.error('Failed to send collected data:', response?.error);
  }
};

// Options context - process and store data
handleMessage: async (message) => {
  const { action, payload } = message;
  
  switch (action) {
    case 'PROCESS_COLLECTED_DATA':
      try {
        // Process the data
        const processedData = await processData(payload.data);
        
        // Store in plugin storage
        await pluginStorage.set('collectedData', processedData);
        
        // Send to background for external API calls if needed
        await chrome.runtime.sendMessage({
          type: 'PLUGIN_MESSAGE',
          pluginId: 'data-collector',
          context: 'background',
          action: 'SEND_TO_API',
          payload: processedData
        });
        
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
  }
}
```

### Cross-Plugin Communication Pattern

```javascript
// Plugin A requests data from Plugin B
const getDataFromOtherPlugin = async () => {
  const response = await chrome.runtime.sendMessage({
    type: 'PLUGIN_MESSAGE',
    pluginId: 'rum-viewer',
    context: 'options',
    action: 'GET_RUM_DATA',
    payload: {
      includeSessionReplay: true
    }
  });
  
  if (response?.success) {
    // Use RUM data in Plugin A
    processRumData(response.data);
  }
};

// Plugin B provides data to other plugins
handleMessage: async (message) => {
  const { action, payload } = message;
  
  switch (action) {
    case 'GET_RUM_DATA':
      const rumData = await collector.getRumData();
      return {
        success: true,
        data: {
          ...rumData,
          sessionReplay: payload.includeSessionReplay ? rumData.sessionReplayLink : null
        }
      };
  }
}
```

## Message Routing in Plugin-Loader-V2

### Context-Aware Message Handling

The plugin loader automatically routes messages to the correct context:

```javascript
// src/shared/plugin-loader-v2.js
class PluginLoaderV2 {
  async handlePluginMessage(pluginId, context, action, payload) {
    const plugin = this.getPluginForContext(pluginId, context);
    
    if (!plugin || !plugin.handleMessage) {
      throw new Error(`No message handler for ${pluginId} in ${context}`);
    }
    
    return await plugin.handleMessage(action, payload);
  }
}
```

### Background Script Integration

The background script (`src/background/background.js`) includes plugin message routing:

```javascript
// Message listener in background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PLUGIN_MESSAGE') {
    const { pluginId, context, action, payload } = message;
    
    // Route to background plugin manager
    if (context === 'background') {
      backgroundPluginManager.handleMessage(pluginId, action, payload, sender)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      
      return true; // Keep channel open for async response
    }
    
    // Route to other contexts via plugin loader
    pluginLoader.handlePluginMessage(pluginId, context, action, payload)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
});
```

## Error Handling and Best Practices

### Error Handling Pattern

```javascript
const sendPluginMessage = async (pluginId, context, action, payload) => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PLUGIN_MESSAGE',
      pluginId,
      context,
      action,
      payload
    });
    
    if (!response) {
      throw new Error('No response received');
    }
    
    if (!response.success) {
      throw new Error(response.error || 'Unknown error');
    }
    
    return response;
  } catch (error) {
    console.error(`Failed to send message to ${pluginId}:${context}:${action}`, error);
    
    // Show user notification if needed
    await notifications.create({
      title: 'Plugin Communication Error',
      message: `Failed to communicate with ${pluginId}`,
      tag: 'plugin-error'
    });
    
    throw error;
  }
};
```

### Message Handler Best Practices

```javascript
// Comprehensive message handler with error handling
handleMessage: async (action, payload, sender) => {
  const logger = createLogger(`Plugin:${context}`);
  
  logger.debug(`Received message: ${action}`, { payload, sender });
  
  try {
    switch (action) {
      case 'EXAMPLE_ACTION':
        // Validate payload
        if (!payload || typeof payload !== 'object') {
          return { success: false, error: 'Invalid payload' };
        }
        
        // Process action
        const result = await processAction(payload);
        
        // Log success
        logger.info(`Action ${action} completed successfully`);
        
        return { success: true, data: result };
        
      default:
        logger.warn(`Unknown action: ${action}`);
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    logger.error(`Error handling action ${action}:`, error);
    return { success: false, error: error.message };
  }
}
```

### Performance Considerations

1. **Message Batching**: Group related operations into single messages
2. **Payload Size**: Keep payloads small, use storage for large data
3. **Error Recovery**: Implement retry logic for critical operations
4. **Context Awareness**: Send messages to the appropriate context
5. **Cleanup**: Remove message listeners during plugin cleanup

## Testing Message Integration

### Manual Testing

```javascript
// Test plugin message flow in browser console
const testPluginMessage = async () => {
  const response = await chrome.runtime.sendMessage({
    type: 'PLUGIN_MESSAGE',
    pluginId: 'your-plugin',
    context: 'background',
    action: 'GET_STATUS'
  });
  
  console.log('Plugin status:', response);
};

// Test from different contexts
const testFromContent = async () => {
  // This would be run in a content script context
  const response = await chrome.runtime.sendMessage({
    type: 'PLUGIN_MESSAGE',
    pluginId: 'your-plugin',
    context: 'options',
    action: 'TRACK_EVENT',
    payload: {
      eventType: 'test',
      eventData: { timestamp: Date.now() }
    }
  });
  
  console.log('Event tracked:', response);
};
```

### Message Flow Debugging

1. **Enable Debug Logging**: Set plugin logging to debug level
2. **Monitor Network Tab**: Watch for message passing in DevTools
3. **Background Script Console**: Check background script console for errors
4. **Content Script Console**: Monitor content script message handling
5. **Storage Inspection**: Verify data persistence after message handling

This comprehensive messaging system provides a robust foundation for plugin communication while maintaining type safety and error handling across all extension contexts.