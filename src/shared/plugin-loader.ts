import { PluginModule } from '@/types';
import { createLogger } from '@/shared/logger';

const logger = createLogger('PluginLoader');

// Auto-discover plugins using import.meta.glob
// Note: This requires Vite/Webpack support for import.meta.glob
const pluginModules = (import.meta as any).glob('../plugins/**/index.ts', { 
  eager: true 
}) as Record<string, { default: PluginModule }>;

export class PluginLoader {
  private static instance: PluginLoader | null = null;
  private plugins: Map<string, PluginModule> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /**
   * Initialize the plugin loader and discover all plugins
   */
  async initialize(): Promise<void> {
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
   */
  getPlugins(): PluginModule[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID
   */
  getPlugin(id: string): PluginModule | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all core plugins (always enabled)
   */
  getCorePlugins(): PluginModule[] {
    return this.getPlugins().filter(plugin => plugin.manifest.core);
  }

  /**
   * Get all optional plugins (user-toggleable)
   */
  getOptionalPlugins(): PluginModule[] {
    return this.getPlugins().filter(plugin => !plugin.manifest.core);
  }

  /**
   * Get plugins that should be enabled by default
   */
  getDefaultEnabledPlugins(): PluginModule[] {
    return this.getPlugins().filter(plugin => 
      plugin.manifest.core || plugin.manifest.defaultEnabled
    );
  }

  /**
   * Get plugins that have content scripts
   */
  getContentScriptPlugins(): PluginModule[] {
    return this.getPlugins().filter(plugin => 
      plugin.runContentScript && plugin.manifest.matches?.length
    );
  }

  /**
   * Get plugins that match a specific URL
   */
  getPluginsForUrl(url: string): PluginModule[] {
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
   */
  async initializePlugin(pluginId: string): Promise<void> {
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
   */
  async cleanupPlugin(pluginId: string): Promise<void> {
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
   */
  async handlePluginMessage(pluginId: string, message: any): Promise<any> {
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
   */
  getPluginManifests(): Array<{ id: string; manifest: PluginModule['manifest'] }> {
    return this.getPlugins().map(plugin => ({
      id: plugin.manifest.id,
      manifest: plugin.manifest
    }));
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Get loading statistics
   */
  getStats(): { total: number; core: number; optional: number; contentScript: number } {
    const plugins = this.getPlugins();
    return {
      total: plugins.length,
      core: plugins.filter(p => p.manifest.core).length,
      optional: plugins.filter(p => !p.manifest.core).length,
      contentScript: plugins.filter(p => p.runContentScript && p.manifest.matches?.length).length
    };
  }
}

// Export singleton instance
export const pluginLoader = PluginLoader.getInstance(); 