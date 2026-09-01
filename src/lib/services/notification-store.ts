import { NotificationItem } from '@/types';

export const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n-1', user_id: 'u-staff-1', title: 'Leave Approved', message: 'Your leave request was approved.', type: 'leave', read: false, created_at: '2026-08-16T10:00:00Z' },
  { id: 'n-2', user_id: 'u-staff-1', title: 'Upcoming Holiday', message: 'Upcoming holiday: Dashain (Phulpati) is approaching.', type: 'info', read: true, created_at: '2026-08-10T09:00:00Z' },
  { id: 'n-3', user_id: 'u-staff-2', title: 'Leave Pending', message: 'Your leave request is pending review.', type: 'leave', read: false, created_at: '2026-08-17T08:30:00Z' },
  { id: 'n-4', user_id: 'u-staff-2', title: 'Tardiness Warning', message: 'You have been late 3 times this month.', type: 'warning', read: false, created_at: '2026-08-15T10:00:00Z' },
  { id: 'n-5', user_id: 'u-manager-1', title: 'Pending Leaves', message: '2 pending leave requests from your team.', type: 'leave', read: false, created_at: '2026-08-17T09:15:00Z' },
  { id: 'n-6', user_id: 'u-manager-1', title: 'Report Ready', message: 'Team attendance report ready for this week.', type: 'info', read: true, created_at: '2026-08-14T17:00:00Z' },
  { id: 'n-7', user_id: 'u-admin-1', title: 'New Employee', message: 'New employee added to the system.', type: 'system', read: false, created_at: '2026-08-16T11:20:00Z' },
  { id: 'n-8', user_id: 'u-admin-1', title: 'Monthly Summary', message: 'Monthly attendance summary for July is available.', type: 'info', read: true, created_at: '2026-08-01T08:00:00Z' },
];

const STORAGE_KEY_NOTIFICATIONS = 'mero_notifications_v1';

export class NotificationService {
  private static isBrowser = typeof window !== 'undefined';

  private static getAllNotifications(): NotificationItem[] {
    if (!this.isBrowser) return DEFAULT_NOTIFICATIONS;
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  }

  public static getNotifications(userId: string): NotificationItem[] {
    const notifications = this.getAllNotifications();
    return notifications
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public static getUnreadCount(userId: string): number {
    const notifications = this.getNotifications(userId);
    return notifications.filter(n => !n.read).length;
  }

  public static createNotification(notification: Omit<NotificationItem, 'id' | 'read' | 'created_at'>): NotificationItem {
    const notifications = this.getAllNotifications();
    const newNotification: NotificationItem = {
      ...notification,
      id: `n-gen-${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };

    const updatedNotifications = [...notifications, newNotification];

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updatedNotifications));
    }

    return newNotification;
  }

  public static markAsRead(notificationId: string): void {
    const notifications = this.getAllNotifications();
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updatedNotifications));
    }
  }

  public static markAllAsRead(userId: string): void {
    const notifications = this.getAllNotifications();
    const updatedNotifications = notifications.map(n => 
      n.user_id === userId ? { ...n, read: true } : n
    );

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updatedNotifications));
    }
  }

  public static deleteNotification(notificationId: string): void {
    const notifications = this.getAllNotifications();
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updatedNotifications));
    }
  }
}
