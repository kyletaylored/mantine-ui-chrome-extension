// src/types/index.js

/* -----------------------------
   Datadog Sites Configuration
------------------------------ */

export const DATADOG_SITES = [
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
];

/* -----------------------------
   Data Structure Documentation
------------------------------ */

/*
DatadogCredentials = {
  apiKey: string,
  appKey: string,
  site: string, // DatadogRegion like 'us1', 'us3', 'eu1', etc.
  isValid: boolean,
  lastValidatedAt?: number
}

HelpfulLink = {
  id: string,
  title: string,
  url: string,
  description?: string,
  category?: string,
  createdAt: number,
  updatedAt: number
}

PluginManifest = {
  id: string,
  name: string,
  description: string,
  version: string,
  permissions?: string[],
  matches?: string[],
  core?: boolean, // if true, plugin is always enabled
  defaultEnabled: boolean,
  icon?: string,
  author?: string,
  category?: string
}

StoredPlugin = {
  id: string,
  name: string,
  description: string,
  version: string,
  enabled: boolean,
  isCore?: boolean,
  icon?: string,
  component: React.ComponentType,
  settings?: object,
  permissions?: string[],
  createdAt: number,
  updatedAt: number
}

ExtensionSettings = {
  theme: 'light' | 'dark' | 'auto',
  defaultPage: string,
  enableNotifications: boolean,
  autoValidateCredentials: boolean
}

ExtensionStorage = {
  credentials: DatadogCredentials,
  helpfulLinks: HelpfulLink[],
  plugins: StoredPlugin[],
  settings: ExtensionSettings
}

PluginContext = {
  storage: ExtensionStorage,
  setStoragePartial: function(updates) -> Promise<void>,
  sendMessage: function(message) -> Promise<any>,
  credentials: DatadogCredentials
}
*/