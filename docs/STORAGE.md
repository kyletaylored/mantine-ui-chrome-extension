# Storage System Documentation

## Overview

The Datadog Sales Engineering Toolkit uses a modern, type-safe storage system built on top of `@extend-chrome/storage`. This system provides automatic encryption for sensitive data (like API keys), reactive storage watching, and a clean API for managing extension data.

## Architecture

### Core Components

1. **`@extend-chrome/storage`** - Modern Chrome extension storage wrapper with Promise-based API and TypeScript support
2. **`EncryptionManager`** - Handles encryption/decryption of sensitive data using AES encryption
3. **`SecureExtensionStorage`** - Main storage class that combines secure storage with encryption
4. **Storage Buckets** - Organized storage areas with typed interfaces

### Storage Structure

```typescript
interface ExtensionStorage {
  credentials: DatadogCredentials;    // Encrypted API keys
  Links: Link[];                      // User-defined links
  plugins: Plugin[];                  // Plugin configurations
  settings: ExtensionSettings;        // User preferences
}
```

## Key Features

### 1. Automatic Encryption for Sensitive Data

API keys and application keys are automatically encrypted before storage and decrypted when retrieved:

```typescript
// Setting credentials - automatically encrypts sensitive fields
await storage.setCredentials({
  apiKey: 'your-api-key-here',        // Will be encrypted
  appKey: 'your-app-key-here',        // Will be encrypted
  site: 'us1',                        // Not encrypted
  isValid: true                       // Not encrypted
});

// Getting credentials - automatically decrypts sensitive fields
const credentials = await storage.getCredentials();
// credentials.apiKey and credentials.appKey are now decrypted
```

### 2. Type-Safe Operations

All storage operations are fully type-safe with TypeScript:

```typescript
// Compiler will catch type errors
const plugins: Plugin[] = await storage.getPlugins();
await storage.updatePlugin('plugin-id', { enabled: false });
```

### 3. Reactive Storage Watching

Monitor storage changes with RxJS-style observables:

```typescript
// Watch for credential changes
storage.watchCredentials().subscribe(newCredentials => {
  console.log('Credentials updated:', newCredentials);
});

// Watch for all storage changes
storage.watchAll().subscribe(allData => {
  console.log('Storage updated:', allData);
});
```

### 4. Functional Setters

Update storage using functional setters that receive the current state:

```typescript
// Add a new plugin using functional setter
await storage.addPlugin(newPlugin);

// Update settings functionally
await storage.updateSettings({ theme: 'dark' });
```

## API Reference

### Core Methods

#### `storage.get(): Promise<ExtensionStorage>`
Returns the complete storage data with default values if not set.

#### `storage.update(updates: Partial<ExtensionStorage>): Promise<void>`
Updates storage with partial data using functional setter.

#### `storage.clear(): Promise<void>`
Clears all storage data.

### Credential Methods

#### `storage.getCredentials(): Promise<DatadogCredentials>`
Returns credentials with automatic decryption of sensitive fields.

#### `storage.setCredentials(credentials: DatadogCredentials): Promise<void>`
Saves credentials with automatic encryption of sensitive fields.

#### `storage.clearCredentials(): Promise<void>`
Clears all credential data.

### Plugin Methods

#### `storage.getPlugins(): Promise<Plugin[]>`
Returns all plugins.

#### `storage.addPlugin(plugin: Plugin): Promise<void>`
Adds or updates a plugin. Core plugins are automatically force-enabled.

#### `storage.updatePlugin(id: string, updates: Partial<Plugin>): Promise<void>`
Updates a plugin. Prevents disabling core plugins.

#### `storage.removePlugin(id: string): Promise<void>`
Removes a plugin. Prevents removing core plugins.

#### `storage.ensureCorePluginsEnabled(): Promise<void>`
Ensures all core plugins are enabled.

### Links Methods

#### `storage.getLinks(): Promise<Link[]>`
Returns all links.

#### `storage.addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt'>): Promise<Link>`
Adds a new link with auto-generated ID and timestamps.

#### `storage.updateLink(id: string, updates: Partial<Link>): Promise<void>`
Updates a link.

#### `storage.removeLink(id: string): Promise<void>`
Removes a link.

### Settings Methods

#### `storage.getSettings(): Promise<ExtensionSettings>`
Returns user settings.

#### `storage.updateSettings(updates: Partial<ExtensionSettings>): Promise<void>`
Updates user settings.

### Watch Methods

#### `storage.watchCredentials()`
Returns an observable that emits when credentials change.

#### `storage.watchPlugins()`
Returns an observable that emits when plugins change.

#### `storage.watchLinks()`
Returns an observable that emits when links change.

#### `storage.watchSettings()`
Returns an observable that emits when settings change.

