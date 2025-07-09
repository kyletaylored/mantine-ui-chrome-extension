# Contributing to Datadog Sales Engineering Toolkit

Welcome to the Datadog Sales Engineering Toolkit! This guide will help you understand how to contribute to the project, especially how to create new plugins.

## Table of Contents

- [Getting Started](#getting-started)
- [Plugin Development](#plugin-development)
- [Architecture Overview](#architecture-overview)
- [Plugin Scaffold Generator](#plugin-scaffold-generator)
- [Plugin File Structure](#plugin-file-structure)
- [Integration Points](#integration-points)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submission Guidelines](#submission-guidelines)

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome browser
- TypeScript knowledge
- React familiarity

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mantine-ui-chrome-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Plugin Development

### Plugin Types

The extension supports two types of plugins:

#### Core Plugins
- **Cannot be disabled** by users
- **Always enabled** and loaded on startup
- Provide essential functionality (e.g., RUM extraction, APM tracing)
- Marked with `isCore: true`

#### Optional Plugins
- **Can be enabled/disabled** by users
- Provide additional features (e.g., RUM injection, event alerts)
- Marked with `isCore: false`

### Plugin Categories

- **monitoring**: Data collection and monitoring plugins
- **injection**: Script injection plugins for demos
- **utility**: General utility plugins
- **core**: Core system plugins (usually also `isCore: true`)

## Plugin Scaffold Generator

The easiest way to create a new plugin is using our scaffold generator:

### Quick Start

```bash
# Run the interactive wizard
node scripts/generate-plugin.js

# Or specify plugin ID directly
node scripts/generate-plugin.js my-new-plugin
```

### Wizard Steps

1. **Plugin ID**: Kebab-case identifier (e.g., `event-tracker`)
2. **Plugin Name**: Human-readable name (e.g., "Event Tracker")
3. **Description**: Brief description of functionality
4. **Author**: Developer/team name
5. **Category**: Plugin category (`monitoring`, `injection`, `utility`, `core`)
6. **Icon**: Emoji icon for UI display
7. **Core Plugin**: Whether it's required (cannot be disabled)
8. **Permissions**: Chrome extension permissions needed

### Generated Files

The generator creates a complete plugin structure:

```
src/plugins/my-plugin/
├── manifest.json    # Plugin metadata and settings schema
├── types.ts         # TypeScript interfaces
├── config.ts        # Configuration and utilities
├── component.tsx    # React UI component
├── index.ts         # Plugin entry point
└── README.md        # Plugin documentation
```

## Plugin File Structure

### manifest.json
Defines plugin metadata and settings schema:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Plugin description",
  "version": "1.0.0",
  "author": "Datadog Sales Engineering Team",
  "category": "monitoring",
  "icon": "🔧",
  "isCore": false,
  "permissions": ["activeTab"],
  "settings": {
    "enabled": {
      "type": "boolean",
      "label": "Enable Plugin",
      "default": true
    }
  }
}
```

### types.ts
TypeScript interfaces for type safety:

```typescript
export interface MyPluginSettings {
  enabled: boolean;
  refreshInterval?: number;
}

export interface MyPluginData {
  id: string;
  timestamp: number;
  status: 'success' | 'error' | 'pending';
}
```

### config.ts
Configuration constants and utility functions:

```typescript
export const MY_PLUGIN_CONFIG = {
  id: 'my-plugin',
  name: 'My Plugin',
  // ...
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  refreshInterval: 30
};

// Utility functions
export const validateSettings = (settings: any) => { /* */ };
export const formatData = (data: any) => { /* */ };
```

### component.tsx
React component for plugin UI:

```typescript
export const MyPluginComponent: React.FC<Props> = ({ context }) => {
  // State management
  const [data, setData] = useState(null);
  
  // Settings from context
  const settings = getPluginSettings(context);
  
  // UI rendering with Mantine components
  return (
    <Tabs>
      <Tabs.Panel value="main">
        {/* Main plugin interface */}
      </Tabs.Panel>
      <Tabs.Panel value="settings">
        {/* Settings interface */}
      </Tabs.Panel>
    </Tabs>
  );
};
```

### index.ts
Plugin entry point and lifecycle:

```typescript
export const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  enabled: false,
  isCore: false,
  component: MyPluginComponent,
  // ...
};

export const registerPlugin = () => myPlugin;
export const initializePlugin = async (context) => { /* */ };
export const cleanupPlugin = async () => { /* */ };
export const handlePluginMessage = async (message) => { /* */ };
```

## Integration Points

### Storage System

Plugins integrate with the secure storage system:

```typescript
// Get plugin settings
const currentPlugin = context.storage.plugins.find(p => p.id === 'my-plugin');
const settings = currentPlugin?.settings || DEFAULT_SETTINGS;

// Update settings
const updatedPlugins = context.storage.plugins.map(plugin =>
  plugin.id === 'my-plugin' 
    ? { ...plugin, settings: newSettings, updatedAt: Date.now() }
    : plugin
);
await context.updateStorage({ plugins: updatedPlugins });
```

### Background Script Communication

Plugins communicate with the background script via messages:

```typescript
// In component
const response = await chrome.runtime.sendMessage({
  type: 'MY_PLUGIN_ACTION',
  payload: { data: 'example' }
});

// In background script (add to handleMessage)
case 'MY_PLUGIN_ACTION':
  const result = await handleMyPluginAction(request.payload);
  sendResponse({ success: true, data: result });
  break;
```

### Content Script Integration

For plugins that need page interaction:

```typescript
// Send message to content script
const response = await chrome.tabs.sendMessage(tabId, {
  type: 'MY_PLUGIN_INJECT',
  data: injectionData
});

// Handle in content script
case 'MY_PLUGIN_INJECT':
  performInjection(request.data);
  sendResponse({ success: true });
  break;
```

### Plugin Loading System

Core plugins are auto-loaded; optional plugins are loaded when enabled:

```typescript
// Core plugin initialization (background.ts)
await storage.addPlugin(myPlugin);
await storage.ensureCorePluginsEnabled();

// Optional plugin loading
if (plugin.enabled && !plugin.isCore) {
  await initializePlugin(context);
}
```

## Testing

### Development Testing

1. **Build and Load**
   ```bash
   npm run build
   # Load unpacked extension in Chrome
   ```

2. **Plugin Interface Testing**
   - Open extension options page
   - Navigate to plugins section
   - Test enable/disable functionality (for optional plugins)
   - Test settings updates

3. **Functional Testing**
   - Test plugin's main functionality
   - Verify message handling
   - Check error handling

4. **Integration Testing**
   - Test with other plugins enabled
   - Verify storage operations
   - Test permission requirements

### Debugging

1. **Console Logging**
   ```typescript
   console.log('Plugin initialized:', pluginData);
   console.error('Plugin error:', error);
   ```

2. **Chrome DevTools**
   - Inspect popup/options pages
   - Check background script console
   - Monitor network requests

3. **Extension Debugging**
   - Use `chrome://extensions/` for reload/inspect
   - Check manifest.json validation
   - Verify permissions

### Testing Checklist

- [ ] Plugin loads without errors
- [ ] Settings save and persist correctly
- [ ] Core plugins cannot be disabled
- [ ] Optional plugins can be toggled
- [ ] UI is responsive and accessible
- [ ] Permissions work correctly
- [ ] Message handling functions properly
- [ ] Error handling is robust

## Code Style

### TypeScript

- Use strict TypeScript settings
- Define interfaces for all data structures
- Use proper return types for functions
- Avoid `any` type when possible

### React

- Use functional components with hooks
- Follow Mantine UI component patterns
- Implement proper loading states
- Handle errors gracefully

### Naming Conventions

- **Files**: kebab-case (`my-plugin.ts`)
- **Directories**: kebab-case (`my-plugin/`)
- **Interfaces**: PascalCase (`MyPluginSettings`)
- **Functions**: camelCase (`validateSettings`)
- **Constants**: UPPER_SNAKE_CASE (`MY_PLUGIN_CONFIG`)

### File Organization

```
src/plugins/my-plugin/
├── manifest.json     # Plugin metadata
├── types.ts          # TypeScript definitions
├── config.ts         # Configuration and utilities  
├── component.tsx     # React component
├── index.ts          # Plugin entry point
├── utils/            # Additional utilities (if needed)
├── components/       # Sub-components (if needed)
└── README.md         # Plugin documentation
```

## Submission Guidelines

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-new-plugin
   ```

2. **Generate Plugin Scaffold**
   ```bash
   node scripts/generate-plugin.js my-plugin
   ```

3. **Implement Functionality**
   - Fill in plugin logic
   - Add proper error handling
   - Write comprehensive tests

4. **Update Documentation**
   - Update plugin README.md
   - Add to main README if significant
   - Update CONTRIBUTING.md if needed

5. **Test Thoroughly**
   - Test all functionality
   - Verify with different configurations
   - Check edge cases

6. **Submit Pull Request**
   - Use descriptive title
   - Include detailed description
   - Link related issues
   - Add screenshots/demos if applicable

### Code Review Criteria

- **Functionality**: Does it work as intended?
- **Code Quality**: Is it well-structured and readable?
- **Type Safety**: Are TypeScript types properly defined?
- **Error Handling**: Are errors handled gracefully?
- **Performance**: Is it efficient and responsive?
- **Documentation**: Is it well-documented?
- **Testing**: Is it thoroughly tested?

### Plugin Requirements

#### Must Have
- Complete TypeScript type definitions
- Proper error handling and validation
- Responsive UI using Mantine components
- Comprehensive documentation
- Working settings interface

#### Should Have
- Loading states for async operations
- Proper accessibility attributes
- Consistent with existing plugins
- Performance optimizations
- Comprehensive error messages

#### Nice to Have
- Advanced configuration options
- Export/import functionality
- Integration with external APIs
- Advanced UI features

## Advanced Topics

### Custom Message Types

Add new message types to background script:

```typescript
// In background/background.ts
case 'MY_PLUGIN_CUSTOM_ACTION':
  const result = await handleCustomAction(request.payload);
  sendResponse({ success: true, data: result });
  break;
```

### Plugin Dependencies

If your plugin depends on others:

```typescript
// Check dependencies in initializePlugin
const dependencies = ['rum-extraction', 'apm-tracing'];
const missingDeps = dependencies.filter(dep => 
  !context.storage.plugins.find(p => p.id === dep && p.enabled)
);

if (missingDeps.length > 0) {
  throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
}
```

### External API Integration

For plugins that integrate with external APIs:

```typescript
// Add API configuration to settings
const apiSettings = {
  apiUrl: {
    type: "string",
    label: "API URL",
    required: true
  },
  apiKey: {
    type: "string", 
    label: "API Key",
    required: true,
    sensitive: true
  }
};
```

### Plugin Marketplace

Future considerations for plugin marketplace:

- Plugin signing and verification
- Automatic updates
- Dependency management
- Community submissions
- Plugin ratings and reviews

## Getting Help

### Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Mantine UI Documentation](https://mantine.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

### Support Channels

- Create GitHub issues for bugs
- Start discussions for feature requests
- Join team Slack for quick questions
- Review existing plugins for examples

### Common Issues

**Plugin not appearing in options**
- Check plugin registration in index.ts
- Verify manifest.json format
- Ensure proper build process

**Settings not persisting**
- Check storage permissions
- Verify settings update logic
- Check for async/await issues

**UI not rendering correctly**
- Check Mantine component usage
- Verify TypeScript types
- Check browser console for errors

## Examples

See existing plugins for reference:

- **RUM Extraction** (`src/plugins/rum-extraction/`): Core monitoring plugin
- **APM Tracing** (`src/plugins/apm-tracing/`): Core data collection plugin  
- **RUM Injection** (`src/plugins/rum-injection/`): Optional injection plugin
- **Event Alerts** (`src/plugins/event-alerts/`): Optional monitoring plugin

These examples demonstrate different patterns and use cases for plugin development.

---

Thank you for contributing to the Datadog Sales Engineering Toolkit! Your plugins help empower sales engineers to deliver better demonstrations and close more deals. 🚀 