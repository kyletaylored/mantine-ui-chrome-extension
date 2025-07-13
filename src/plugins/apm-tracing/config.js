// Default APM settings
export const DEFAULT_APM_SETTINGS = {
  enabled: false,
  autoTrace: false,
  traceEndpoints: [],
  excludePatterns: []
};

// Utility functions for APM tracing
export function generateTraceUrl(traceId, site = 'us1') {
  const domain = site === 'us1' ? 'app.datadoghq.com' : `app.datadoghq.${site}`;
  return `https://${domain}/apm/trace/${traceId}`;
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

export function getStatusColor(status) {
  if (status >= 200 && status < 300) return 'green';
  if (status >= 300 && status < 400) return 'blue';
  if (status >= 400 && status < 500) return 'orange';
  return 'red';
}

export function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}