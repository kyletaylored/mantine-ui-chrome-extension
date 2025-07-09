import { 
  ProcessedEvent, 
  EventAlertsSettings
} from './types';
import { 
  createChromeNotificationConfig,
  createInPageNotificationConfig,
  parseTargetDomains,
  shouldShowInPageNotification
} from './config';
import { notificationService } from '@/shared/notifications';

export class NotificationManager {
  /**
   * Show Chrome notification
   */
  public static async showChromeNotification(
    event: ProcessedEvent, 
    settings: EventAlertsSettings
  ): Promise<void> {
    const config = createChromeNotificationConfig(event, settings);
    
    await notificationService.create({
      type: 'basic',
      iconUrl: config.iconUrl,
      title: config.title,
      message: config.message,
      priority: config.priority,
      requireInteraction: config.requireInteraction,
      silent: config.silent,
      buttons: config.actions?.map(action => ({ title: action.title })),
      tag: config.tag,
      data: {
        eventId: event.id,
        dashboardUrl: event.dashboardUrl,
        buttons: config.actions
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
    const data = await notificationService.getNotificationData(notificationId);

    if (data?.dashboardUrl) {
      await chrome.tabs.create({ url: data.dashboardUrl });
    }

    // Clear notification
    await notificationService.clear(notificationId);
  }

  /**
   * Clear all notifications
   */
  public static async clearAllNotifications(): Promise<void> {
    await notificationService.clearAll();
  }
} 