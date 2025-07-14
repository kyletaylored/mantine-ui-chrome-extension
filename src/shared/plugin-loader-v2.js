/**
 * Advanced Plugin Loader with Context Separation
 * Supports background, content, and options execution contexts
 */

import { createLogger } from '@/shared/logger';

const logger = createLogger('PluginLoaderV2');

/**
 * Plugin execution contexts
 */
export const PLUGIN_CONTEXTS = {
  OPTIONS: 'options',
  BACKGROUND: 'background', 
  CONTENT: 'content'
};

/**
 * Context-specific permission mappings
 */
const CONTEXT_PERMISSIONS = {
  [PLUGIN_CONTEXTS.BACKGROUND]: [
    'background', 'alarms', 'notifications', 'webRequest', 'storage',
    'tabs', 'activeTab', 'scripting', 'cookies', 'identity'
  ],
  [PLUGIN_CONTEXTS.CONTENT]: [
    'activeTab', 'scripting', 'storage'
  ],
  [PLUGIN_CONTEXTS.OPTIONS]: [
    'storage', 'tabs', 'activeTab'
  ]
};

class PluginLoaderV2 {
  constructor() {
    this.plugins = new Map();
    this.manifests = new Map();
    this.contextManagers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the plugin loader
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('Initializing Plugin Loader V2');
      await this.discoverPlugins();
      await this.validatePlugins();
      this.initialized = true;
      logger.info(`Loaded ${this.manifests.size} plugins`);
    } catch (error) {
      logger.error('Failed to initialize plugin loader:', error);
      throw error;
    }
  }

  /**
   * Discover all plugins by scanning directories and loading manifests
   */
  async discoverPlugins() {
    try {
      // Use webpack's require.context to discover plugins
      const requireContext = require.context('../plugins', true, /manifest\.json$/);
      
      for (const manifestPath of requireContext.keys()) {
        try {
          const manifest = requireContext(manifestPath);
          const pluginId = this.extractPluginIdFromPath(manifestPath);
          
          // Validate basic manifest structure
          if (!this.isValidManifest(manifest, pluginId)) {
            logger.warn(`Invalid manifest for plugin: ${pluginId}`);
            continue;
          }

          this.manifests.set(pluginId, {
            ...manifest,
            id: pluginId,
            _manifestPath: manifestPath
          });

          logger.debug(`Discovered plugin: ${pluginId}`);
        } catch (error) {
          logger.error(`Failed to load manifest: ${manifestPath}`, error);
        }
      }
    } catch (error) {
      logger.error('Plugin discovery failed:', error);
      // Fallback to manual plugin imports if require.context fails
      await this.fallbackPluginDiscovery();
    }
  }

  /**
   * Extract plugin ID from manifest path
   */
  extractPluginIdFromPath(manifestPath) {
    // Path format: "./plugin-id/manifest.json"
    const matches = manifestPath.match(/\.\/(.+?)\/manifest\.json$/);
    return matches ? matches[1] : null;
  }

  /**
   * Validate manifest structure
   */
  isValidManifest(manifest, pluginId) {
    const required = ['name', 'description', 'version'];
    const hasRequired = required.every(field => manifest[field]);
    
    if (!hasRequired) {
      logger.error(`Plugin ${pluginId} missing required fields:`, required);
      return false;
    }

    // Validate contexts
    if (manifest.contexts) {
      const validContexts = Object.values(PLUGIN_CONTEXTS);
      const invalidContexts = Object.keys(manifest.contexts).filter(
        ctx => !validContexts.includes(ctx)
      );
      
      if (invalidContexts.length > 0) {
        logger.error(`Plugin ${pluginId} has invalid contexts:`, invalidContexts);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate plugin permissions for their declared contexts
   */
  async validatePlugins() {
    for (const [pluginId, manifest] of this.manifests) {
      try {
        await this.validatePluginPermissions(manifest);
        logger.debug(`Validated permissions for plugin: ${pluginId}`);
      } catch (error) {
        logger.error(`Permission validation failed for ${pluginId}:`, error);
        // Remove invalid plugin
        this.manifests.delete(pluginId);
      }
    }
  }

  /**
   * Validate plugin permissions against allowed contexts
   */
  async validatePluginPermissions(manifest) {
    const { permissions = [], contexts = {} } = manifest;
    
    // Check each context the plugin declares
    for (const [context, enabled] of Object.entries(contexts)) {
      if (!enabled) continue;

      const allowedPermissions = CONTEXT_PERMISSIONS[context];
      if (!allowedPermissions) {
        throw new Error(`Unknown context: ${context}`);
      }

      // Validate permissions for this context
      const invalidPermissions = permissions.filter(permission => {
        // Allow URL patterns (origins)
        if (permission.includes('://')) return false;
        // Check against allowed permissions for context
        return !allowedPermissions.includes(permission);
      });

      if (invalidPermissions.length > 0) {
        throw new Error(
          `Invalid permissions for context ${context}: ${invalidPermissions.join(', ')}`
        );
      }
    }
  }

  /**
   * Get all plugins that support a specific context
   */
  getPluginsForContext(context) {
    const plugins = [];
    
    for (const [pluginId, manifest] of this.manifests) {
      if (manifest.contexts && manifest.contexts[context]) {
        plugins.push({
          id: pluginId,
          manifest,
          isEnabled: () => this.isPluginEnabled(pluginId),
          shouldInjectForUrl: (url) => this.shouldInjectForUrl(manifest, url)
        });
      }
    }
    
    return plugins;
  }

  /**
   * Load plugin module for specific context
   */
  async loadPluginForContext(pluginId, context) {
    const manifest = this.manifests.get(pluginId);
    
    if (!manifest) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (!manifest.contexts || !manifest.contexts[context]) {
      logger.debug(`Plugin ${pluginId} does not support context: ${context}`);
      return null;
    }

    try {
      let modulePath;
      
      switch (context) {
        case PLUGIN_CONTEXTS.BACKGROUND:
          modulePath = `../plugins/${pluginId}/background.js`;
          break;
        case PLUGIN_CONTEXTS.CONTENT:
          modulePath = `../plugins/${pluginId}/content.js`;
          break;
        case PLUGIN_CONTEXTS.OPTIONS:
        default:
          modulePath = `../plugins/${pluginId}/index.js`;
          break;
      }

      const module = await import(modulePath);
      
      // Validate module interface
      this.validateModuleInterface(module.default, context, pluginId);
      
      return {
        ...module.default,
        manifest,
        pluginId,
        context
      };
    } catch (error) {
      if (error.message.includes('Cannot resolve module')) {
        logger.debug(`No ${context} module found for plugin: ${pluginId}`);
        return null;
      }
      logger.error(`Failed to load ${context} module for ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Validate that module implements required interface for context
   */
  validateModuleInterface(module, context, pluginId) {
    if (!module) {
      throw new Error(`Plugin ${pluginId} must export a default object`);
    }

    const requiredMethods = {
      [PLUGIN_CONTEXTS.BACKGROUND]: ['initialize'],
      [PLUGIN_CONTEXTS.CONTENT]: ['initialize'],
      [PLUGIN_CONTEXTS.OPTIONS]: []
    };

    const required = requiredMethods[context] || [];
    const missing = required.filter(method => typeof module[method] !== 'function');
    
    if (missing.length > 0) {
      throw new Error(
        `Plugin ${pluginId} ${context} module missing required methods: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Check if plugin should inject into given URL
   */
  shouldInjectForUrl(manifest, url) {
    const { matches = [] } = manifest;
    
    if (matches.length === 0) return false;
    
    // Simple pattern matching
    return matches.some(pattern => {
      if (pattern === '*://*/*') return true;
      
      // Convert simple glob patterns to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\./g, '\\.');
      
      try {
        return new RegExp(regexPattern).test(url);
      } catch {
        return false;
      }
    });
  }

  /**
   * Check if plugin is enabled (placeholder - integrate with storage)
   */
  isPluginEnabled(pluginId) {
    // TODO: Integrate with storage system
    const manifest = this.manifests.get(pluginId);
    return manifest?.core || manifest?.defaultEnabled || false;
  }

  /**
   * Get plugin manifest
   */
  getManifest(pluginId) {
    return this.manifests.get(pluginId);
  }

  /**
   * Get all available plugins
   */
  getAllPlugins() {
    return Array.from(this.manifests.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category) {
    return Array.from(this.manifests.values())
      .filter(manifest => manifest.category === category);
  }

  /**
   * Request Chrome permissions for plugin
   */
  async requestPluginPermissions(pluginId) {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const { permissions = [], matches = [] } = manifest;
    
    if (permissions.length === 0 && matches.length === 0) {
      return true; // No permissions needed
    }

    try {
      // Check if permissions are already granted
      const hasPermissions = await chrome.permissions.contains({
        permissions: permissions.filter(p => !p.includes('://')),
        origins: matches
      });

      if (hasPermissions) {
        return true;
      }

      // Request permissions
      const granted = await chrome.permissions.request({
        permissions: permissions.filter(p => !p.includes('://')),
        origins: matches
      });

      logger.info(`Permissions ${granted ? 'granted' : 'denied'} for plugin: ${pluginId}`);
      return granted;
    } catch (error) {
      logger.error(`Failed to request permissions for ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Fallback plugin discovery for development
   */
  async fallbackPluginDiscovery() {
    logger.warn('Using fallback plugin discovery');
    
    const knownPlugins = [
      'hello-world',
      'rum-injection', 
      'rum-viewer',
      'apm-tracing',
      'event-alerts'
    ];

    for (const pluginId of knownPlugins) {
      try {
        const manifest = await import(`../plugins/${pluginId}/manifest.json`);
        
        if (this.isValidManifest(manifest, pluginId)) {
          this.manifests.set(pluginId, {
            ...manifest,
            id: pluginId
          });
        }
      } catch (error) {
        logger.debug(`Fallback discovery failed for ${pluginId}:`, error.message);
      }
    }
  }

  /**
   * Register context manager for handling plugin lifecycle in specific contexts
   */
  registerContextManager(context, manager) {
    this.contextManagers.set(context, manager);
    logger.debug(`Registered context manager for: ${context}`);
  }

  /**
   * Get context manager
   */
  getContextManager(context) {
    return this.contextManagers.get(context);
  }
}

// Export singleton instance
export const pluginLoaderV2 = new PluginLoaderV2();
export default pluginLoaderV2;