import { DATADOG_SITES } from '../../types';

export interface RumInjectionSettings {
  applicationId: string;
  clientToken: string;
  service: string;
  version: string;
  env: 'demo' | 'staging' | 'production' | 'development';
  trackUserInteractions: boolean;
  trackResources: boolean;
  trackLongTasks: boolean;
}

export const DEFAULT_RUM_SETTINGS: RumInjectionSettings = {
  applicationId: '',
  clientToken: '',
  service: 'demo-application',
  version: '1.0.0',
  env: 'demo',
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: false,
};

export const getRumScriptUrl = (site: string): string => {
  return `https://www.datadoghq-browser-agent.com/${site}/v6/datadog-rum.js`;
};

export const generateRumInitScript = (settings: RumInjectionSettings, site: string): string => {
  const datadogSite = DATADOG_SITES.find(s => s.region === site);
  const rumSite = datadogSite ? datadogSite.region : 'datadoghq.com';
  
  return `
    window.DD_RUM && window.DD_RUM.init({
      applicationId: "${settings.applicationId}",
      clientToken: "${settings.clientToken}",
      site: "${rumSite}",
      service: "${settings.service}",
      version: "${settings.version}",
      env: "${settings.env}",
      sessionSampleRate: 100,
      sessionReplaySampleRate: 100,
      defaultPrivacyLevel: 'mask-user-input',
      enableExperimentalFeatures: ['clickmap']
    });
  `;
};

export const RUM_PLUGIN_CONFIG = {
  id: 'rum-injection',
  name: 'RUM Injection',
  description: 'Inject Datadog Real User Monitoring (RUM) into web pages for demonstration purposes',
  version: '1.0.0',
  category: 'monitoring',
  icon: '📊',
  permissions: ['activeTab', 'scripting'],
  defaultSettings: DEFAULT_RUM_SETTINGS,
}; 