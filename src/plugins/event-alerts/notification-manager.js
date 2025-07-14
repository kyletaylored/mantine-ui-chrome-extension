// Event Alerts Notification Manager - JavaScript version

export class EventAlertsNotificationManager {
  constructor() {
    this.notifications = [];
  }

  async create(notification) {
    console.log('Creating event alert notification:', notification);
    return 'notification-id';
  }

  async dismiss(notificationId) {
    console.log('Dismissing notification:', notificationId);
  }

  async getAll() {
    return this.notifications;
  }

  async clear() {
    this.notifications = [];
  }
}

export const notificationManager = new EventAlertsNotificationManager();