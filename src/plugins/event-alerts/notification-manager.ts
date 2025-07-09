import { 
  ProcessedEvent, 
  EventAlertsSettings,
  NotificationConfig,
  InPageNotificationConfig
} from './types';
import { 
  createChromeNotificationConfig,
  createInPageNotificationConfig,
  parseTargetDomains,
  shouldShowInPageNotification
} from './config';

export class NotificationManager {
  /**
   * Show Chrome notification
   */
  public static async showChromeNotification(
    event: ProcessedEvent, 
    settings: EventAlertsSettings
  ): Promise<void> {
    const config = createChromeNotificationConfig(event, settings);
    
    const notificationOptions: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: config.iconUrl || chrome.runtime.getURL('icons/icon48.png'),
      title: config.title,
      message: config.message,
      priority: config.priority,
      requireInteraction: config.requireInteraction || false,
      silent: config.silent || false,
      buttons: config.actions?.map(action => ({ title: action.title }))
    };

    const notificationId = await chrome.notifications.create(
      config.tag || `event-${event.id}`,
      notificationOptions
    );

    // Store event reference for notification clicks
    await chrome.storage.local.set({
      [`notification-${notificationId}`]: {
        eventId: event.id,
        dashboardUrl: event.dashboardUrl
      }
    });
  }

  /**
   * Show in-page notification
   */
  public static async showInPageNotification(
    event: ProcessedEvent,
    settings: EventAlertsSettings
  ): Promise<void> {
    const targetDomains = parseTargetDomains(settings.targetDomains);
    
    // Get all tabs and filter by target domains
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    for (const tab of tabs) {
      if (tab.url && shouldShowInPageNotification(tab.url, targetDomains)) {
        const config = createInPageNotificationConfig(event, settings);
        
        try {
          await chrome.tabs.sendMessage(tab.id!, {
            type: 'SHOW_IN_PAGE_NOTIFICATION',
            payload: config
          });
        } catch (error) {
          console.error('Failed to send in-page notification:', error);
        }
      }
    }
  }

  /**
   * Handle notification click
   */
  public static async handleNotificationClick(notificationId: string): Promise<void> {
    const key = `notification-${notificationId}`;
    const result = await chrome.storage.local.get(key);
    const notificationData = result[key];

    if (notificationData?.dashboardUrl) {
      await chrome.tabs.create({ url: notificationData.dashboardUrl });
    }

    // Clear the notification data
    await chrome.storage.local.remove(key);
    await chrome.notifications.clear(notificationId);
  }

  /**
   * Clear all notifications
   */
  public static async clearAllNotifications(): Promise<void> {
    const notifications = await chrome.notifications.getAll();
    
    for (const notificationId of Object.keys(notifications)) {
      await chrome.notifications.clear(notificationId);
      await chrome.storage.local.remove(`notification-${notificationId}`);
    }
  }
} 