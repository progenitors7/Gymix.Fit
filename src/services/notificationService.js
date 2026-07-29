import { supabase } from '../lib/supabaseClient';

export const notificationService = {
  /**
   * Syncs notifications by checking member statuses and creating alerts.
   * Replaced RPC with JS logic for "Trial Ending Today", "Plan Expired", "Plan Expiring Soon".
   */
  async syncNotifications(gymId) {
    console.warn('[notificationService] syncNotifications is deprecated. Notifications are now synced via backend pg_cron.');
    return { success: true };
  },

  /**
   * Fetches all notifications for the current gym, merged with global platform broadcasts.
   */
  async getNotifications(gymId) {
    if (!gymId) return { data: [] };
    try {
      // 1. Fetch gym-specific notifications from DB
      const { data: dbNotifs, error } = await supabase
        .from('notifications')
        .select(`
          id, type, title, message, related_member_id, is_read, created_at,
          members ( full_name )
        `)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // 2. Fetch recent broadcasts from DB
      let broadcastNotifs = [];
      try {
        const { data: broadcasts, error: bcError } = await supabase
          .from('broadcasts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (bcError) throw bcError;

        // Read dismissed broadcasts from localStorage
        let dismissedIds = [];
        try {
          const saved = localStorage.getItem('dismissed_broadcasts');
          dismissedIds = saved ? JSON.parse(saved) : [];
        } catch (e) {
          console.error('LocalStorage error:', e);
        }

        // BUG #21 FIX: Prune stale dismissed IDs whose broadcasts no longer exist in DB.
        // Without this, the array grew indefinitely causing localStorage bloat.
        const validBroadcastIds = new Set((broadcasts || []).map(b => b.id));
        const cleanedDismissed = dismissedIds.filter(id => validBroadcastIds.has(id));
        if (cleanedDismissed.length !== dismissedIds.length) {
          localStorage.setItem('dismissed_broadcasts', JSON.stringify(cleanedDismissed));
          dismissedIds = cleanedDismissed;
        }

        broadcastNotifs = (broadcasts || []).map(b => ({
          id: b.id,
          type: 'system_broadcast',
          title: b.title,
          message: b.message,
          related_member_id: null,
          is_read: dismissedIds.includes(b.id),
          created_at: b.created_at,
          members: null
        }));
      } catch (bcErr) {
        console.error('Error fetching/mapping broadcasts:', bcErr);
      }

      // 3. Merge and sort by created_at descending
      const merged = [...(dbNotifs || []), ...broadcastNotifs].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      return { data: merged };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { error };
    }
  },

  /**
   * Marks a single notification as read (supports both normal notifications and global broadcasts).
   */
  async markAsRead(id) {
    try {
      // 1. If it's a broadcast ID, add to localStorage dismissed list
      try {
        const saved = localStorage.getItem('dismissed_broadcasts');
        let dismissed = saved ? JSON.parse(saved) : [];
        if (!dismissed.includes(id)) {
          dismissed.push(id);
          localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed));
        }
      } catch (e) {
        console.error('Failed to update dismissed broadcasts:', e);
      }

      // 2. Always attempt to update database notification in case it's a normal notification
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { error };
    }
  },

  /**
   * Marks all notifications as read for the current gym, including global broadcasts.
   */
  async markAllAsRead(gymId) {
    if (!gymId) return { error: 'No gym provided' };
    
    try {
      // 1. Dismiss all active broadcasts in localStorage
      try {
        const { data: broadcasts } = await supabase
          .from('broadcasts')
          .select('id');
        
        if (broadcasts) {
          const saved = localStorage.getItem('dismissed_broadcasts');
          let dismissed = saved ? JSON.parse(saved) : [];
          broadcasts.forEach(b => {
            if (!dismissed.includes(b.id)) {
              dismissed.push(b.id);
            }
          });
          localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed));
        }
      } catch (e) {
        console.error('Failed to dismiss broadcasts:', e);
      }

      // 2. Update all database notifications for this gym
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('gym_id', gymId)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { error };
    }
  }
};
