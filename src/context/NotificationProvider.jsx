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
      // BUG #13 FIX: syncNotifications is a heavy pipeline (fetches all members,
      // checks 90 days of notifications, calls FCM Edge Functions). Throttle it to
      // once per 30 minutes per gym to prevent hammering the DB on every page load.
      const syncKey = `notifications_sync_ts_${gym.id}`;
      const lastSync = localStorage.getItem(syncKey);
      const THROTTLE_MS = 30 * 60 * 1000; // 30 minutes
      const shouldSync = !lastSync || (Date.now() - Number(lastSync)) > THROTTLE_MS;

      if (shouldSync) {
        await notificationService.syncNotifications(gym.id);
        localStorage.setItem(syncKey, String(Date.now()));
      }
      
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
