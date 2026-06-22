import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { SocketEvents } from '@/types';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

export function useNotifications(enabled: boolean) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refetch = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        apiClient.getNotifications(),
        apiClient.getUnreadNotificationCount(),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.unread_count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  // Initial load + fallback source of truth (REST)
  useEffect(() => {
    if (!enabled) return;
    refetch();
  }, [enabled, refetch]);

  // Live updates over the socket. If the socket drops, REST above still
  // populates history on (re)mount, so nothing is lost — just not instant.
  useEffect(() => {
    if (!enabled) return;

    const handleNewNotification = (data: SocketEvents['notification:new']) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === data.id)) return prev;
        return [data as Notification, ...prev];
      });
      if (!data.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    socketService.on('notification:new', handleNewNotification);
    return () => socketService.off('notification:new', handleNewNotification);
  }, [enabled]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiClient.markNotificationAsRead(notificationId);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await apiClient.markAllNotificationsAsRead();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    try {
      await apiClient.deleteNotification(notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification };
}
