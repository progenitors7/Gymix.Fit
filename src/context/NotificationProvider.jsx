import { useState, useEffect, useCallback } from 'react';
import { useGym } from '../hooks/useGym';
import { notificationService } from '../services/notificationService';
import { NotificationContext } from './NotificationContext';

export function NotificationProvider({ children }) {
  const { gym } = useGym();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!gym) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      // Notifications are now generated automatically by a Backend Cron Job (pg_cron).
      // We only need to fetch the existing notifications for this gym.
      
      // Then fetch
      const { data, error } = await notificationService.getNotifications(gym.id);
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error('[NotificationProvider] Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [gym]);

  useEffect(() => {
    if (gym?.id) {
      fetchNotifications();
    }
  }, [gym?.id, fetchNotifications]);

  const markAsRead = async (id) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!gym) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    
    await notificationService.markAllAsRead(gym.id);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      refresh: fetchNotifications,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
