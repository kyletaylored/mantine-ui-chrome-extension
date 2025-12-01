# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
```bash
# Production build
npm run build

# Development build
npm run build:dev

# Watch mode (rebuilds on file changes)
npm run watch

# Run tests
npm run test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Plugin Development
```bash
# Generate new plugin with interactive prompts
npm run generate-plugin
# or
npm run new-plugin

# Example usage:
node scripts/generate-plugin.js
```

### Loading Extension
After building, load the `dist/` folder in Chrome at `chrome://extensions/` (ensure Developer Mode is enabled).

## Architecture Overview

### Chrome Extension Structure
This is a Manifest V3 Chrome extension with the following key components:

- **Background Script** (`src/background/background.ts`): Service worker handling extension lifecycle, API calls, and plugin coordination
- **Content Script** (`src/content/content.ts`): Injected into web pages for DOM manipulation and data extraction
- **Popup** (`src/popup/`): Extension popup UI built with React and Mantine
- **Options Page** (`src/options/`): Extension settings page with comprehensive configuration

### Plugin System Architecture
The extension uses a sophisticated plugin system:

1. **Plugin Discovery**: Auto-discovers plugins using webpack's `import.meta.glob` from `src/plugins/*/index.ts`
2. **Plugin Loader** (`src/shared/plugin-loader.ts`): Singleton managing plugin lifecycle, initialization, and message handling
3. **Plugin Types**: Core plugins (always enabled) vs optional plugins (user-toggleable)
4. **Plugin Structure**: Each plugin has:
   - `manifest.json` - Plugin metadata and settings schema
   - `index.ts` - Entry point with PluginModule interface
   - `component.tsx` - React component for UI
   - `config.ts` - Configuration defaults
   - `types.ts` - TypeScript interfaces

### Key Systems

#### Storage System
- Built on `@extend-chrome/storage` for type-safe, encrypted storage
- Centralized storage management in `src/shared/storage.ts`
- Supports plugin-specific storage buckets
- Handles credentials, settings, and plugin data

#### Messaging System
- Centralized message handling in background script
- Type-safe message passing between contexts
- Plugin-specific message routing
- Supports both sync and async message handling

#### Notification System
- Built on `@extend-chrome/notify`
- Supports both Chrome notifications and in-page notifications
- Automatic event handling and metadata persistence

## Plugin Development Workflow

### Creating a New Plugin
1. Run `npm run generate-plugin` for interactive scaffolding
2. This creates the complete plugin structure in `src/plugins/your-plugin/`
3. Plugin is automatically discovered and loaded by the plugin system

### Plugin Interface
All plugins must implement the `PluginModule` interface:
```typescript
interface PluginModule {
  manifest: PluginManifest;
  renderComponent: () => JSX.Element;
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  handleMessage?: (message: any) => Promise<any>;
  runContentScript?: (settings: any) => Promise<void>;
}
```

### Plugin Categories
- **Core Plugins** (`manifest.core: true`): Always enabled, essential functionality
- **Optional Plugins** (`manifest.core: false`): User-toggleable, enhanced features

## Code Conventions

### File Structure
- Use absolute imports with `@/` alias (points to `src/`)
- Follow established patterns in existing plugins
- Keep plugin-specific code within plugin directories

### TypeScript
- Strict TypeScript configuration
- Define interfaces for all data structures
- Use proper typing, avoid `any`
- Plugin settings must match manifest schema

### React/UI
- Use Mantine UI components consistently
- Follow functional component patterns with hooks
- Use established UI patterns from existing components
- Implement proper error handling and loading states

## Testing and Quality

### Manual Testing
1. Run `npm run build` to build the extension
2. Load `dist/` folder in Chrome extensions
3. Test all functionality thoroughly
4. Verify TypeScript compilation passes
5. Ensure linting passes with `npm run lint`

### Key Testing Areas
- Plugin loading and initialization
- Settings persistence across sessions
- Message passing between contexts
- UI responsiveness and error handling
- Cross-plugin interactions

## Development Notes

### Webpack Configuration
- Uses custom webpack config for Chrome extension bundling
- Supports TypeScript, React, and CSS processing
- Includes source maps for debugging
- Copies manifest and assets to dist folder

### Background Script Patterns
- Handles all Chrome extension API calls
- Manages plugin lifecycle and coordination
- Provides centralized credential validation
- Implements comprehensive logging with debug levels

### Content Script Manager
- Manages injection of content scripts across tabs
- Handles plugin-specific content script execution
- Provides communication bridge between page and extension

## Common Issues and Solutions

### Plugin Not Loading
- Check plugin manifest.json is valid
- Verify plugin exports default PluginModule
- Ensure plugin is in correct directory structure
- Check browser console for initialization errors

### Type Errors
- Ensure all plugin interfaces are properly typed
- Check manifest schema matches TypeScript definitions
- Use proper imports with `@/` alias

### Build Issues
- Clear node_modules and reinstall if needed
- Check webpack configuration for any conflicts
- Verify all dependencies are properly installed