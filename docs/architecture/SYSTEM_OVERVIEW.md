---
title: System Overview
parent: System Architecture
nav_order: 1
---
# System Overview

This document provides a comprehensive overview of the Datadog Sales Engineering Toolkit's architecture, components, and data flow.

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│  │   Popup     │   │   Options   │   │   Content   │            │
│  │    (UI)     │   │    (UI)     │   │   Script    │            │
│  └─────────────┘   └─────────────┘   └─────────────┘            │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Background Script                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │ │
│  │  │  Storage    │ │  Messages   │ │Notifications│          │ │
│  │  │  Manager    │ │  Handler    │ │  Manager    │          │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **Background Script** (`src/background/background.ts`)
- **Purpose**: Long-running service worker that handles extension lifecycle
- **Responsibilities**:
  - Message routing between contexts
  - Storage management
  - Notification handling
  - Plugin lifecycle management
  - Chrome API interactions

#### 2. **Storage System** (`src/shared/storage.ts`)
- **Purpose**: Type-safe, encrypted data persistence
- **Built on**: `@extend-chrome/storage`
- **Features**:
  - Automatic encryption for sensitive data
  - Plugin-specific storage buckets
  - Reactive updates with observables
  - Functional setters for immutable updates

#### 3. **Messaging System** (`src/shared/messages.ts`)
- **Purpose**: Type-safe inter-context communication
- **Built on**: `@extend-chrome/messages`
- **Features**:
  - Async/await support
  - Type-safe message definitions
  - Automatic error handling
  - Request/response patterns

#### 4. **Notification System** (`src/shared/notifications.ts`)
- **Purpose**: Centralized notification management
- **Built on**: `@extend-chrome/notify`
- **Features**:
  - Automatic event handling
  - Persistent metadata storage
  - Button actions and click handling
  - Automatic cleanup

#### 5. **Plugin System** (`src/plugins/`)
- **Purpose**: Modular functionality extensions
- **Types**:
  - **Core Plugins**: Always enabled (RUM Extraction, APM Tracing)
  - **Optional Plugins**: User-toggleable (Event Alerts, RUM Injection)

#### 6. **UI Components**
- **Popup** (`src/popup/`): Quick access interface
- **Options** (`src/options/`): Full configuration interface
- **Content Scripts** (`src/content/`): Page interaction scripts

## 🔄 Data Flow

### 1. User Interaction Flow

```
User Action → UI Component → Message → Background Script → Storage/API → Response
```

**Example**: User saves credentials
1. User enters credentials in `CredentialsPage.tsx`
2. Component calls `storage.setCredentials()`
3. Storage system encrypts and persists data
4. UI receives confirmation and updates state

### 2. Plugin Communication Flow

```
Plugin Component → Message → Background Script → Plugin Handler → Response
```

**Example**: Plugin generates notification
1. Plugin component triggers action
2. Message sent to background script
3. Background script processes via notification system
4. Browser notification displayed to user

### 3. Storage Update Flow

```
Storage Update → Observable → Subscribers → UI Update
```

**Example**: Settings change
1. Settings updated in storage
2. Observable emits change event
3. Subscribed components receive update
4. UI re-renders with new data

## 🗄️ Storage Architecture

### Storage Structure

```typescript
interface ExtensionStorage {
  // User credentials (encrypted)
  credentials: {
    apiKey: string;      // Encrypted
    appKey: string;      // Encrypted
    site: string;        // Plain text
    isValid: boolean;    // Plain text
  };
  
  // Plugin configurations
  plugins: Plugin[];
  
  // Global settings
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoUpdates: boolean;
  };
  
  // Application state
  ui: {
    activeTab: string;
    sidebarCollapsed: boolean;
  };
}
```

### Plugin Storage

Each plugin gets its own isolated storage bucket:

```typescript
// Plugin-specific storage
const pluginStorage = SecureExtensionStorage.createPluginBucket<MyData>('my-plugin');
await pluginStorage.set(() => ({ myData: 'value' }));
```

### Encryption Strategy

- **Sensitive Data**: API keys, app keys automatically encrypted
- **Plugin Data**: Optional encryption based on plugin needs
- **UI State**: Plain text for performance
- **Settings**: Mixed based on sensitivity

## 📨 Messaging Architecture

### Message Types

```typescript
interface MessageTypes {
  // Plugin actions
  PLUGIN_ACTION: { pluginId: string; action: string; data?: any };
  
  // Storage operations
  STORAGE_UPDATE: { key: string; value: any };
  
  // Notifications
  SHOW_NOTIFICATION: { title: string; message: string; options?: any };
  
  // Content script communication
  INJECT_SCRIPT: { script: string; data?: any };
}
```

