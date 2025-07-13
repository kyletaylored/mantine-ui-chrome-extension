# Hello World Plugin Tutorial

Welcome! This step-by-step tutorial will guide you through creating your first plugin for the Datadog Sales Engineering Toolkit. You'll learn the fundamentals of plugin development and how to use our modern abstractions for storage, messaging, and notifications.

## 🎯 What You'll Build

A simple "Hello World" plugin that:
- ✅ Displays a greeting message
- ✅ Stores user preferences using our storage system
- ✅ Sends messages between components
- ✅ Shows notifications using our notification system
- ✅ Demonstrates core plugin patterns

## 📋 Prerequisites

- Node.js (v16+) installed
- Chrome browser
- Basic TypeScript/React knowledge
- Extension development environment set up

> **Need setup help?** See [Development Setup Guide](./DEVELOPMENT_SETUP.md)

## 🚀 Step 1: Generate Plugin Scaffold

Let's use our plugin generator to create the initial structure:

```bash
# Navigate to project root
cd mantine-ui-chrome-extension

# Generate the plugin scaffold
node scripts/generate-plugin.js hello-world
```

### Generator Prompts

When prompted, enter these values:

```
Plugin ID: hello-world
Plugin Name: Hello World
Description: A simple greeting plugin for learning
Author: Your Name
Category: utility
Icon: 👋
Core Plugin: false
Permissions: activeTab
```

This creates:
```
src/plugins/hello-world/
├── manifest.json     # Plugin metadata
├── types.ts          # TypeScript interfaces
├── config.ts         # Configuration
├── component.tsx     # React UI component
├── index.ts          # Plugin entry point
└── README.md         # Plugin documentation
```

## 🔧 Step 2: Define TypeScript Interfaces

Let's start by defining our data types in `types.ts`:

```typescript
// src/plugins/hello-world/types.ts
export interface HelloWorldSettings {
  enabled: boolean;
  userName: string;
  greetingStyle: 'casual' | 'formal' | 'friendly';
  showNotifications: boolean;
}

export interface GreetingData {
  id: string;
  message: string;
  timestamp: number;
  style: HelloWorldSettings['greetingStyle'];
}

export interface HelloWorldState {
  greetings: GreetingData[];
  lastGreeting?: GreetingData;
  isLoading: boolean;
}
```

## ⚙️ Step 3: Configure Plugin Settings

Update the configuration in `config.ts`:

```typescript
// src/plugins/hello-world/config.ts
import { HelloWorldSettings } from './types';

export const HELLO_WORLD_CONFIG = {
  id: 'hello-world',
  name: 'Hello World',
  description: 'A simple greeting plugin for learning',
  version: '1.0.0',
  icon: '👋'
};

export const DEFAULT_SETTINGS: HelloWorldSettings = {
  enabled: true,
  userName: 'Developer',
  greetingStyle: 'friendly',
  showNotifications: true
};

export const GREETING_MESSAGES = {
  casual: (name: string) => `Hey ${name}! 👋`,
  formal: (name: string) => `Good day, ${name}.`,
  friendly: (name: string) => `Hello there, ${name}! Hope you're having a great day! 😊`
};

export const generateGreeting = (settings: HelloWorldSettings): string => {
  const generator = GREETING_MESSAGES[settings.greetingStyle];
  return generator(settings.userName);
};

export const createGreetingData = (settings: HelloWorldSettings): GreetingData => ({
  id: `greeting-${Date.now()}`,
  message: generateGreeting(settings),
  timestamp: Date.now(),
  style: settings.greetingStyle
});
```

## 🎨 Step 4: Build the UI Component

Now let's create our React component using Mantine UI:

```typescript
// src/plugins/hello-world/component.tsx
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Card,
  Title,
  Text,
  Button,
  Select,
  TextInput,
  Switch,
  Group,
  Badge,
  Notification,
  Alert,
  Tabs
} from '@mantine/core';
import { IconCheck, IconInfoCircle } from '@tabler/icons-react';

import { HelloWorldSettings, HelloWorldState, GreetingData } from './types';
import { DEFAULT_SETTINGS, createGreetingData } from './config';

