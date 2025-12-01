# Plugin Development Standards

This document defines the standards and contracts for developing plugins in the Datadog Sales Engineering Toolkit.

## Plugin Manifest Contract

Every plugin must export a default object that implements the `PluginModule` interface:

```javascript
export default {
  manifest: {
    // Required fields
    id: 'unique-plugin-id',                    // Kebab-case identifier
    name: 'Human Readable Name',               // Display name
    description: 'Brief description',          // One-line description
    version: '1.0.0',                         // Semantic version
    core: false,                              // true = always enabled, false = user toggleable
    
    // Optional fields
    defaultEnabled: false,                     // Default enabled state for optional plugins
    icon: 'IconName',                         // Tabler icon name (without 'Icon' prefix)
    permissions: ['tabs', 'storage'],         // Chrome extension permissions
    matches: ['*://*/*'],                     // URL patterns for content scripts
    
    // Configuration schema (optional)
    configSchema: {
      type: 'object',
      properties: {
        apiEndpoint: {
          type: 'string',
          title: 'API Endpoint',
          description: 'Custom API endpoint URL',
          default: 'https://api.example.com'
        },
        enableLogging: {
          type: 'boolean',
          title: 'Enable Logging',
          description: 'Enable debug logging',
          default: false
        },
        maxRetries: {
          type: 'number',
          title: 'Max Retries',
          description: 'Maximum retry attempts',
          default: 3,
          minimum: 1,
          maximum: 10
        }
      }
    }
  },
  
  // Optional lifecycle methods
  initialize: async () => { /* startup logic */ },
  cleanup: async () => { /* cleanup logic */ },
  handleMessage: async (message) => { /* message handling */ },
  runContentScript: async (settings) => { /* content script logic */ },
  renderComponent: () => <React.Component />  // UI component
};
```

## Icon Standards

### Icon Requirements
All icons must be from `@tabler/icons-react`. The system will automatically validate and import icons.

