---
title: Contributing Overview
parent: Contributing
nav_order: 1
---
# Contributing to Datadog Sales Engineering Toolkit

> 📖 **New Documentation Structure**: We've reorganized our documentation! For comprehensive guides, please visit [docs/index.md](./docs/index.md) for our new developer documentation hub.

Welcome to the Datadog Sales Engineering Toolkit! This guide provides essential information for contributing to the project.

## 🚀 Quick Start

### New Contributors
1. **[Quick Start Guide](./docs/guides/QUICK_START.md)** - Get up and running in 5 minutes
2. **[Hello World Plugin](./docs/guides/HELLO_WORLD.md)** - Build your first plugin step-by-step
3. **[System Overview](./docs/architecture/SYSTEM_OVERVIEW.md)** - Understand the architecture

### Plugin Development
1. **[Plugin System](./docs/plugins/PLUGIN_SYSTEM.md)** - Plugin architecture and patterns
2. **[Plugin Generator](./docs/plugins/PLUGIN_GENERATOR.md)** - Automated scaffolding
3. **[Example Plugins](./docs/plugins/EXAMPLES.md)** - Real-world examples

## 📋 Prerequisites

- Node.js (v16+)
- Chrome browser
- TypeScript/React knowledge
- Git familiarity

## 🔧 Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd mantine-ui-chrome-extension
npm install

# Build and load extension
npm run build
# Load dist/ folder in chrome://extensions/
```

## 🏗️ Architecture Overview

The extension is built with modern abstractions:

### Storage System
- **Built on**: `@extend-chrome/storage`
- **Features**: Type-safe, encrypted, reactive storage
- **Documentation**: [Storage System](./docs/core-apis/storage.md)

### Messaging System
- **Built on**: Centralized message handler
- **Features**: Type-safe inter-context communication
- **Documentation**: [Messaging System](./docs/core-apis/messages.md)

### Notification System
- **Built on**: `@extend-chrome/notify`
- **Features**: Automatic event handling, persistent metadata
- **Documentation**: [Notification System](./docs/core-apis/notifications.md)

## 🧩 Plugin Development

### Generate New Plugin
```bash
# Interactive generator
node scripts/generate-plugin.js

# Creates complete plugin structure:
# src/plugins/my-plugin/
# ├── manifest.json    # Plugin metadata
# ├── types.ts         # TypeScript interfaces
# ├── config.ts        # Configuration
# ├── component.tsx    # React UI component
# └── index.ts         # Plugin entry point
```

### Core Systems Integration

#### Storage
```typescript
import { SecureExtensionStorage } from '@/shared/storage';

// Plugin-specific storage
const pluginStorage = SecureExtensionStorage.createPluginBucket<MyData>('my-plugin');
await pluginStorage.set(() => ({ myData: 'value' }));
```

#### Messaging
```typescript
// Send message to background script
const response = await chrome.runtime.sendMessage({
  type: 'MY_PLUGIN_ACTION',
  payload: { data: 'example' }
});
```

#### Notifications
```typescript
import { showNotification } from '@/shared/notifications';

// Show notification
await showNotification('Title', 'Message');
```

## 🎨 UI Development

### Use Mantine Components
```typescript
import { Stack, Card, Button } from '@mantine/core';

