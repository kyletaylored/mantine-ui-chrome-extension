import { EventAlertsComponent } from './component';
import { EventMonitor, initializeEventMonitor, cleanupEventMonitor } from './event-monitor';
import { NotificationManager } from './notification-manager';
import { DEFAULT_EVENT_ALERTS_SETTINGS, EVENT_ALERTS_PLUGIN_CONFIG } from './config';
import { EventAlertsSettings, ProcessedEvent, PollingStatus, EventStats } from './types';
import { Plugin } from '../../types';

export class EventAlertsPlugin implements Plugin {
  public readonly id = 'event-alerts';
  public readonly name = 'Event Alerts';
  public readonly description = 'Monitor Datadog events and generate real-time notifications';
  public readonly version = '1.0.0';
  public readonly component = EventAlertsComponent;
  public readonly enabled = true;
  public readonly createdAt = Date.now();
  public readonly updatedAt = Date.now();

  private eventMonitor: EventMonitor | null = null;

  /**
   * Initialize the plugin
   */
  public async initialize(): Promise<void> {
    console.log('Initializing Event Alerts plugin');
    
    // Set up message listeners for background script communication
    this.setupMessageListeners();
  }

  /**
   * Cleanup the plugin
   */
  public async cleanup(): Promise<void> {
    console.log('Cleaning up Event Alerts plugin');
    cleanupEventMonitor();
    this.eventMonitor = null;
  }

  /**
   * Handle plugin actions from the UI
   */
  public async handleAction(action: string, data?: any): Promise<any> {
    switch (action) {
      case 'START_POLLING':
        return await this.startPolling();
      
      case 'STOP_POLLING':
        return await this.stopPolling();
      
      case 'GET_EVENTS':
        return await this.getEvents();
      
      case 'CLEAR_EVENTS':
        return await this.clearEvents();
      
      case 'DISMISS_EVENT':
        return await this.dismissEvent(data);
      
      case 'GET_POLLING_STATUS':
        return await this.getPollingStatus();
      
      case 'GET_STATS':
        return await this.getStats();
      
      case 'TEST_CONNECTION':
        return await this.testConnection();
      
      case 'UPDATE_SETTINGS':
        return await this.updateSettings(data);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Start event polling
   */
  private async startPolling(): Promise<void> {
    const { apiKey, site } = await this.getCredentials();
    const settings = await this.getSettings();
    
    this.eventMonitor = initializeEventMonitor(settings, site, apiKey);
    await this.eventMonitor.startPolling();
    
    // Send message to background script to start monitoring
    await chrome.runtime.sendMessage({
      type: 'START_EVENT_MONITORING',
      payload: { settings, site, apiKey }
    });
  }

  /**
   * Stop event polling
   */
  private async stopPolling(): Promise<void> {
    if (this.eventMonitor) {
      this.eventMonitor.stopPolling();
    }
    
    await chrome.runtime.sendMessage({
      type: 'STOP_EVENT_MONITORING'
    });
  }

  /**
   * Get stored events
   */
  private async getEvents(): Promise<ProcessedEvent[]> {
    if (this.eventMonitor) {
      return await this.eventMonitor.getStoredEvents();
    }
    
    // Fallback to requesting from background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EVENT_ALERTS_EVENTS'
    });
    
    return response || [];
  }

  /**
   * Clear all events
   */
  private async clearEvents(): Promise<void> {
    if (this.eventMonitor) {
      await this.eventMonitor.clearEventStorage();
    }
    
    await chrome.runtime.sendMessage({
      type: 'CLEAR_EVENT_ALERTS_EVENTS'
    });
  }

  /**
   * Dismiss an event
   */
  private async dismissEvent(eventId: string): Promise<void> {
    if (this.eventMonitor) {
      await this.eventMonitor.dismissEvent(eventId);
    }
    
    await chrome.runtime.sendMessage({
      type: 'DISMISS_EVENT_ALERT',
      payload: { eventId }
    });
  }

  /**
   * Get polling status
   */
  private async getPollingStatus(): Promise<PollingStatus> {
    if (this.eventMonitor) {
      return this.eventMonitor.getPollingStatus();
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
  }

  /**
   * Get event statistics
   */
  private async getStats(): Promise<EventStats> {
    const events = await this.getEvents();
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
  }

  /**
   * Test connection to Datadog API
   */
  private async testConnection(): Promise<{ success: boolean; message: string; eventCount?: number }> {
    try {
      const { apiKey, site } = await this.getCredentials();
      const settings = await this.getSettings();
      
      const testMonitor = new EventMonitor(settings, site, apiKey);
      return await testMonitor.testConnection();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update plugin settings
   */
  private async updateSettings(newSettings: EventAlertsSettings): Promise<void> {
    await chrome.storage.local.set({
      'event-alerts-settings': newSettings
    });
    
    if (this.eventMonitor) {
      this.eventMonitor.updateSettings(newSettings);
    }
    
    await chrome.runtime.sendMessage({
      type: 'UPDATE_EVENT_ALERTS_SETTINGS',
      payload: { settings: newSettings }
    });
  }

  /**
   * Get plugin settings
   */
  private async getSettings(): Promise<EventAlertsSettings> {
    const result = await chrome.storage.local.get('event-alerts-settings');
    return result['event-alerts-settings'] || DEFAULT_EVENT_ALERTS_SETTINGS;
  }

  /**
   * Get Datadog credentials
   */
  private async getCredentials(): Promise<{ apiKey: string; site: string }> {
    const result = await chrome.storage.local.get(['datadog-credentials']);
    const credentials = result['datadog-credentials'];
    
    if (!credentials?.apiKey) {
      throw new Error('Datadog API key not configured');
    }
    
    return {
      apiKey: credentials.apiKey,
      site: credentials.site || 'us1'
    };
  }

  /**
   * Setup message listeners for background script communication
   */
  private setupMessageListeners(): void {
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
  }
}

// Export plugin configuration
export const eventAlertsPluginConfig = EVENT_ALERTS_PLUGIN_CONFIG;

// Export the plugin instance
export default new EventAlertsPlugin(); 