---
title: Messaging
parent: Core APIs
nav_order: 1
---
# Messaging System

This document explains the messaging architecture used in the Datadog Sales Engineering Toolkit Chrome Extension. The extension uses a unified message handler in the background script to facilitate type-safe communication between various contexts.

## 🏗️ Architecture Overview

The messaging system is built around a centralized message handler in the background script that routes messages between different contexts:

- **Popup/Options** ↔ **Background Script** ↔ **Content Scripts**
- **Plugins** ↔ **Background Script** ↔ **External APIs**
- **Storage System** ↔ **Background Script** ↔ **UI Components**

## 🔧 Current Implementation

### Background Script Message Handler

The background script (`src/background/background.ts`) contains a centralized message handler that processes all message types:

```typescript
// Message handler in background script
const handleMessage = async (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  try {
    switch (request.type) {
      case 'VALIDATE_CREDENTIALS':
        const { credentials } = request.payload;
        const isValid = await validateDatadogCredentials(credentials);
        sendResponse({ success: true, isValid });
        break;

      case 'GET_RUM_SESSION_DATA':
        // Forward to content script
        if (sender.tab?.id) {
          const response = await chrome.tabs.sendMessage(sender.tab.id, request);
          sendResponse(response);
        }
        break;

      case 'INJECT_RUM_SCRIPT':
        const { script, sessionData } = request.payload;
        if (sender.tab?.id) {
          await chrome.tabs.sendMessage(sender.tab.id, {
            type: 'INJECT_SCRIPT',
            payload: { script, data: sessionData }
          });
        }
        sendResponse({ success: true });
        break;

      // Plugin-specific messages
      case 'EVENT_ALERT_QUERY':
        const { query, timeRange } = request.payload;
        const events = await queryDatadogEvents(query, timeRange);
        sendResponse({ success: true, events });
        break;

      // Notification messages
      case 'SHOW_NOTIFICATION':
        const { title, message, options } = request.payload;
        await showNotification(title, message, options);
        sendResponse({ success: true });
        break;

      default:
        console.warn('Unknown message type:', request.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
};

// Register message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async response
});
```

## 📨 Message Types

### Core Message Types

#### 1. Credential Validation
```typescript
// Request
{
  type: 'VALIDATE_CREDENTIALS',
  payload: {
    credentials: {
      apiKey: string;
      appKey: string;
      site: string;
    }
  }
}

// Response
{
  success: boolean;
  isValid: boolean;
  error?: string;
}
```

#### 2. RUM Session Data
```typescript
// Request
{
  type: 'GET_RUM_SESSION_DATA',
  payload: {}
}

// Response
{
  success: boolean;
  data: {
    sessionId?: string;
    userId?: string;
    userEmail?: string;
    sessionReplayId?: string;
    traceId?: string;
  }
}
```

#### 3. Script Injection
```typescript
// Request
{
  type: 'INJECT_RUM_SCRIPT',
  payload: {
    script: string;
    sessionData: RUMSessionData;
  }
}

// Response
{
  success: boolean;
  error?: string;
}
```

### Plugin Message Types

#### 1. Event Alerts
```typescript
// Request
{
  type: 'EVENT_ALERT_QUERY',
  payload: {
    query: string;
    timeRange: {
      from: string;
      to: string;
    };
  }
}

// Response
{
  success: boolean;
  events: DatadogEvent[];
}
```

#### 2. APM Tracing
```typescript
// Request
{
  type: 'APM_TRACE_QUERY',
  payload: {
    traceId: string;
    service?: string;
  }
}

// Response
{
  success: boolean;
  trace: DatadogTrace;
}
```

### Notification Messages

#### 1. Show Notification
```typescript
// Request
{
  type: 'SHOW_NOTIFICATION',
  payload: {
    title: string;
    message: string;
    options?: {
      priority?: number;
      buttons?: { title: string }[];
      data?: Record<string, any>;
    }
  }
}

// Response
{
  success: boolean;
  notificationId?: string;
}
```

## 🔄 Message Flow Examples

### 1. Credential Validation Flow

```
UI Component → Background Script → Datadog API → Background Script → UI Component
```

```typescript
// In UI component
const validateCredentials = async (credentials: DatadogCredentials) => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'VALIDATE_CREDENTIALS',
      payload: { credentials }
    });
    
    if (response.success) {
      setIsValid(response.isValid);
    }
  } catch (error) {
    console.error('Credential validation failed:', error);
  }
};
```

### 2. RUM Data Retrieval Flow

```
Popup → Background Script → Content Script → Background Script → Popup
```

