import { getMessage } from '@extend-chrome/messages';
import { DatadogCredentials } from '../types';
import { createLogger } from './logger';

const debugLog = createLogger('Messages');

// Credential validation messages
export interface ValidateCredentialsRequest {
  credentials: Pick<DatadogCredentials, 'apiKey' | 'appKey'>;
}

export interface ValidateCredentialsResponse {
  success: boolean;
  isValid?: boolean;
  error?: string;
}

const [_sendValidateCredentials, validateCredentialsStream, waitForValidateCredentials] = 
  getMessage<ValidateCredentialsRequest>('VALIDATE_CREDENTIALS');

// Wrap with debug logging
export const sendValidateCredentials = (data: ValidateCredentialsRequest) => {
  debugLog.debug('SENDING', 'VALIDATE_CREDENTIALS', data);
  return _sendValidateCredentials(data);
};

export { validateCredentialsStream, waitForValidateCredentials };

// Script injection messages
export interface InjectScriptRequest {
  tabId: number;
  script: string;
}

export const [sendInjectScript, injectScriptStream, waitForInjectScript] = 
  getMessage<InjectScriptRequest>('INJECT_SCRIPT');

// Active tab messages
export interface GetActiveTabResponse {
  success: boolean;
  data?: chrome.tabs.Tab;
  error?: string;
}

export const [sendGetActiveTab, getActiveTabStream, waitForGetActiveTab] = 
  getMessage<void>('GET_ACTIVE_TAB');

// Plugin messages
export interface PluginMessageRequest {
  pluginId: string;
  action: string;
  payload?: any;
}

export const [sendPluginMessage, pluginMessageStream, waitForPluginMessage] = 
  getMessage<PluginMessageRequest>('PLUGIN_MESSAGE');

// APM Monitoring messages
export interface APMSettings {
  enabled: boolean;
  autoTrace: boolean;
  traceEndpoints: string[];
  excludePatterns: string[];
}

export const [sendInitAPMMonitoring, initAPMMonitoringStream, waitForInitAPMMonitoring] = 
  getMessage<APMSettings>('INIT_APM_MONITORING');

export const [sendStartAPMMonitoring, startAPMMonitoringStream, waitForStartAPMMonitoring] = 
  getMessage<APMSettings>('START_APM_MONITORING');

export const [sendStopAPMMonitoring, stopAPMMonitoringStream, waitForStopAPMMonitoring] = 
  getMessage<void>('STOP_APM_MONITORING');

export const [sendUpdateAPMSettings, updateAPMSettingsStream, waitForUpdateAPMSettings] = 
  getMessage<APMSettings>('UPDATE_APM_SETTINGS');

// APM Trace messages
export interface GetAPMTracesRequest {
  filter?: string;
}

export interface APMTrace {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number;
}

export const [sendGetAPMTraces, getAPMTracesStream, waitForGetAPMTraces] = 
  getMessage<GetAPMTracesRequest>('GET_APM_TRACES');

export const [sendClearAPMTraces, clearAPMTracesStream, waitForClearAPMTraces] = 
  getMessage<void>('CLEAR_APM_TRACES');

// RUM Session messages
export interface RUMSessionData {
  sessionId?: string;
  userId?: string;
  userInfo?: any;
  sessionReplayLink?: string;
  isActive: boolean;
  error?: string;
  lastUpdated?: number;
  url?: string;
  applicationId?: string;
}

export const [sendGetRUMSessionData, getRUMSessionDataStream, waitForGetRUMSessionData] = 
  getMessage<void>('GET_RUM_SESSION_DATA');

// Event Alerts messages
export interface EventMonitoringSettings {
  enabled: boolean;
  monitorIds: string[];
  pollingInterval: number;
  notificationType: 'chrome' | 'in-page' | 'both';
  targetDomains: string[];
  soundAlert: boolean;
  priority: 'all' | 'low' | 'normal' | 'high';
}

export interface StartEventMonitoringRequest {
  settings: EventMonitoringSettings;
  site: string;
  apiKey: string;
}

export const [sendStartEventMonitoring, startEventMonitoringStream, waitForStartEventMonitoring] = 
  getMessage<StartEventMonitoringRequest>('START_EVENT_MONITORING');

export const [sendStopEventMonitoring, stopEventMonitoringStream, waitForStopEventMonitoring] = 
  getMessage<void>('STOP_EVENT_MONITORING');

// Event data messages
export interface DatadogEvent {
  id: string;
  title: string;
  text: string;
  priority: 'low' | 'normal' | 'high';
  tags: string[];
  timestamp: number;
  monitorId?: string;
  alertType?: string;
}

export const [sendGetEventAlertsEvents, getEventAlertsEventsStream, waitForGetEventAlertsEvents] = 
  getMessage<void>('GET_EVENT_ALERTS_EVENTS');

export const [sendClearEventAlertsEvents, clearEventAlertsEventsStream, waitForClearEventAlertsEvents] = 
  getMessage<void>('CLEAR_EVENT_ALERTS_EVENTS');

export interface DismissEventAlertRequest {
  eventId: string;
}

export const [sendDismissEventAlert, dismissEventAlertStream, waitForDismissEventAlert] = 
  getMessage<DismissEventAlertRequest>('DISMISS_EVENT_ALERT');

// Event monitoring status
export interface EventMonitoringStatus {
  isActive: boolean;
  lastPoll: number;
  nextPoll: number;
  pollCount: number;
  errors: number;
}

export const [sendGetEventAlertsStatus, getEventAlertsStatusStream, waitForGetEventAlertsStatus] = 
  getMessage<void>('GET_EVENT_ALERTS_STATUS');

export const [sendUpdateEventAlertsSettings, updateEventAlertsSettingsStream, waitForUpdateEventAlertsSettings] = 
  getMessage<EventMonitoringSettings>('UPDATE_EVENT_ALERTS_SETTINGS');

// Notification messages
export interface ShowChromeNotificationRequest {
  event: DatadogEvent;
  settings: EventMonitoringSettings;
}

export const [sendShowChromeNotification, showChromeNotificationStream, waitForShowChromeNotification] = 
  getMessage<ShowChromeNotificationRequest>('SHOW_CHROME_NOTIFICATION');

export interface ShowInPageNotificationRequest {
  event: DatadogEvent;
  settings: EventMonitoringSettings;
}

export const [sendShowInPageNotification, showInPageNotificationStream, waitForShowInPageNotification] = 
  getMessage<ShowInPageNotificationRequest>('SHOW_IN_PAGE_NOTIFICATION');

// Generic response interface for messages that return simple success/error
export interface GenericResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// Content script messages
export interface GetPageInfoResponse {
  success: boolean;
  data?: {
    hasDatadog: {
      rum: boolean;
      logs: boolean;
      apm: boolean;
    };
    performance?: any;
  };
  error?: string;
}

export const [sendGetPageInfo, getPageInfoStream, waitForGetPageInfo] = 
  getMessage<void>('GET_PAGE_INFO');

export const [sendCollectPerformanceData, collectPerformanceDataStream, waitForCollectPerformanceData] = 
  getMessage<void>('COLLECT_PERFORMANCE_DATA');

 