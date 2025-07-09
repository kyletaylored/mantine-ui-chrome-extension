import { storage } from '@/shared/storage';
import { DatadogCredentials, DATADOG_SITES } from '@/types';
import { getNetworkMonitor, stopNetworkMonitor } from '@/plugins/apm-tracing/network-monitor';
import { DEFAULT_APM_SETTINGS } from '@/plugins/apm-tracing/config';

// Core plugins that should always be enabled
import { rumExtractionPlugin } from '@/plugins/rum-extraction/index';
import { apmTracingPlugin } from '@/plugins/apm-tracing/index';

// Debug logging helper
const debugLog = (operation: string, messageType: string, data?: any) => {
  console.log(`[Background Debug] ${operation} - ${messageType}`, data);
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('=== Datadog Sales Engineering Toolkit installed ===');
  debugLog('LIFECYCLE', 'EXTENSION_INSTALLED', {});
  
  // Initialize storage with default values
  await storage.get();
  
  // Initialize core plugins
  await initializeCorePlugins();
  
  // Set default badge
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setBadgeBackgroundColor({ color: '#632CA6' });
  
  debugLog('LIFECYCLE', 'EXTENSION_READY', {});
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('=== Datadog Sales Engineering Toolkit started ===');
  debugLog('LIFECYCLE', 'EXTENSION_STARTUP', {});
  
  // Auto-validate credentials if enabled
  const storageData = await storage.get();
  if (storageData.settings.autoValidateCredentials && storageData.credentials.apiKey) {
    await validateDatadogCredentials(storageData.credentials);
  }
});

