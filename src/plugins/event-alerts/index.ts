import { PluginModule } from '../../types';
import { EventMonitor, initializeEventMonitor, cleanupEventMonitor } from './event-monitor';
import { NotificationManager } from './notification-manager';
import { DEFAULT_EVENT_ALERTS_SETTINGS, EVENT_ALERTS_PLUGIN_CONFIG } from './config';
import { EventAlertsSettings, ProcessedEvent, PollingStatus, EventStats } from './types';
import { SecureExtensionStorage } from '@/shared/storage';

// Plugin state
let eventMonitor: EventMonitor | null = null;
const storage = SecureExtensionStorage.getInstance();

/**
 * Get plugin settings
 */
const getSettings = async (): Promise<EventAlertsSettings> => {
  const data = await storage.get();
  return (data as any)[`plugin-event-alerts-settings`] || DEFAULT_EVENT_ALERTS_SETTINGS;
};

/**
 * Get Datadog credentials
 */
const getCredentials = async (): Promise<{ apiKey: string; site: string }> => {
  const credentials = await storage.getCredentials();
  
  if (!credentials?.apiKey) {
    throw new Error('Datadog API key not configured');
  }
  
  return {
    apiKey: credentials.apiKey,
    site: credentials.site || 'us1'
  };
};

/**
 * Start event polling
 */
const startPolling = async (): Promise<void> => {
  const { apiKey, site } = await getCredentials();
  const settings = await getSettings();
  
  eventMonitor = initializeEventMonitor(settings, site, apiKey);
  await eventMonitor.startPolling();
  
  // Send message to background script to start monitoring
  await chrome.runtime.sendMessage({
    type: 'START_EVENT_MONITORING',
    payload: { settings, site, apiKey }
  });
};

/**
 * Stop event polling
 */
const stopPolling = async (): Promise<void> => {
  if (eventMonitor) {
    eventMonitor.stopPolling();
  }
  
  await chrome.runtime.sendMessage({
    type: 'STOP_EVENT_MONITORING'
  });
};

/**
 * Get stored events
 */
const getEvents = async (): Promise<ProcessedEvent[]> => {
  if (eventMonitor) {
    return await eventMonitor.getStoredEvents();
  }
  
  // Fallback to requesting from background script
  const response = await chrome.runtime.sendMessage({
    type: 'GET_EVENT_ALERTS_EVENTS'
  });
  
  return response || [];
};

/**
 * Clear all events
 */
const clearEvents = async (): Promise<void> => {
  if (eventMonitor) {
    await eventMonitor.clearEventStorage();
  }
  
  await chrome.runtime.sendMessage({
    type: 'CLEAR_EVENT_ALERTS_EVENTS'
  });
};

/**
 * Dismiss an event
 */
const dismissEvent = async (eventId: string): Promise<void> => {
  if (eventMonitor) {
    await eventMonitor.dismissEvent(eventId);
  }
  
  await chrome.runtime.sendMessage({
    type: 'DISMISS_EVENT_ALERT',
    payload: { eventId }
  });
};

/**
 * Get polling status
 */
const getPollingStatus = async (): Promise<PollingStatus> => {
  if (eventMonitor) {
    return eventMonitor.getPollingStatus();
  }
  
  const response = await chrome.runtime.sendMessage({
    type: 'GET_EVENT_ALERTS_STATUS'
  });
  
  return response || {
    isActive: false,
    lastPoll: 0,
    nextPoll: 0,
    pollCount: 0,
    errors: 0
  };
};

/**
 * Get event statistics
 */
const getStats = async (): Promise<EventStats> => {
  const events = await getEvents();
  const now = Date.now();
  const dayStart = now - (24 * 60 * 60 * 1000);
  
  const newEventsToday = events.filter(e => e.timestamp >= dayStart).length;
  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const warningEvents = events.filter(e => e.severity === 'warning').length;
  const infoEvents = events.filter(e => e.severity === 'info').length;
  const dismissedEvents = events.filter(e => e.dismissed).length;
  
  return {
    totalEvents: events.length,
    newEventsToday,
    criticalEvents,
    warningEvents,
    infoEvents,
    dismissedEvents,
    averageResponseTime: 0, // TODO: Calculate if needed
  };
};

/**
 * Test connection to Datadog API
 */
const testConnection = async (): Promise<{ success: boolean; message: string; eventCount?: number }> => {
  try {
    const { apiKey, site } = await getCredentials();
    const settings = await getSettings();
    
    const testMonitor = new EventMonitor(settings, site, apiKey);
    return await testMonitor.testConnection();
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Update plugin settings
 */
const updateSettings = async (newSettings: EventAlertsSettings): Promise<void> => {
  // Store settings in the main storage under a plugin-specific key
  await storage.update({
    [`plugin-event-alerts-settings`]: newSettings
  } as any);
  
  if (eventMonitor) {
    eventMonitor.updateSettings(newSettings);
  }
  
  await chrome.runtime.sendMessage({
    type: 'UPDATE_EVENT_ALERTS_SETTINGS',
    payload: { settings: newSettings }
  });
};

/**
 * Event Alerts Plugin Module
 */
const eventAlertsPlugin: PluginModule = {
  manifest: {
    id: EVENT_ALERTS_PLUGIN_CONFIG.id,
    name: EVENT_ALERTS_PLUGIN_CONFIG.name,
    description: EVENT_ALERTS_PLUGIN_CONFIG.description,
    version: EVENT_ALERTS_PLUGIN_CONFIG.version,
    core: false, // Optional plugin - user can enable/disable
    defaultEnabled: false,
    icon: EVENT_ALERTS_PLUGIN_CONFIG.icon,
    permissions: EVENT_ALERTS_PLUGIN_CONFIG.permissions,
    // No content script injection needed - this is a background/popup plugin
  },

  // Background initialization
  initialize: async () => {
    console.log('Initializing Event Alerts plugin');
    
    // Set up message listeners for background script communication
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SHOW_CHROME_NOTIFICATION') {
        NotificationManager.showChromeNotification(message.payload.event, message.payload.settings)
          .then(() => sendResponse({ success: true }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
      }
      
      if (message.type === 'SHOW_IN_PAGE_NOTIFICATION') {
        NotificationManager.showInPageNotification(message.payload.event, message.payload.settings)
          .then(() => sendResponse({ success: true }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
      }
    });
  },

  // UI component for the popup
  renderComponent: undefined, // Component handled by legacy system

  // Cleanup function
  cleanup: async () => {
    console.log('Cleaning up Event Alerts plugin');
    cleanupEventMonitor();
    eventMonitor = null;
  },

  // Handle plugin messages
  handleMessage: async (message: any) => {
    const { action, data } = message;
    
    switch (action) {
      case 'START_POLLING':
        await startPolling();
        return { success: true };
      
      case 'STOP_POLLING':
        await stopPolling();
        return { success: true };
      
      case 'GET_EVENTS': {
        const events = await getEvents();
        return { success: true, data: events };
      }
      
      case 'CLEAR_EVENTS':
        await clearEvents();
        return { success: true };
      
      case 'DISMISS_EVENT':
        await dismissEvent(data);
        return { success: true };
      
      case 'GET_POLLING_STATUS': {
        const status = await getPollingStatus();
        return { success: true, data: status };
      }
      
      case 'GET_STATS': {
        const stats = await getStats();
        return { success: true, data: stats };
      }
      
      case 'TEST_CONNECTION': {
        const result = await testConnection();
        return { success: true, data: result };
      }
      
      case 'UPDATE_SETTINGS':
        await updateSettings(data);
        return { success: true };
      
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }
};

export default eventAlertsPlugin; 