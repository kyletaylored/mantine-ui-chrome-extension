import { DATADOG_SITES } from '../../types';
import { 
  DEFAULT_EVENT_ALERTS_SETTINGS, 
  EVENT_PRIORITY_LEVELS, 
  ALERT_TYPE_MAPPING,
  EventAlertsSettings,
  DatadogEvent,
  ProcessedEvent,
  NotificationConfig,
  InPageNotificationConfig,
  EventFilter
} from './types';

export { DEFAULT_EVENT_ALERTS_SETTINGS, EVENT_PRIORITY_LEVELS, ALERT_TYPE_MAPPING };

export const EVENT_ALERTS_PLUGIN_CONFIG = {
  id: 'event-alerts',
  name: 'Event Alerts',
  description: 'Monitor Datadog events and generate real-time notifications for specified monitors',
  version: '1.0.0',
  category: 'monitoring',
  icon: '🔔',
  permissions: ['notifications', 'activeTab', 'scripting', 'storage', 'alarms'],
  defaultSettings: DEFAULT_EVENT_ALERTS_SETTINGS,
};

/**
 * Generate Datadog Events API URL for a given site
 */
export const generateEventsApiUrl = (site: string): string => {
  const datadogSite = DATADOG_SITES.find(s => s.region === site);
  if (!datadogSite) {
    // Default to US1 if site not found
    return 'https://api.datadoghq.com/api/v1/events';
  }
  
  return `${datadogSite.apiUrl}/api/v1/events`;
};

/**
 * Generate Datadog Monitor API URL for a given site
 */
export const generateMonitorApiUrl = (site: string, monitorId?: number): string => {
  const datadogSite = DATADOG_SITES.find(s => s.region === site);
  const baseUrl = datadogSite ? datadogSite.apiUrl : 'https://api.datadoghq.com';
  
  if (monitorId) {
    return `${baseUrl}/api/v1/monitor/${monitorId}`;
  }
  
  return `${baseUrl}/api/v1/monitor`;
};

/**
 * Generate monitor dashboard URL
 */
export const generateMonitorDashboardUrl = (site: string, monitorId: number): string => {
  const datadogSite = DATADOG_SITES.find(s => s.region === site);
  if (!datadogSite) {
    return `https://app.datadoghq.com/monitors/${monitorId}`;
  }
  
  return `${datadogSite.url}/monitors/${monitorId}`;
};

/**
 * Generate event dashboard URL
 */
export const generateEventDashboardUrl = (site: string, eventId?: string): string => {
  const datadogSite = DATADOG_SITES.find(s => s.region === site);
  const baseUrl = datadogSite ? datadogSite.url : 'https://app.datadoghq.com';
  
  if (eventId) {
    return `${baseUrl}/event/stream?live=true&event=${eventId}`;
  }
  
  return `${baseUrl}/event/stream`;
};

/**
 * Parse monitor IDs from comma-separated string
 */
export const parseMonitorIds = (monitorIdsStr: string): number[] => {
  if (!monitorIdsStr.trim()) return [];
  
  return monitorIdsStr
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0);
};

/**
 * Parse target domains from comma-separated string
 */
export const parseTargetDomains = (domainsStr: string): string[] => {
  if (!domainsStr.trim()) return [];
  
  return domainsStr
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(domain => domain.length > 0);
};

/**
 * Check if current domain should receive in-page notifications
 */
export const shouldShowInPageNotification = (currentUrl: string, targetDomains: string[]): boolean => {
  if (targetDomains.length === 0) return false;
  
  try {
    const currentDomain = new URL(currentUrl).hostname.toLowerCase();
    
    return targetDomains.some(targetDomain => 
      currentDomain === targetDomain || currentDomain.endsWith(`.${targetDomain}`)
    );
  } catch {
    return false;
  }
};

/**
 * Process raw Datadog event into our internal format
 */
export const processDatadogEvent = (
  event: DatadogEvent, 
  monitorName?: string,
  site: string = 'us1'
): ProcessedEvent => {
  const severity = event.alert_type ? ALERT_TYPE_MAPPING[event.alert_type] || 'info' : 'info';
  
  return {
    id: event.id,
    datadogEvent: event,
    monitorId: event.monitor_id,
    monitorName: monitorName || `Monitor ${event.monitor_id}`,
    timestamp: Date.now(),
    processed: true,
    notified: false,
    dismissed: false,
    severity,
    message: event.title || event.text,
    dashboardUrl: event.monitor_id ? generateMonitorDashboardUrl(site, event.monitor_id) : undefined,
    monitorUrl: event.monitor_id ? generateMonitorDashboardUrl(site, event.monitor_id) : undefined,
  };
};

/**
 * Filter events based on priority settings
 */