// Standard Chrome message handling with debug logging
console.log('=== Setting up Chrome message handler ===');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('RECEIVED', request.type || 'UNKNOWN', { 
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
        debugLog('PROCESSING', 'VALIDATE_CREDENTIALS', 'Starting validation...');
        const isValid = await validateDatadogCredentials(request.credentials);
        const response = { success: true, isValid };
        debugLog('COMPLETED', 'VALIDATE_CREDENTIALS', response);
        sendResponse(response);
        break;
      }
        
      case 'INJECT_SCRIPT':
        debugLog('PROCESSING', 'INJECT_SCRIPT', { tabId: request.tabId, scriptLength: request.script.length });
        await injectScript(request.tabId, request.script);
        sendResponse({ success: true });
        break;
        
      case 'GET_ACTIVE_TAB': {
        debugLog('PROCESSING', 'GET_ACTIVE_TAB', {});
        const tab = await getActiveTab();
        sendResponse({ success: true, data: tab });
        break;
      }
        
      case 'PLUGIN_MESSAGE':
        debugLog('PROCESSING', 'PLUGIN_MESSAGE', request);
        await handlePluginMessage(request);
        sendResponse({ success: true });
        break;
        
      case 'INIT_APM_MONITORING':
        debugLog('PROCESSING', 'INIT_APM_MONITORING', request.settings);
        await initApmMonitoring(request.settings);
        sendResponse({ success: true });
        break;
        
      case 'START_APM_MONITORING':
        debugLog('PROCESSING', 'START_APM_MONITORING', request.settings);
        await startApmMonitoring(request.settings);
        sendResponse({ success: true });
        break;
        
      case 'STOP_APM_MONITORING':
        debugLog('PROCESSING', 'STOP_APM_MONITORING', {});
        await stopApmMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_APM_SETTINGS':
        debugLog('PROCESSING', 'UPDATE_APM_SETTINGS', request.settings);
        await updateApmSettings(request.settings);
        sendResponse({ success: true });
        break;
        
      case 'GET_APM_TRACES': {
        debugLog('PROCESSING', 'GET_APM_TRACES', { filter: request.filter });
        const traces = await getApmTraces();
        sendResponse({ success: true, traces });
        break;
      }
        
      case 'CLEAR_APM_TRACES':
        debugLog('PROCESSING', 'CLEAR_APM_TRACES', {});
        await clearApmTraces();
        sendResponse({ success: true });
        break;
        
      case 'GET_RUM_SESSION_DATA': {
        debugLog('PROCESSING', 'GET_RUM_SESSION_DATA', {});
        const rumData = await getRumSessionData();
        sendResponse({ success: true, data: rumData });
        break;
      }

      // Event Alerts messages
      case 'START_EVENT_MONITORING':
        debugLog('PROCESSING', 'START_EVENT_MONITORING', request.payload);
        await startEventMonitoring(request.payload);
        sendResponse({ success: true });
        break;
        
      case 'STOP_EVENT_MONITORING':
        debugLog('PROCESSING', 'STOP_EVENT_MONITORING', {});
        await stopEventMonitoring();
        sendResponse({ success: true });
        break;
        
      case 'GET_EVENT_ALERTS_EVENTS': {
        debugLog('PROCESSING', 'GET_EVENT_ALERTS_EVENTS', {});
        const events = await getEventAlertsEvents();
        sendResponse({ success: true, events });
        break;
      }
        
      case 'CLEAR_EVENT_ALERTS_EVENTS':
        debugLog('PROCESSING', 'CLEAR_EVENT_ALERTS_EVENTS', {});
        await clearEventAlertsEvents();
        sendResponse({ success: true });
        break;
        
      case 'DISMISS_EVENT_ALERT':
        debugLog('PROCESSING', 'DISMISS_EVENT_ALERT', request.payload);
        await dismissEventAlert(request.payload.eventId);
        sendResponse({ success: true });
        break;
        
      case 'GET_EVENT_ALERTS_STATUS': {
        debugLog('PROCESSING', 'GET_EVENT_ALERTS_STATUS', {});
        const status = await getEventAlertsStatus();
        sendResponse({ success: true, status });
        break;
      }
        
      case 'UPDATE_EVENT_ALERTS_SETTINGS':
        debugLog('PROCESSING', 'UPDATE_EVENT_ALERTS_SETTINGS', request.payload);
        await updateEventAlertsSettings(request.payload.settings);
        sendResponse({ success: true });
        break;
        
      case 'SHOW_CHROME_NOTIFICATION':
        debugLog('PROCESSING', 'SHOW_CHROME_NOTIFICATION', request.payload);
        await showChromeNotification(request.payload);
        sendResponse({ success: true });
        break;
        
      case 'SHOW_IN_PAGE_NOTIFICATION':
        debugLog('PROCESSING', 'SHOW_IN_PAGE_NOTIFICATION', request.payload);
        await showInPageNotification(request.payload);
        sendResponse({ success: true });
        break;
        
      default:
        debugLog('ERROR', 'UNKNOWN_MESSAGE_TYPE', request.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    debugLog('ERROR', request.type || 'UNKNOWN', error);
    console.error('Background script error:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

console.log('=== Chrome message handler configured ===');

// Validate Datadog credentials by auto-discovering the correct region
async function validateDatadogCredentials(credentials: DatadogCredentials): Promise<boolean> {
  console.log('Auto-discovering Datadog region for credentials...');
  
  // Test all sites to find the correct region
  for (const site of DATADOG_SITES) {
    try {
      console.log(`Testing credentials for ${site.name} (${site.region})...`);
      
      const response = await fetch(`${site.apiUrl}/api/v2/validate_keys`, {
        method: 'GET',
        headers: {
          'DD-API-KEY': credentials.apiKey,
          'DD-APPLICATION-KEY': credentials.appKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`${site.name} response status:`, response.status);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`${site.name} response:`, data);
          
          // Check if validation was successful
          if (data && data.status === 'ok') {
            console.log(`✓ Credentials validated successfully for ${site.name}!`);
            
            // Update credentials in storage with the correct site
            await storage.setCredentials({
              apiKey: credentials.apiKey,
              appKey: credentials.appKey,
              site: site.region,
              isValid: true,
              validatedAt: Date.now()
            });
            
            // Update badge
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#28a745' });
            
            return true;
          } else {
            console.log(`${site.name} validation failed: Invalid response format`);
          }
        } catch (jsonError) {
          console.log(`${site.name} validation failed: Invalid JSON response`);
        }
      } else if (response.status === 401 || response.status === 403) {
        console.log(`${site.name} validation failed: Invalid API keys`);
      } else {
        console.log(`${site.name} validation failed: Server error ${response.status}`);
      }
    } catch (error) {
      console.log(`${site.name} validation failed: Network error`, error);
    }
  }
  
  // If we get here, no site worked
  console.log('✗ Credentials validation failed for all regions');
  
  // Update credentials as invalid
  await storage.setCredentials({
    apiKey: credentials.apiKey,
    appKey: credentials.appKey,
    site: credentials.site || 'us1', // Keep existing site or default to us1
    isValid: false,
    validatedAt: Date.now()
  });
  
  chrome.action.setBadgeText({ text: '✗' });
  chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
  
  return false;
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
      console.warn('Unknown plugin action:', action);
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
      console.log('APM tracing injected with config:', ${JSON.stringify(config)});
    })();
  `;
  
  await injectScript(tab.id!, apmScript);
}

async function sendDatadogEvent(eventData: any): Promise<void> {
  const credentials = await storage.getCredentials();
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

// Initialize core plugins that are always required
async function initializeCorePlugins(): Promise<void> {
  try {
    console.log('Initializing core plugins...');
    
    // Add core plugins to storage
    await storage.addPlugin(rumExtractionPlugin);
    await storage.addPlugin(apmTracingPlugin);
    
    // Ensure all core plugins are enabled
    await storage.ensureCorePluginsEnabled();
    
    console.log('Core plugins initialized successfully');
  } catch (error) {
    console.error('Failed to initialize core plugins:', error);
  }
} 