import { 
  DatadogEvent, 
  EventAlertsSettings, 
  ProcessedEvent, 
  EventStorage, 
  PollingStatus,
  EventAPIResponse
} from './types';
import { 
  generateEventsApiUrl, 
  parseMonitorIds, 
  processDatadogEvent,
  filterEventsByPriority,
  formatEventQueryParams,
  generateEventStorageKey,
  calculateNextPollTime,
  isWithinQuietHours
} from './config';

export class EventMonitor {
  private pollingInterval: number | null = null;
  private isPolling = false;
  private settings: EventAlertsSettings;
  private site: string;
  private apiKey: string;
  private pollingStatus: PollingStatus = {
    isActive: false,
    lastPoll: 0,
    nextPoll: 0,
    pollCount: 0,
    errors: 0,
  };

  constructor(settings: EventAlertsSettings, site: string, apiKey: string) {
    this.settings = settings;
    this.site = site;
    this.apiKey = apiKey;
  }

  /**
   * Start polling for events
   */
  public async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('Event polling is already active');
      return;
    }

    const monitorIds = parseMonitorIds(this.settings.monitorIds);
    if (monitorIds.length === 0) {
      throw new Error('No valid monitor IDs configured');
    }

    this.isPolling = true;
    this.pollingStatus.isActive = true;
    
    console.log(`Starting event polling for monitors: ${monitorIds.join(', ')}`);
    
    // Do initial poll immediately
    await this.pollEvents();
    
    // Schedule recurring polls
    this.scheduleNextPoll();
  }

  /**
   * Stop polling for events
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isPolling = false;
    this.pollingStatus.isActive = false;
    
    console.log('Event polling stopped');
  }

  /**
   * Update settings and restart polling if needed
   */
  public updateSettings(newSettings: EventAlertsSettings): void {
    const wasPolling = this.isPolling;
    
    if (wasPolling) {
      this.stopPolling();
    }
    
    this.settings = newSettings;
    
    if (wasPolling) {
      this.startPolling().catch(error => {
        console.error('Failed to restart polling after settings update:', error);
      });
    }
  }

  /**
   * Get current polling status
   */
  public getPollingStatus(): PollingStatus {
    return { ...this.pollingStatus };
  }

  /**
   * Manually trigger a poll
   */
  public async forcePoll(): Promise<ProcessedEvent[]> {
    return await this.pollEvents();
  }

  /**
   * Schedule the next poll
   */
  private scheduleNextPoll(): void {
    if (!this.isPolling) return;

    const nextPollTime = calculateNextPollTime(this.settings.pollingInterval);
    this.pollingStatus.nextPoll = nextPollTime;

    this.pollingInterval = setTimeout(() => {
      if (this.isPolling) {
        this.pollEvents()
          .then(() => this.scheduleNextPoll())
          .catch(error => {
            console.error('Error during scheduled poll:', error);
            this.pollingStatus.errors++;
            this.pollingStatus.lastError = error.message;
            // Continue polling despite errors
            this.scheduleNextPoll();
          });
      }
    }, this.settings.pollingInterval * 1000) as unknown as number;
  }

  /**
   * Poll events from Datadog API
   */
  private async pollEvents(): Promise<ProcessedEvent[]> {
    const monitorIds = parseMonitorIds(this.settings.monitorIds);
    if (monitorIds.length === 0) {
      return [];
    }

    this.pollingStatus.lastPoll = Date.now();
    this.pollingStatus.pollCount++;

    try {
      // Check quiet hours
      if (isWithinQuietHours(this.settings)) {
        console.log('Skipping poll during quiet hours');
        return [];
      }

      // Get existing event storage
      const storage = await this.getEventStorage();
      
      // Calculate time range for polling (look back from last poll time)
      const startTime = storage.lastPollTime || (Date.now() - (24 * 60 * 60 * 1000)); // Default: 24 hours ago
      const endTime = Date.now();

      // Fetch events from Datadog API
      const events = await this.fetchEventsFromAPI(monitorIds, startTime, endTime);
      
      // Process new events
      const processedEvents = await this.processNewEvents(events, storage.events);
      
      // Update storage
      storage.events = [...storage.events, ...processedEvents];
      storage.lastPollTime = endTime;
      storage.pollCount++;
      
      // Trim events to max history
      if (storage.events.length > this.settings.maxEventsHistory) {
        storage.events = storage.events
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.settings.maxEventsHistory);
      }
      
      // Save updated storage
      await this.saveEventStorage(storage);
      
      // Send notifications for new events
      if (processedEvents.length > 0) {
        await this.sendNotifications(processedEvents);
      }

      console.log(`Polled ${events.length} events, ${processedEvents.length} new`);
      
      return processedEvents;
    } catch (error) {
      console.error('Error polling events:', error);
      this.pollingStatus.errors++;
      this.pollingStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Fetch events from Datadog API
   */
  private async fetchEventsFromAPI(
    monitorIds: number[], 
    startTime: number, 
    endTime: number
  ): Promise<DatadogEvent[]> {
    const apiUrl = generateEventsApiUrl(this.site);
    const queryParams = formatEventQueryParams(monitorIds, startTime, endTime);
    const url = `${apiUrl}?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'DD-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch events: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: EventAPIResponse = await response.json();
    return data.events || [];
  }

  /**
   * Process new events and filter out duplicates
   */
  private async processNewEvents(
    apiEvents: DatadogEvent[], 
    existingEvents: ProcessedEvent[]
  ): Promise<ProcessedEvent[]> {
    const existingEventIds = new Set(existingEvents.map(e => e.id));
    const newEvents: ProcessedEvent[] = [];

    for (const apiEvent of apiEvents) {
      // Skip if we've already processed this event
      if (existingEventIds.has(apiEvent.id)) {
        continue;
      }

      // Get monitor name if available
      const monitorName = await this.getMonitorName(apiEvent.monitor_id);
      
      // Process the event
      const processedEvent = processDatadogEvent(apiEvent, monitorName, this.site);
      newEvents.push(processedEvent);
    }

    // Filter by priority
    return filterEventsByPriority(newEvents, this.settings.alertPriority);
  }

  /**
   * Get monitor name from monitor ID
   */
  private async getMonitorName(monitorId?: number): Promise<string | undefined> {
    if (!monitorId) return undefined;

    try {
      // Try to get from cache first
      const cacheKey = `monitor-name-${monitorId}`;
      const cached = await chrome.storage.local.get(cacheKey);
      
      if (cached[cacheKey]) {
        return cached[cacheKey];
      }

      // TODO: Fetch from Datadog Monitor API if needed
      // For now, return a default name
      return `Monitor ${monitorId}`;
    } catch (error) {
      console.error('Error getting monitor name:', error);
      return `Monitor ${monitorId}`;
    }
  }

  /**
   * Send notifications for new events
   */
  private async sendNotifications(events: ProcessedEvent[]): Promise<void> {
    for (const event of events) {
      try {
        // Send based on notification type setting
        switch (this.settings.notificationType) {
          case 'chrome':
            await this.sendChromeNotification(event);
            break;
          case 'in-page':
            await this.sendInPageNotification(event);
            break;
          case 'both':
            await this.sendChromeNotification(event);
            await this.sendInPageNotification(event);
            break;
        }
        
        // Mark as notified
        event.notified = true;
      } catch (error) {
        console.error('Error sending notification for event:', event.id, error);
      }
    }
  }

  /**
   * Send Chrome notification
   */
  private async sendChromeNotification(event: ProcessedEvent): Promise<void> {
    const message = {
      type: 'SHOW_CHROME_NOTIFICATION' as const,
      payload: {
        event,
        settings: this.settings,
      },
    };

    await chrome.runtime.sendMessage(message);
  }

  /**
   * Send in-page notification
   */
  private async sendInPageNotification(event: ProcessedEvent): Promise<void> {
    const message = {
      type: 'SHOW_IN_PAGE_NOTIFICATION' as const,
      payload: {
        event,
        settings: this.settings,
      },
    };

    await chrome.runtime.sendMessage(message);
  }

  /**
   * Get event storage
   */
  private async getEventStorage(): Promise<EventStorage> {
    const storageKey = generateEventStorageKey(this.settings);
    const result = await chrome.storage.local.get(storageKey);
    
    return result[storageKey] || {
      events: [],
      lastPollTime: 0,
      pollCount: 0,
    };
  }

  /**
   * Save event storage
   */
  private async saveEventStorage(storage: EventStorage): Promise<void> {
    const storageKey = generateEventStorageKey(this.settings);
    await chrome.storage.local.set({ [storageKey]: storage });
  }

  /**
   * Clear all stored events
   */
  public async clearEventStorage(): Promise<void> {
    const storageKey = generateEventStorageKey(this.settings);
    await chrome.storage.local.remove(storageKey);
  }

  /**
   * Get all stored events
   */
  public async getStoredEvents(): Promise<ProcessedEvent[]> {
    const storage = await this.getEventStorage();
    return storage.events.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Mark event as dismissed
   */
  public async dismissEvent(eventId: string): Promise<void> {
    const storage = await this.getEventStorage();
    const event = storage.events.find(e => e.id === eventId);
    
    if (event) {
      event.dismissed = true;
      await this.saveEventStorage(storage);
    }
  }

  /**
   * Test the connection and poll once
   */
  public async testConnection(): Promise<{ success: boolean; message: string; eventCount?: number }> {
    try {
      const monitorIds = parseMonitorIds(this.settings.monitorIds);
      if (monitorIds.length === 0) {
        return { success: false, message: 'No valid monitor IDs configured' };
      }

      const startTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      const endTime = Date.now();
      
      const events = await this.fetchEventsFromAPI(monitorIds, startTime, endTime);
      
      return { 
        success: true, 
        message: 'Connection successful', 
        eventCount: events.length 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Global event monitor instance
 */
let globalEventMonitor: EventMonitor | null = null;

/**
 * Initialize global event monitor
 */
export const initializeEventMonitor = (
  settings: EventAlertsSettings, 
  site: string, 
  apiKey: string
): EventMonitor => {
  if (globalEventMonitor) {
    globalEventMonitor.stopPolling();
  }
  
  globalEventMonitor = new EventMonitor(settings, site, apiKey);
  return globalEventMonitor;
};

/**
 * Get global event monitor instance
 */
export const getEventMonitor = (): EventMonitor | null => {
  return globalEventMonitor;
};

/**
 * Stop and cleanup global event monitor
 */
export const cleanupEventMonitor = (): void => {
  if (globalEventMonitor) {
    globalEventMonitor.stopPolling();
    globalEventMonitor = null;
  }
}; 