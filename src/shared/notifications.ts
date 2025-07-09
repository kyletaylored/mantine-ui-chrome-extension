import { notify } from '@extend-chrome/notify';
import { SecureExtensionStorage } from './storage';

export interface ExtensionNotificationOptions {
  type?: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title: string;
  message: string;
  priority?: number;
  requireInteraction?: boolean;
  silent?: boolean;
  buttons?: Array<{ title: string; iconUrl?: string }>;
  tag?: string;
  data?: Record<string, any>;
}

interface NotificationData {
  eventId?: string;
  dashboardUrl?: string;
  data?: Record<string, any>;
}

/**
 * Shared notification service using @extend-chrome/notify
 */
export class NotificationService {
  private static instance: NotificationService;
  private storage = SecureExtensionStorage.createPluginBucket<Record<string, NotificationData>>('notifications');

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create a notification with automatic data persistence
   */
  async create(options: ExtensionNotificationOptions): Promise<string> {
    const notificationOptions: chrome.notifications.NotificationOptions = {
      type: options.type || 'basic',
      iconUrl: options.iconUrl || chrome.runtime.getURL('icons/icon48.png'),
      title: options.title,
      message: options.message,
      priority: options.priority,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      buttons: options.buttons
    };

    const notificationId = await notify.create(notificationOptions);

    // Store notification data if provided
    if (options.data) {
      await this.storeNotificationData(notificationId, options.data);
    }

    return notificationId;
  }

  /**
   * Simple notification with just title and message
   */
  async show(title: string, message: string, options?: Partial<ExtensionNotificationOptions>): Promise<string> {
    return this.create({
      title,
      message,
      ...options
    });
  }

  /**
   * Clear a specific notification
   */
  async clear(notificationId: string): Promise<void> {
    await notify.clear(notificationId);
    await this.removeNotificationData(notificationId);
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    const notifications = await notify.getAll();
    const notificationIds = Object.keys(notifications);
    
    for (const notificationId of notificationIds) {
      await notify.clear(notificationId);
    }
    
    // Clear all stored notification data
    await this.storage.clear();
  }

  /**
   * Get all active notifications
   */
  async getAll(): Promise<any> {
    return notify.getAll();
  }

  /**
   * Get notification data by ID
   */
  async getNotificationData(notificationId: string): Promise<NotificationData | undefined> {
    const allData = await this.storage.get();
    return allData?.[notificationId];
  }

  /**
   * Store notification data
   */
  private async storeNotificationData(notificationId: string, data: Record<string, any>): Promise<void> {
    await this.storage.set((prev) => ({
      ...prev,
      [notificationId]: data
    }));
  }

  /**
   * Remove notification data
   */
  private async removeNotificationData(notificationId: string): Promise<void> {
    await this.storage.set((prev) => {
      const updated = { ...prev };
      delete updated[notificationId];
      return updated;
    });
  }

  /**
   * Setup event listeners for notification interactions
   */
  private setupEventListeners(): void {
    // Handle notification clicks
    notify.onClicked.addListener(async (notificationId: string) => {
      const data = await this.getNotificationData(notificationId);
      
      if (data?.dashboardUrl) {
        await chrome.tabs.create({ url: data.dashboardUrl });
      }
      
      // Clear notification and data
      await this.clear(notificationId);
    });

    // Handle notification button clicks
    notify.onButtonClicked.addListener(async (notificationId: string, buttonIndex: number) => {
      const data = await this.getNotificationData(notificationId);
      
      // Handle button actions based on stored data
      if (data?.data?.buttons?.[buttonIndex]) {
        const buttonAction = data.data.buttons[buttonIndex];
        
        if (buttonAction.url) {
          await chrome.tabs.create({ url: buttonAction.url });
        }
        
        if (buttonAction.action) {
          // Emit custom event for button action handling
          chrome.runtime.sendMessage({
            type: 'NOTIFICATION_BUTTON_CLICKED',
            payload: {
              notificationId,
              buttonIndex,
              action: buttonAction.action,
              data: data.data
            }
          });
        }
      }
      
      // Clear notification
      await this.clear(notificationId);
    });

    // Handle notification close
    notify.onClosed.addListener(async (notificationId: string) => {
      // Clean up stored data when notification is closed
      await this.removeNotificationData(notificationId);
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export convenience functions
export const createNotification = (options: ExtensionNotificationOptions) => notificationService.create(options);
export const showNotification = (title: string, message: string, options?: Partial<ExtensionNotificationOptions>) => 
  notificationService.show(title, message, options);
export const clearNotification = (notificationId: string) => notificationService.clear(notificationId);
export const clearAllNotifications = () => notificationService.clearAll();
export const getAllNotifications = () => notificationService.getAll(); 