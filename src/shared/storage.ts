import { getBucket } from '@extend-chrome/storage';
import CryptoJS from 'crypto-js';
import { ExtensionStorage, DatadogCredentials, HelpfulLink, Plugin } from '@/types';

const ENCRYPTION_KEY = 'datadog_toolkit_encryption_key_v1';

// Initialize storage bucket using @extend-chrome/storage
const storageBucket = getBucket<ExtensionStorage>('datadog-toolkit', 'local');

// Encryption utilities for sensitive data
class EncryptionManager {
  private static keyCache: string | null = null;

  static async getEncryptionKey(): Promise<string> {
    if (this.keyCache !== null) {
      return this.keyCache!;
    }

    const result = await chrome.storage.local.get([ENCRYPTION_KEY]);
    if (result[ENCRYPTION_KEY]) {
      this.keyCache = result[ENCRYPTION_KEY];
      return this.keyCache!;
    }
    
    // Generate new encryption key
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    await chrome.storage.local.set({ [ENCRYPTION_KEY]: key });
    this.keyCache = key;
    return key;
  }

  static async encrypt(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  static async decrypt(encryptedData: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

// Default storage structure
const DEFAULT_STORAGE: ExtensionStorage = {
  credentials: {
    apiKey: '',
    appKey: '',
    site: 'us1',
    isValid: false
  },
  helpfulLinks: [],
  plugins: [],
  settings: {
    theme: 'light',
    defaultPage: 'dashboard',
    enableNotifications: true,
    autoValidateCredentials: true
  }
};

// Enhanced storage API with encryption for sensitive data
export class SecureExtensionStorage {
  private static instance: SecureExtensionStorage;
  private bucket = storageBucket;

  private constructor() {}

  static getInstance(): SecureExtensionStorage {
    if (!SecureExtensionStorage.instance) {
      SecureExtensionStorage.instance = new SecureExtensionStorage();
    }
    return SecureExtensionStorage.instance;
  }

  // ====================
  // Core Storage Methods
  // ====================

  /**
   * Get all storage data
   */
  async get(): Promise<ExtensionStorage> {
    const data = await this.bucket.get();
    return data || DEFAULT_STORAGE;
  }

  /**
   * Update storage with partial data
   */
  async update(updates: Partial<ExtensionStorage>): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => ({ ...prev, ...updates }));
  }

  /**
   * Clear all storage data
   */
  async clear(): Promise<void> {
    await this.bucket.clear();
  }

  // ====================
  // Credential Methods (with encryption)
  // ====================

  /**
   * Get credentials (automatically decrypts sensitive data)
   */
  async getCredentials(): Promise<DatadogCredentials> {
    const data = await this.get();
    const credentials = data.credentials;

    // Decrypt sensitive fields if they exist and are encrypted
    if (credentials.apiKey && credentials.apiKey.length > 32) {
      try {
        credentials.apiKey = await EncryptionManager.decrypt(credentials.apiKey);
      } catch (error) {
        console.warn('Failed to decrypt API key, using as-is');
      }
    }

    if (credentials.appKey && credentials.appKey.length > 40) {
      try {
        credentials.appKey = await EncryptionManager.decrypt(credentials.appKey);
      } catch (error) {
        console.warn('Failed to decrypt App key, using as-is');
      }
    }

    return credentials;
  }

  /**
   * Set credentials (automatically encrypts sensitive data)
   */
  async setCredentials(credentials: DatadogCredentials): Promise<void> {
    const encryptedCredentials = { ...credentials };

    // Encrypt sensitive fields
    if (encryptedCredentials.apiKey) {
      encryptedCredentials.apiKey = await EncryptionManager.encrypt(encryptedCredentials.apiKey);
    }

    if (encryptedCredentials.appKey) {
      encryptedCredentials.appKey = await EncryptionManager.encrypt(encryptedCredentials.appKey);
    }

    await this.bucket.set((prev: ExtensionStorage) => ({ 
      ...prev, 
      credentials: encryptedCredentials 
    }));
  }

  /**
   * Clear credentials
   */
  async clearCredentials(): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      credentials: {
        apiKey: '',
        appKey: '',
        site: 'us1',
        isValid: false
      }
    }));
  }

  // ====================
  // Helpful Links Methods
  // ====================

  /**
   * Get all helpful links
   */
  async getHelpfulLinks(): Promise<HelpfulLink[]> {
    const data = await this.get();
    return data.helpfulLinks;
  }

  /**
   * Add a new helpful link
   */
  async addHelpfulLink(link: Omit<HelpfulLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<HelpfulLink> {
    const newLink: HelpfulLink = {
      ...link,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      helpfulLinks: [...prev.helpfulLinks, newLink]
    }));
    
    return newLink;
  }

  /**
   * Update a helpful link
   */
  async updateHelpfulLink(id: string, updates: Partial<HelpfulLink>): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      helpfulLinks: prev.helpfulLinks.map((link: HelpfulLink) => 
        link.id === id 
          ? { ...link, ...updates, updatedAt: Date.now() }
          : link
      )
    }));
  }

  /**
   * Remove a helpful link
   */
  async removeHelpfulLink(id: string): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      helpfulLinks: prev.helpfulLinks.filter((link: HelpfulLink) => link.id !== id)
    }));
  }

  // ====================
  // Plugin Methods
  // ====================

  /**
   * Get all plugins
   */
  async getPlugins(): Promise<Plugin[]> {
    const data = await this.get();
    return data.plugins;
  }

  /**
   * Add or update a plugin
   */
  async addPlugin(plugin: Plugin): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => {
      const existingIndex = prev.plugins.findIndex((p: Plugin) => p.id === plugin.id);
      
      if (existingIndex !== -1) {
        // Update existing plugin
        const updatedPlugins = [...prev.plugins];
        updatedPlugins[existingIndex] = {
          ...plugin,
          // Preserve enabled state unless it's a core plugin
          enabled: plugin.isCore ? true : prev.plugins[existingIndex].enabled,
          updatedAt: Date.now()
        };
        return { ...prev, plugins: updatedPlugins };
      } else {
        // Add new plugin
        return {
          ...prev,
          plugins: [...prev.plugins, {
            ...plugin,
            // Force enable core plugins
            enabled: plugin.isCore ? true : plugin.enabled,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }]
        };
      }
    });
  }

  /**
   * Update a plugin
   */
  async updatePlugin(id: string, updates: Partial<Plugin>): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      plugins: prev.plugins.map((plugin: Plugin) => {
        if (plugin.id !== id) return plugin;
        
        // Prevent disabling core plugins
        if (plugin.isCore && updates.enabled === false) {
          console.warn(`Cannot disable core plugin: ${id}`);
          return plugin;
        }
        
        return {
          ...plugin,
          ...updates,
          // Force enable core plugins
          enabled: plugin.isCore ? true : (updates.enabled ?? plugin.enabled),
          updatedAt: Date.now()
        };
      })
    }));
  }

  /**
   * Remove a plugin
   */
  async removePlugin(id: string): Promise<void> {
    const data = await this.get();
    const plugin = data.plugins.find((p: Plugin) => p.id === id);
    
    // Prevent removing core plugins
    if (plugin?.isCore) {
      console.warn(`Cannot remove core plugin: ${id}`);
      return;
    }
    
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      plugins: prev.plugins.filter((plugin: Plugin) => plugin.id !== id)
    }));
  }

  /**
   * Ensure all core plugins are enabled
   */
  async ensureCorePluginsEnabled(): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => {
      let hasChanges = false;
      
      const updatedPlugins = prev.plugins.map((plugin: Plugin) => {
        if (plugin.isCore && !plugin.enabled) {
          hasChanges = true;
          return { ...plugin, enabled: true, updatedAt: Date.now() };
        }
        return plugin;
      });
      
      if (hasChanges) {
        console.log('Core plugins have been re-enabled');
      }
      
      return { ...prev, plugins: updatedPlugins };
    });
  }

  // ====================
  // Settings Methods
  // ====================

  /**
   * Get settings
   */
  async getSettings(): Promise<ExtensionStorage['settings']> {
    const data = await this.get();
    return data.settings;
  }

  /**
   * Update settings
   */
  async updateSettings(updates: Partial<ExtensionStorage['settings']>): Promise<void> {
    await this.bucket.set((prev: ExtensionStorage) => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  }

  // ====================
  // Storage Streams (Observable)
  // ====================

  /**
   * Watch for changes to credentials
   */
  watchCredentials() {
    return this.bucket.valueStream.pipe(
      // Add RxJS operators here if needed
    );
  }

  /**
   * Watch for changes to helpful links
   */
  watchHelpfulLinks() {
    return this.bucket.valueStream.pipe(
      // Add RxJS operators here if needed
    );
  }

  /**
   * Watch for changes to plugins
   */
  watchPlugins() {
    return this.bucket.valueStream.pipe(
      // Add RxJS operators here if needed
    );
  }

  /**
   * Watch for changes to settings
   */
  watchSettings() {
    return this.bucket.valueStream.pipe(
      // Add RxJS operators here if needed
    );
  }

  /**
   * Watch for changes to all storage data
   */
  watchAll() {
    return this.bucket.valueStream;
  }
}

// Export singleton instance
export const storage = SecureExtensionStorage.getInstance();

// Legacy support - add methods that match the old API
export const legacyStorage = {
  async get(): Promise<ExtensionStorage> {
    return await storage.get();
  },
  
  async saveCredentials(credentials: DatadogCredentials): Promise<void> {
    await storage.setCredentials(credentials);
  },
  
  async clearCredentials(): Promise<void> {
    await storage.clearCredentials();
  }
}; 