#### `storage.watchAll()`
Returns an observable that emits when any storage data changes.

## Security Features

### Encryption Details

- **Algorithm**: AES encryption using CryptoJS
- **Key Management**: Encryption keys are generated per-extension installation and stored securely
- **Encrypted Fields**: Only `apiKey` and `appKey` in credentials are encrypted
- **Key Caching**: Encryption keys are cached in memory for performance

### Security Best Practices

1. **Sensitive Data Detection**: The system automatically detects if data is encrypted by checking length
2. **Graceful Fallback**: If decryption fails, the system logs a warning and uses the value as-is
3. **Key Generation**: Encryption keys are generated using secure random methods
4. **Storage Isolation**: Each extension instance has its own encryption key

## Migration from Old Storage System

### Legacy Support

The new system includes legacy support methods to ease migration:

```typescript
import { legacyStorage } from '@/shared/storage';

// These methods work with the old API
const data = await legacyStorage.get();
await legacyStorage.saveCredentials(credentials);
await legacyStorage.clearCredentials();
```

### Migration Steps

1. Replace old storage calls with new typed methods
2. Update imports to use the new storage instance
3. Take advantage of reactive watching where needed
4. Remove legacy method calls once migration is complete

## Performance Considerations

### Optimizations

1. **Functional Setters**: Multiple synchronous calls are batched into single storage operations
2. **Caching**: Encryption keys are cached to avoid repeated key generation
3. **Selective Updates**: Only changed data is written to storage
4. **Typed Operations**: TypeScript eliminates runtime type checking overhead

### Best Practices

1. **Use Functional Setters**: They're more efficient than get-modify-set patterns
2. **Batch Operations**: Group related updates into single calls
3. **Watch Selectively**: Only watch for changes you actually need
4. **Avoid Frequent Polling**: Use reactive watching instead of polling storage

## Error Handling

### Encryption Errors

```typescript
try {
  const credentials = await storage.getCredentials();
} catch (error) {
  console.error('Failed to decrypt credentials:', error);
  // Handle gracefully - system will log warning and continue
}
```

### Storage Errors

```typescript
try {
  await storage.setCredentials(newCredentials);
} catch (error) {
  console.error('Failed to save credentials:', error);
  // Handle storage failure
}
```

## Testing

### Unit Testing

```typescript
// Mock the storage bucket for testing
jest.mock('@extend-chrome/storage', () => ({
  getBucket: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    valueStream: {
      pipe: jest.fn(),
      subscribe: jest.fn()
    }
  }))
}));
```

### Integration Testing

```typescript
// Test with real storage in integration tests
describe('Storage Integration', () => {
  beforeEach(async () => {
    await storage.clear();
  });

  it('should encrypt and decrypt credentials', async () => {
    const testCredentials = {
      apiKey: 'test-api-key',
      appKey: 'test-app-key',
      site: 'us1',
      isValid: true
    };

    await storage.setCredentials(testCredentials);
    const retrieved = await storage.getCredentials();
    
    expect(retrieved.apiKey).toBe('test-api-key');
    expect(retrieved.appKey).toBe('test-app-key');
  });
});
```

## Development Guidelines

### Adding New Storage Fields

1. Update the `ExtensionStorage` interface in `@/types`
2. Add the field to `DEFAULT_STORAGE` constant
3. Create typed methods in `SecureExtensionStorage` class
4. Add corresponding watch methods if needed
5. Update documentation

### Sensitive Data Guidelines

1. **Always encrypt sensitive data** like API keys, passwords, tokens
2. **Use descriptive field names** that indicate encryption status
3. **Test encryption/decryption** thoroughly
4. **Document security implications** in code comments

### Performance Guidelines

1. **Prefer functional setters** over get-modify-set patterns
2. **Use batch operations** when updating multiple fields
3. **Implement selective watching** rather than watching everything
4. **Cache frequently accessed data** in memory when appropriate

## Troubleshooting

### Common Issues

1. **"Storage not available"** - Check if storage permission is granted
2. **"Decryption failed"** - Check if encryption key is corrupted
3. **"Type errors"** - Ensure all storage operations use correct types
4. **"Watch not firing"** - Check if storage area matches bucket area

### Debug Mode

Enable debug logging for storage operations:

```typescript
// Add debug logging in development
if (process.env.NODE_ENV === 'development') {
  storage.watchAll().subscribe(data => {
    console.log('Storage debug:', data);
  });
}
```

## Conclusion

The new storage system provides a robust, type-safe, and secure foundation for the Datadog Sales Engineering Toolkit. It combines modern Chrome extension storage patterns with enterprise-grade security features, making it both developer-friendly and production-ready.

For questions or contributions, please refer to the main contributing guidelines in the repository root. 