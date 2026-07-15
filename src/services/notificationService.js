import { supabase } from '../lib/supabaseClient';

export const notificationService = {
  /**
   * Syncs notifications by checking member statuses and creating alerts.
   * Replaced RPC with JS logic for "Trial Ending Today", "Plan Expired", "Plan Expiring Soon".
   */
  async syncNotifications(gymId) {
    if (!gymId) return { error: 'No gym provided' };
    
    try {
      // 1. Fetch active, expiring, and trial members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, full_name, status, expiry_date, membership_plan')
        .eq('gym_id', gymId);
        
      if (membersError) throw membersError;

      // 2. Fetch recent notifications to avoid duplicates (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data: recentNotifs, error: notifsError } = await supabase
        .from('notifications')
        .select('type, related_member_id, created_at')
        .eq('gym_id', gymId)
        .in('type', ['trial_ending', 'trial_expired', 'membership_expired', 'membership_expiring'])
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (notifsError) throw notifsError;

      const newNotifications = [];

      // 3. Evaluate each member
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      members.forEach(m => {
        if (!m.expiry_date) return;
        
        const expiry = new Date(m.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        
        const hasExistingNotif = (type, sinceDate) => {
          const existsInDb = (recentNotifs || []).some(n => 
            n.related_member_id === m.id && 
            n.type === type && 
            new Date(n.created_at) >= sinceDate
          );
          if (existsInDb) return true;

          return newNotifications.some(n => 
            n.related_member_id === m.id && 
            n.type === type
          );
        };

        // --- Trial logic ---
        if (m.status === 'trial') {
          if (diffDays === 0) {
            if (!hasExistingNotif('trial_ending', expiry)) {
              newNotifications.push({
                gym_id: gymId,
                related_member_id: m.id,
                type: 'trial_ending',
                title: 'Trial Ending Today',
                message: `${m.full_name}'s trial ends today. Reach out to convert them!`,
                is_read: false
              });
            }
          } else if (diffDays < 0) {
            if (!hasExistingNotif('trial_expired', expiry)) {
              newNotifications.push({
                gym_id: gymId,
                related_member_id: m.id,
                type: 'trial_expired',
                title: 'Trial Expired',
                message: `${m.full_name}'s trial has expired.`,
                is_read: false
              });
            }
          }
        }
        
        // --- Active/Expired logic ---
        if (m.status === 'expired' || diffDays < 0) {
          if (m.status !== 'trial' && !hasExistingNotif('membership_expired', expiry)) {
            newNotifications.push({
              gym_id: gymId,
              related_member_id: m.id,
              type: 'membership_expired',
              title: 'Plan Expired',
              message: `${m.full_name}'s ${m.membership_plan || 'plan'} has expired.`,
              is_read: false
            });
          }
        } else if (m.status === 'expiring_soon' || (diffDays >= 0 && diffDays <= 3 && m.status !== 'trial')) {
          const expiringSince = new Date(expiry);
          expiringSince.setDate(expiringSince.getDate() - 3);
          
          if (!hasExistingNotif('membership_expiring', expiringSince)) {
            newNotifications.push({
              gym_id: gymId,
              related_member_id: m.id,
              type: 'membership_expiring',
              title: 'Plan Expiring Soon',
              message: `${m.full_name}'s ${m.membership_plan || 'plan'} expires in ${diffDays} days.`,
              is_read: false
            });
          }
        }
      });

      // 4. Insert new notifications
      if (newNotifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(newNotifications);
          
        if (insertError) throw insertError;

        // 5. Fetch gym owner's user_id to send FCM push notification
        try {
          const { data: gymData, error: gymErr } = await supabase
            .from('gyms')
            .select('owner_user_id')
            .eq('id', gymId)
            .maybeSingle();

          if (!gymErr && gymData?.owner_user_id) {
            const ownerUserId = gymData.owner_user_id;

            // Send one FCM push per new notification (batched to owner's device)
            for (const notif of newNotifications) {
              try {
                await supabase.functions.invoke('send-push-notification', {
                  body: {
                    userIds: [ownerUserId],
                    title: notif.title,
                    body: notif.message,
                    gymId: gymId,
                    type: notif.type,
                    relatedMemberId: notif.related_member_id,
                    data: {
                      route: '/notifications',
                      type: notif.type,
                      gymId: gymId,
                    },
                  },
                });
                console.log('[Notifications] FCM push sent for:', notif.type, notif.title);
              } catch (pushErr) {
                // Non-fatal: DB notification already inserted, push is best-effort
                console.warn('[Notifications] FCM push failed (non-fatal):', pushErr);
              }
            }
          } else {
            console.warn('[Notifications] Could not fetch owner_user_id for gym:', gymId, gymErr);
          }
        } catch (ownerFetchErr) {
          console.warn('[Notifications] Failed to fetch gym owner for push:', ownerFetchErr);
        }
      }

      return { success: true, count: newNotifications.length };
    } catch (error) {
      console.error('Error syncing notifications:', error);
      return { error };
    }
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
