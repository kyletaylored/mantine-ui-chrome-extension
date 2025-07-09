import { DATADOG_SITES } from '../../types';
import { DEFAULT_APM_SETTINGS, TraceHeaders, DATADOG_TRACE_HEADERS } from './types';

export { DEFAULT_APM_SETTINGS, DATADOG_TRACE_HEADERS };

export const APM_PLUGIN_CONFIG = {
  id: 'apm-tracing',
  name: 'APM Tracing',
  description: 'Monitor and track Datadog APM traces from network requests for demonstration purposes',
  version: '1.0.0',
  category: 'monitoring',
  icon: '🔍',
  permissions: ['activeTab', 'webRequest', 'storage'],
  defaultSettings: DEFAULT_APM_SETTINGS,
};

/**
 * Extract Datadog trace headers from request/response headers
 */
export const extractTraceHeaders = (headers: Record<string, string>): TraceHeaders => {
  const traceHeaders: TraceHeaders = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    switch (lowerKey) {
      case 'x-datadog-trace-id':
        traceHeaders.traceId = value;
        break;
      case 'x-datadog-parent-id':
        traceHeaders.parentId = value;
        break;
      case 'x-datadog-sampling-priority':
        traceHeaders.samplingPriority = value;
        break;
      case 'x-datadog-origin':
        traceHeaders.origin = value;
        break;
      case 'x-datadog-tags':
        traceHeaders.tags = value;
        break;
    }
  }
  
  return traceHeaders;
};

/**
 * Check if headers contain Datadog trace information
 */
export const hasDatadogTraceHeaders = (headers: Record<string, string>): boolean => {
  const lowerHeaders = Object.keys(headers).map(key => key.toLowerCase());
  return DATADOG_TRACE_HEADERS.some(header => lowerHeaders.includes(header));
};

/**
 * Generate APM trace URL for a given trace ID and site
 */
export const generateTraceUrl = (traceId: string, site: string): string => {
  const datadogSite = DATADOG_SITES.find(s => s.region === site);
  if (!datadogSite) {
    // Default to US1 if site not found
    return `https://app.datadoghq.com/apm/trace/${traceId}`;
  }
  
  return `${datadogSite.url}/apm/trace/${traceId}`;
};

/**
 * Filter traces based on status code filter
 */
export const filterTracesByStatus = (traces: any[], filter: string): any[] => {
  if (filter === 'all') return traces;
  
  return traces.filter(trace => {
    const status = trace.status;
    switch (filter) {
      case '2xx':
        return status >= 200 && status < 300;
      case '4xx':
        return status >= 400 && status < 500;
      case '5xx':
        return status >= 500 && status < 600;
      default:
        return true;
    }
  });
};

/**
 * Check if a domain should be monitored based on settings
 */
export const shouldMonitorDomain = (url: string, monitorDomains: string): boolean => {
  if (!monitorDomains.trim()) return true; // Monitor all domains if none specified
  
  try {
    const domain = new URL(url).hostname;
    const domainsToMonitor = monitorDomains.split(',').map(d => d.trim()).filter(d => d);
    
    return domainsToMonitor.some(monitorDomain => 
      domain === monitorDomain || domain.endsWith(`.${monitorDomain}`)
    );
  } catch {
    return false;
  }
};

/**
 * Convert Chrome webRequest headers to Record<string, string>
 */
export const convertWebRequestHeaders = (headers: chrome.webRequest.HttpHeader[]): Record<string, string> => {
  const result: Record<string, string> = {};
  
  for (const header of headers) {
    if (header.name && header.value) {
      result[header.name] = header.value;
    }
  }
  
  return result;
};

/**
 * Generate unique request ID
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format duration in milliseconds to human readable format
 */
export const formatDuration = (duration: number): string => {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(1)}s`;
  } else {
    return `${(duration / 60000).toFixed(1)}m`;
  }
};

/**
 * Format timestamp to human readable format
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

/**
 * Get status code color for UI
 */
export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'green';
  if (status >= 300 && status < 400) return 'blue';
  if (status >= 400 && status < 500) return 'yellow';
  if (status >= 500) return 'red';
  return 'gray';
};

/**
 * Truncate URL for display
 */
export const truncateUrl = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname + urlObj.search;
    
    if (pathname.length <= maxLength - urlObj.hostname.length - 3) {
      return `${urlObj.hostname}${pathname}`;
    }
    
    return `${urlObj.hostname}...${pathname.slice(-(maxLength - urlObj.hostname.length - 6))}`;
  } catch {
    return url.length > maxLength ? `${url.slice(0, maxLength - 3)}...` : url;
  }
}; 