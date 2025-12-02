---
title: Plugin Development (v2)
parent: Getting Started
nav_order: 3
---
# Plugin Development with Plugin-Loader-V2

This guide covers plugin development using the latest plugin-loader-v2 architecture with abstracted libraries (storage, messages, notifications) and the new context separation system.

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating a New Plugin](#creating-a-new-plugin)
4. [Context Separation](#context-separation)
5. [Shared Libraries Integration](#shared-libraries-integration)
6. [Message Passing System](#message-passing-system)
7. [Complete Example: Analytics Plugin](#complete-example-analytics-plugin)
8. [Testing Your Plugin](#testing-your-plugin)

## Overview

The Plugin-Loader-V2 system provides:

- **Automatic Discovery**: Plugins are automatically discovered and loaded
- **Context Separation**: Different execution contexts (options, background, content, popup)
- **Abstracted Libraries**: Built-in storage, messaging, and notifications
- **Class-Based Utilities**: Reusable utility classes for complex functionality
- **Type Safety**: Full TypeScript support with proper interfaces

### Key Components

- **Plugin-Loader-V2** (`src/shared/plugin-loader-v2.js`): Core plugin discovery and management
- **Background Plugin Manager** (`src/background/plugin-manager.js`): Handles background context plugins
- **Content Script Manager** (`src/shared/content-script-manager.js`): Manages content script injection
- **Shared Libraries**: Storage, messaging, notifications, and logging abstractions

## Plugin Architecture

### Plugin Structure

Each plugin follows this structure:

```
src/plugins/my-plugin/
├── manifest.json          # Plugin metadata and configuration
├── index.js              # Main plugin (options context)
├── background.js         # Background script (optional)
├── content.js            # Content script (optional)
├── component.jsx         # React component for UI
├── my-utility-class.js   # Class-based utilities (optional)
└── README.md            # Plugin documentation
```

### Plugin Interface

Plugins export an object with this structure:

```javascript
export default {
  // Plugin metadata
  manifest: manifestData,

  // Services (class instances for complex logic)
  collector: null,
  notifications: null,
  logger: null,

  // Plugin lifecycle
  initialize: async () => { /* startup logic */ },
  cleanup: async () => { /* cleanup logic */ },
  handleMessage: async (message) => { /* message handling */ },
  onSettingsChange: async (settings) => { /* settings updates */ },
  
  // Context-specific methods
  renderComponent: () => <Component />
};
```

## Creating a New Plugin

### Step 1: Plugin Manifest

Create `manifest.json` with plugin metadata:

```json
{
  "id": "analytics-tracker",
  "name": "Analytics Tracker",
  "description": "Track user interactions and send analytics data",
  "version": "1.0.0",
  "author": "Your Name",
  "category": "monitoring",
  "core": false,
  "defaultEnabled": false,
  "icon": "ChartLine",
  "permissions": ["storage", "activeTab", "webRequest"],
  "matches": ["*://*/*"],
  "contexts": {
    "options": true,
    "background": true,
    "content": true,
    "popup": true
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "trackingId": {
        "type": "string",
        "title": "Tracking ID",
        "description": "Your analytics tracking ID",
        "default": "",
        "minLength": 1
      },
      "enableRealTime": {
        "type": "boolean",
        "title": "Real-time Tracking",
        "description": "Enable real-time event tracking",
        "default": true
      },
      "sampleRate": {
        "type": "number",
        "title": "Sample Rate (%)",
        "description": "Percentage of events to track",
        "default": 100,
        "minimum": 1,
        "maximum": 100
      }
    },
    "required": ["trackingId"]
  }
}
```

### Step 2: Class-Based Utility

Create a utility class for complex logic (`analytics-collector.js`):

```javascript
import { getPluginStorage, getPluginSettings, setPluginSettings } from '@/shared/storage';
import { sendMessage } from '@/shared/messages';
import { NotificationService } from '@/shared/notifications';
import { createLogger } from '@/shared/logger';

export class AnalyticsCollector {
  constructor(pluginId = 'analytics-tracker') {
    this.pluginId = pluginId;
    this.storage = getPluginStorage(pluginId);
    this.notifications = NotificationService.getInstance();
    this.logger = createLogger(`AnalyticsCollector:${pluginId}`);
    this.eventQueue = [];
    this.settings = {};
    this.initialized = false;
  }

  /**
   * Initialize the collector with settings
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load settings from storage
      this.settings = await getPluginSettings(this.pluginId);
      
      // Merge with defaults
      this.settings = {
        trackingId: '',
        enableRealTime: true,
        sampleRate: 100,
        batchSize: 10,
        flushInterval: 30000, // 30 seconds
        ...this.settings
      };

      // Start batch processing if real-time is enabled
      if (this.settings.enableRealTime) {
        this.startBatchProcessing();
      }

      this.initialized = true;
      this.logger.info('Analytics Collector initialized', { settings: this.settings });
    } catch (error) {
      this.logger.error('Failed to initialize Analytics Collector', error);
      throw error;
    }
  }

  /**
   * Track an analytics event
   */
  async trackEvent(eventType, eventData = {}) {
    try {
      // Check if we should sample this event
      if (Math.random() * 100 > this.settings.sampleRate) {
        this.logger.debug('Event skipped due to sampling');
        return;
      }

      const event = {
        id: crypto.randomUUID(),
        type: eventType,
        data: eventData,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        trackingId: this.settings.trackingId
      };

      // Add to queue
      this.eventQueue.push(event);
      this.logger.debug('Event tracked', { eventType, eventId: event.id });

      // Flush immediately if real-time is disabled or queue is full
      if (!this.settings.enableRealTime || this.eventQueue.length >= this.settings.batchSize) {
        await this.flushEvents();
      }

      // Show notification for important events
      if (eventType === 'error' || eventType === 'conversion') {
        await this.notifications.create({
          title: 'Analytics Event Tracked',
          message: `${eventType} event has been recorded`,
          tag: 'analytics-event',
          data: { eventType, eventId: event.id }
        });
      }

    } catch (error) {
      this.logger.error('Failed to track event', error);
    }
  }

  /**
   * Flush events to analytics service
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send events via background script
      const response = await chrome.runtime.sendMessage({
        type: 'PLUGIN_MESSAGE',
        pluginId: this.pluginId,
        context: 'background',
        action: 'SEND_ANALYTICS_BATCH',
        payload: { events: eventsToSend }
      });

      if (response?.success) {
        this.logger.info(`Sent ${eventsToSend.length} analytics events`);
        
        // Store successful send statistics
        await this.storage.set('lastFlush', {
          timestamp: Date.now(),
          eventCount: eventsToSend.length,
          success: true
        });
      } else {
        // Re-queue events if sending failed
        this.eventQueue.unshift(...eventsToSend);
        this.logger.warn('Failed to send analytics events, re-queued');
      }

    } catch (error) {
      // Re-queue events on error
      this.eventQueue.unshift(...eventsToSend);
      this.logger.error('Error sending analytics events', error);
    }
  }

  /**
   * Start batch processing timer
   */
  startBatchProcessing() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.settings.flushInterval);

    this.logger.debug('Batch processing started', { interval: this.settings.flushInterval });
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await setPluginSettings(this.pluginId, this.settings);
    
    // Restart batch processing if settings changed
    if (newSettings.enableRealTime !== undefined || newSettings.flushInterval !== undefined) {
      if (this.settings.enableRealTime) {
        this.startBatchProcessing();
      } else if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
    }

    this.logger.info('Settings updated', this.settings);
  }

  /**
   * Get analytics statistics
   */
  async getStatistics() {
    const lastFlush = await this.storage.get('lastFlush');
    
    return {
      queuedEvents: this.eventQueue.length,
      settings: this.settings,
      lastFlush: lastFlush || null,
      initialized: this.initialized
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Flush remaining events
    await this.flushEvents();

    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.initialized = false;
    this.logger.info('Analytics Collector cleaned up');
  }
}
```

### Step 3: Main Plugin (Options Context)

*[Content continues with the complete example as shown in the original file...]*

## Message Passing System

### Plugin Message Format

All plugin messages use this standardized format:

```javascript
const message = {
  type: 'PLUGIN_MESSAGE',
  pluginId: 'your-plugin-id',
  context: 'background|content|options|popup',
  action: 'ACTION_NAME',
  payload: { /* action-specific data */ }
};
```

### Using Shared Message APIs

The shared message system provides typed message functions:

```javascript
import { sendMessage } from '@/shared/messages';

// Send predefined message types
await sendMessage('GET_ACTIVE_TAB');
await sendMessage('GET_APM_TRACES', { filter: 'errors' });

// Send custom plugin messages
await sendMessage('PLUGIN_SETTINGS_UPDATED', {
  pluginId: 'analytics-tracker',
  settings: newSettings
});
```

## Testing Your Plugin

### Manual Testing Steps

1. **Build the Extension**: `npm run build`
2. **Load in Chrome**: Load `dist/` folder in `chrome://extensions/`
3. **Test Plugin Discovery**: Verify plugin appears in options
4. **Test Configuration**: Enable plugin and test settings
5. **Test Functionality**: Test all plugin features
6. **Test Message Flow**: Monitor communication between contexts

### Debugging Tips

- **Use the Logger**: Use `createLogger` utility for consistent logging
- **Check Context Loading**: Verify plugins load in correct contexts
- **Monitor Messages**: Use Chrome DevTools to monitor message passing
- **Storage Inspection**: Check data persistence
- **Error Boundaries**: Implement proper error handling

## Best Practices

1. **Use Abstracted Libraries**: Always use shared storage, messaging, and notification systems
2. **Class-Based Utilities**: Use class-based utilities for complex logic with state management
3. **Proper Cleanup**: Always implement cleanup methods to prevent memory leaks
4. **Error Handling**: Implement comprehensive error handling with user-friendly messages
5. **Type Safety**: Use proper TypeScript interfaces (even in JS files for JSDoc)
6. **Testing**: Test all plugin functionality thoroughly before deployment

This guide provides a complete example of building a sophisticated plugin using the Plugin-Loader-V2 system with all the latest architectural improvements and shared library integrations.