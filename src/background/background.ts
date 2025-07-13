import { getCredentials, setCredentials, isPluginEnabled, getPlugins, addPlugin, getStorage, getSettings } from '@/shared/storage';
import { DatadogCredentials, DATADOG_SITES } from '@/types';
import { getNetworkMonitor, stopNetworkMonitor } from '@/plugins/apm-tracing/network-monitor';
import { DEFAULT_APM_SETTINGS } from '@/plugins/apm-tracing/config';
import { createLogger } from '@/shared/logger';
import { pluginLoader } from '@/shared/plugin-loader';
import { contentScriptManager } from '@/shared/content-script-manager';

const logger = createLogger('Background');

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Datadog Sales Engineering Toolkit installed');
  logger.debug('LIFECYCLE', 'EXTENSION_INSTALLED', {});
  
  // Initialize storage with default values
  await getStorage();
  
  // Initialize plugin system
  await initializePluginSystem();
  
  logger.debug('LIFECYCLE', 'EXTENSION_READY', {});
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Datadog Sales Engineering Toolkit started');
  logger.debug('LIFECYCLE', 'EXTENSION_STARTUP', {});
  
  // Auto-validate credentials if enabled
  const credentials = await getCredentials();
  const settings = await getSettings();
  if (settings.autoValidateCredentials && credentials.apiKey) {
    const validated = await validateDatadogCredentials(credentials);
    if (validated) {
      await setCredentials(validated);
    }
  }
});

