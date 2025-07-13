# Contributing Guidelines

Welcome to the Datadog Sales Engineering Toolkit! This guide covers the essentials for contributing to the project.

## 🚀 Quick Start

### New Contributors
1. **[Quick Start Guide](../guides/QUICK_START.md)** - Get up and running in 5 minutes
2. **[Hello World Plugin](../guides/HELLO_WORLD.md)** - Build your first plugin
3. **[System Overview](../architecture/SYSTEM_OVERVIEW.md)** - Understand the architecture

### Experienced Contributors
1. **[Plugin System](../plugins/PLUGIN_SYSTEM.md)** - Advanced plugin patterns
2. **[Code Style](./CODE_STYLE.md)** - Coding standards
3. **[Testing Guide](../testing/TESTING_GUIDE.md)** - Test your changes

## 📋 Before You Start

### Prerequisites
- Node.js (v16+)
- Chrome browser for testing
- TypeScript/React knowledge
- Git familiarity

### Development Setup
```bash
# Clone and setup
git clone <repository-url>
cd mantine-ui-chrome-extension
npm install

# Build and test
npm run build
npm run test
```

## 🧩 Plugin Development

### Create New Plugin
```bash
# Use our interactive generator
node scripts/generate-plugin.js

# Or specify plugin ID
node scripts/generate-plugin.js my-plugin
```

### Plugin Structure
```
src/plugins/my-plugin/
├── manifest.json    # Plugin metadata and settings schema
├── types.ts         # TypeScript interfaces
├── config.ts        # Configuration and utilities
├── component.tsx    # React UI component
├── index.ts         # Plugin entry point
└── README.md        # Plugin documentation
```

### Core Systems Integration

#### Storage System
```typescript
import { SecureExtensionStorage } from '@/shared/storage';

// Plugin-specific storage
const pluginStorage = SecureExtensionStorage.createPluginBucket<MyData>('my-plugin');
await pluginStorage.set(() => ({ myData: 'value' }));
const data = await pluginStorage.get();
```

#### Messaging System
```typescript
// Background script handler
case 'MY_PLUGIN_ACTION':
  const result = await handleMyPluginAction(request.payload);
  sendResponse({ success: true, data: result });
  break;

// Plugin component
const response = await chrome.runtime.sendMessage({
  type: 'MY_PLUGIN_ACTION',
  payload: { data: 'example' }
});
```

#### Notification System
```typescript
import { showNotification, createNotification } from '@/shared/notifications';

// Simple notification
await showNotification('Title', 'Message');

// Advanced notification with actions
await createNotification({
  title: 'Event Alert',
  message: 'Critical issue detected',
  buttons: [{ title: 'View' }],
  data: { eventId: 'evt_123' }
});
```

## 🎨 UI Development

### Use Mantine Components
```typescript
import { Stack, Card, Button, TextInput } from '@mantine/core';

// Follow established patterns
export const MyComponent = () => (
  <Stack spacing="md">
    <Card p="md">
      <TextInput label="Input" />
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

# Test your changes
# 1. Load in Chrome (chrome://extensions/)
# 2. Test all functionality
# 3. Check browser console for errors
```

### Test Checklist
- [ ] Plugin loads without errors
- [ ] Settings save and persist
- [ ] UI is responsive
- [ ] Notifications work correctly
- [ ] Background script integration
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
- Implement proper error boundaries
- Use Mantine UI components

### File Organization
```
src/plugins/my-plugin/
├── types.ts         # All TypeScript interfaces
├── config.ts        # Constants and utilities
├── component.tsx    # Main React component
├── index.ts         # Plugin entry point
└── utils/           # Additional utilities (if needed)
```

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

### 3. Pre-submission Checklist
- [ ] Code follows [style guidelines](./CODE_STYLE.md)
- [ ] All TypeScript errors resolved
- [ ] Plugin tested manually
- [ ] Documentation updated
- [ ] No console errors

### 4. Submit Pull Request
- **Title**: Descriptive title (e.g., "Add Event Tracker plugin")
- **Description**: Explain what the plugin does
- **Testing**: Describe how you tested it
- **Screenshots**: Include UI screenshots if applicable

## 📖 Documentation

### Required Documentation
- **Plugin README**: Describe functionality and usage
- **Inline Comments**: Document complex logic
- **API Changes**: Update relevant docs if you modify shared systems

### Documentation Standards
- Use clear, concise language
- Include code examples
- Keep documentation up to date
- Link to related docs

## 🆘 Getting Help

### Resources
- **[System Overview](../architecture/SYSTEM_OVERVIEW.md)** - Architecture guide
- **[Plugin Examples](../plugins/EXAMPLES.md)** - Real plugin examples
- **[Storage Documentation](../STORAGE.md)** - Data persistence
- **[Messaging Documentation](../MESSAGES.md)** - Inter-context communication

### Support Channels
- **Issues**: GitHub issues for bugs
- **Discussions**: GitHub discussions for questions
- **Examples**: Check existing plugins in `src/plugins/`

### Common Issues
- **TypeScript Errors**: Check interfaces and imports
- **Storage Issues**: Verify async/await usage
- **UI Problems**: Check Mantine component usage
- **Plugin Loading**: Ensure proper registration

## 🎯 Plugin Categories

### Core Plugins (`isCore: true`)
- **Cannot be disabled** by users
- **Essential functionality** (e.g., RUM extraction, APM tracing)
- **Always loaded** on extension startup

### Optional Plugins (`isCore: false`)
- **User-toggleable** functionality
- **Enhanced features** (e.g., event alerts, RUM injection)
- **Loaded when enabled** by user

### Plugin Categories
- **`monitoring`**: Data collection and monitoring
- **`injection`**: Script injection for demos
- **`utility`**: General utility functions
- **`core`**: Core system functionality

## 🔍 Code Review

### What We Look For
- **Functionality**: Does it work as intended?
- **Code Quality**: Clean, readable, maintainable code
- **Type Safety**: Proper TypeScript usage
- **Performance**: Efficient and responsive
- **Security**: Safe handling of sensitive data
- **Documentation**: Well-documented code

### Review Process
1. **Automated Checks**: TypeScript compilation, linting
2. **Manual Review**: Code quality, functionality
3. **Testing**: Reviewer tests the plugin
4. **Feedback**: Constructive feedback and suggestions
5. **Approval**: Final approval and merge

---

## 🚀 Ready to Contribute?

1. **Start Simple**: Try the [Hello World Plugin](../guides/HELLO_WORLD.md) tutorial
2. **Study Examples**: Check existing plugins for patterns
3. **Ask Questions**: Use GitHub discussions for help
4. **Have Fun**: Build something awesome! 🎉

Thank you for contributing to the Datadog Sales Engineering Toolkit! 🙏 