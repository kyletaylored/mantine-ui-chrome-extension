/**
 * @typedef {Object} PluginManifest
 * @property {string} id - Unique identifier for the plugin (kebab-case)
 * @property {string} name - Human-readable name of the plugin
 * @property {string} description - Brief description of the plugin
 * @property {string} version - Semantic version string
 * @property {string} [author] - Author of the plugin
 * @property {'monitoring' | 'injection' | 'utility'} [category] - Plugin category
 * @property {string} [icon] - Icon name (PascalCase) from available icons
 * @property {string[]} [permissions] - List of Chrome permissions required
 * @property {Object.<string, boolean>} [contexts] - Execution contexts ({ background: true, content: true })
 * @property {string[]} [matches] - URL patterns for content script injection
 * @property {boolean} [core] - Whether the plugin is essential and cannot be disabled
 * @property {boolean} [defaultEnabled] - Whether the plugin is enabled by default
 * @property {Object.<string, PluginSetting>} [settings] - Configuration schema
 */

/**
 * @typedef {Object} PluginSetting
 * @property {'boolean' | 'string' | 'number' | 'select'} type - Data type of the setting
 * @property {string} title - Display title
 * @property {string} description - Helper text
 * @property {any} default - Default value
 * @property {number} [minimum] - Min value for numbers
 * @property {number} [maximum] - Max value for numbers
 * @property {string[]} [options] - Options for select type
 */

/**
 * @typedef {Object} PluginModule
 * @property {PluginManifest} manifest - The plugin's manifest
 * @property {Object} [settings] - Current runtime settings
 * @property {boolean} [initialized] - Initialization state
 * @property {Function} [initialize] - Called when the plugin is loaded
 * @property {Function} [cleanup] - Called when the plugin is disabled
 * @property {Function} [handleMessage] - Handler for inter-plugin/extension messages
 * @property {Function} [runContentScript] - Entry point for content script logic
 * @property {Function} [renderComponent] - React component for UI rendering
 */

export const Types = {};