interface HelloWorldComponentProps {
  context: {
    storage: any;
    updateStorage: (updates: any) => Promise<void>;
  };
}

export const HelloWorldComponent: React.FC<HelloWorldComponentProps> = ({ context }) => {
  // State management
  const [state, setState] = useState<HelloWorldState>({
    greetings: [],
    isLoading: true
  });
  const [settings, setSettings] = useState<HelloWorldSettings>(DEFAULT_SETTINGS);

  // Load settings and data on mount
  useEffect(() => {
    loadPluginData();
  }, []);

  const loadPluginData = async () => {
    try {
      const currentPlugin = context.storage.plugins?.find(p => p.id === 'hello-world');
      const pluginSettings = currentPlugin?.settings || DEFAULT_SETTINGS;
      setSettings(pluginSettings);

      // Load greeting history (we'll implement this with storage)
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load plugin data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updatePluginSettings = async (newSettings: Partial<HelloWorldSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Update plugin in storage
    const updatedPlugins = context.storage.plugins.map(plugin =>
      plugin.id === 'hello-world'
        ? { ...plugin, settings: updatedSettings, updatedAt: Date.now() }
        : plugin
    );

    await context.updateStorage({ plugins: updatedPlugins });
  };

  const generateGreeting = async () => {
    if (!settings.enabled) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Create new greeting
      const newGreeting = createGreetingData(settings);
      
      // Update state
      setState(prev => ({
        ...prev,
        greetings: [newGreeting, ...prev.greetings.slice(0, 9)], // Keep last 10
        lastGreeting: newGreeting,
        isLoading: false
      }));

      // Send message to background script (we'll implement this)
      await chrome.runtime.sendMessage({
        type: 'HELLO_WORLD_GREETING',
        payload: { greeting: newGreeting, settings }
      });

      // Show notification if enabled
      if (settings.showNotifications) {
        // We'll implement this with our notification system
        await chrome.runtime.sendMessage({
          type: 'SHOW_HELLO_WORLD_NOTIFICATION',
          payload: { greeting: newGreeting }
        });
      }

    } catch (error) {
      console.error('Failed to generate greeting:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (state.isLoading) {
    return (
      <Card p="md">
        <Text>Loading Hello World plugin...</Text>
      </Card>
    );
  }

  return (
    <Stack spacing="md">
      <Card p="md">
        <Group position="apart" mb="md">
          <Title order={3}>👋 Hello World Plugin</Title>
          <Badge color={settings.enabled ? 'green' : 'gray'}>
            {settings.enabled ? 'Active' : 'Disabled'}
          </Badge>
        </Group>

        <Tabs defaultValue="greeting">
          <Tabs.List>
            <Tabs.Tab value="greeting">Greeting</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="greeting" pt="md">
            <Stack spacing="md">
              {state.lastGreeting && (
                <Alert icon={<IconCheck size={16} />} color="green">
                  <Text weight={500}>Latest Greeting:</Text>
                  <Text>{state.lastGreeting.message}</Text>
                  <Text size="xs" color="dimmed">
                    {new Date(state.lastGreeting.timestamp).toLocaleString()}
                  </Text>
                </Alert>
              )}

              <Button
                onClick={generateGreeting}
                disabled={!settings.enabled}
                loading={state.isLoading}
                size="lg"
                fullWidth
              >
                Generate Greeting
              </Button>

              {!settings.enabled && (
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                  Enable the plugin in settings to generate greetings.
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="history" pt="md">
            <Stack spacing="xs">
              <Title order={4}>Recent Greetings</Title>
              {state.greetings.length === 0 ? (
                <Text color="dimmed">No greetings yet. Generate your first one!</Text>
              ) : (
                state.greetings.map((greeting) => (
                  <Card key={greeting.id} p="sm" withBorder>
                    <Text>{greeting.message}</Text>
                    <Group position="apart" mt="xs">
                      <Badge size="sm" variant="light">
                        {greeting.style}
                      </Badge>
                      <Text size="xs" color="dimmed">
                        {new Date(greeting.timestamp).toLocaleString()}
                      </Text>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="md">
            <Stack spacing="md">
              <Switch
                label="Enable Plugin"
                description="Allow the plugin to generate greetings"
                checked={settings.enabled}
                onChange={(event) => updatePluginSettings({ enabled: event.currentTarget.checked })}
              />

              <TextInput
                label="Your Name"
                description="Name to use in greetings"
                value={settings.userName}
                onChange={(event) => updatePluginSettings({ userName: event.currentTarget.value })}
              />

              <Select
                label="Greeting Style"
                description="Choose your preferred greeting style"
                value={settings.greetingStyle}
                onChange={(value) => updatePluginSettings({ greetingStyle: value as any })}
                data={[
                  { value: 'casual', label: '👋 Casual' },
                  { value: 'formal', label: '🎩 Formal' },
                  { value: 'friendly', label: '😊 Friendly' }
                ]}
              />

              <Switch
                label="Show Notifications"
                description="Display browser notifications for new greetings"
                checked={settings.showNotifications}
                onChange={(event) => updatePluginSettings({ showNotifications: event.currentTarget.checked })}
              />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Card>
    </Stack>
  );
};
```

## 📨 Step 5: Implement Message Handling

Update the plugin entry point to handle messages:

```typescript
// src/plugins/hello-world/index.ts
import { Plugin } from '@/types';
import { HelloWorldComponent } from './component';
import { HELLO_WORLD_CONFIG } from './config';

export class HelloWorldPlugin implements Plugin {
  public readonly id = 'hello-world';
  public readonly name = 'Hello World';
  public readonly description = 'A simple greeting plugin for learning';
  public readonly version = '1.0.0';
  public readonly component = HelloWorldComponent;
  public readonly enabled = false;
  public readonly isCore = false;
  public readonly createdAt = Date.now();
  public readonly updatedAt = Date.now();

  async initialize(): Promise<void> {
    console.log('Hello World plugin initialized');
  }

  async cleanup(): Promise<void> {
    console.log('Hello World plugin cleaned up');
  }

  async handleAction(action: string, data?: any): Promise<any> {
    switch (action) {
      case 'generateGreeting':
        return this.generateGreeting(data);
      case 'getHistory':
        return this.getGreetingHistory();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async generateGreeting(data: any) {
    // Plugin-specific greeting logic
    console.log('Generating greeting with data:', data);
    return { success: true, timestamp: Date.now() };
  }

  private async getGreetingHistory() {
    // Return greeting history
    return [];
  }
}

export const helloWorldPlugin = new HelloWorldPlugin();
export default helloWorldPlugin;
```

## 📱 Step 6: Add Background Script Integration

Add message handling to the background script:

```typescript
// Add to src/background/background.ts in the handleMessage function

case 'HELLO_WORLD_GREETING':
  const { greeting, settings } = request.payload;
  console.log('Hello World greeting generated:', greeting);
  sendResponse({ success: true, timestamp: Date.now() });
  break;

case 'SHOW_HELLO_WORLD_NOTIFICATION':
  const { greeting: notificationGreeting } = request.payload;
  
  // Use our notification system
  const { showNotification } = await import('@/shared/notifications');
  await showNotification(
    'Hello World Plugin', 
    notificationGreeting.message,
    {
      priority: 1,
      data: {
        pluginId: 'hello-world',
        greetingId: notificationGreeting.id
      }
    }
  );
  sendResponse({ success: true });
  break;
```

## 🗄️ Step 7: Implement Storage Integration

Let's enhance our component with proper storage:

```typescript
// Add to component.tsx - enhanced storage methods

import { SecureExtensionStorage } from '@/shared/storage';

// In your component, add storage operations:
const storage = SecureExtensionStorage.getInstance();

const saveGreetingHistory = async (greetings: GreetingData[]) => {
  try {
    // Store in plugin-specific storage
    const pluginStorage = SecureExtensionStorage.createPluginBucket<{greetings: GreetingData[]}>('hello-world');
    await pluginStorage.set(() => ({ greetings }));
  } catch (error) {
    console.error('Failed to save greeting history:', error);
  }
};

const loadGreetingHistory = async (): Promise<GreetingData[]> => {
  try {
    const pluginStorage = SecureExtensionStorage.createPluginBucket<{greetings: GreetingData[]}>('hello-world');
    const data = await pluginStorage.get();
    return data?.greetings || [];
  } catch (error) {
    console.error('Failed to load greeting history:', error);
    return [];
  }
};

// Update loadPluginData method:
const loadPluginData = async () => {
  try {
    const currentPlugin = context.storage.plugins?.find(p => p.id === 'hello-world');
    const pluginSettings = currentPlugin?.settings || DEFAULT_SETTINGS;
    setSettings(pluginSettings);

    // Load greeting history from storage
    const greetings = await loadGreetingHistory();
    
    setState(prev => ({
      ...prev,
      greetings,
      isLoading: false
    }));
  } catch (error) {
    console.error('Failed to load plugin data:', error);
    setState(prev => ({ ...prev, isLoading: false }));
  }
};

// Update generateGreeting method to save history:
const generateGreeting = async () => {
  if (!settings.enabled) return;

  setState(prev => ({ ...prev, isLoading: true }));

  try {
    const newGreeting = createGreetingData(settings);
    const updatedGreetings = [newGreeting, ...state.greetings.slice(0, 9)];
    
    // Save to storage
    await saveGreetingHistory(updatedGreetings);
    
    setState(prev => ({
      ...prev,
      greetings: updatedGreetings,
      lastGreeting: newGreeting,
      isLoading: false
    }));

    // Send message and notification...
    // (rest of the method remains the same)
  } catch (error) {
    console.error('Failed to generate greeting:', error);
    setState(prev => ({ ...prev, isLoading: false }));
  }
};
```

## 🔔 Step 8: Test Your Plugin

### Build and Load

```bash
# Build the extension
npm run build

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the dist/ folder
```

### Test Functionality

1. **Open Extension Options**
   - Click the extension icon
   - Navigate to "Plugins" tab
   - Enable the "Hello World" plugin

2. **Test Basic Features**
   - Generate greetings with different styles
   - Change your name in settings
   - Toggle notifications on/off
   - Check greeting history

3. **Test Storage**
   - Generate several greetings
   - Reload the extension
   - Verify history persists

4. **Test Notifications**
   - Enable notifications in settings
   - Generate a greeting
   - Check for browser notification

## 🎉 Congratulations!

You've built your first plugin with:

✅ **Modern Storage**: Type-safe, encrypted data persistence
✅ **Messaging System**: Inter-context communication  
✅ **Notification System**: User-friendly alerts
✅ **UI Components**: Responsive Mantine UI
✅ **Settings Management**: Persistent user preferences
✅ **Error Handling**: Graceful error management

## 🚀 Next Steps

### Enhance Your Plugin

1. **Add Data Export**: Let users export greeting history
2. **Custom Greetings**: Allow users to create custom greeting templates
3. **Scheduling**: Add scheduled greetings
4. **Analytics**: Track greeting generation patterns

### Learn More

- **[Plugin System](../plugins/PLUGIN_SYSTEM.md)** - Advanced plugin patterns
- **[Storage System](../STORAGE.md)** - Deep dive into storage features
- **[Messaging System](../MESSAGES.md)** - Advanced message patterns
- **[Example Plugins](../plugins/EXAMPLES.md)** - Study real plugins

### Debugging Tips

```typescript
// Add debug logging
console.log('Plugin state:', state);
console.log('Settings updated:', settings);

// Test storage operations
const testStorage = async () => {
  const storage = SecureExtensionStorage.createPluginBucket('hello-world-test');
  await storage.set(() => ({ test: 'data' }));
  const result = await storage.get();
  console.log('Storage test:', result);
};
```

## 🤝 Contributing

Ready to contribute your plugin?

1. **Code Review**: Ensure your code follows our [Code Style](../contributing/CODE_STYLE.md)
2. **Documentation**: Update your plugin's README.md
3. **Testing**: Test thoroughly across different scenarios
4. **Pull Request**: Follow our [PR Process](../contributing/PR_PROCESS.md)

---

**Great job!** You've learned the fundamentals of plugin development. Now go build something amazing! 🚀 