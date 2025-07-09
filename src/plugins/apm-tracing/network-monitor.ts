import { TraceData, TraceStorage, NetworkRequestDetails, NetworkResponseDetails, APMTracingSettings } from './types';
import { 
  extractTraceHeaders, 
  hasDatadogTraceHeaders, 
  shouldMonitorDomain, 
  convertWebRequestHeaders,
  generateRequestId
} from './config';
import { SecureExtensionStorage } from '@/shared/storage';

export class NetworkMonitor {
  private pendingRequests: Map<string, NetworkRequestDetails> = new Map();
  private traceStorage: TraceStorage = { traces: [], lastCleanup: Date.now() };
  private settings: APMTracingSettings;
  private isMonitoring = false;
  private storage = SecureExtensionStorage.createPluginBucket<TraceStorage>('apm-tracing');

  constructor(settings: APMTracingSettings) {
    this.settings = settings;
    this.loadTraces();
  }

  /**
   * Start monitoring network requests
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Load existing traces from storage
      await this.loadTraces();

      // Set up webRequest listeners
      this.setupWebRequestListeners();

      this.isMonitoring = true;
      console.log('APM Network Monitor started');
    } catch (error) {
      console.error('Failed to start APM network monitoring:', error);
    }
  }

  /**
   * Stop monitoring network requests
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    // Remove webRequest listeners
    this.removeWebRequestListeners();

    this.isMonitoring = false;
    console.log('APM Network Monitor stopped');
  }

  /**
   * Update monitoring settings
   */
  updateSettings(newSettings: APMTracingSettings): void {
    this.settings = newSettings;
  }

  /**
   * Get current traces
   */
  async getTraces(): Promise<TraceData[]> {
    await this.cleanupOldTraces();
    return this.traceStorage.traces.slice().reverse(); // Most recent first
  }

  /**
   * Clear all traces
   */
  async clearTraces(): Promise<void> {
    this.traceStorage.traces = [];
    await this.saveTraces();
  }

  /**
   * Set up Chrome webRequest listeners
   */
  private setupWebRequestListeners(): void {
    // Listen for request headers
    chrome.webRequest.onBeforeSendHeaders.addListener(
      this.handleBeforeSendHeaders.bind(this),
      { urls: ['<all_urls>'] },
      ['requestHeaders']
    );

    // Listen for response headers
    chrome.webRequest.onHeadersReceived.addListener(
      this.handleHeadersReceived.bind(this),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    // Listen for completed requests
    chrome.webRequest.onCompleted.addListener(
      this.handleCompleted.bind(this),
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );

    // Listen for error requests
    chrome.webRequest.onErrorOccurred.addListener(
      this.handleErrorOccurred.bind(this),
      { urls: ['<all_urls>'] }
    );
  }

  /**
   * Remove Chrome webRequest listeners
   */
  private removeWebRequestListeners(): void {
    if (chrome.webRequest?.onBeforeSendHeaders) {
      chrome.webRequest.onBeforeSendHeaders.removeListener(this.handleBeforeSendHeaders);
    }
    if (chrome.webRequest?.onHeadersReceived) {
      chrome.webRequest.onHeadersReceived.removeListener(this.handleHeadersReceived);
    }
    if (chrome.webRequest?.onCompleted) {
      chrome.webRequest.onCompleted.removeListener(this.handleCompleted);
    }
    if (chrome.webRequest?.onErrorOccurred) {
      chrome.webRequest.onErrorOccurred.removeListener(this.handleErrorOccurred);
    }
  }

  /**
   * Handle request headers
   */
  private handleBeforeSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails): void {
    if (!this.shouldProcessRequest(details.url)) return;

    const headers = convertWebRequestHeaders(details.requestHeaders || []);
    
    // Only track requests with Datadog trace headers
    if (!hasDatadogTraceHeaders(headers)) return;

    const requestDetails: NetworkRequestDetails = {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      requestHeaders: headers,
      timestamp: Date.now(),
      tabId: details.tabId,
    };

    this.pendingRequests.set(details.requestId, requestDetails);
  }

  /**
   * Handle response headers
   */
  private handleHeadersReceived(details: chrome.webRequest.WebResponseHeadersDetails): void {
    const request = this.pendingRequests.get(details.requestId);
    if (!request) return;

    const responseHeaders = convertWebRequestHeaders(details.responseHeaders || []);
    
    // Check if response also has trace headers
    const hasResponseTraceHeaders = hasDatadogTraceHeaders(responseHeaders);
    
    // Store response info with the request
    const responseDetails: NetworkResponseDetails = {
      requestId: details.requestId,
      status: details.statusCode,
      statusText: details.statusLine || '',
      responseHeaders,
      timestamp: Date.now(),
    };

    // Update the pending request with response info
    const updatedRequest = {
      ...request,
      responseDetails,
      hasResponseTraceHeaders,
    };

    this.pendingRequests.set(details.requestId, updatedRequest);
  }

  /**
   * Handle completed requests
   */
  private handleCompleted(details: chrome.webRequest.WebResponseHeadersDetails): void {
    const request = this.pendingRequests.get(details.requestId);
    if (!request) return;

    this.processCompletedRequest(request, details);
    this.pendingRequests.delete(details.requestId);
  }

  /**
   * Handle error requests
   */
  private handleErrorOccurred(details: any): void {
    const request = this.pendingRequests.get(details.requestId);
    if (!request) return;

    this.processErrorRequest(request, details);
    this.pendingRequests.delete(details.requestId);
  }

