import { notify } from '@extend-chrome/notify';
import { SecureExtensionStorage } from './storage';
import { sendNotificationButtonClicked } from './messages';

/**
 * @typedef {Object} ExtensionNotificationOptions
 * @property {'basic' | 'image' | 'list' | 'progress'} [type]
 * @property {string} [iconUrl]
 * @property {string} title
 * @property {string} message
 * @property {number} [priority]
 * @property {boolean} [requireInteraction]
 * @property {boolean} [silent]
 * @property {Array<{title: string, iconUrl?: string}>} [buttons]
 * @property {string} [tag]
 * @property {Record<string, any>} [data]
 */

/**
 * @typedef {Object} NotificationData
 * @property {string} [eventId]
 * @property {string} [dashboardUrl]
 * @property {Record<string, any>} [data]
 */

/**
 * Shared notification service using @extend-chrome/notify
 */
export class NotificationService {
  static instance;
  
  constructor() {
    this.storage = SecureExtensionStorage.createPluginBucket('notifications');
    this.setupEventListeners();
  }

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create a notification with automatic data persistence
   */
  async create(options) {
    const notificationOptions = {
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
  async show(title, message, options = {}) {
    return this.create({
      title,
      message,
      ...options
    });
  }

  /**
   * Clear a specific notification
   */
  async clear(notificationId) {
    await notify.clear(notificationId);
    await this.removeNotificationData(notificationId);
  }

  /**
   * Clear all notifications
   */
  async clearAll() {
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
  async getAll() {
    return notify.getAll();
  }

  /**
   * Get notification data by ID
   */
  async getNotificationData(notificationId) {
    const allData = await this.storage.get();
    return allData?.[notificationId];
  }

  /**
   * Store notification data
   */
  async storeNotificationData(notificationId, data) {
    await this.storage.set((prev) => ({
      ...prev,
      [notificationId]: data
    }));
  }

  /**
   * Remove notification data
   */
  async removeNotificationData(notificationId) {
    await this.storage.set((prev) => {
      const updated = { ...prev };
      delete updated[notificationId];
      return updated;
    });
  }

  /**
   * Setup event listeners for notification interactions
   */
  setupEventListeners() {
    // Handle notification clicks
    notify.onClicked.addListener(async (notificationId) => {
      const data = await this.getNotificationData(notificationId);
      
      if (data?.dashboardUrl) {
        await chrome.tabs.create({ url: data.dashboardUrl });
      }
      
      // Clear notification and data
      await this.clear(notificationId);
    });

    // Handle notification button clicks
    notify.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      const data = await this.getNotificationData(notificationId);
      
      // Handle button actions based on stored data
      if (data?.data?.buttons?.[buttonIndex]) {
        const buttonAction = data.data.buttons[buttonIndex];
        
        if (buttonAction.url) {
          await chrome.tabs.create({ url: buttonAction.url });
        }
        
        if (buttonAction.action) {
          // Emit custom event for button action handling
          await sendNotificationButtonClicked({
            notificationId,
            buttonIndex,
            action: buttonAction.action,
            data: data.data
          });
        }
      }
      
      // Clear notification
      await this.clear(notificationId);
    });

    // Handle notification close
    notify.onClosed.addListener(async (notificationId) => {
      // Clean up stored data when notification is closed
      await this.removeNotificationData(notificationId);
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export convenience functions
export const createNotification = (options) => notificationService.create(options);
export const showNotification = (title, message, options) => 
  notificationService.show(title, message, options);
export const clearNotification = (notificationId) => notificationService.clear(notificationId);
export const clearAllNotifications = () => notificationService.clearAll();
export const getAllNotifications = () => notificationService.getAll();