export const filterEventsByPriority = (
  events: ProcessedEvent[], 
  minPriority: 'low' | 'normal' | 'high'
): ProcessedEvent[] => {
  const minPriorityLevel = EVENT_PRIORITY_LEVELS[minPriority];
  
  return events.filter(event => {
    const eventPriority = event.datadogEvent.priority || 'normal';
    const eventPriorityLevel = EVENT_PRIORITY_LEVELS[eventPriority];
    return eventPriorityLevel >= minPriorityLevel;
  });
};

/**
 * Create Chrome notification configuration
 */
export const createChromeNotificationConfig = (
  event: ProcessedEvent,
  settings: EventAlertsSettings
): NotificationConfig => {
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  
  return {
    type: 'chrome',
    title: `${event.severity.toUpperCase()}: ${event.monitorName || 'Monitor Alert'}`,
    message: settings.showEventDetails 
      ? `${event.message}\n\nTime: ${new Date(event.datadogEvent.date_happened * 1000).toLocaleString()}`
      : event.message,
    iconUrl,
    priority: getSeverityPriority(event.severity),
    requireInteraction: event.severity === 'critical',
    silent: !settings.enableSound,
    tag: `datadog-event-${event.id}`,
    actions: [
      {
        action: 'view',
        title: 'View in Datadog',
        iconUrl,
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        iconUrl,
      }
    ],
  };
};

/**
 * Create in-page notification configuration
 */
export const createInPageNotificationConfig = (
  event: ProcessedEvent,
  settings: EventAlertsSettings
): InPageNotificationConfig => {
  return {
    id: `datadog-event-${event.id}`,
    title: event.monitorName || 'Monitor Alert',
    message: event.message,
    type: getNotificationType(event.severity),
    duration: event.severity === 'critical' ? 0 : 10000, // Critical alerts persist
    position: 'top-right',
    actionButton: {
      text: 'View in Datadog',
      action: 'view-datadog',
    },
    dismissible: true,
    sound: settings.enableSound,
  };
};

/**
 * Get notification type for severity
 */
const getNotificationType = (severity: string): 'success' | 'error' | 'warning' | 'info' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

/**
 * Get priority number for severity
 */
const getSeverityPriority = (severity: string): number => {
  switch (severity) {
    case 'critical':
      return 2; // High priority
    case 'warning':
      return 1; // Normal priority
    case 'info':
    default:
      return 0; // Low priority
  }
};

/**
 * Check if current time is within quiet hours
 */
export const isWithinQuietHours = (settings: EventAlertsSettings): boolean => {
  if (!settings.enableQuietHours) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle quiet hours that span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
};

/**
 * Build event filter query parameters
 */
export const buildEventFilter = (
  monitorIds: number[]
): EventFilter => {
  const filter: EventFilter = {
    sources: ['monitor alert', 'datadog'],
    tags: monitorIds.map(id => `monitor_id:${id}`),
    unaggregated: true,
  };
  
  return filter;
};

/**
 * Format event API query parameters
 */
export const formatEventQueryParams = (
  monitorIds: number[],
  startTime?: number,
  endTime?: number
): string => {
  const params = new URLSearchParams();
  
  // Set time range
  if (startTime) {
    params.append('start', Math.floor(startTime / 1000).toString());
  }
  if (endTime) {
    params.append('end', Math.floor(endTime / 1000).toString());
  }
  
  // Add monitor filter
  if (monitorIds.length > 0) {
    const monitorTags = monitorIds.map(id => `monitor_id:${id}`).join(' OR ');
    params.append('tags', monitorTags);
  }
  
  // Add source filter for monitor alerts
  params.append('sources', 'monitor alert,datadog');
  params.append('unaggregated', 'true');
  
  return params.toString();
};

/**
 * Generate unique event storage key
 */
export const generateEventStorageKey = (settings: EventAlertsSettings): string => {
  const monitorIds = parseMonitorIds(settings.monitorIds).sort().join('-');
  return `event-alerts-${monitorIds}`;
};

/**
 * Calculate next poll time based on interval
 */
export const calculateNextPollTime = (intervalSeconds: number): number => {
  return Date.now() + (intervalSeconds * 1000);
};

/**
 * Format time duration for display
 */
export const formatTimeDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ago`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return `${seconds}s ago`;
  }
};

/**
 * Truncate text for notifications
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Get severity color for UI
 */
export const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'info':
    default:
      return 'blue';
  }
};

/**
 * Validate monitor ID format
 */
export const validateMonitorId = (id: string): boolean => {
  const numId = parseInt(id.trim(), 10);
  return !isNaN(numId) && numId > 0;
};

/**
 * Validate time format (HH:MM)
 */
export const validateTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}; 