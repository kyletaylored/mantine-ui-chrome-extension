// src/shared/storage.js
import { getBucket } from '@extend-chrome/storage';
import { createLogger } from '@/shared/logger';
import { DEFAULT_DOCUMENTS } from '@/shared/values';

const logger = createLogger('Storage');

const DEFAULT_STORAGE = {
  credentials: {
    apiKey: '',
    appKey: '',
    site: '',
    isValid: false
  },
  links: DEFAULT_DOCUMENTS,
  plugins: [],
  settings: {
    theme: 'light',
    defaultPage: 'dashboard',
    enableNotifications: true,
    autoValidateCredentials: true
  }
};

// Core storage bucket
const storage = getBucket('datadog-toolkit', 'local');

// Base helpers
export async function getStorage() {
  const data = await storage.get();
  if (!data) {
    return DEFAULT_STORAGE;
  }
  
  // Ensure default links are present if none exist
  const mergedData = {
    ...DEFAULT_STORAGE,
    ...data,
    links: (data.links && data.links.length > 0) ? data.links : DEFAULT_DOCUMENTS
  };
  
  return mergedData;
}

export async function updateStorage(updates) {
  await storage.set((prev) => ({ ...prev, ...updates }));
}

export async function clearStorage() {
  await storage.clear();
}

// Credentials
export async function getCredentials() {
  return (await getStorage()).credentials;
}

export async function setCredentials(credentials) {
  await updateStorage({ credentials });
}

export async function clearCredentials() {
  await updateStorage({
    credentials: {
      apiKey: '',
      appKey: '',
      site: '',
      isValid: false
    }
  });
}

// Links
export async function getLinks() {
  return (await getStorage()).links;
}

export async function addLink(link) {
  const newLink = {
    ...link,
    id: Date.now().toString(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await storage.set((prev) => ({
    ...prev,
    links: [...prev.links, newLink]
  }));
  
  return newLink;
}

export async function updateLink(id, updates) {
  await storage.set((prev) => ({
    ...prev,
    links: prev.links.map((link) =>
      link.id === id ? { ...link, ...updates, updatedAt: Date.now() } : link
    )
  }));
}

export async function removeLink(id) {
  await storage.set((prev) => ({
    ...prev,
    links: prev.links.filter((link) => link.id !== id)
  }));
}

// Settings
export async function getSettings() {
  return (await getStorage()).settings;
}

export async function updateSettings(updates) {
  await storage.set((prev) => ({
    ...prev,
    settings: { ...prev.settings, ...updates }
  }));
}

// Plugins
export async function getPlugins() {
  return (await getStorage()).plugins;
}

export async function getEnabledPlugins() {
  return (await getPlugins()).filter((p) => p.enabled);
}

export async function isPluginEnabled(pluginId) {
  const plugin = (await getPlugins()).find((p) => p.id === pluginId);
  return plugin?.enabled ?? false;
}

export async function setPluginEnabled(pluginId, enabled) {
  const plugin = (await getPlugins()).find((p) => p.id === pluginId);
  if (!plugin) throw new Error(`Plugin ${pluginId} not found in storage`);
  if (plugin.isCore && !enabled) throw new Error('Cannot disable core plugin');

  await updatePlugin(pluginId, { enabled });
}

export async function addPlugin(plugin) {
  await storage.set((prev) => {
    const existing = prev.plugins.find((p) => p.id === plugin.id);
    const now = Date.now();

    if (existing) {
      return {
        ...prev,
        plugins: prev.plugins.map((p) =>
          p.id === plugin.id
            ? {
                ...plugin,
                enabled: plugin.isCore ? true : existing.enabled,
                updatedAt: now
              }
            : p
        )
      };
    }

    return {
      ...prev,
      plugins: [
        ...prev.plugins,
        {
          ...plugin,
          enabled: plugin.isCore ? true : plugin.enabled,
          createdAt: now,
          updatedAt: now
        }
      ]
    };
  });
}

export async function updatePlugin(id, updates) {
  await storage.set((prev) => {
    const plugins = prev.plugins || [];
    const existingPlugin = plugins.find(p => p.id === id);
    
    if (existingPlugin) {
      // Update existing plugin
      return {
        ...prev,
        plugins: plugins.map((plugin) => {
          if (plugin.id !== id) return plugin;
          if (plugin.isCore && updates.enabled === false) {
            logger.warn(`Cannot disable core plugin: ${id}`);
            return plugin;
          }

          return {
            ...plugin,
            ...updates,
            enabled: plugin.isCore ? true : updates.enabled ?? plugin.enabled,
            updatedAt: Date.now()
          };
        })
      };
    } else {
      // Add new plugin if it doesn't exist
      const newPlugin = {
        id,
        enabled: updates.enabled ?? false,
        settings: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...updates
      };
      
      return {
        ...prev,
        plugins: [...plugins, newPlugin]
      };
    }
  });
}

export async function getPluginSettings(pluginId) {
  const plugins = await getPlugins();
  const plugin = plugins.find(p => p.id === pluginId);
  return plugin?.settings || {};
}

export async function setPluginSettings(pluginId, settings) {
  await updatePlugin(pluginId, { settings });
  logger.info(`Settings updated for plugin: ${pluginId}`, settings);
}

export async function removePlugin(id) {
  const plugin = (await getPlugins()).find((p) => p.id === id);
  if (plugin?.isCore) throw new Error(`Cannot remove core plugin: ${id}`);

  await storage.set((prev) => ({
    ...prev,
    plugins: prev.plugins.filter((p) => p.id !== id)
  }));
}

export async function ensureCorePluginsEnabled() {
  await storage.set((prev) => ({
    ...prev,
    plugins: prev.plugins.map((plugin) =>
      plugin.isCore && !plugin.enabled
        ? { ...plugin, enabled: true, updatedAt: Date.now() }
        : plugin
    )
  }));
}

// Plugin-scoped storage
export function getPluginStorage(pluginId) {
  return getBucket(`datadog-toolkit-plugin-${pluginId}`, 'local');
}