import { createLogger } from '@/shared/logger';

const logger = createLogger('PluginLoader');

// Auto-discover plugins using webpack's require.context
// This dynamically imports all plugin index.js files
function getPluginModules() {
  const pluginModules = {};
  
  try {
    // Use require.context to dynamically import plugin modules
    const requireContext = require.context('../plugins', true, /index\.js$/);
    
    requireContext.keys().forEach(key => {
      // Convert ./plugin-name/index.js to plugin-name
      const pluginPath = key.replace('./', '').replace('/index.js', '');
      pluginModules[`../plugins/${key.substring(2)}`] = requireContext(key);
    });
  } catch (error) {
    console.warn('Plugin auto-discovery failed, falling back to manual imports:', error);
    
    // Fallback: manually import known plugins
    try {
      pluginModules['../plugins/apm-tracing/index.js'] = require('../plugins/apm-tracing/index.js');
    } catch (e) { /* ignore */ }
    
    try {
      pluginModules['../plugins/event-alerts/index.js'] = require('../plugins/event-alerts/index.js');
    } catch (e) { /* ignore */ }
    
    try {
      pluginModules['../plugins/rum-injection/index.js'] = require('../plugins/rum-injection/index.js');
    } catch (e) { /* ignore */ }
    
    try {
      pluginModules['../plugins/rum-viewer/index.js'] = require('../plugins/rum-viewer/index.js');
    } catch (e) { /* ignore */ }
  }
  
  return pluginModules;
}

const pluginModules = getPluginModules();

/**
 * Plugin Loader - Manages plugin discovery, loading, and lifecycle
 * 
 * @typedef {Object} PluginManifest
 * @property {string} id - Unique plugin identifier
 * @property {string} name - Display name
 * @property {string} description - Plugin description
 * @property {string} version - Plugin version
 * @property {boolean} core - Whether plugin is core (always enabled)
 * @property {boolean} [defaultEnabled] - Whether plugin is enabled by default
 * @property {string} [icon] - Icon name/path
 * @property {string[]} [permissions] - Required permissions
 * @property {string[]} [matches] - URL patterns for content scripts
 * 
 * @typedef {Object} PluginModule
 * @property {PluginManifest} manifest - Plugin manifest data
 * @property {Function} [initialize] - Plugin initialization function
 * @property {Function} [cleanup] - Plugin cleanup function
 * @property {Function} [handleMessage] - Message handler function
 * @property {Function} [runContentScript] - Content script runner
 * @property {Function} [renderComponent] - UI component renderer
 */
export class PluginLoader {
  constructor() {
    /** @type {Map<string, PluginModule>} */
    this.plugins = new Map();
    /** @type {boolean} */
    this.initialized = false;
  }

