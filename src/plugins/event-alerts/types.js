// Event Alerts types converted to JavaScript with JSDoc

/**
 * @typedef {Object} EventAlert
 * @property {string} id - Unique identifier for the alert
 * @property {string} title - Alert title
 * @property {string} message - Alert message
 * @property {string} type - Alert type (info, warning, error, success)
 * @property {number} timestamp - When the alert was created
 * @property {boolean} dismissed - Whether the alert has been dismissed
 * @property {string} [url] - Optional URL associated with the alert
 * @property {Object} [metadata] - Additional alert metadata
 */

/**
 * @typedef {Object} EventAlertSettings
 * @property {boolean} enabled - Whether event alerts are enabled
 * @property {string[]} monitoredEvents - Types of events to monitor
 * @property {boolean} showNotifications - Whether to show browser notifications
 * @property {number} maxAlerts - Maximum number of alerts to keep
 */

/**
 * @typedef {Object} NotificationManager
 * @property {Function} create - Create a new notification
 * @property {Function} dismiss - Dismiss a notification
 * @property {Function} getAll - Get all notifications
 * @property {Function} clear - Clear all notifications
 */

export {}; // Make this a module