---
title: Quick Start
parent: Getting Started
nav_order: 1
---

# Quick Start Guide

Get the Datadog Sales Engineering Toolkit up and running in under 5 minutes! ⚡

## 🚀 Setup (2 minutes)

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd mantine-ui-chrome-extension

# Install dependencies
npm install
```

### 2. Build Extension
```bash
# Build for development
npm run build

# Or build for production
npm run build:prod
```

### 3. Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist/` folder

## 🎯 First Use (1 minute)

### 1. Configure Credentials
1. Click the extension icon in Chrome toolbar
2. Go to "Credentials" tab
3. Enter your Datadog API credentials:
   - **API Key**: Your Datadog API key
   - **App Key**: Your Datadog application key
   - **Site**: Your Datadog site (us1, us3, us5, eu1, etc.)
4. Click "Save Credentials"

### 2. Enable Plugins
1. Navigate to "Plugins" tab
2. Enable desired plugins:
   - **RUM Extraction** (Core) - Always enabled
   - **APM Tracing** (Core) - Always enabled
   - **Event Alerts** - Toggle on/off
   - **RUM Injection** - Toggle on/off

### 3. Explore Features
- **Dashboard**: Overview of extension status
- **Settings**: Configure global preferences
- **Links**: Quick access to Datadog resources

## 🔧 Development Mode (2 minutes)

### Watch Mode
```bash
# Watch for changes and rebuild automatically
npm run watch
```

### Hot Reload
1. Make code changes
2. Click "Reload" on extension card in `chrome://extensions/`
3. Changes take effect immediately

### Debug Console
- **Popup**: Right-click extension icon → "Inspect popup"
- **Options**: Right-click options page → "Inspect"
- **Background**: Click "background page" in extension details

## 📦 Key Concepts

### Storage System
```typescript
import { SecureExtensionStorage } from '@/shared/storage';

// Type-safe, encrypted storage
const storage = SecureExtensionStorage.getInstance();
await storage.setCredentials({ apiKey: 'key', appKey: 'app' });
```

### Messaging System
```typescript
// Send message to background script
const response = await chrome.runtime.sendMessage({
  type: 'PLUGIN_ACTION',
  payload: { data: 'example' }
});
```

### Notification System
```typescript
import { showNotification } from '@/shared/notifications';

// Show user notification
await showNotification('Title', 'Message');
```

## 🧩 Create Your First Plugin

### Generate Scaffold
```bash
# Interactive generator
node scripts/generate-plugin.js

# Or specify plugin ID
node scripts/generate-plugin.js my-plugin
```

### Plugin Structure
```
src/plugins/my-plugin/
├── manifest.json    # Plugin metadata
├── types.ts         # TypeScript interfaces
├── config.ts        # Configuration
├── component.tsx    # React UI component
├── index.ts         # Plugin entry point
└── README.md        # Documentation
```

## 🔗 Common Tasks

### Add New Permission
```json
// src/manifest.json
{
  "permissions": [
    "activeTab",
    "storage",
    "notifications",
    "your-new-permission"
  ]
}
```

### Update Plugin Settings
```typescript
// In plugin component
const updateSettings = async (newSettings) => {
  const updatedPlugins = context.storage.plugins.map(plugin =>
    plugin.id === 'my-plugin' 
      ? { ...plugin, settings: newSettings }
      : plugin
  );
  await context.updateStorage({ plugins: updatedPlugins });
};
```

### Add Background Script Handler
```typescript
// src/background/background.ts
case 'MY_PLUGIN_ACTION':
  const result = await handleMyPluginAction(request.payload);
  sendResponse({ success: true, data: result });
  break;
```

## 🚨 Troubleshooting

### Common Issues

**Extension won't load**
- Check console for syntax errors
- Verify `manifest.json` format
- Ensure `dist/` folder exists

**Storage not persisting**
- Check Chrome permissions
- Verify async/await usage
- Check browser console for errors

**Plugin not appearing**
- Ensure plugin is registered in index.ts
- Check plugin manifest.json
- Verify build completed successfully

### Debug Commands
```bash
# Check build errors
npm run build 2>&1 | grep -i error

# Clean build
rm -rf dist/ && npm run build

# Check TypeScript errors
npx tsc --noEmit
```

## 🎓 Next Steps

### Learning Path
1. **[Hello World Plugin](./HELLO_WORLD.md)** - Build your first plugin
2. **[System Overview](../architecture/SYSTEM_OVERVIEW.md)** - Understand the architecture
3. **[Plugin Development](../plugins/PLUGIN_SYSTEM.md)** - Advanced plugin patterns

### Resources
- **[Storage Documentation](../STORAGE.md)** - Data persistence
- **[Messaging Documentation](../MESSAGES.md)** - Inter-context communication
- **[UI Guidelines](../ui/UI_GUIDELINES.md)** - Mantine UI patterns

### Support
- **Issues**: GitHub issues for bugs
- **Questions**: GitHub discussions
- **Examples**: Check existing plugins in `src/plugins/`

---

**Ready to code?** Try the [Hello World Plugin tutorial](./HELLO_WORLD.md) next! 🚀 