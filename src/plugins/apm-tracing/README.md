# APM Tracing Plugin

A comprehensive plugin for monitoring and tracking Datadog APM traces from network requests during sales demonstrations.

## Overview

The APM Tracing Plugin automatically monitors network requests in the background and captures those containing Datadog trace headers. This enables sales engineers to:

- **Track APM traces** from network requests with Datadog headers
- **View trace details** including timing, status codes, and metadata
- **Link directly to traces** in Datadog APM for detailed analysis
- **Configure monitoring settings** for different demonstration scenarios

## Features

### Core Functionality

- **Automatic Trace Detection**: Monitors all network requests for Datadog trace headers (`x-datadog-trace-id`, `x-datadog-parent-id`, etc.)
- **Real-time Collection**: Captures traces as they occur during demonstrations
- **Trace Linking**: Direct links to view traces in Datadog APM
- **Status Filtering**: Filter traces by HTTP status codes (2xx, 4xx, 5xx)
- **Domain Filtering**: Configure which domains to monitor
- **Retention Management**: Automatic cleanup of old traces

### Configuration Options

- **Maximum Traces**: Set limit for stored traces (10-500)
- **Retention Period**: Configure how long to keep traces (1-168 hours)
- **Domain Filtering**: Specify which domains to monitor
- **Auto-open Traces**: Automatically open traces in new tabs
- **Request Details**: Show/hide detailed request information

### Network Monitoring

The plugin uses Chrome's webRequest API to monitor:
- **Request Headers**: Captures outgoing request headers
- **Response Headers**: Captures incoming response headers
- **Request/Response Timing**: Measures duration and timing
- **Status Codes**: Records HTTP status codes
- **Error Handling**: Captures network errors and failures

## Installation

The APM Tracing Plugin is included as part of the Datadog Sales Engineering Toolkit and requires no additional installation.

### Required Permissions

- `webRequest`: Monitor network requests
- `storage`: Store trace data
- `activeTab`: Access current tab information

## Usage

### Enabling the Plugin

1. Open the extension options page
2. Navigate to the "Plugins" section
3. Enable the "APM Tracing" plugin
4. Configure settings as needed

### Viewing Traces

**In Options Page:**
1. Click on "APM Tracing" in the plugins list
2. View traces in the "Traces" tab
3. Click on any trace to open it in Datadog APM

**In Popup:**
1. Click the extension icon
2. Switch to the "APM Traces" tab
3. View recent traces and click to open in Datadog

### Configuration

**Storage Settings:**
- Set maximum number of traces to store
- Configure retention period for traces

**Monitoring Settings:**
- Specify domains to monitor (leave empty for all)
- Set default status filter

**Display Settings:**
- Toggle auto-opening of traces
- Show/hide request details

## Technical Implementation

### Network Request Monitoring

The plugin implements a sophisticated network monitoring system:

```typescript
// Monitor outgoing requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  this.handleBeforeSendHeaders.bind(this),
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// Monitor incoming responses
chrome.webRequest.onHeadersReceived.addListener(
  this.handleHeadersReceived.bind(this),
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);
```

### Trace Header Detection

The plugin automatically detects Datadog trace headers:

```typescript
const DATADOG_TRACE_HEADERS = [
  'x-datadog-trace-id',
  'x-datadog-parent-id',
  'x-datadog-sampling-priority',
  'x-datadog-origin',
  'x-datadog-tags'
];
```

### Data Storage

Traces are stored locally using Chrome's storage API:

```typescript
interface TraceData {
  id: string;
  traceId: string;
  spanId?: string;
  parentId?: string;
  domain: string;
  url: string;
  method: string;
  status: number;
  timestamp: number;
  duration?: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  // ... additional fields
}
```

### Background Service Integration

The plugin integrates with the extension's background service:

```typescript
// Message handlers
'GET_APM_TRACES': Get stored traces
'CLEAR_APM_TRACES': Clear all traces
'UPDATE_APM_SETTINGS': Update plugin settings
'START_APM_MONITORING': Start monitoring
'STOP_APM_MONITORING': Stop monitoring
```

## API Reference

### Network Monitor Class

```typescript
class NetworkMonitor {
  startMonitoring(): Promise<void>
  stopMonitoring(): void
  getTraces(): Promise<TraceData[]>
  clearTraces(): Promise<void>
  updateSettings(settings: APMTracingSettings): void
}
```

### Configuration Interface

```typescript
interface APMTracingSettings {
  maxTraces: number;
  traceRetentionHours: number;
  monitorDomains: string;
  autoOpenTraces: boolean;
  showRequestDetails: boolean;
  filterByStatus: 'all' | '2xx' | '4xx' | '5xx';
}
```

### Utility Functions

```typescript
generateTraceUrl(traceId: string, site: string): string
extractTraceHeaders(headers: Record<string, string>): TraceHeaders
shouldMonitorDomain(url: string, domains: string): boolean
filterTracesByStatus(traces: TraceData[], filter: string): TraceData[]
```

## Troubleshooting

### Common Issues

**No traces appearing:**
- Ensure the plugin is enabled
- Check that websites are making requests with Datadog headers
- Verify domain filtering settings

**Traces not linking to Datadog:**
- Confirm valid Datadog credentials are configured
- Check that the correct Datadog site is selected
- Verify trace IDs are valid

**Performance issues:**
- Reduce maximum traces limit
- Decrease retention period
- Use domain filtering to limit monitoring scope

### Debug Information

The plugin logs debug information to the browser console:

```javascript
// Enable debug logging
localStorage.setItem('DD_TOOLKIT_DEBUG', 'true');

// View network monitor logs
console.log('APM Network Monitor started');
console.log('Traces stored:', traces.length);
```

## Development

### Adding New Features

1. **Extend TraceData interface** for new fields
2. **Update network monitor** to capture additional data
3. **Modify UI components** to display new information
4. **Add configuration options** in settings

### Testing

```bash
# Build development version
npm run build:dev

# Load extension in Chrome
# Navigate to chrome://extensions/
# Enable Developer mode
# Load unpacked extension from dist/ folder

# Test network monitoring
# Open websites with Datadog APM enabled
# Verify traces appear in plugin UI
```

### Performance Considerations

- **Memory usage**: Traces are stored in memory and local storage
- **Network overhead**: Monitoring adds minimal overhead to requests
- **Storage cleanup**: Automatic cleanup prevents storage bloat
- **UI responsiveness**: Traces are loaded asynchronously

## Future Enhancements

- **Trace visualization**: Add in-extension trace timeline
- **Export functionality**: Export traces to CSV/JSON
- **Filter improvements**: Advanced filtering by headers, timing
- **Batch operations**: Select and manage multiple traces
- **Integration with other tools**: Connect with external APM tools

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify extension permissions
4. Contact the development team

---

*This plugin is part of the Datadog Sales Engineering Toolkit and is designed specifically for demonstration and educational purposes.* 