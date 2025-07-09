# Event Alerts Plugin

## Overview

The Event Alerts plugin enables real-time monitoring of Datadog events and provides customizable notifications for specified monitors. This powerful tool helps sales engineers stay informed about critical system events during demonstrations and client interactions.

## Features

### Core Functionality
- **Real-time Event Monitoring**: Continuously polls Datadog Events API for new monitor alerts
- **Multiple Notification Types**: Support for Chrome notifications, in-page notifications, or both
- **Configurable Monitor Filtering**: Watch specific monitors by ID
- **Priority-based Alerting**: Filter events by priority level (low, normal, high)
- **Historical Event Storage**: Maintains event history with configurable retention

### Notification Options
- **Chrome Notifications**: Native browser notifications with action buttons
- **In-page Notifications**: Animated notifications displayed directly on target websites
- **Domain-specific Targeting**: Configure which domains receive in-page notifications
- **Sound Alerts**: Optional audio notifications for urgent events
- **Quiet Hours**: Disable notifications during specified time periods

### Advanced Features
- **Event Deduplication**: Prevents duplicate notifications for the same event
- **Auto-dismiss Timers**: Automatically hide non-critical notifications
- **Dashboard Integration**: Direct links to Datadog dashboards and monitors
- **Event Statistics**: Track alert patterns and response times
- **Bulk Operations**: Clear all events or dismiss multiple alerts

## Configuration

### Required Settings

#### Monitor IDs
- **Description**: Comma-separated list of Datadog monitor IDs to watch
- **Format**: `123456,789012,345678`
- **Required**: Yes
- **Example**: `1234567,2345678,3456789`

#### Polling Interval
- **Description**: How often to check for new events (in seconds)
- **Range**: 10-300 seconds
- **Default**: 30 seconds
- **Recommendation**: 30-60 seconds for demo environments

#### Notification Type
- **Options**:
  - `chrome`: Chrome browser notifications only
  - `in-page`: Website overlay notifications only  
  - `both`: Both Chrome and in-page notifications
- **Default**: `chrome`

### Optional Settings

#### Target Domains
- **Description**: Domains where in-page notifications will be shown
- **Format**: Comma-separated domain list
- **Default**: `shopist.io,demo.datadoghq.com`
- **Example**: `mystore.com,staging.example.com`

#### Alert Priority Filter
- **Options**:
  - `low`: Show low, normal, and high priority events
  - `normal`: Show normal and high priority events only
  - `high`: Show high priority events only
- **Default**: `normal`

#### Advanced Options
- **Enable Sound**: Play audio alerts (default: true)
- **Show Event Details**: Include timestamp and detailed info (default: true)
- **Auto-open Dashboard**: Automatically open Datadog when clicking notifications (default: false)
- **Max Events History**: Maximum number of events to store (10-500, default: 100)

#### Quiet Hours
- **Enable Quiet Hours**: Disable notifications during specified times
- **Start Time**: Beginning of quiet period (24h format, default: 22:00)
- **End Time**: End of quiet period (24h format, default: 08:00)

## Usage Guide

### Initial Setup

1. **Configure Datadog Credentials**
   - Navigate to Extension Options → Credentials
   - Enter valid API Key and App Key
   - Verify credentials are validated for your Datadog site

2. **Enable Event Alerts Plugin**
   - Go to Extension Options → Plugins
   - Enable the Event Alerts plugin
   - Configure plugin settings

3. **Configure Monitor IDs**
   - Identify the Datadog monitor IDs you want to watch
   - Enter them in the "Monitor IDs" field (comma-separated)
   - Test the connection to verify API access

### Starting Monitoring

1. **Click "Start Monitoring"** in the plugin configuration
2. **Verify Active Status** - The interface will show "Monitoring Active"
3. **Check Polling Information** - View last poll time and error count

### Managing Events

#### Viewing Events
- Access the "Events" tab to see recent alerts
- Events are sorted by timestamp (newest first)
- Each event shows severity, monitor name, and timestamp

#### Event Actions
- **View in Datadog**: Click the external link icon to open the event in Datadog
- **Dismiss Event**: Remove the event from your active list
- **Clear All**: Remove all stored events

#### Event Statistics
- View the "Statistics" tab for event analytics
- Track total events, daily counts, and severity distribution
- Monitor polling status and error rates

