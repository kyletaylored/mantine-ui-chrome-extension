#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`)
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt function
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Validate plugin ID
function validatePluginId(id) {
  if (!id) return 'Plugin ID is required';
  if (!/^[a-z0-9-]+$/.test(id)) return 'Plugin ID must contain only lowercase letters, numbers, and hyphens';
  if (id.length < 3) return 'Plugin ID must be at least 3 characters';
  if (id.length > 50) return 'Plugin ID must be less than 50 characters';
  return null;
}

// Convert kebab-case to PascalCase
function toPascalCase(str) {
  return str.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

// Convert kebab-case to camelCase
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// Generate plugin files
function generatePluginFiles(config) {
  const pluginDir = path.join('src', 'plugins', config.id);
  
  // Create plugin directory
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
    log.success(`Created plugin directory: ${pluginDir}`);
  } else {
    log.warning(`Plugin directory already exists: ${pluginDir}`);
  }

  // Generate manifest.json
  const manifest = {
    id: config.id,
    name: config.name,
    description: config.description,
    version: "1.0.0",
    author: config.author,
    category: config.category,
    icon: config.icon,
    isCore: config.isCore,
    permissions: config.permissions.filter(p => p.trim()),
    settings: generateSettingsSchema(config)
  };

  fs.writeFileSync(
    path.join(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  log.success('Generated manifest.json');

  // Generate types.ts
  const typesContent = generateTypesFile(config);
  fs.writeFileSync(path.join(pluginDir, 'types.ts'), typesContent);
  log.success('Generated types.ts');

  // Generate config.ts
  const configContent = generateConfigFile(config);
  fs.writeFileSync(path.join(pluginDir, 'config.ts'), configContent);
  log.success('Generated config.ts');

  // Generate component.tsx
  const componentContent = generateComponentFile(config);
  fs.writeFileSync(path.join(pluginDir, 'component.tsx'), componentContent);
  log.success('Generated component.tsx');

  // Generate index.ts
  const indexContent = generateIndexFile(config);
  fs.writeFileSync(path.join(pluginDir, 'index.ts'), indexContent);
  log.success('Generated index.ts');

  // Generate README.md
  const readmeContent = generateReadmeFile(config);
  fs.writeFileSync(path.join(pluginDir, 'README.md'), readmeContent);
  log.success('Generated README.md');
}

function generateSettingsSchema(config) {
  const settings = {
    enabled: {
      type: "boolean",
      label: "Enable Plugin",
      description: `Enable or disable the ${config.name} plugin`,
      default: !config.isCore
    }
  };

  // Add custom settings based on category
  if (config.category === 'monitoring') {
    settings.refreshInterval = {
      type: "number",
      label: "Refresh Interval (seconds)",
      description: "How often to refresh data",
      default: 30,
      min: 5,
      max: 300
    };
  }

  if (config.category === 'injection') {
    settings.autoInject = {
      type: "boolean", 
      label: "Auto Inject",
      description: "Automatically inject scripts when pages load",
      default: false
    };
  }

  return settings;
}

function generateTypesFile(config) {
  const pascalName = toPascalCase(config.id);
  
  return `export interface ${pascalName}Settings {
  enabled: boolean;
  ${config.category === 'monitoring' ? 'refreshInterval: number;' : ''}
  ${config.category === 'injection' ? 'autoInject: boolean;' : ''}
}

export interface ${pascalName}Data {
  id: string;
  timestamp: number;
  status: 'success' | 'error' | 'pending';
  message?: string;
  data?: any;
}

export interface ${pascalName}Result {
  success: boolean;
  data?: ${pascalName}Data;
  error?: string;
}

export interface ${pascalName}Config {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
}
`;
}

function generateConfigFile(config) {
  const pascalName = toPascalCase(config.id);
  const constantName = config.id.toUpperCase().replace(/-/g, '_');
  
  return `import { ${pascalName}Settings, ${pascalName}Config } from './types';

export const ${constantName}_PLUGIN_CONFIG: ${pascalName}Config = {
  id: '${config.id}',
  name: '${config.name}',
  description: '${config.description}',
  version: '1.0.0',
  permissions: ${JSON.stringify(config.permissions.filter(p => p.trim()), null, 2)},
};

export const DEFAULT_${constantName}_SETTINGS: ${pascalName}Settings = {
  enabled: ${!config.isCore},${config.category === 'monitoring' ? '\n  refreshInterval: 30,' : ''}${config.category === 'injection' ? '\n  autoInject: false,' : ''}
};

/**
 * ${config.name} utility functions
 */

export const validate${pascalName}Settings = (settings: Partial<${pascalName}Settings>): ${pascalName}Settings => {
  return {
    enabled: settings.enabled ?? DEFAULT_${constantName}_SETTINGS.enabled,${config.category === 'monitoring' ? `
    refreshInterval: Math.max(5, Math.min(300, settings.refreshInterval ?? DEFAULT_${constantName}_SETTINGS.refreshInterval)),` : ''}${config.category === 'injection' ? `
    autoInject: settings.autoInject ?? DEFAULT_${constantName}_SETTINGS.autoInject,` : ''}
  };
};

export const format${pascalName}Data = (data: any): string => {
  if (!data) return 'No data available';
  
  // Add custom formatting logic here
  return JSON.stringify(data, null, 2);
};

/**
 * Plugin-specific helper functions
 * Add your custom utility functions here
 */
export const initialize${pascalName} = async (): Promise<void> => {
  console.log('Initializing ${config.name} plugin...');
  // Add initialization logic here
};

export const cleanup${pascalName} = async (): Promise<void> => {
  console.log('Cleaning up ${config.name} plugin...');
  // Add cleanup logic here
};
`;
}

function generateComponentFile(config) {
  const pascalName = toPascalCase(config.id);
  const constantName = config.id.toUpperCase().replace(/-/g, '_');
  
  return `import React, { useState, useEffect } from 'react';
import {
  Stack,
  Card,
  Text,
  Group,
  Button,
  Alert,
  Switch,
  ActionIcon,
  Paper,
  LoadingOverlay,
  Tabs,
  Box,
  Badge
} from '@mantine/core';
import {
  IconRefresh,
  IconSettings,
  IconInfoCircle,
  IconCheck,
  IconAlertCircle,
  ${config.icon === '🔧' ? 'IconTool' : config.icon === '📊' ? 'IconChartBar' : config.icon === '🚀' ? 'IconRocket' : 'IconPuzzle'}
} from '@tabler/icons-react';
import { PluginContext } from '../../types';
import { 
  ${pascalName}Settings,
  ${pascalName}Data 
} from './types';
import { 
  DEFAULT_${constantName}_SETTINGS,
  validate${pascalName}Settings,
  format${pascalName}Data
} from './config';

interface ${pascalName}ComponentProps {
  context: PluginContext;
}

export const ${pascalName}Component: React.FC<${pascalName}ComponentProps> = ({ context }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<${pascalName}Data | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('main');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Get current plugin settings
  const currentPlugin = context.storage.plugins.find(p => p.id === '${config.id}');
  const settings = validate${pascalName}Settings(currentPlugin?.settings || {});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Implement your data loading logic here
      // Example: Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: '${config.id.toUpperCase().replace(/-/g, '_')}_GET_DATA'
      });
      
      if (response.success) {
        setData(response.data);
        setLastRefresh(new Date());
      } else {
        console.error('Failed to load ${config.name} data:', response.error);
      }
    } catch (error) {
      console.error('Failed to load ${config.name} data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<${pascalName}Settings>) => {
    const updatedSettings = validate${pascalName}Settings({ ...settings, ...newSettings });
    const updatedPlugins = context.storage.plugins.map(plugin =>
      plugin.id === '${config.id}' 
        ? { ...plugin, settings: updatedSettings, updatedAt: Date.now() }
        : plugin
    );
    
    await context.updateStorage({ plugins: updatedPlugins });
  };

  const handleAction = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Implement your main action logic here
      await chrome.runtime.sendMessage({
        type: '${config.id.toUpperCase().replace(/-/g, '_')}_EXECUTE_ACTION'
      });
      
      // Reload data after action
      await loadData();
    } catch (error) {
      console.error('Failed to execute ${config.name} action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <LoadingOverlay visible={isLoading} />
      
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="main" leftSection={<${config.icon === '🔧' ? 'IconTool' : config.icon === '📊' ? 'IconChartBar' : config.icon === '🚀' ? 'IconRocket' : 'IconPuzzle'} size={16} />}>
            ${config.name}
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
            Settings
          </Tabs.Tab>
        </Tabs.List>

        {/* Main Tab */}
        <Tabs.Panel value="main" pt="md">
          <Stack gap="md">
            {/* Header with refresh */}
            <Group justify="space-between">
              <Text fw={500}>${config.name}</Text>
              <Group gap="xs">
                {lastRefresh && (
                  <Text size="xs" c="dimmed">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </Text>
                )}
                <ActionIcon 
                  variant="subtle" 
                  onClick={loadData}
                  loading={isLoading}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Group>
            </Group>

            {/* Status */}
            <Alert color={data ? 'green' : 'gray'} icon={data ? <IconCheck size={16} /> : <IconInfoCircle size={16} />}>
              <Text size="sm">
                {data ? 'Plugin is active and working' : 'No data available'}
              </Text>
            </Alert>

            {/* Data Display */}
            {data && (
              <Card withBorder>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text fw={500} size="sm">Plugin Data</Text>
                    <Badge color={data.status === 'success' ? 'green' : data.status === 'error' ? 'red' : 'yellow'}>
                      {data.status}
                    </Badge>
                  </Group>
                  
                  <Paper p="sm" bg="gray.0">
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {format${pascalName}Data(data)}
                    </Text>
                  </Paper>
                </Stack>
              </Card>
            )}

            {/* Action Button */}
            <Button
              onClick={handleAction}
              loading={isLoading}
              disabled={!settings.enabled}
              fullWidth
            >
              Execute ${config.name} Action
            </Button>
          </Stack>
        </Tabs.Panel>

        {/* Settings Tab */}
        <Tabs.Panel value="settings" pt="md">
          <Stack gap="md">
            <Text fw={500}>Plugin Settings</Text>
            
            <Paper p="md" withBorder>
              <Stack gap="md">
                ${config.isCore ? `
                <Alert color="violet" icon={<IconInfoCircle size={16} />}>
                  <Text size="sm">
                    This is a core plugin and cannot be disabled.
                  </Text>
                </Alert>` : `
                <Switch
                  label="Enable Plugin"
                  description="Enable or disable the ${config.name} plugin"
                  checked={settings.enabled}
                  onChange={(event) => updateSettings({ enabled: event.currentTarget.checked })}
                />`}
                
                ${config.category === 'monitoring' ? `
                <div>
                  <Text size="sm" fw={500} mb="xs">Refresh Interval</Text>
                  <Text size="xs" c="dimmed" mb="sm">
                    How often to refresh data (5-300 seconds)
                  </Text>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={(e) => updateSettings({ refreshInterval: parseInt(e.target.value) || 30 })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>` : ''}
                
                ${config.category === 'injection' ? `
                <Switch
                  label="Auto Inject"
                  description="Automatically inject scripts when pages load"
                  checked={settings.autoInject}
                  onChange={(event) => updateSettings({ autoInject: event.currentTarget.checked })}
                />` : ''}
              </Stack>
            </Paper>

            <Alert color="blue" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                ${config.description}
              </Text>
            </Alert>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
};
`;
}

function generateIndexFile(config) {
  const pascalName = toPascalCase(config.id);
  const constantName = config.id.toUpperCase().replace(/-/g, '_');
  
  return `import { Plugin } from '../../types';
import { ${pascalName}Component } from './component';
import { 
  ${constantName}_PLUGIN_CONFIG, 
  DEFAULT_${constantName}_SETTINGS,
  initialize${pascalName},
  cleanup${pascalName}
} from './config';

/**
 * ${config.name} Plugin
 * 
 * ${config.description}
 * 
 * ${config.isCore ? 'This is a CORE plugin that cannot be disabled by users.' : 'This is an optional plugin that can be enabled/disabled by users.'}
 * 
 * Features:
 * - TODO: Add feature list
 * - TODO: Add feature list
 * - TODO: Add feature list
 */

export const ${toCamelCase(config.id)}Plugin: Plugin = {
  id: ${constantName}_PLUGIN_CONFIG.id,
  name: ${constantName}_PLUGIN_CONFIG.name,
  description: ${constantName}_PLUGIN_CONFIG.description,
  version: ${constantName}_PLUGIN_CONFIG.version,
  enabled: ${config.isCore}, // ${config.isCore ? 'Always enabled (core plugin)' : 'Default to disabled, user can enable in settings'}
  isCore: ${config.isCore}, // ${config.isCore ? 'Cannot be disabled by users' : 'Can be enabled/disabled by users'}
  icon: '${config.icon}',
  component: ${pascalName}Component,
  settings: DEFAULT_${constantName}_SETTINGS,
  permissions: ${constantName}_PLUGIN_CONFIG.permissions,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Plugin registration function
 * Called by the extension to register this plugin
 */
export const registerPlugin = (): Plugin => {
  return ${toCamelCase(config.id)}Plugin;
};

/**
 * Plugin initialization function
 * Called when the plugin is first loaded${config.isCore ? ' or on extension startup' : ' or enabled'}
 */
export const initializePlugin = async (context: any): Promise<void> => {
  console.log('${config.name} Plugin initialized${config.isCore ? ' (core plugin)' : ''}');
  
  ${config.isCore ? '// Core plugins are always enabled, so no need to check enabled status' : `// Check if plugin is enabled
  const plugins = context.storage?.plugins || [];
  const existingPlugin = plugins.find((p: Plugin) => p.id === ${toCamelCase(config.id)}Plugin.id);
  
  if (!existingPlugin?.enabled) {
    console.log('${config.name} Plugin: Not enabled, skipping initialization');
    return;
  }`}
  
  // Initialize the plugin
  await initialize${pascalName}();
  
  // Initialize with default settings if none exist
  try {
    const plugins = context.storage?.plugins || [];
    const existingPlugin = plugins.find((p: Plugin) => p.id === ${toCamelCase(config.id)}Plugin.id);
    
    if (!existingPlugin) {
      console.log('${config.name} Plugin: Adding to plugin list${config.isCore ? ' as core plugin' : ''}');
      const updatedPlugins = [...plugins, ${toCamelCase(config.id)}Plugin];
      await context.updateStorage?.({ plugins: updatedPlugins });
    }${config.isCore ? ` else if (!existingPlugin.isCore) {
      // Upgrade existing plugin to core status
      console.log('${config.name} Plugin: Upgrading to core plugin status');
      const updatedPlugins = plugins.map((p: Plugin) =>
        p.id === ${toCamelCase(config.id)}Plugin.id 
          ? { ...p, isCore: true, enabled: true, updatedAt: Date.now() }
          : p
      );
      await context.updateStorage?.({ plugins: updatedPlugins });
    }` : ''}
  } catch (error) {
    console.error('${config.name} Plugin: Failed to initialize:', error);
  }
};

/**
 * Plugin cleanup function
 * Called when the plugin is disabled${config.isCore ? ' or extension is uninstalled' : ' or uninstalled'}
 * ${config.isCore ? 'Note: Core plugins cannot be individually disabled' : ''}
 */
export const cleanupPlugin = async (): Promise<void> => {
  console.log('${config.name} Plugin: Cleanup${config.isCore ? ' (core plugin cannot be disabled)' : ''}');
  ${config.isCore ? '// Core plugins don\'t need cleanup as they\'re always active' : 'await cleanup' + pascalName + '();'}
};

/**
 * Handle plugin-specific messages
 * Called when background script receives plugin messages
 */
export const handlePluginMessage = async (message: any): Promise<any> => {
  const { action } = message;
  
  switch (action) {
    case 'GET_DATA':
      // TODO: Implement data retrieval logic
      return { success: true, data: { id: '${config.id}', timestamp: Date.now(), status: 'success' } };
      
    case 'EXECUTE_ACTION':
      // TODO: Implement main action logic
      return { success: true, message: '${config.name} action executed successfully' };
      
    case 'UPDATE_SETTINGS':
      // TODO: Implement settings update logic
      return { success: true, message: 'Settings updated successfully' };
      
    default:
      console.warn('${config.name} Plugin: Unknown action:', action);
      return { success: false, error: 'Unknown action' };
  }
};

export default ${toCamelCase(config.id)}Plugin;
`;
}

function generateReadmeFile(config) {
  const pascalName = toPascalCase(config.id);
  
  return `# ${config.name} Plugin

${config.description}

## Overview

This plugin provides ${config.name.toLowerCase()} functionality for the Datadog Sales Engineering Toolkit. ${config.isCore ? 'It is a **core plugin** that cannot be disabled as it provides essential functionality.' : 'It is an **optional plugin** that can be enabled or disabled by users.'}

## Features

- 🔧 **Feature 1**: Description of feature 1
- 📊 **Feature 2**: Description of feature 2  
- 🚀 **Feature 3**: Description of feature 3

## Installation

This plugin is ${config.isCore ? 'automatically installed and enabled' : 'available in the plugin directory'} as part of the Datadog Sales Engineering Toolkit.

## Configuration

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| enabled | boolean | ${!config.isCore} | ${config.isCore ? 'Always enabled (core plugin)' : 'Enable or disable the plugin'} |
${config.category === 'monitoring' ? '| refreshInterval | number | 30 | How often to refresh data (5-300 seconds) |' : ''}
${config.category === 'injection' ? '| autoInject | boolean | false | Automatically inject scripts when pages load |' : ''}

### Permissions

This plugin requires the following permissions:

${config.permissions.filter(p => p.trim()).map(p => `- \`${p}\``).join('\n')}

## Usage

### Basic Usage

1. ${config.isCore ? 'The plugin is automatically enabled' : 'Enable the plugin in the Options page'}
2. Configure settings as needed
3. Use the plugin interface to interact with features

### Advanced Usage

Add detailed usage instructions here.

## API Reference

### Plugin Messages

The plugin responds to the following message types:

#### GET_DATA
Get current plugin data.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: '${config.id.toUpperCase().replace(/-/g, '_')}_GET_DATA'
});
\`\`\`

#### EXECUTE_ACTION
Execute the main plugin action.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: '${config.id.toUpperCase().replace(/-/g, '_')}_EXECUTE_ACTION'
});
\`\`\`

#### UPDATE_SETTINGS
Update plugin settings.

\`\`\`javascript
chrome.runtime.sendMessage({
  type: '${config.id.toUpperCase().replace(/-/g, '_')}_UPDATE_SETTINGS',
  settings: { enabled: true }
});
\`\`\`

### TypeScript Interfaces

\`\`\`typescript
interface ${pascalName}Settings {
  enabled: boolean;
  ${config.category === 'monitoring' ? 'refreshInterval: number;' : ''}
  ${config.category === 'injection' ? 'autoInject: boolean;' : ''}
}

interface ${pascalName}Data {
  id: string;
  timestamp: number;
  status: 'success' | 'error' | 'pending';
  message?: string;
  data?: any;
}
\`\`\`

## Development

### File Structure

\`\`\`
src/plugins/${config.id}/
├── manifest.json    # Plugin metadata and settings schema
├── types.ts         # TypeScript interfaces and types
├── config.ts        # Configuration and utility functions
├── component.tsx    # React UI component
├── index.ts         # Plugin entry point and registration
└── README.md        # This documentation
\`\`\`

### Testing

1. Build the extension: \`npm run build\`
2. Load the extension in Chrome developer mode
3. Test plugin functionality in the options page
4. Verify messages are handled correctly in background script

### Debugging

- Check browser console for error messages
- Use Chrome DevTools to inspect plugin state
- Enable verbose logging in development mode

## Contributing

When modifying this plugin:

1. Update TypeScript interfaces in \`types.ts\`
2. Add utility functions to \`config.ts\`
3. Update the React component in \`component.tsx\`
4. Handle new message types in \`index.ts\`
5. Update this README with new features
6. Test thoroughly before submitting

## Troubleshooting

### Common Issues

**Plugin not loading**
- Check browser console for errors
- Verify all required permissions are granted
- Ensure plugin is enabled in settings

**Data not updating**
- Check network connectivity
- Verify API credentials are valid
- Check refresh interval settings

**Settings not saving**
- Check browser storage permissions
- Verify settings format is correct
- Check for validation errors

## License

This plugin is part of the Datadog Sales Engineering Toolkit and follows the same license terms.
`;
}