  static getInstance() {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /**
   * Initialize the plugin loader and discover all plugins
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing plugin loader...');
    
    // Load all discovered plugins
    let loadedCount = 0;
    let errorCount = 0;

    for (const [path, module] of Object.entries(pluginModules)) {
      try {
        const plugin = module.default;
        
        // Validate plugin structure
        if (!plugin || !plugin.manifest || !plugin.manifest.id) {
          logger.error(`Invalid plugin structure at ${path}`, plugin);
          errorCount++;
          continue;
        }

        // Check for duplicate plugin IDs
        if (this.plugins.has(plugin.manifest.id)) {
          logger.error(`Duplicate plugin ID "${plugin.manifest.id}" found at ${path}`);
          errorCount++;
          continue;
        }

        this.plugins.set(plugin.manifest.id, plugin);
        loadedCount++;
        
        logger.info(`Loaded plugin: ${plugin.manifest.id} (${plugin.manifest.name})`);
      } catch (error) {
        logger.error(`Failed to load plugin from ${path}`, error);
        errorCount++;
      }
    }

    this.initialized = true;
    logger.info(`Plugin loader initialized: ${loadedCount} plugins loaded, ${errorCount} errors`);
  }

  /**
   * Get all loaded plugins
   * @returns {PluginModule[]}
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID
   * @param {string} id - Plugin ID
   * @returns {PluginModule|undefined}
   */
  getPlugin(id) {
    return this.plugins.get(id);
  }

  /**
   * Get all core plugins (always enabled)
   * @returns {PluginModule[]}
   */
  getCorePlugins() {
    return this.getPlugins().filter(plugin => plugin.manifest.core);
  }

  /**
   * Get all optional plugins (user-toggleable)
   * @returns {PluginModule[]}
   */
  getOptionalPlugins() {
    return this.getPlugins().filter(plugin => !plugin.manifest.core);
  }

  /**
   * Get plugins that should be enabled by default
   * @returns {PluginModule[]}
   */
  getDefaultEnabledPlugins() {
    return this.getPlugins().filter(plugin => 
      plugin.manifest.core || plugin.manifest.defaultEnabled
    );
  }

  /**
   * Get plugins that have content scripts
   * @returns {PluginModule[]}
   */
  getContentScriptPlugins() {
    return this.getPlugins().filter(plugin => 
      plugin.runContentScript && plugin.manifest.matches?.length
    );
  }

  /**
   * Get plugins that match a specific URL
   * @param {string} url - URL to match against
   * @returns {PluginModule[]}
   */
  getPluginsForUrl(url) {
    return this.getContentScriptPlugins().filter(plugin => {
      if (!plugin.manifest.matches) return false;
      
      return plugin.manifest.matches.some(pattern => {
        // Convert match pattern to regex
        const regex = new RegExp(
          pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '\\?')
            .replace(/\./g, '\\.')
        );
        return regex.test(url);
      });
    });
  }

  /**
   * Initialize a specific plugin
   * @param {string} pluginId - Plugin ID to initialize
   * @returns {Promise<void>}
   */
  async initializePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      logger.error(`Plugin not found`, { pluginId });
      return;
    }

    try {
      if (plugin.initialize) {
        await plugin.initialize();
        logger.info(`Initialized plugin: ${pluginId}`);
      }
    } catch (error) {
      logger.error(`Failed to initialize plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup a specific plugin
   * @param {string} pluginId - Plugin ID to cleanup
   * @returns {Promise<void>}
   */
  async cleanupPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      logger.error(`Plugin not found`, { pluginId });
      return;
    }

    try {
      if (plugin.cleanup) {
        await plugin.cleanup();
        logger.info(`Cleaned up plugin: ${pluginId}`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Handle a message for a specific plugin
   * @param {string} pluginId - Plugin ID
   * @param {any} message - Message to handle
   * @returns {Promise<any>}
   */
  async handlePluginMessage(pluginId, message) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      logger.error(`Plugin not found`, { pluginId });
      return { success: false, error: 'Plugin not found' };
    }

    try {
      if (plugin.handleMessage) {
        return await plugin.handleMessage(message);
      } else {
        logger.warn(`Plugin ${pluginId} does not support messages`);
        return { success: false, error: 'Plugin does not support messages' };
      }
    } catch (error) {
      logger.error(`Failed to handle message for plugin ${pluginId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get plugin manifest information
   * @returns {Array<{id: string, manifest: PluginManifest}>}
   */
  getPluginManifests() {
    return this.getPlugins().map(plugin => ({
      id: plugin.manifest.id,
      manifest: plugin.manifest
    }));
  }

  /**
   * Check if a plugin is loaded
   * @param {string} id - Plugin ID
   * @returns {boolean}
   */
  isPluginLoaded(id) {
    return this.plugins.has(id);
  }

  /**
   * Get plugin count
   * @returns {number}
   */
  getPluginCount() {
    return this.plugins.size;
  }

  /**
   * Get loading statistics
   * @returns {{total: number, core: number, optional: number, contentScript: number}}
   */
  getStats() {
    const plugins = this.getPlugins();
    return {
      total: plugins.length,
      core: plugins.filter(p => p.manifest.core).length,
      optional: plugins.filter(p => !p.manifest.core).length,
      contentScript: plugins.filter(p => p.runContentScript && p.manifest.matches?.length).length
    };
  }
}

// Static instance property
PluginLoader.instance = null;

// Export singleton instance
export const pluginLoader = PluginLoader.getInstance();