**Icon Reference**: Visit [https://tabler.io/icons](https://tabler.io/icons) to browse all available icons.

### Icon Naming Convention
When specifying an icon in the manifest:

1. Use the icon name **without** the `Icon` prefix
2. Use PascalCase (e.g., `'Eye'`, `'Code'`, `'Bell'`, `'Settings'`)
3. The system will automatically prepend `Icon` and validate existence
4. If the icon doesn't exist, it will fallback to `IconPuzzle`

**Example:**
```javascript
// ✅ Correct
icon: 'Eye'        // Will import as IconEye
icon: 'Speedboat'  // Will import as IconSpeedboat (if it exists)
icon: 'Database'   // Will import as IconDatabase

// ❌ Incorrect  
icon: 'IconEye'    // Will try to import IconIconEye
icon: 'eye'        // Case mismatch - must be PascalCase
icon: 'nonexistent' // Will fallback to IconPuzzle with warning
```

### Icon Validation
The system uses a pre-imported icon map for performance:
1. Check if the icon exists in the pre-imported `ICON_MAP` in `src/shared/icon-loader.js`
2. Use the icon if found, or fallback to `IconPuzzle` with a warning
3. Log available icons and instructions for adding new ones

### Adding New Icons
To add a new icon that's not in the pre-imported map:

1. **Find the icon** at [https://tabler.io/icons](https://tabler.io/icons)
2. **Import it** in `src/shared/icon-loader.js`:
   ```javascript
   import { IconCalendar } from '@tabler/icons-react';
   ```
3. **Add to ICON_MAP**:
   ```javascript
   const ICON_MAP = {
     // ... existing icons
     'Calendar': IconCalendar,
   };
   ```
4. **Use in plugin manifest**:
   ```javascript
   icon: 'Calendar'
   ```

### Common Icon Suggestions
- `'Eye'` - Monitoring, viewing, inspection
- `'Code'` - Development, scripting, technical features
- `'Bell'` - Notifications, alerts, monitoring
- `'Settings'` - Configuration, preferences
- `'Database'` - Data management, storage
- `'Upload'` - Data injection, importing
- `'Download'` - Data extraction, exporting
- `'Shield'` - Security, protection features
- `'Speedboat'` - Fast operations, performance
- `'Robot'` - Automation, AI features
- `'Chart'` - Analytics, reporting
- `'Cloud'` - Cloud services, APIs
- `'Lock'` - Security, authentication
- `'Puzzle'` - Generic plugin (default fallback)

## Configuration Schema

Plugins can define configuration options using JSON Schema:

```javascript
configSchema: {
  type: 'object',
  properties: {
    fieldName: {
      type: 'string|number|boolean|array|object',
      title: 'Display Label',
      description: 'Help text for users',
      default: 'default value',
      
      // String-specific
      minLength: 1,
      maxLength: 100,
      pattern: '^https?://',
      
      // Number-specific  
      minimum: 0,
      maximum: 100,
      
      // Array-specific
      items: { type: 'string' },
      
      // Enum options
      enum: ['option1', 'option2'],
      enumNames: ['Option 1', 'Option 2']
    }
  },
  required: ['requiredField']
}
```

### Supported Field Types

The plugin configuration form supports 4 main field types, which are rendered using appropriate Mantine components:

1. **String Fields**
   - **Rendered as**: `TextInput` (short text) or `Textarea` (long text > 100 chars)
   - **For enums**: `Select` with dropdown options
   
   ```javascript
   // Basic string input
   apiUrl: {
     type: 'string',
     title: 'API URL',
     description: 'Base URL for API calls',
     default: 'https://api.datadog.com',
     pattern: '^https?://',
     minLength: 1,
     maxLength: 200
   }
   
   // Long text (renders as Textarea)
   description: {
     type: 'string',
     title: 'Description',
     description: 'Long description text',
     maxLength: 500
   }
   
   // Enum string (renders as Select)
   logLevel: {
     type: 'string',
     title: 'Log Level',
     description: 'Logging verbosity',
     enum: ['debug', 'info', 'warn', 'error'],
     enumNames: ['Debug', 'Info', 'Warning', 'Error'],
     default: 'info'
   }
   ```

2. **Number Fields**
   - **Rendered as**: `NumberInput` with increment/decrement controls
   
   ```javascript
   timeout: {
     type: 'number',
     title: 'Timeout (seconds)',
     description: 'Request timeout',
     default: 30,
     minimum: 1,
     maximum: 300,
     step: 1
   }
   ```

3. **Boolean Fields**
   - **Rendered as**: `Checkbox` with label
   
   ```javascript
   enableFeature: {
     type: 'boolean',
     title: 'Enable Feature',
     description: 'Toggle feature on/off',
     default: true
   }
   ```

4. **Array Fields**
   - **Simple arrays**: `MultiSelect` with creatable options
   - **Enum arrays**: `MultiSelect` with predefined options
   - **Key-value arrays**: Custom key-value pair inputs with add/remove buttons
   
   ```javascript
   // Simple string array (creatable MultiSelect)
   allowedDomains: {
     type: 'array',
     title: 'Allowed Domains',
     description: 'List of allowed domains',
     items: { type: 'string' },
     default: ['example.com']
   }
   
   // Enum array (predefined options MultiSelect)
   enabledFeatures: {
     type: 'array',
     title: 'Enabled Features',
     description: 'Select which features to enable',
     items: {
       type: 'string',
       enum: ['logging', 'analytics', 'debugging'],
       enumNames: ['Logging', 'Analytics', 'Debugging']
     },
     default: ['logging']
   }
   
   // Key-value array (custom component with pairs)
   customAttributes: {
     type: 'array',
     title: 'Custom Attributes',
     description: 'Custom key-value attributes',
     items: {
       type: 'object',
       properties: {
         value: { type: 'string' }, // This becomes the "key" 
         label: { type: 'string' }  // This becomes the "value"
       }
     },
     default: []
   }
   ```

### Field Properties

All field types support these common properties:

- **`title`**: Display label for the field
- **`description`**: Help text shown below the field
- **`default`**: Default value when not set
- **Required fields**: Listed in the schema's `required` array

#### String-specific properties:
- **`minLength`**, **`maxLength`**: Length constraints
- **`pattern`**: Regex validation pattern
- **`enum`**, **`enumNames`**: For dropdown selections

#### Number-specific properties:
- **`minimum`**, **`maximum`**: Value range constraints
- **`step`**: Increment/decrement step size

#### Array-specific properties:
- **`items`**: Schema for array items
- **`items.enum`**, **`items.enumNames`**: For predefined options

### Form Features

- **Validation**: Real-time validation based on schema constraints
- **Required fields**: Visual indicators and validation
- **Clearable inputs**: All appropriate fields support clearing values
- **Add/Remove**: Dynamic add/remove for key-value arrays
- **Searchable**: MultiSelect and Select fields are searchable
- **Auto-sizing**: Textarea fields auto-resize based on content

## Plugin Types

### Core Plugins
- `core: true`
- Always enabled, cannot be disabled by users
- Essential for extension functionality
- Examples: APM Tracing, RUM Extraction

### Optional Plugins  
- `core: false`
- User can enable/disable
- Enhanced features and integrations
- Examples: RUM Injection, Event Alerts

## Plugin Lifecycle

### Initialization
```javascript
initialize: async () => {
  console.log('Plugin starting up');
  // Setup event listeners
  // Initialize external connections
  // Load saved settings
}
```

### Message Handling
```javascript
handleMessage: async (message) => {
  const { action, payload } = message;
  
  switch (action) {
    case 'GET_STATUS':
      return { enabled: true, version: '1.0.0' };
    case 'UPDATE_SETTINGS':
      // Handle settings update
      return { success: true };
    default:
      return { success: false, error: 'Unknown action' };
  }
}
```

### Content Scripts
```javascript
runContentScript: async (settings) => {
  // Execute in page context
  // settings contains user configuration
}
```

### Cleanup
```javascript
cleanup: async () => {
  console.log('Plugin shutting down');
  // Remove event listeners
  // Close connections
  // Save state
}
```

## Settings Management

Plugin settings are automatically managed by the system:

1. **Reading Settings**: Use the plugin loader to get current settings
2. **Saving Settings**: Settings are saved when user submits configuration form
3. **Validation**: Settings are validated against the configSchema
4. **Defaults**: Missing settings fall back to schema defaults

## Best Practices

### Plugin Structure
```
src/plugins/my-plugin/
├── index.js          # Main plugin file
├── config.js         # Configuration constants
├── component.jsx     # React component (if needed)
├── content.js        # Content script (if needed)
├── manifest.json     # Additional metadata (optional)
└── README.md         # Plugin documentation
```

### Error Handling
- Always wrap async operations in try-catch
- Return meaningful error messages
- Log errors for debugging
- Fail gracefully without breaking the extension

### Performance
- Lazy load heavy dependencies
- Use efficient DOM queries in content scripts
- Implement proper cleanup to prevent memory leaks
- Cache frequently accessed data

### Security
- Validate all inputs
- Use secure communication channels
- Don't expose sensitive data in logs
- Follow Chrome extension security guidelines

## Example Plugin

See `src/plugins/hello-world/` for a complete example implementation.