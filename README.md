# Datadog Sales Engineering Toolkit

A comprehensive Chrome extension for Datadog Sales Engineers to enhance their productivity and streamline customer interactions.

## 🔧 Architecture

### Storage System

The extension uses a modern, type-safe storage system built on `@extend-chrome/storage`:

- **Secure**: Automatic encryption for sensitive data (API keys)
- **Type-Safe**: Full TypeScript support for all operations
- **Reactive**: RxJS-style observables for storage changes
- **Efficient**: Functional setters with batched operations

```typescript
import { storage } from '@/shared/storage';

// Type-safe credential storage with auto-encryption
await storage.setCredentials({
  apiKey: 'your-api-key',    // Automatically encrypted
  appKey: 'your-app-key',    // Automatically encrypted
  site: 'us1',
  isValid: true
});

// Watch for changes
storage.watchCredentials().subscribe(newCredentials => {
  console.log('Credentials updated:', newCredentials);
});
```

📖 **[Full Storage Documentation](./docs/STORAGE.md)**

### Notification System

The extension uses a centralized notification system built on `@extend-chrome/notify`:

- **Automatic Event Handling**: Click, button, and close events managed automatically
- **Data Persistence**: Notification metadata stored and retrieved seamlessly
- **Type-Safe**: Full TypeScript support with proper interfaces
- **Plugin Integration**: Easy integration for custom notifications

```typescript
import { showNotification, createNotification } from '@/shared/notifications';

// Simple notification
await showNotification('Alert', 'Something happened');

// Advanced notification with actions
await createNotification({
  title: 'Event Alert',
  message: 'Critical issue detected',
  priority: 2,
  buttons: [{ title: 'View Dashboard' }],
  data: {
    dashboardUrl: 'https://app.datadoghq.com/dashboard',
    eventId: 'evt_123456'
  }
});
```

📖 **[Full Notification Documentation](./docs/NOTIFICATIONS.md)**

## 📦 Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Load in Chrome: Go to `chrome://extensions/`, enable Developer mode, and load the `dist` folder

## 🚀 Development

```bash
# Install dependencies
npm install

# Build for development
npm run build

# Build for production
npm run build:prod

# Watch for changes
npm run watch
```

## 🔐 Security Features

- **Encrypted Storage**: Sensitive data is automatically encrypted using AES
- **Key Management**: Per-installation encryption keys
- **Secure Defaults**: All storage operations are secure by default
- **Type Safety**: Compile-time checks prevent security issues

## 🧩 Plugin System

The extension supports a modular plugin system:

- **Core Plugins**: Always enabled (APM Tracing, RUM Extraction)
- **Optional Plugins**: Can be toggled by users
- **Type-Safe**: All plugins are fully typed

## 📋 Features

- **Credential Management**: Secure storage of Datadog API keys
- **APM Tracing**: Real-time application monitoring
- **RUM Session Data**: User experience analytics
- **Event Alerts**: Configurable notifications
- **Helpful Links**: Quick access to resources

## 🤝 Contributing

1. Read the [Contributing Guidelines](./CONTRIBUTING.md)
2. Review the [Storage Documentation](./docs/STORAGE.md)
3. Follow the established patterns and conventions
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the [Storage Documentation](./docs/STORAGE.md)
2. Review existing issues
3. Create a new issue with detailed information 