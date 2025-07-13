// src/types/index.ts
import React from 'react';

/* -----------------------------
   Datadog Credentials
------------------------------ */

export type DatadogRegion =
  | 'us1'
  | 'us3'
  | 'us5'
  | 'eu1'
  | 'ap1'
  | 'ap2';

export interface DatadogCredentials {
  apiKey: string;
  appKey: string;
  site: DatadogRegion;
  isValid: boolean;
  lastValidatedAt?: number;
}

/* -----------------------------
   Helpful Links
------------------------------ */

export interface HelpfulLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

/* -----------------------------
   Plugin Types
------------------------------ */

// Stored in manifest.ts per plugin
export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions?: string[];
  matches?: string[];
  core?: boolean; // if true, plugin is always enabled
  defaultEnabled: boolean;
  icon?: string;
  author?: string;
  category?: string;
}

// Code module loaded at runtime
export interface PluginModule {
  manifest: PluginManifest;

  initialize?: () => Promise<void> | void;
  runContentScript?: () => Promise<void> | void;
  settingsComponent?: () => React.ReactElement;
  renderComponent?: () => React.ReactElement;
  cleanup?: () => Promise<void> | void;
  handleMessage?: (message: any) => Promise<any> | any;
}

// Saved in chrome.storage
export interface StoredPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  isCore?: boolean;
  icon?: string;
  component: React.ComponentType<any>; // Dynamically loaded
  settings?: Record<string, any>;
  permissions?: string[];
  createdAt: number;
  updatedAt: number;
}

/* -----------------------------
   Plugin Messaging
------------------------------ */

export type PluginAction =
  | 'REFRESH_DATA'
  | 'RESET_SETTINGS'
  | 'TOGGLE_WIDGET'
  | string;

export interface PluginMessage {
  type: 'PLUGIN_ACTION';
  pluginId: string;
  action: PluginAction;
  payload?: any;
}

/* -----------------------------
   Extension Storage
------------------------------ */

export interface ExtensionSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultPage: string;
  enableNotifications: boolean;
  autoValidateCredentials: boolean;
}

export interface ExtensionStorage {
  credentials: DatadogCredentials;
  helpfulLinks: HelpfulLink[];
  plugins: StoredPlugin[];
  settings: ExtensionSettings;
}

/* -----------------------------
   Plugin Runtime Context
------------------------------ */

export interface PluginContext {
  storage: ExtensionStorage;
  setStoragePartial: (updates: Partial<ExtensionStorage>) => Promise<void>;
  sendMessage: (message: PluginMessage) => Promise<any>;
  credentials: DatadogCredentials;
}

/* -----------------------------
   Datadog Sites
------------------------------ */

export interface DatadogSite {
  name: string;
  url: string;
  apiUrl: string;
  region: DatadogRegion;
}

export const DATADOG_SITES: readonly DatadogSite[] = [
  {
    name: 'US1',
    url: 'https://app.datadoghq.com',
    apiUrl: 'https://api.datadoghq.com',
    region: 'us1'
  },
  {
    name: 'US3',
    url: 'https://us3.datadoghq.com',
    apiUrl: 'https://api.us3.datadoghq.com',
    region: 'us3'
  },
  {
    name: 'US5',
    url: 'https://us5.datadoghq.com',
    apiUrl: 'https://api.us5.datadoghq.com',
    region: 'us5'
  },
  {
    name: 'EU1',
    url: 'https://app.datadoghq.eu',
    apiUrl: 'https://api.datadoghq.eu',
    region: 'eu1'
  },
  {
    name: 'AP1',
    url: 'https://ap1.datadoghq.com',
    apiUrl: 'https://api.ap1.datadoghq.com',
    region: 'ap1'
  },
  {
    name: 'AP2',
    url: 'https://ap2.datadoghq.com',
    apiUrl: 'https://api.ap2.datadoghq.com',
    region: 'ap2'
  },
  {
    name: 'GOV',
    url: 'https://app.ddog-gov.com',
    apiUrl: 'https://api.ddog-gov.com',
    region: 'gov'
  }
] as const;
