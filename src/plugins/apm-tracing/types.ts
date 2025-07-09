export interface TraceData {
  id: string;
  traceId: string;
  spanId?: string;
  parentId?: string;
  domain: string;
  url: string;
  method: string;
  status: number;
  statusText?: string;
  timestamp: number;
  duration?: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  error?: string;
  tabId?: number;
  tabUrl?: string;
}

export interface TraceStorage {
  traces: TraceData[];
  lastCleanup: number;
}

export interface APMTracingSettings {
  maxTraces: number;
  traceRetentionHours: number;
  monitorDomains: string;
  autoOpenTraces: boolean;
  showRequestDetails: boolean;
  filterByStatus: 'all' | '2xx' | '4xx' | '5xx';
}

export interface NetworkRequestDetails {
  requestId: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  timestamp: number;
  tabId?: number;
  tabUrl?: string;
}

export interface NetworkResponseDetails {
  requestId: string;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody?: string;
  timestamp: number;
}

export interface TraceHeaders {
  traceId?: string;
  spanId?: string;
  parentId?: string;
  samplingPriority?: string;
  origin?: string;
  tags?: string;
}

export const DATADOG_TRACE_HEADERS = [
  'x-datadog-trace-id',
  'x-datadog-parent-id',
  'x-datadog-sampling-priority',
  'x-datadog-origin',
  'x-datadog-tags'
] as const;

export const DEFAULT_APM_SETTINGS: APMTracingSettings = {
  maxTraces: 100,
  traceRetentionHours: 24,
  monitorDomains: '',
  autoOpenTraces: true,
  showRequestDetails: true,
  filterByStatus: 'all'
};

export {}; 