  /**
   * Process completed request and extract trace data
   */
  private async processCompletedRequest(
    request: NetworkRequestDetails,
    details: chrome.webRequest.WebResponseHeadersDetails
  ): Promise<void> {
    const traceHeaders = extractTraceHeaders(request.requestHeaders);
    
    if (!traceHeaders.traceId) return;

    try {
      // Get tab URL if available
      let tabUrl = '';
      if (request.tabId && request.tabId > 0) {
        try {
          const tab = await chrome.tabs.get(request.tabId);
          tabUrl = tab.url || '';
        } catch {
          // Tab might not exist anymore
        }
      }

      const traceData: TraceData = {
        id: generateRequestId(),
        traceId: traceHeaders.traceId,
        spanId: traceHeaders.spanId,
        parentId: traceHeaders.parentId,
        domain: new URL(request.url).hostname,
        url: request.url,
        method: request.method,
        status: details.statusCode,
        statusText: details.statusLine || '',
        timestamp: request.timestamp,
        duration: Date.now() - request.timestamp,
        requestHeaders: request.requestHeaders,
        responseHeaders: convertWebRequestHeaders(details.responseHeaders || []),
        tabId: request.tabId,
        tabUrl,
      };

      await this.storeTrace(traceData);
    } catch (error) {
      console.error('Failed to process completed request:', error);
    }
  }

  /**
   * Process error request
   */
  private async processErrorRequest(
    request: NetworkRequestDetails,
    details: any
  ): Promise<void> {
    const traceHeaders = extractTraceHeaders(request.requestHeaders);
    
    if (!traceHeaders.traceId) return;

    try {
      let tabUrl = '';
      if (request.tabId && request.tabId > 0) {
        try {
          const tab = await chrome.tabs.get(request.tabId);
          tabUrl = tab.url || '';
        } catch {
          // Tab might not exist anymore
        }
      }

      const traceData: TraceData = {
        id: generateRequestId(),
        traceId: traceHeaders.traceId,
        spanId: traceHeaders.spanId,
        parentId: traceHeaders.parentId,
        domain: new URL(request.url).hostname,
        url: request.url,
        method: request.method,
        status: 0,
        statusText: details.error,
        timestamp: request.timestamp,
        duration: Date.now() - request.timestamp,
        requestHeaders: request.requestHeaders,
        responseHeaders: {},
        error: details.error,
        tabId: request.tabId,
        tabUrl,
      };

      await this.storeTrace(traceData);
    } catch (error) {
      console.error('Failed to process error request:', error);
    }
  }

  /**
   * Check if request should be processed
   */
  private shouldProcessRequest(url: string): boolean {
    try {
      // Skip chrome:// and moz-extension:// URLs
      if (url.startsWith('chrome://') || url.startsWith('moz-extension://')) {
        return false;
      }

      // Check domain filtering
      return shouldMonitorDomain(url, this.settings.monitorDomains);
    } catch {
      return false;
    }
  }

  /**
   * Store trace data
   */
  private async storeTrace(traceData: TraceData): Promise<void> {
    this.traceStorage.traces.push(traceData);
    
    // Enforce max traces limit
    if (this.traceStorage.traces.length > this.settings.maxTraces) {
      this.traceStorage.traces = this.traceStorage.traces.slice(-this.settings.maxTraces);
    }

    await this.saveTraces();
  }

  /**
   * Load traces from storage
   */
  private async loadTraces(): Promise<void> {
    try {
      const result = await this.storage.get();
      if (result) {
        this.traceStorage = result;
      }
    } catch (error) {
      console.error('Failed to load traces from storage:', error);
    }
  }

  /**
   * Save traces to storage
   */
  private async saveTraces(): Promise<void> {
    try {
      await this.storage.set(() => this.traceStorage);
    } catch (error) {
      console.error('Failed to save traces to storage:', error);
    }
  }

  /**
   * Clean up old traces based on retention settings
   */
  private async cleanupOldTraces(): Promise<void> {
    const now = Date.now();
    const retentionMs = this.settings.traceRetentionHours * 60 * 60 * 1000;
    
    // Only cleanup if it's been more than 1 hour since last cleanup
    if (now - this.traceStorage.lastCleanup < 60 * 60 * 1000) {
      return;
    }

    const cutoffTime = now - retentionMs;
    const originalCount = this.traceStorage.traces.length;
    
    this.traceStorage.traces = this.traceStorage.traces.filter(
      trace => trace.timestamp > cutoffTime
    );

    this.traceStorage.lastCleanup = now;

    if (this.traceStorage.traces.length !== originalCount) {
      await this.saveTraces();
      console.log(`Cleaned up ${originalCount - this.traceStorage.traces.length} old traces`);
    }
  }
}

/**
 * Singleton instance for network monitoring
 */
let networkMonitorInstance: NetworkMonitor | null = null;

/**
 * Get or create network monitor instance
 */
export const getNetworkMonitor = (settings: APMTracingSettings): NetworkMonitor => {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor(settings);
  } else {
    networkMonitorInstance.updateSettings(settings);
  }
  return networkMonitorInstance;
};

/**
 * Stop and cleanup network monitor
 */
export const stopNetworkMonitor = (): void => {
  if (networkMonitorInstance) {
    networkMonitorInstance.stopMonitoring();
    networkMonitorInstance = null;
  }
}; 