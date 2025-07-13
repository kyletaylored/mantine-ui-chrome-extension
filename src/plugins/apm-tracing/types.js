// APM Tracing types converted to JavaScript with JSDoc

/**
 * @typedef {Object} TraceData
 * @property {string} id - Unique identifier for the trace
 * @property {string} traceId - Datadog trace ID
 * @property {string} spanId - Datadog span ID
 * @property {string} url - Request URL
 * @property {string} method - HTTP method
 * @property {number} status - HTTP status code
 * @property {number} timestamp - Timestamp when trace was captured
 * @property {string} domain - Domain of the request
 * @property {Object} [headers] - Request headers
 * @property {number} [duration] - Request duration in milliseconds
 */

/**
 * @typedef {Object} NetworkMonitor
 * @property {Function} start - Start monitoring network requests
 * @property {Function} stop - Stop monitoring network requests
 * @property {Function} getTraces - Get collected traces
 * @property {Function} clearTraces - Clear stored traces
 */

/**
 * @typedef {Object} APMSettings
 * @property {boolean} enabled - Whether APM tracing is enabled
 * @property {boolean} autoTrace - Whether to automatically trace requests
 * @property {string[]} traceEndpoints - Endpoints to trace
 * @property {string[]} excludePatterns - Patterns to exclude from tracing
 */

export {}; // Make this a module