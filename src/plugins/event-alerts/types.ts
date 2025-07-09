export interface DatadogEvent {
  id: string;
  title: string;
  text: string;
  date_happened: number;
  handle?: string;
  priority: 'low' | 'normal' | 'high';
  related_event_id?: string;
  tags: string[];
  url?: string;
  source?: string;
  event_type?: string;
  aggregation_key?: string;
  source_type_name?: string;
  monitor_id?: number;
  monitor_groups?: string[];
  alert_type?: 'error' | 'warning' | 'info' | 'success' | 'user_update' | 'recommendation' | 'snapshot';
  host?: string;
  device_name?: string;
}

export interface ProcessedEvent {
  id: string;
  datadogEvent: DatadogEvent;
  monitorId?: number;
  monitorName?: string;
  timestamp: number;
  processed: boolean;
  notified: boolean;
  dismissed: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  dashboardUrl?: string;
  monitorUrl?: string;
}

export interface EventAlertsSettings {
  monitorIds: string;
  pollingInterval: number;
  notificationType: 'chrome' | 'in-page' | 'both';
  targetDomains: string;
  enableSound: boolean;
  alertPriority: 'low' | 'normal' | 'high';
  maxEventsHistory: number;
  showEventDetails: boolean;
  autoOpenDashboard: boolean;
  enableQuietHours: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface EventStorage {
  events: ProcessedEvent[];
  lastPollTime: number;
  lastEventId?: string;
  pollCount: number;
}

export interface NotificationConfig {
  type: 'chrome' | 'in-page';
  title: string;
  message: string;
  iconUrl?: string;
  priority: number;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  iconUrl?: string;
}

export interface InPageNotificationConfig {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  actionButton?: {
    text: string;
    action: string;
  };
  dismissible: boolean;
  sound?: boolean;
}

export interface MonitorInfo {
  id: number;
  name: string;
  type: string;
  query: string;
  message: string;
  tags: string[];
  options: {
    notify_audit: boolean;
    locked: boolean;
    timeout_h: number;
    include_tags: boolean;
    no_data_timeframe: number;
    require_full_window: boolean;
    new_host_delay: number;
    notify_no_data: boolean;
    renotify_interval: number;
    escalation_message: string;
    monitor_thresholds: {
      critical?: number;
      warning?: number;
      unknown?: number;
      ok?: number;
      critical_recovery?: number;
      warning_recovery?: number;
    };
  };
  priority?: number;
  restricted_roles?: string[];
  created?: string;
  modified?: string;
  deleted?: string;
  creator?: {
    name: string;
    handle: string;
    email: string;
  };
  overall_state?: 'Alert' | 'Warn' | 'No Data' | 'OK' | 'Skipped' | 'Ignored';
}

export interface EventFilter {
  sources?: string[];
  tags?: string[];
  unaggregated?: boolean;
  exclude_aggregate?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export interface PollingStatus {
  isActive: boolean;
  lastPoll: number;
  nextPoll: number;
  pollCount: number;
  errors: number;
  lastError?: string;
}

export interface EventStats {
  totalEvents: number;
  newEventsToday: number;
  criticalEvents: number;
  warningEvents: number;
  infoEvents: number;
  dismissedEvents: number;
  averageResponseTime: number;
}

export const DEFAULT_EVENT_ALERTS_SETTINGS: EventAlertsSettings = {
  monitorIds: '',
  pollingInterval: 30,
  notificationType: 'chrome',
  targetDomains: 'shopist.io,demo.datadoghq.com',
  enableSound: true,
  alertPriority: 'normal',
  maxEventsHistory: 100,
  showEventDetails: true,
  autoOpenDashboard: false,
  enableQuietHours: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export const EVENT_PRIORITY_LEVELS: Record<string, number> = {
  low: 1,
  normal: 2,
  high: 3,
};

export const ALERT_TYPE_MAPPING: Record<string, 'critical' | 'warning' | 'info'> = {
  error: 'critical',
  warning: 'warning',
  info: 'info',
  success: 'info',
  user_update: 'info',
  recommendation: 'info',
  snapshot: 'info',
};

export const NOTIFICATION_SOUNDS = {
  critical: 'critical-alert.wav',
  warning: 'warning-alert.wav',
  info: 'info-alert.wav',
} as const;

export const DATADOG_EVENT_SOURCES = [
  'nagios',
  'hudson',
  'jenkins',
  'my apps',
  'chef',
  'puppet',
  'git',
  'bitbucket',
  'fabric',
  'capistrano',
  'datadog',
  'monitor alert',
  'downtime',
  'maintenance',
] as const;

export type DatadogEventSource = typeof DATADOG_EVENT_SOURCES[number];

export interface EventAPIResponse {
  events: DatadogEvent[];
  status: string;
}

export interface MonitorAPIResponse {
  id: number;
  name: string;
  type: string;
  query: string;
  message: string;
  tags: string[];
  options: any;
  overall_state: string;
  created: string;
  modified: string;
  creator: {
    name: string;
    handle: string;
    email: string;
  };
}

export {}; 