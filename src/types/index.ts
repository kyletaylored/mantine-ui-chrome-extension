export interface DatadogCredentials {
  apiKey: string;
  appKey: string;
  site: string;
  isValid: boolean;
  validatedAt?: number;
}

export interface HelpfulLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  isCore?: boolean; // If true, plugin cannot be disabled and is always enabled
  icon?: string;
  component: any; // React component will be loaded dynamically
  settings?: Record<string, any>;
  permissions?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PluginMessage {
  type: 'PLUGIN_ACTION';
  pluginId: string;
  action: string;
  payload?: any;
}

export interface ExtensionStorage {
  credentials: DatadogCredentials;
  helpfulLinks: HelpfulLink[];
  plugins: Plugin[];
  settings: {
    theme: 'light' | 'dark' | 'auto';
    defaultPage: string;
    enableNotifications: boolean;
    autoValidateCredentials: boolean;
  };
}

export interface PluginContext {
  storage: ExtensionStorage;
  updateStorage: (updates: Partial<ExtensionStorage>) => Promise<void>;
  sendMessage: (message: PluginMessage) => Promise<any>;
  credentials: DatadogCredentials;
}

export interface DatadogSite {
  name: string;
  url: string;
  apiUrl: string;
  region: string;
}

export const DATADOG_SITES: DatadogSite[] = [
  { name: 'US1', url: 'https://app.datadoghq.com', apiUrl: 'https://api.datadoghq.com', region: 'us1' },
  { name: 'US3', url: 'https://us3.datadoghq.com', apiUrl: 'https://api.us3.datadoghq.com', region: 'us3' },
  { name: 'US5', url: 'https://us5.datadoghq.com', apiUrl: 'https://api.us5.datadoghq.com', region: 'us5' },
  { name: 'EU1', url: 'https://app.datadoghq.eu', apiUrl: 'https://api.datadoghq.eu', region: 'eu1' },
  { name: 'AP1', url: 'https://ap1.datadoghq.com', apiUrl: 'https://api.ap1.datadoghq.com', region: 'ap1' },
  { name: 'GOV', url: 'https://app.ddog-gov.com', apiUrl: 'https://api.ddog-gov.com', region: 'gov' }
]; 