## Integration Examples

### Demo Environment Setup

```javascript
// Example monitor IDs for a demo environment
const demoMonitors = [
  1234567, // High CPU Usage Alert
  2345678, // Memory Usage Warning  
  3456789, // Application Error Rate
  4567890, // Response Time Threshold
];

// Configure for demo website
targetDomains: "shopist.io,demo.datadoghq.com"
notificationType: "both"
alertPriority: "normal"
pollingInterval: 30
```

### Client Presentation Setup

```javascript
// Focus on critical alerts only
alertPriority: "high"
notificationType: "chrome"
enableSound: true
autoOpenDashboard: true

// Quiet hours during off-hours
enableQuietHours: true
quietHoursStart: "18:00"
quietHoursEnd: "09:00"
```

## API Reference

### Message Types

The plugin communicates with the background script using these message types:

#### `START_MONITORING`
Start event polling with current settings.

#### `STOP_MONITORING`  
Stop event polling and cleanup resources.

#### `GET_EVENTS`
Retrieve stored events list.

#### `CLEAR_EVENTS`
Remove all stored events.

#### `DISMISS_EVENT`
Mark a specific event as dismissed.
- **Payload**: `{ eventId: string }`

#### `GET_POLLING_STATUS`
Get current monitoring status and statistics.

#### `TEST_CONNECTION`
Test API connectivity and monitor access.

### Event Data Structure

```typescript
interface ProcessedEvent {
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
```

## Troubleshooting

### Common Issues

#### No Events Appearing
1. **Verify Monitor IDs**: Ensure monitor IDs are correct and exist
2. **Check API Permissions**: Confirm API key has read access to monitors and events
3. **Review Time Range**: Events API only returns recent events
4. **Test Connection**: Use the "Test Connection" button to verify API access

#### Notifications Not Showing
1. **Browser Permissions**: Ensure Chrome notifications are enabled
2. **Domain Matching**: For in-page notifications, verify current domain matches target domains
3. **Quiet Hours**: Check if quiet hours are enabled and active
4. **Priority Filter**: Verify alert priority filter isn't too restrictive

#### High API Usage
1. **Increase Polling Interval**: Use 60+ seconds for production environments
2. **Limit Monitor Count**: Monitor only essential alerts
3. **Enable Quiet Hours**: Reduce unnecessary polling during off-hours

### Error Messages

#### "No valid monitor IDs configured"
- **Cause**: Monitor IDs field is empty or contains invalid IDs
- **Solution**: Enter comma-separated numeric monitor IDs

#### "Datadog API key not configured" 
- **Cause**: Missing or invalid API credentials
- **Solution**: Configure valid API key in Options → Credentials

#### "Failed to fetch events: 403 Forbidden"
- **Cause**: API key lacks required permissions
- **Solution**: Verify API key has monitors and events read permissions

## Performance Considerations

### Polling Frequency
- **Demo Environment**: 30-60 seconds
- **Production Monitoring**: 60-300 seconds  
- **Client Presentations**: 30 seconds for responsiveness

### Storage Management
- Events are automatically pruned based on max history setting
- Clear events periodically to free storage space
- Consider lower retention for high-volume environments

### Network Usage
- Each poll makes 1 API request per configured monitor
- Monitor network usage in environments with many monitors
- Use priority filtering to reduce noise

## Security Notes

- API keys are stored encrypted in Chrome storage
- All communications use HTTPS
- No sensitive data is transmitted to third parties
- Events are stored locally in the browser only

## Version History

### v1.0.0 (Current)
- Initial release with core event monitoring
- Chrome and in-page notification support  
- Configurable polling and filtering
- Event history and statistics
- Quiet hours functionality
- Dashboard integration

## Support

For technical support or feature requests:

1. Check the troubleshooting section above
2. Review the extension console logs for errors
3. Verify Datadog API connectivity and permissions
4. Contact the Sales Engineering team for assistance

## Contributing

This plugin follows the established development guidelines:

1. **Plugin Structure**: Follow the standard plugin directory layout
2. **TypeScript**: All code must be properly typed
3. **Error Handling**: Implement comprehensive error handling
4. **Documentation**: Update this README for any new features
5. **Testing**: Test thoroughly with various configurations

See the main project README for detailed contribution guidelines. 