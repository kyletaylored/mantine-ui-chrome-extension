# Plugin Generator Example

This document shows an example of using the plugin scaffold generator to create a new plugin.

## Example: Creating a "Performance Monitor" Plugin

Let's create a plugin that monitors page performance metrics.

### Step 1: Run the Generator

```bash
npm run generate-plugin performance-monitor
```

### Step 2: Answer the Wizard Questions

```
🔌 Datadog Plugin Scaffold Generator

Plugin ID (kebab-case, e.g., "my-awesome-plugin"): performance-monitor
→ Collecting plugin information...
Plugin Name (e.g., "My Awesome Plugin"): Performance Monitor
Plugin Description: Monitor and display page performance metrics for sales demonstrations
Author (default: "Datadog Sales Engineering Team"): Datadog Sales Engineering Team
Category (monitoring/injection/utility/core): monitoring
Icon (emoji, e.g., "🔧"): ⚡
Is this a core plugin that cannot be disabled? (y/N): n
Chrome permissions (comma-separated, e.g., "activeTab,storage"): activeTab,tabs
→ Generating plugin files...
✓ Created plugin directory: src/plugins/performance-monitor
✓ Generated manifest.json
✓ Generated types.ts
✓ Generated config.ts
✓ Generated component.tsx
✓ Generated index.ts
✓ Generated README.md

🎉 Plugin "Performance Monitor" generated successfully!

Next steps:
1. cd src/plugins/performance-monitor
2. Review and customize the generated files
3. Implement your plugin logic in component.tsx and config.ts
4. Add message handlers to the background script if needed
5. Test your plugin with: npm run build

See CONTRIBUTING.md for detailed development guidelines.
```

### Step 3: Generated File Structure

The generator creates this structure:

```
src/plugins/performance-monitor/
├── manifest.json     # Plugin metadata
├── types.ts          # TypeScript interfaces
├── config.ts         # Configuration and utilities
├── component.tsx     # React UI component
├── index.ts          # Plugin entry point
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
  "icon": "⚡",
  "isCore": false,
  "permissions": ["activeTab", "tabs"],
  "settings": {
    "enabled": {
      "type": "boolean",
      "label": "Enable Plugin",
      "description": "Enable or disable the Performance Monitor plugin",
      "default": true
    },
    "refreshInterval": {
      "type": "number",
      "label": "Refresh Interval (seconds)",
      "description": "How often to refresh data",
      "default": 30,
      "min": 5,
      "max": 300
    }
  }
}
```

#### types.ts
```typescript
export interface PerformanceMonitorSettings {
  enabled: boolean;
  refreshInterval: number;
}

export interface PerformanceMonitorData {
  id: string;
  timestamp: number;
  status: 'success' | 'error' | 'pending';
  message?: string;
  data?: any;
}

export interface PerformanceMonitorResult {
  success: boolean;
  data?: PerformanceMonitorData;
  error?: string;
}

export interface PerformanceMonitorConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
}
```

#### config.ts (excerpt)
```typescript
export const PERFORMANCE_MONITOR_PLUGIN_CONFIG: PerformanceMonitorConfig = {
  id: 'performance-monitor',
  name: 'Performance Monitor',
  description: 'Monitor and display page performance metrics for sales demonstrations',
  version: '1.0.0',
  permissions: ["activeTab", "tabs"],
};

export const DEFAULT_PERFORMANCE_MONITOR_SETTINGS: PerformanceMonitorSettings = {
  enabled: true,
  refreshInterval: 30,
};
```

### Step 5: Customization

After generation, customize the plugin:

1. **Update types.ts** with specific performance metrics interfaces
2. **Modify config.ts** to add performance data collection utilities  
3. **Enhance component.tsx** with charts and performance visualization
4. **Update index.ts** message handlers for performance data collection

### Step 6: Implementation Example

Here's how you might customize the component for performance monitoring:

```typescript
// In component.tsx - add performance-specific functionality
const [performanceData, setPerformanceData] = useState({
  loadTime: 0,
  domContentLoaded: 0,
  firstContentfulPaint: 0,
  largestContentfulPaint: 0
});

const collectPerformanceMetrics = async () => {
  const response = await chrome.runtime.sendMessage({
    type: 'PERFORMANCE_MONITOR_COLLECT_METRICS'
  });
  
  if (response.success) {
    setPerformanceData(response.data);
  }
};

// Add charts, metrics display, etc.
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

Add background script handlers if needed:

```typescript
// In background/background.ts
case 'PERFORMANCE_MONITOR_COLLECT_METRICS':
  const metrics = await collectPagePerformanceMetrics();
  sendResponse({ success: true, data: metrics });
  break;
```

## Tips for Plugin Development

1. **Start Simple**: Begin with basic functionality and iterate
2. **Follow Patterns**: Look at existing plugins for reference
3. **Use TypeScript**: Take advantage of the generated type definitions
4. **Test Thoroughly**: Test with different websites and scenarios
5. **Document Well**: Update the generated README with your specific details

## Next Steps

- See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed development guidelines
- Review existing plugins in `src/plugins/` for examples
- Check the main README for integration patterns
- Join the team Slack for questions and support

## Common Customizations

### Adding New Settings
```typescript
// In manifest.json settings
"metricTypes": {
  "type": "select", 
  "label": "Metric Types",
  "options": [
    {"value": "all", "label": "All Metrics"},
    {"value": "core", "label": "Core Web Vitals"},
    {"value": "custom", "label": "Custom Metrics"}
  ],
  "default": "all"
}
```

### Adding Charts/Visualization
```typescript
// Install chart library
npm install recharts @types/recharts

// Use in component
import { LineChart, Line, XAxis, YAxis } from 'recharts';

<LineChart data={performanceData}>
  <Line type="monotone" dataKey="loadTime" stroke="#8884d8" />
</LineChart>
```

### Adding External API Integration
```typescript
// In config.ts
export const fetchExternalData = async (apiKey: string) => {
  const response = await fetch('https://api.example.com/data', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  return response.json();
};
```

This example demonstrates the power of the plugin generator - it creates a solid foundation that you can build upon for your specific use case. 