```typescript
// In popup component
const getRUMData = async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_RUM_SESSION_DATA',
      payload: {}
    });
    
    if (response.success) {
      setRUMData(response.data);
    }
  } catch (error) {
    console.error('RUM data retrieval failed:', error);
  }
};
```

### 3. Plugin Action Flow

```
Plugin Component → Background Script → External API → Background Script → Plugin Component
```

```typescript
// In plugin component
const queryEvents = async (query: string, timeRange: any) => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'EVENT_ALERT_QUERY',
      payload: { query, timeRange }
    });
    
    if (response.success) {
      setEvents(response.events);
    }
  } catch (error) {
    console.error('Event query failed:', error);
  }
};
```

## 🛠️ Usage Patterns

### 1. Plugin Message Pattern

```typescript
// In plugin component
const sendPluginMessage = async (action: string, data?: any) => {
  const messageType = `${pluginId.toUpperCase()}_${action.toUpperCase()}`;
  
  const response = await chrome.runtime.sendMessage({
    type: messageType,
    payload: { pluginId, action, data }
  });
  
  return response;
};
```

### 2. Content Script Communication

```typescript
// From popup/options to content script via background
const sendToContentScript = async (tabId: number, message: any) => {
  const response = await chrome.runtime.sendMessage({
    type: 'FORWARD_TO_CONTENT',
    payload: { tabId, message }
  });
  
  return response;
};
```

### 3. Notification Pattern

```typescript
// Show notification with action buttons
const showNotificationWithAction = async (title: string, message: string, actions: string[]) => {
  const response = await chrome.runtime.sendMessage({
    type: 'SHOW_NOTIFICATION',
    payload: {
      title,
      message,
      options: {
        priority: 2,
        buttons: actions.map(action => ({ title: action })),
        data: { timestamp: Date.now() }
      }
    }
  });
  
  return response;
};
```

## 🔍 Debugging Messages

### Debug Logging

```typescript
// Enable debug logging in background script
const DEBUG_MESSAGES = true;

const debugLog = (operation: string, messageType: string, data?: any) => {
  if (DEBUG_MESSAGES) {
    console.log(`[Messages Debug] ${operation} - ${messageType}`, data);
  }
};

// Use in message handler
case 'MY_MESSAGE_TYPE':
  debugLog('RECEIVED', 'MY_MESSAGE_TYPE', request.payload);
  // ... handle message
  debugLog('RESPONDING', 'MY_MESSAGE_TYPE', response);
  break;
```

### Chrome DevTools

1. **Background Script**: Right-click extension → "Inspect background page"
2. **Content Script**: F12 in target tab → Console
3. **Popup**: Right-click extension icon → "Inspect popup"

## 📋 Best Practices

### 1. Type Safety
```typescript
// Define message interfaces
interface PluginMessage {
  type: string;
  payload: {
    pluginId: string;
    action: string;
    data?: any;
  };
}

// Use in message handler
const handleMessage = async (request: PluginMessage, sender: chrome.runtime.MessageSender) => {
  // Type-safe handling
};
```

### 2. Error Handling
```typescript
try {
  const response = await chrome.runtime.sendMessage(message);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
} catch (error) {
  console.error('Message failed:', error);
  throw error;
}
```

### 3. Response Consistency
```typescript
// Always return consistent response format
const response = {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date.now();
};
```

### 4. Message Validation
```typescript
// Validate message structure
const validateMessage = (message: any): boolean => {
  return message && 
         typeof message.type === 'string' && 
         message.payload !== undefined;
};
```

## 🚀 Adding New Message Types

### 1. Define Message Interface
```typescript
interface MyNewMessage {
  type: 'MY_NEW_MESSAGE';
  payload: {
    data: string;
    options?: any;
  };
}
```

### 2. Add Handler to Background Script
```typescript
case 'MY_NEW_MESSAGE':
  const { data, options } = request.payload;
  const result = await handleMyNewMessage(data, options);
  sendResponse({ success: true, result });
  break;
```

### 3. Create Helper Function
```typescript
export const sendMyNewMessage = async (data: string, options?: any) => {
  const response = await chrome.runtime.sendMessage({
    type: 'MY_NEW_MESSAGE',
    payload: { data, options }
  });
  
  if (!response.success) {
    throw new Error(response.error);
  }
  
  return response.result;
};
```

---

This messaging system provides a robust, type-safe, and scalable foundation for inter-context communication in the Chrome extension. The centralized handler makes it easy to add new message types and maintain consistency across the application.

## 🧭 Navigation

| [< Back to Index](../index.md) | [Next: Notifications >](./notifications.md) |
| :--- | :--- |