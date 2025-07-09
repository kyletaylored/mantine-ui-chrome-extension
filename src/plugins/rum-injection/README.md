# RUM Injection Plugin

A comprehensive plugin for injecting Datadog Real User Monitoring (RUM) into web pages for demonstration purposes.

## Overview

The RUM Injection Plugin allows Datadog Sales Engineers to dynamically inject RUM monitoring into any web page during demonstrations. This enables real-time monitoring of user interactions, performance metrics, and page behavior without requiring the target website to have RUM pre-installed.

## Features

### Core Functionality
- **Dynamic RUM Injection**: Inject RUM script into the current active tab
- **Real-time Status**: Monitor RUM injection status and current page information
- **Configuration Management**: Persistent settings for RUM application configuration
- **Visual Indicators**: On-page indicator when RUM is active
- **Easy Removal**: Remove RUM script when demonstration is complete

### Configuration Options
- **Application ID**: Datadog RUM application identifier
- **Client Token**: Datadog RUM client token for authentication
- **Service Name**: Custom service name for the monitored application
- **Environment**: Environment classification (demo, staging, production, development)
- **Version**: Application version for tracking
- **Tracking Options**: Configurable tracking for user interactions, resources, and long tasks

## Usage

### Initial Setup

1. **Enable the Plugin**
   - Navigate to the extension options page
   - Go to the "Plugins" tab
   - Find "RUM Injection" and toggle it on

2. **Configure RUM Settings**
   - Click on the RUM Injection plugin card
   - Go to the "Settings" tab
   - Enter your RUM Application ID and Client Token
   - Configure service name, version, and environment
   - Adjust tracking options as needed
   - Click "Save Settings"

### Getting RUM Credentials

To use this plugin, you'll need:

1. **RUM Application ID**: 
   - Log in to your Datadog account
   - Navigate to **UX Monitoring** → **RUM Applications**
   - Select your application or create a new one
   - Copy the Application ID from the application details

2. **Client Token**:
   - In the same RUM application details page
   - Copy the Client Token (starts with "pub")

### Injecting RUM

1. **Navigate to Target Page**
   - Open the web page where you want to inject RUM
   - Ensure the page is fully loaded

2. **Inject RUM**
   - Open the extension popup or options page
   - Go to the RUM Injection plugin
   - Click "Inject RUM" button
   - Look for the purple "📊 Datadog RUM Active" indicator on the page

3. **Monitor Results**
   - Check your Datadog RUM dashboard for incoming data
   - Monitor user interactions and performance metrics
   - Use the RUM explorer to analyze the collected data

### Removing RUM

1. **Remove RUM Script**
   - Click the "Remove RUM" button in the plugin interface
   - The visual indicator will disappear from the page
   - RUM data collection will stop

## Configuration Reference

### Required Settings

| Setting | Description | Format | Example |
|---------|-------------|---------|---------|
| Application ID | Datadog RUM application identifier | UUID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| Client Token | Datadog RUM client token | String starting with "pub" | `pub********************************` |

### Optional Settings

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| Service Name | Name of the monitored service | `demo-application` | Any string |
| Version | Application version | `1.0.0` | Semantic version |
| Environment | Environment classification | `demo` | `demo`, `staging`, `production`, `development` |
| Track User Interactions | Monitor clicks and form submissions | `true` | `true`, `false` |
| Track Resources | Monitor resource loading times | `true` | `true`, `false` |
| Track Long Tasks | Monitor long-running tasks | `false` | `true`, `false` |

## Technical Implementation

### Architecture

The plugin follows the standard extension plugin architecture:

```
src/plugins/rum-injection/
├── manifest.json         # Plugin metadata and settings schema
├── config.ts            # Configuration interfaces and utilities
├── types.ts             # TypeScript definitions for RUM
├── rum-injector.ts      # Core injection logic
├── component.tsx        # React UI component
├── index.ts             # Plugin entry point and registration
└── README.md           # This documentation
```

### Key Components