// Standard Chrome message handling with debug logging
logger.info('Setting up Chrome message handler');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('RECEIVED', request.type || 'UNKNOWN', { 
    request: { ...request, credentials: request.credentials ? '***' : undefined }, 
    sender: sender.id,
    tab: sender.tab?.id 
  });
  
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
  try {
    switch (request.type) {
      case 'VALIDATE_CREDENTIALS': {
        logger.debug('PROCESSING', 'VALIDATE_CREDENTIALS', 'Starting validation...');
        const isValid = await validateDatadogCredentials(request.credentials);
        const response = { success: true, isValid };
        logger.debug('COMPLETED', 'VALIDATE_CREDENTIALS', response);
        sendResponse(response);
        break;
      }
        
      case 'INJECT_SCRIPT':
        logger.debug('PROCESSING', 'INJECT_SCRIPT', { tabId: request.tabId, scriptLength: request.script.length });
        await injectScript(request.tabId, request.script);
        sendResponse({ success: true });
        break;
        
      case 'GET_ACTIVE_TAB': {
        logger.debug('PROCESSING', 'GET_ACTIVE_TAB', {});
        const tab = await getActiveTab();
        sendResponse({ success: true, data: tab });
        break;
      }
        
      case 'PLUGIN_MESSAGE':
        logger.debug('PROCESSING', 'PLUGIN_MESSAGE', request);
        await handlePluginMessage(request);
        sendResponse({ success: true });
        break;
        
      case 'INIT_APM_MONITORING':
        logger.debug('PROCESSING', 'INIT_APM_MONITORING', request.settings);
        await initApmMonitoring(request.settings);
        sendResponse({ success: true });
        break;
        
      case 'START_APM_MONITORING':
        logger.debug('PROCESSING', 'START_APM_MONITORING', request.settings);
        await startApmMonitoring(request.settings);
        sendResponse({ success: true });
        break;
        
      case 'STOP_APM_MONITORING':
        logger.debug('PROCESSING', 'STOP_APM_MONITORING', {});
        await stopApmMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_APM_SETTINGS':
        logger.debug('PROCESSING', 'UPDATE_APM_SETTINGS', request.settings);
        await updateApmSettings(request.settings);
        sendResponse({ success: true });
        break;
        
      case 'GET_APM_TRACES': {
        logger.debug('PROCESSING', 'GET_APM_TRACES', { filter: request.filter });
        const traces = await getApmTraces();
        sendResponse({ success: true, traces });
        break;
      }
        
      case 'CLEAR_APM_TRACES':
        logger.debug('PROCESSING', 'CLEAR_APM_TRACES', {});
        await clearApmTraces();
        sendResponse({ success: true });
        break;
        
      case 'GET_RUM_SESSION_DATA': {
        logger.debug('PROCESSING', 'GET_RUM_SESSION_DATA', {});
        const rumData = await getRumSessionData();
        sendResponse({ success: true, data: rumData });
        break;
      }

      // Event Alerts messages
      case 'START_EVENT_MONITORING':
        logger.debug('PROCESSING', 'START_EVENT_MONITORING', request.payload);
        await startEventMonitoring(request.payload);
        sendResponse({ success: true });
        break;
        
      case 'STOP_EVENT_MONITORING':
        logger.debug('PROCESSING', 'STOP_EVENT_MONITORING', {});
        await stopEventMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'GET_EVENT_ALERTS_EVENTS': {
        logger.debug('PROCESSING', 'GET_EVENT_ALERTS_EVENTS', {});
        const events = await getEventAlertsEvents();
        sendResponse({ success: true, events });
        break;
      }
        
      case 'CLEAR_EVENT_ALERTS_EVENTS':
        logger.debug('PROCESSING', 'CLEAR_EVENT_ALERTS_EVENTS', {});
        await clearEventAlertsEvents();
        sendResponse({ success: true });
        break;
        
      case 'DISMISS_EVENT_ALERT':
        logger.debug('PROCESSING', 'DISMISS_EVENT_ALERT', request.payload);
        await dismissEventAlert(request.payload.eventId);
        sendResponse({ success: true });
        break;
        
      case 'GET_EVENT_ALERTS_STATUS': {
        logger.debug('PROCESSING', 'GET_EVENT_ALERTS_STATUS', {});
        const status = await getEventAlertsStatus();
        sendResponse({ success: true, status });
        break;
      }
        
      case 'UPDATE_EVENT_ALERTS_SETTINGS':
        logger.debug('PROCESSING', 'UPDATE_EVENT_ALERTS_SETTINGS', request.payload);
        await updateEventAlertsSettings(request.payload.settings);
        sendResponse({ success: true });
        break;
        
      case 'SHOW_CHROME_NOTIFICATION':
        logger.debug('PROCESSING', 'SHOW_CHROME_NOTIFICATION', request.payload);
        await showChromeNotification(request.payload);
        sendResponse({ success: true });
        break;
        
      case 'SHOW_IN_PAGE_NOTIFICATION':
        logger.debug('PROCESSING', 'SHOW_IN_PAGE_NOTIFICATION', request.payload);
        await showInPageNotification(request.payload);
        sendResponse({ success: true });
        break;
        
      default:
        logger.debug('ERROR', 'UNKNOWN_MESSAGE_TYPE', request.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    logger.debug('ERROR', request.type || 'UNKNOWN', error);
    logger.error('Background script error', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

logger.info('Chrome message handler configured');

// Validate Datadog credentials by auto-discovering the correct region
export async function validateDatadogCredentials(
  raw: Pick<DatadogCredentials, 'apiKey' | 'appKey'>
): Promise<DatadogCredentials | null> {
  logger.info('Auto-discovering Datadog region for credentials...');

  for (const site of DATADOG_SITES) {
    try {
      logger.info(`Testing credentials for ${site.name} (${site.region})...`);

      const response = await fetch(`${site.apiUrl}/api/v2/validate_keys`, {
        method: 'GET',
        headers: {
          'DD-API-KEY': raw.apiKey,
          'DD-APPLICATION-KEY': raw.appKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.info(`${site.name} returned HTTP ${response.status}`);
        continue;
      }

      const json = await response.json();
      if (json?.status === 'ok') {
        const validated: DatadogCredentials = {
          ...raw,
          site: site.region,
          isValid: true,
          lastValidatedAt: Date.now(),
        };

        await setCredentials(validated);

        logger.info(`✓ Credentials validated for ${site.name}`);
        return validated;
      } else {
        logger.info(`${site.name} validation failed:`, json);
      }
    } catch (err) {
      logger.info(`Validation error for ${site.name}:`, err);
    }
  }

  logger.info('✗ All Datadog regions rejected credentials.');

  return null;
}

// Inject script into active tab
async function injectScript(tabId: number, script: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (code: string) => {
      const scriptElement = document.createElement('script');
      scriptElement.textContent = code;
      document.head.appendChild(scriptElement);
    },
    args: [script]
  });
}

// Get active tab
async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

// Handle plugin messages
async function handlePluginMessage(request: any): Promise<void> {
  const { action, payload } = request;
  
  switch (action) {
    case 'INJECT_RUM':
      await injectRumScript(payload);
      break;
      
    case 'INJECT_APM':
      await injectApmScript(payload);
      break;
      
    case 'SEND_EVENT':
      await sendDatadogEvent(payload);
      break;
      
    default:
      logger.warn('Unknown plugin action:', action);
  }
}

// Plugin-specific functions
async function injectRumScript(config: any): Promise<void> {
  const tab = await getActiveTab();
  const rumScript = `
    (function() {
      window.DD_RUM && window.DD_RUM.init({
        applicationId: '${config.applicationId}',
        clientToken: '${config.clientToken}',
        site: '${config.site}',
        service: '${config.service}',
        env: '${config.env}',
        version: '${config.version}',
        sampleRate: ${config.sampleRate || 100},
        trackInteractions: true,
        trackResources: true,
        trackLongTasks: true,
      });
    })();
  `;
  
  await injectScript(tab.id!, rumScript);
}

async function injectApmScript(config: any): Promise<void> {
  const tab = await getActiveTab();
  const apmScript = `
    (function() {
      // APM tracing injection code
      logger.info('APM tracing injected with config:', ${JSON.stringify(config)});
    })();
  `;
  
  await injectScript(tab.id!, apmScript);
}

async function sendDatadogEvent(eventData: any): Promise<void> {
  const credentials = await getCredentials();
  if (!credentials.isValid) {
    throw new Error('Invalid credentials');
  }
  
  const site = DATADOG_SITES.find(s => s.region === credentials.site);
  if (!site) {
    throw new Error('Invalid Datadog site');
  }
  
  await fetch(`${site.apiUrl}/api/v1/events`, {
    method: 'POST',
    headers: {
      'DD-API-KEY': credentials.apiKey,
      'DD-APPLICATION-KEY': credentials.appKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
}

// APM functions
async function initApmMonitoring(settings: any): Promise<void> {
  const networkMonitor = getNetworkMonitor(settings || DEFAULT_APM_SETTINGS);
  await networkMonitor.startMonitoring();
}

async function startApmMonitoring(settings: any): Promise<void> {
  const networkMonitor = getNetworkMonitor(settings || DEFAULT_APM_SETTINGS);
  await networkMonitor.startMonitoring();
}

async function stopApmMonitoring(): Promise<void> {
  await stopNetworkMonitor();
}

async function updateApmSettings(settings: any): Promise<void> {
  const networkMonitor = getNetworkMonitor(settings);
  networkMonitor.updateSettings(settings);
}

async function getApmTraces(): Promise<any[]> {
  const networkMonitor = getNetworkMonitor(DEFAULT_APM_SETTINGS);
  return await networkMonitor.getTraces();
}

async function clearApmTraces(): Promise<void> {
  const networkMonitor = getNetworkMonitor(DEFAULT_APM_SETTINGS);
  await networkMonitor.clearTraces();
}

// RUM Session functions
async function getRumSessionData(): Promise<any> {
  try {
    const tab = await getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab');
    }
    
    // Send message to content script to get RUM session data
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_RUM_SESSION_DATA'
    });
    
    return response || { isActive: false, error: 'No RUM session found' };
  } catch (error) {
    return { 
      isActive: false, 
      error: error instanceof Error ? error.message : 'Failed to get RUM session data' 
    };
  }
}

// Event Alerts functions
let eventAlertsMonitor: any = null;

async function startEventMonitoring(payload: any): Promise<void> {
  const { settings, site, apiKey } = payload;
  
  // Import and initialize event monitor
  const { initializeEventMonitor } = await import('../plugins/event-alerts/event-monitor');
  eventAlertsMonitor = initializeEventMonitor(settings, site, apiKey);
  
  await eventAlertsMonitor.startPolling();
}

async function stopEventMonitoring(): Promise<void> {
  if (eventAlertsMonitor) {
    await eventAlertsMonitor.stopPolling();
    eventAlertsMonitor = null;
  }
}

async function getEventAlertsEvents(): Promise<any[]> {
  if (eventAlertsMonitor) {
    return await eventAlertsMonitor.getStoredEvents();
  }
  return [];
}

async function clearEventAlertsEvents(): Promise<void> {
  if (eventAlertsMonitor) {
    await eventAlertsMonitor.clearEvents();
  }
}

async function dismissEventAlert(eventId: string): Promise<void> {
  if (eventAlertsMonitor) {
    await eventAlertsMonitor.dismissEvent(eventId);
  }
}

async function getEventAlertsStatus(): Promise<any> {
  if (eventAlertsMonitor) {
    return eventAlertsMonitor.getPollingStatus();
  }
  return {
    isActive: false,
    lastPoll: 0,
    nextPoll: 0,
    pollCount: 0,
    errors: 0
  };
}

async function updateEventAlertsSettings(settings: any): Promise<void> {
  if (eventAlertsMonitor) {
    eventAlertsMonitor.updateSettings(settings);
  }
}

async function showChromeNotification(payload: any): Promise<void> {
  const { event, settings } = payload;
  const { NotificationManager } = await import('../plugins/event-alerts/notification-manager');
  
  await NotificationManager.showChromeNotification(event, settings);
}

async function showInPageNotification(payload: any): Promise<void> {
  const { event, settings } = payload;
  const { NotificationManager } = await import('../plugins/event-alerts/notification-manager');
  
  await NotificationManager.showInPageNotification(event, settings);
}

// Chrome notification handlers - these will be handled by the shared notification service
// The notificationService already sets up these listeners automatically

// Initialize plugin system
async function initializePluginSystem(): Promise<void> {
  try {
    logger.info('Initializing plugin system...');
    
    // Initialize plugin loader
    await pluginLoader.initialize();
    
    // Get all loaded plugins
    const plugins = pluginLoader.getPlugins();
    logger.info(`Found ${plugins.length} plugins`);
    
    // Initialize core plugins first
    for (const plugin of plugins) {
      if (plugin.manifest.core) {
        try {
          logger.info(`Initializing core plugin: ${plugin.manifest.name}`);
          await pluginLoader.initializePlugin(plugin.manifest.id);
          
          // Ensure core plugin is in storage and enabled
          const existingPlugin = await getPlugins().then(p => p.find(p => p.id === plugin.manifest.id));
          if (!existingPlugin) {
            // Add new plugin to storage
            await addPlugin({
              id: plugin.manifest.id,
              name: plugin.manifest.name,
              description: plugin.manifest.description,
              version: plugin.manifest.version,
              enabled: true,
              isCore: true,
              icon: plugin.manifest.icon,
              component: plugin.renderComponent,
              settings: {},
              permissions: plugin.manifest.permissions || [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        } catch (error) {
          logger.error(`Failed to initialize core plugin ${plugin.manifest.id}:`, error);
        }
      }
    }
    
    // Initialize enabled optional plugins
    for (const plugin of plugins) {
      if (!plugin.manifest.core) {
        try {
          const enabled = await isPluginEnabled(plugin.manifest.id);
          if (enabled) {
            logger.info(`Initializing optional plugin: ${plugin.manifest.name}`);
            await pluginLoader.initializePlugin(plugin.manifest.id);
          }
        } catch (error) {
          logger.error(`Failed to initialize optional plugin ${plugin.manifest.id}:`, error);
        }
      }
    }
    
    // Initialize content script manager
    await contentScriptManager.initialize();
    
    logger.info('Plugin system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize plugin system:', error);
  }
} 