// Main wizard function
async function runWizard() {
  log.title('🔌 Datadog Plugin Scaffold Generator');
  
  try {
    // Get plugin ID from command line or prompt
    let pluginId = process.argv[2];
    
    if (!pluginId) {
      pluginId = await prompt('Plugin ID (kebab-case, e.g., "my-awesome-plugin"): ');
    }
    
    // Validate plugin ID
    const validationError = validatePluginId(pluginId);
    if (validationError) {
      log.error(validationError);
      process.exit(1);
    }
    
    // Check if plugin already exists
    const pluginDir = path.join('src', 'plugins', pluginId);
    if (fs.existsSync(pluginDir)) {
      const overwrite = await prompt(`Plugin "${pluginId}" already exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== 'y') {
        log.info('Cancelled by user');
        process.exit(0);
      }
    }
    
    log.step('Collecting plugin information...');
    
    // Collect plugin details
    const config = {
      id: pluginId,
      name: await prompt('Plugin Name (e.g., "My Awesome Plugin"): '),
      description: await prompt('Plugin Description: '),
      author: await prompt('Author (default: "Datadog Sales Engineering Team"): ') || 'Datadog Sales Engineering Team',
      category: await prompt('Category (monitoring/injection/utility/core): ') || 'utility',
      icon: await prompt('Icon (emoji, e.g., "🔧"): ') || '🔧',
      isCore: (await prompt('Is this a core plugin that cannot be disabled? (y/N): ')).toLowerCase() === 'y',
      permissions: (await prompt('Chrome permissions (comma-separated, e.g., "activeTab,storage"): ') || '').split(',')
    };
    
    log.step('Generating plugin files...');
    generatePluginFiles(config);
    
    log.success(`\n🎉 Plugin "${config.name}" generated successfully!`);
    log.info(`\nNext steps:`);
    log.info(`1. cd src/plugins/${pluginId}`);
    log.info(`2. Review and customize the generated files`);
    log.info(`3. Implement your plugin logic in component.tsx and config.ts`);
    log.info(`4. Add message handlers to the background script if needed`);
    log.info(`5. Test your plugin with: npm run build`);
    log.info(`\nSee CONTRIBUTING.md for detailed development guidelines.`);
    
  } catch (error) {
    log.error(`Failed to generate plugin: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Check if we're in the right directory
if (!fs.existsSync('package.json') || !fs.existsSync('src/plugins')) {
  log.error('Please run this script from the root of the Chrome extension project');
  process.exit(1);
}

// Run the wizard
runWizard(); 