### Message Flow

1. **Sender**: Creates type-safe message
2. **Runtime**: Routes message to appropriate handler
3. **Handler**: Processes message and generates response
4. **Response**: Returns result to sender

## 🔔 Notification Architecture

### Notification Flow

```
Trigger → NotificationService → Chrome API → User Display
   ↓
Metadata Storage → Event Handling → Action Processing
```

### Event Handling

- **Click Events**: Automatic handling and routing
- **Button Actions**: Custom action processing
- **Close Events**: Automatic cleanup
- **Data Persistence**: Metadata storage and retrieval

## 🧩 Plugin Architecture

### Plugin Structure

```typescript
interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  component: React.ComponentType<any>;
  enabled: boolean;
  isCore: boolean;
  settings: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}
```

### Plugin Lifecycle

1. **Registration**: Plugin registers with system
2. **Initialization**: Plugin initializes on enable
3. **Runtime**: Plugin processes messages and updates
4. **Cleanup**: Plugin cleans up on disable

### Plugin Types

#### Core Plugins
- **Always Enabled**: Cannot be disabled by users
- **System Critical**: Required for basic functionality
- **Auto-loaded**: Loaded on extension startup

#### Optional Plugins
- **User Controlled**: Can be enabled/disabled
- **Feature Extensions**: Add additional functionality
- **On-demand**: Loaded when enabled

## 🎨 UI Architecture

### Component Structure

```
OptionsApp
├── Navigation
├── Pages
│   ├── DashboardPage
│   ├── CredentialsPage
│   ├── PluginsPage
│   ├── SettingsPage
│   └── LinksPage
└── Common Components
    ├── LoadingState
    ├── ErrorBoundary
    └── StatusIndicator
```

### State Management

- **Local State**: React hooks for component state
- **Shared State**: Storage system for persistent data
- **Context**: React Context for cross-component communication

### UI Patterns

- **Tabs**: Mantine Tabs for navigation
- **Cards**: Mantine Cards for content sections
- **Forms**: Mantine form components with validation
- **Notifications**: Mantine notifications for user feedback

## 🔐 Security Architecture

### Security Layers

1. **Storage Encryption**: Automatic encryption of sensitive data
2. **Message Validation**: Type-safe message handling
3. **Permission Control**: Chrome extension permissions
4. **Input Validation**: Form validation and sanitization

### Threat Model

- **Data Exposure**: Mitigated by encryption and secure storage
- **Message Injection**: Mitigated by type-safe messaging
- **Permission Abuse**: Mitigated by minimal permissions
- **Code Injection**: Mitigated by Content Security Policy

## 🚀 Performance Architecture

### Optimization Strategies

1. **Lazy Loading**: Plugins loaded on-demand
2. **Efficient Storage**: Minimal storage operations
3. **Batched Updates**: Grouped UI updates
4. **Memory Management**: Proper cleanup and disposal

### Monitoring

- **Error Tracking**: Console logging and error boundaries
- **Performance Metrics**: Load times and response times
- **User Feedback**: Built-in feedback mechanisms

## 🔧 Development Architecture

### Build System

```
Source Code → TypeScript → Webpack → Chrome Extension
     ↓
Type Checking → Linting → Bundling → Distribution
```

### Development Tools

- **TypeScript**: Type safety and developer experience
- **Webpack**: Module bundling and optimization
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting

### Testing Strategy

- **Unit Tests**: Component and function testing
- **Integration Tests**: Cross-module testing
- **Manual Tests**: Chrome extension testing
- **End-to-End**: Complete workflow testing

## 📊 Monitoring & Debugging

### Debugging Tools

- **Chrome DevTools**: Extension debugging
- **Console Logging**: Structured logging
- **Error Boundaries**: React error handling
- **Storage Inspector**: Storage state inspection

### Performance Monitoring

- **Load Times**: Extension startup performance
- **Memory Usage**: Runtime memory consumption
- **User Interactions**: UI responsiveness
- **API Calls**: External API performance

## 🔄 Extension Lifecycle

### Installation
1. Extension installed in Chrome
2. Background script initializes
3. Storage system sets up
4. Core plugins auto-enabled

### Runtime
1. User opens popup/options
2. UI components render
3. User interactions processed
4. Data persisted to storage

### Updates
1. Extension updated
2. Migration scripts run
3. New features enabled
4. User notified of changes

### Uninstall
1. Extension removed
2. Storage cleaned up
3. Background script terminated
4. User data removed

---

This architecture provides a robust, scalable, and maintainable foundation for the Datadog Sales Engineering Toolkit. Each component is designed to be independent, testable, and extensible while maintaining strong type safety and security. 