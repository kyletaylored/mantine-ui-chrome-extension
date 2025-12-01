# Notification System

The extension uses a centralized notification system built on top of the [`@extend-chrome/notify`](https://github.com/extend-chrome/notify) package to provide a consistent, type-safe API for Chrome notifications.

## Architecture

### Core Components

- **`src/shared/notifications.ts`**: Main notification service with automatic event handling
- **`NotificationService`**: Singleton service managing all notification operations
- **`@extend-chrome/notify`**: Underlying library providing Chrome notifications abstraction

### Key Features

- **Automatic Data Persistence**: Notification metadata is stored and retrieved automatically
- **Event Handling**: Click, button click, and close events are handled centrally
- **Type Safety**: Full TypeScript support with proper interfaces
- **Storage Integration**: Uses `@extend-chrome/storage` for consistent data management

## Usage

### Basic Usage

```typescript
import { showNotification, createNotification } from '@/shared/notifications';

// Simple notification
await showNotification('Title', 'Message');

// Advanced notification with options
await createNotification({
  title: 'Event Alert',
  message: 'Critical issue detected',
  type: 'basic',
  priority: 2,
  requireInteraction: true,
  buttons: [
    { title: 'View Dashboard' },
    { title: 'Dismiss' }
  ],
  data: {
    dashboardUrl: 'https://app.datadoghq.com/dashboard',
    eventId: 'evt_123456'
  }
});
```

### Plugin Integration

```typescript
import { notificationService } from '@/shared/notifications';

// Create plugin-specific notification
await notificationService.create({
  title: 'Plugin Alert',
  message: 'Operation completed',
  data: {
    pluginId: 'my-plugin',
    operation: 'sync'
  }
});
```

## API Reference

### NotificationService Methods

#### `create(options: ExtensionNotificationOptions): Promise<string>`
Creates a new notification with automatic data persistence.

**Parameters:**
- `options`: Notification configuration object

**Returns:** Promise resolving to the notification ID

#### `show(title: string, message: string, options?: Partial<ExtensionNotificationOptions>): Promise<string>`
Creates a simple notification with title and message.

#### `clear(notificationId: string): Promise<void>`
Clears a specific notification and its stored data.

#### `clearAll(): Promise<void>`
Clears all notifications and their stored data.

#### `getAll(): Promise<any>`
Returns all active notifications.

#### `getNotificationData(notificationId: string): Promise<NotificationData | undefined>`
Retrieves stored data for a specific notification.

### ExtensionNotificationOptions Interface

```typescript
interface ExtensionNotificationOptions {
  type?: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title: string;
  message: string;
  priority?: number;
  requireInteraction?: boolean;
  silent?: boolean;
  buttons?: Array<{ title: string; iconUrl?: string }>;
  tag?: string;
  data?: Record<string, any>;
}
```

### NotificationData Interface

```typescript
interface NotificationData {
  eventId?: string;
  dashboardUrl?: string;
  data?: Record<string, any>;
}
```

## Event Handling

The notification service automatically handles all Chrome notification events:

### Click Events
- **Action**: Opens dashboard URL if provided in notification data
- **Cleanup**: Automatically clears notification and stored data

### Button Click Events
- **Action**: Executes button-specific actions (URL opening, custom actions)
- **Messaging**: Sends custom messages for button actions
- **Cleanup**: Clears notification after action

### Close Events
- **Cleanup**: Removes stored notification data when notifications are closed

## Convenience Functions

The module exports several convenience functions for common operations:

```typescript
// Direct exports for common operations
export const createNotification = (options: ExtensionNotificationOptions) => 
  notificationService.create(options);

export const showNotification = (title: string, message: string, options?: Partial<ExtensionNotificationOptions>) => 
  notificationService.show(title, message, options);

export const clearNotification = (notificationId: string) => 
  notificationService.clear(notificationId);

export const clearAllNotifications = () => 
  notificationService.clearAll();

export const getAllNotifications = () => 
  notificationService.getAll();
```

## Plugin Integration

### Event Alerts Plugin

The event alerts plugin uses the notification service for Chrome notifications:

```typescript
import { notificationService } from '@/shared/notifications';

// Create event alert notification
await notificationService.create({
  title: config.title,
  message: config.message,
  priority: config.priority,
  data: {
    eventId: event.id,
    dashboardUrl: event.dashboardUrl,
    buttons: config.actions
  }
});
```

### Custom Plugins

Plugins can create their own notification types:

```typescript
import { notificationService } from '@/shared/notifications';

// Plugin-specific notification
await notificationService.create({
  title: 'Plugin Status',
  message: 'Sync completed successfully',
  data: {
    pluginId: 'my-plugin',
    operation: 'sync',
    timestamp: Date.now()
  }
});
```

## Background Script Integration

The notification service automatically handles Chrome notification events, eliminating the need for manual event listeners in the background script. The service:

1. **Registers Event Listeners**: Automatically sets up `onClicked`, `onButtonClicked`, and `onClosed` listeners
2. **Handles Data Persistence**: Stores and retrieves notification metadata
3. **Manages Cleanup**: Removes stored data when notifications are closed or clicked

## Storage Integration

The notification service uses the `@extend-chrome/storage` abstraction for data persistence:

- **Bucket**: `notifications` - stores notification metadata
- **Data Structure**: `Record<string, NotificationData>` - maps notification IDs to data
- **Cleanup**: Automatic cleanup when notifications are closed

## Best Practices

### 1. Use Descriptive Titles and Messages
```typescript
await showNotification(
  'Datadog Event Alert',
  'Critical error detected in production environment'
);
```

### 2. Include Dashboard Links
```typescript
await createNotification({
  title: 'Alert Triggered',
  message: 'View details in Datadog dashboard',
  data: {
    dashboardUrl: 'https://app.datadoghq.com/dashboard/abc-123'
  }
});
```

### 3. Use Appropriate Priority Levels
```typescript
await createNotification({
  title: 'Critical Alert',
  message: 'Immediate attention required',
  priority: 2, // Highest priority
  requireInteraction: true
});
```

### 4. Provide Action Buttons
```typescript
await createNotification({
  title: 'Event Alert',
  message: 'Multiple issues detected',
  buttons: [
    { title: 'View Dashboard' },
    { title: 'Acknowledge' }
  ],
  data: {
    dashboardUrl: 'https://app.datadoghq.com/dashboard',
    buttons: [
      { action: 'open-dashboard' },
      { action: 'acknowledge' }
    ]
  }
});
```

## Migration from Direct Chrome API

If you're migrating from direct Chrome API usage:

### Before
```typescript
chrome.notifications.create({
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icons/icon48.png'),
  title: 'Alert',
  message: 'Something happened'
});
```

### After
```typescript
import { showNotification } from '@/shared/notifications';

await showNotification('Alert', 'Something happened');
```

## Testing

The notification service can be tested using the `@extend-chrome/jest-chrome` mock:

```typescript
import { notificationService } from '@/shared/notifications';

// Test notification creation
it('should create notification with proper data', async () => {
  const notificationId = await notificationService.create({
    title: 'Test',
    message: 'Test message',
    data: { test: true }
  });
  
  expect(notificationId).toBeDefined();
  
  const data = await notificationService.getNotificationData(notificationId);
  expect(data).toEqual({ test: true });
});
```

## Troubleshooting

### Common Issues

1. **Notifications not showing**: Check that the `notifications` permission is included in `manifest.json`
2. **Data not persisting**: Ensure the storage system is properly initialized
3. **Event handlers not working**: Verify that the notification service is imported in the background script

### Debug Mode

Enable debug logging to troubleshoot notification issues:

```typescript
import { notificationService } from '@/shared/notifications';

// The service automatically logs notification events in development mode
console.log('Notification service initialized');
```

## 🧭 Navigation

| [< Previous: Messaging](./messages.md) | [Next: Storage >](./storage.md) |
| :--- | :--- | 