1. **RumInjector Class**: Handles the actual script injection and removal
2. **RumInjectionComponent**: React component providing the user interface
3. **Configuration Management**: Persistent storage of plugin settings
4. **Type Safety**: Full TypeScript support with proper type definitions

### Script Injection Process

1. **Validation**: Check if required configuration is present
2. **Tab Detection**: Identify the current active tab
3. **Conflict Check**: Verify RUM is not already injected
4. **Library Injection**: Inject the Datadog RUM library from CDN
5. **Initialization**: Configure and initialize RUM with user settings
6. **Visual Feedback**: Add on-page indicator and console logging

### Error Handling

The plugin includes comprehensive error handling:

- **Configuration Validation**: Ensures required settings are present
- **Permission Checks**: Verifies necessary Chrome extension permissions
- **Injection Conflicts**: Prevents multiple RUM instances
- **Network Errors**: Handles CDN loading failures
- **User Feedback**: Provides clear error messages in the UI

## Development Guide

### Creating Similar Plugins

This plugin serves as a reference implementation for creating new plugins. Key patterns to follow:

1. **Plugin Structure**: Use the standard directory structure and file naming
2. **Configuration**: Define settings in `manifest.json` and `config.ts`
3. **Component**: Create a React component following Mantine UI patterns
4. **Type Safety**: Include proper TypeScript definitions
5. **Error Handling**: Implement comprehensive error handling
6. **Documentation**: Provide clear documentation and usage examples

### Plugin Interface

```typescript
interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  icon?: string;
  component: React.ComponentType;
  settings?: Record<string, any>;
  permissions?: string[];
  createdAt: number;
  updatedAt: number;
}
```

### Required Functions

```typescript
export const registerPlugin = (): Plugin => { /* ... */ };
export const initializePlugin = async (context: any): Promise<void> => { /* ... */ };
export const cleanupPlugin = async (): Promise<void> => { /* ... */ };
export const handlePluginMessage = async (message: any): Promise<any> => { /* ... */ };
```

### Best Practices

1. **Permissions**: Only request necessary Chrome extension permissions
2. **Error Handling**: Provide user-friendly error messages
3. **State Management**: Use React hooks for component state
4. **Persistence**: Store settings in the extension storage
5. **Validation**: Validate user input thoroughly
6. **Documentation**: Include comprehensive documentation

## Security Considerations

### Data Privacy
- RUM tokens are stored encrypted in Chrome extension storage
- No sensitive data is transmitted to external servers
- All RUM data follows Datadog's standard privacy policies

### Permissions
- `activeTab`: Required to inject scripts into the current tab
- `scripting`: Required for dynamic script injection
- Limited to necessary permissions only

### Script Injection
- Uses Chrome's scripting API for secure injection
- Validates script sources (official Datadog CDN only)
- Prevents injection conflicts with existing RUM instances

## Troubleshooting

### Common Issues

1. **"Missing required RUM configuration"**
   - Ensure Application ID and Client Token are set in settings
   - Verify the Application ID format is a valid UUID

2. **"RUM is already injected in this tab"**
   - Remove existing RUM before injecting new configuration
   - Check for existing RUM installations on the page

3. **"No active tab found"**
   - Ensure you have an active tab open
   - Verify the tab is not a Chrome system page

4. **Script loading failures**
   - Check internet connectivity
   - Verify access to Datadog CDN (datadoghq-browser-agent.com)
   - Check browser console for network errors

### Debug Mode

Enable debug mode by:
1. Opening browser console (F12)
2. Looking for "Datadog RUM" log messages
3. Checking for injection status and errors

## Version History

### v1.0.0
- Initial release
- Basic RUM injection and removal
- Configuration management
- Visual indicators
- Comprehensive error handling

## Contributing

To contribute to this plugin:

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for any changes
4. Ensure TypeScript compliance
5. Test across different websites and scenarios

## License

This plugin is part of the Datadog Sales Engineering Toolkit and follows the same license terms.

## Support

For support:
- Check the troubleshooting section above
- Review browser console for error messages
- Contact the Datadog Sales Engineering team
- Submit issues through the project's issue tracker 