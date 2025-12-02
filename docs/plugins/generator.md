---
title: Plugin Generator
parent: Plugins
nav_order: 2
---
# Plugin Generator Example

This document shows an example of using the plugin scaffold generator to create a new plugin.

## Example: Creating a "Performance Monitor" Plugin

Let's create a plugin that monitors page performance metrics.

### Step 1: Run the Generator

```bash
npm run generate-plugin
```

### Step 2: Answer the Wizard Questions

```
🔌 Datadog Plugin Generator (JavaScript)

→ Collecting plugin information...
Plugin Name (e.g., "My Awesome Plugin"): Performance Monitor
Plugin ID [performance-monitor]: 
→ Collecting plugin information...
Icon Reference: Visit https://tabler.io/icons to browse all available icons
Common icon suggestions:
  Eye - Monitoring, viewing, inspection
  ...
Plugin Description: Monitor and display page performance metrics for sales demonstrations
Category (monitoring/injection/utility): monitoring
Icon name (PascalCase, e.g., "Eye", "Speedboat", default: "Puzzle"): Speedboat
Is this a core plugin that cannot be disabled? (y/N): n
Chrome permissions (comma-separated, e.g., "tabs,storage"): activeTab,tabs

→ Generating plugin files...
✓ Created plugin directory: src/plugins/performance-monitor
✓ Generated manifest.json
✓ Generated index.js
✓ Generated README.md

🎉 Plugin "Performance Monitor" generated successfully!

Next steps:
1. cd src/plugins/performance-monitor
2. Review and customize the generated index.js file
3. Implement your plugin logic in the appropriate methods
4. Test your plugin with: npm run build
5. Load the extension and test in Chrome

See PLUGIN_STANDARDS.md for detailed development guidelines.
```

### Step 3: Generated File Structure

The generator creates this structure:

```
src/plugins/performance-monitor/
├── manifest.json     # Plugin metadata and settings
├── index.js          # Plugin entry point and logic
└── README.md         # Plugin documentation
```

### Step 4: Generated Files Overview

#### manifest.json
```json
{
  "id": "performance-monitor",
  "name": "Performance Monitor", 
  "description": "Monitor and display page performance metrics for sales demonstrations",
  "version": "1.0.0",
  "author": "Datadog Sales Engineering Team",
  "category": "monitoring",
  "icon": "Speedboat",
  "core": false,
  "defaultEnabled": false,
  "permissions": ["activeTab", "tabs"],
  "settings": {
    "enabled": {
      "type": "boolean",
      "title": "Enable Plugin",
      "description": "Enable or disable the Performance Monitor plugin",
      "default": false
    },
    "refreshInterval": {
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
    }
  }
}
```

#### index.js
```javascript
// Performance Monitor Plugin - JavaScript implementation
// Monitor and display page performance metrics for sales demonstrations

import manifest from './manifest.json';

const performanceMonitorPlugin = {
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
    console.log('Performance Monitor Plugin initialized');
    
    try {
      // Load plugin settings
      performanceMonitorPlugin.settings = await performanceMonitorPlugin.getSettings();
      performanceMonitorPlugin.initialized = true;
      
      // Start monitoring if auto-refresh is enabled
      if (performanceMonitorPlugin.settings.autoRefresh) {
        performanceMonitorPlugin.startMonitoring();
      }
      
      performanceMonitorPlugin.log('info', 'Plugin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Performance Monitor Plugin:', error);
    }
  },

  // ... (other methods like cleanup, handleMessage, etc.)
};

export default performanceMonitorPlugin;
```

### Step 5: Customization

After generation, customize the plugin:

1. **Update manifest.json** to add new settings or permissions.
2. **Modify index.js** to implement your logic in `initialize`, `handleMessage`, etc.
3. **Add React components** if you need a custom UI (create `component.jsx` and import it).

### Step 6: Implementation Example

Here's how you might customize `index.js` for performance monitoring:

```javascript
// In index.js

// Add a method to collect metrics
collectMetrics: async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      loadTime: window.performance.timing.loadEventEnd - window.performance.timing.navigationStart,
      // ... other metrics
    })
  });
  
  return results[0]?.result;
},

// Update handleMessage to respond to requests
handleMessage: async (message) => {
  if (message.action === 'GET_METRICS') {
    const metrics = await performanceMonitorPlugin.collectMetrics();
    return { success: true, data: metrics };
  }
  // ...
}
```

### Step 7: Testing

1. **Build the extension**:
   ```bash
   npm run build
   ```

2. **Load in Chrome**:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select `dist` folder

3. **Test the plugin**:
   - Open extension options
   - Go to Plugins page
   - Enable "Performance Monitor"
   - Test functionality

### Step 8: Integration

Add background script handlers if needed in `src/background/background.js` if you need global coordination, but usually plugin logic should stay within the plugin's `index.js`.

## Tips for Plugin Development

1. **Start Simple**: Begin with basic functionality and iterate
2. **Follow Patterns**: Look at existing plugins for reference
3. **Use JSDoc**: Document your code for better maintainability
4. **Test Thoroughly**: Test with different websites and scenarios
5. **Document Well**: Update the generated README with your specific details

## Next Steps

- See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed development guidelines
- Review existing plugins in `src/plugins/` for examples
- Check the main README for integration patterns
- Join the team Slack for questions and support

## 🧭 Navigation

| [< Previous: Architecture](./architecture.md) | [Next: Development Guide >](../guides/PLUGIN_DEVELOPMENT_V2.md) |
| :--- | :--- |
 