export const MyComponent = () => (
  <Stack spacing="md">
    <Card p="md">
      <Button>Action</Button>
    </Card>
  </Stack>
);
```

### Design Principles
- **Consistent**: Follow existing UI patterns
- **Responsive**: Test on different screen sizes
- **Accessible**: Use proper ARIA attributes
- **Modern**: Use latest Mantine components

## 🧪 Testing

### Manual Testing
```bash
# Build and load extension
npm run build
# Load in Chrome (chrome://extensions/)
# Test all functionality
```

### Test Checklist
- [ ] Plugin loads without errors
- [ ] Settings save and persist
- [ ] UI is responsive
- [ ] TypeScript compiles without errors

## 📝 Code Standards

### TypeScript
- Use strict TypeScript settings
- Define interfaces for all data structures
- Avoid `any` type - use proper typing
- Document complex functions

### React
- Use functional components with hooks
- Follow established component patterns
- Use Mantine UI components
- Implement proper error handling

## 🔄 Submission Process

### 1. Create Feature Branch
```bash
git checkout -b feature/my-plugin-name
```

### 2. Follow Development Flow
1. **Generate**: Use plugin generator for scaffolding
2. **Implement**: Add your plugin logic
3. **Test**: Thoroughly test functionality
4. **Document**: Update README and inline docs

### 3. Submit Pull Request
- **Title**: Descriptive title (e.g., "Add Event Tracker plugin")
- **Description**: Explain what the plugin does
- **Testing**: Describe how you tested it
- **Screenshots**: Include UI screenshots if applicable

## 📖 Documentation

### Comprehensive Guides
- **[Developer Documentation Hub](./docs/index.md)** - Complete documentation index
- **[Storage System](./docs/core-apis/storage.md)** - Data persistence guide
- **[Messaging System](./docs/core-apis/messages.md)** - Inter-context communication
- **[Notification System](./docs/core-apis/notifications.md)** - User notifications

### Architecture
- **[System Overview](./docs/architecture/SYSTEM_OVERVIEW.md)** - High-level architecture
- **[Plugin System](./docs/plugins/PLUGIN_SYSTEM.md)** - Plugin architecture
- **[UI Guidelines](./docs/ui/UI_GUIDELINES.md)** - UI patterns and design

### Getting Started
- **[Quick Start](./docs/guides/QUICK_START.md)** - 5-minute setup
- **[Hello World Plugin](./docs/guides/HELLO_WORLD.md)** - Step-by-step tutorial
- **[Development Setup](./docs/guides/DEVELOPMENT_SETUP.md)** - Environment setup

## 🆘 Getting Help

### Resources
- **[Documentation Hub](./docs/README.md)** - Complete documentation
- **[Example Plugins](./docs/plugins/EXAMPLES.md)** - Real plugin examples
- **[Troubleshooting](./docs/guides/QUICK_START.md#troubleshooting)** - Common issues

### Support Channels
- **Issues**: GitHub issues for bugs and feature requests
- **Discussions**: GitHub discussions for questions
- **Examples**: Check existing plugins in `src/plugins/`

## 🎯 Plugin Categories

### Core Plugins (`isCore: true`)
- **Always Enabled**: Cannot be disabled by users
- **Essential functionality** (e.g., RUM extraction, APM tracing)
- **Auto-loaded** on extension startup

### Optional Plugins (`isCore: false`)
- **User-toggleable** functionality
- **Enhanced features** (e.g., event alerts, RUM injection)
- **Loaded when enabled** by user

## 🏆 Best Practices

### Plugin Development
1. **Use Generator**: Always start with `node scripts/generate-plugin.js`
2. **Follow Patterns**: Study existing plugins for patterns
3. **Type Safety**: Use proper TypeScript interfaces
4. **Test Thoroughly**: Test across different scenarios
5. **Document Well**: Update README and inline docs

### Code Quality
- **TypeScript**: Strict typing, no `any` types
- **React**: Functional components, hooks, error boundaries
- **UI**: Mantine components, consistent patterns
- **Testing**: Manual testing, error checking

---

## 🚀 Ready to Contribute?

1. **Start Simple**: Try the [Hello World Plugin](./docs/guides/HELLO_WORLD.md) tutorial
2. **Explore Examples**: Check [existing plugins](./docs/plugins/EXAMPLES.md)
3. **Ask Questions**: Use GitHub discussions for help
4. **Build Something**: Create a plugin that solves a real problem!

For detailed documentation and step-by-step guides, visit **[docs/index.md](./docs/index.md)** 📚

Thank you for contributing to the Datadog Sales Engineering Toolkit! 🙏

## 🧭 Navigation

| [< Back to Index](./docs/index.md) | [Next: UI Guidelines >](./docs/ui/UI_GUIDELINES.md) |
| :--- | :--- | 