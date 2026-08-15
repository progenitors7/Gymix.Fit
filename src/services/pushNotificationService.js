/**
 * pushNotificationService.js
 * 
 * Handles native push notifications for the Capacitor Android app using FCM.
 * Works via @capacitor/push-notifications which wraps Firebase Cloud Messaging.
 * 
 * Flow:
 * 1. App starts → initialize() called
 * 2. If permission granted → FCM token registered → saved to Supabase (push_tokens table)
 * 3. When a notification is sent (from Supabase Edge Function):
 *    - If app is open → onNotificationReceived fires → shows in-app toast/badge
 *    - If app is closed/background → FCM delivers it as a system notification
 */

import { supabase } from '../lib/supabaseClient';

// Lazily import PushNotifications only when running in a native Capacitor context.
// A top-level static import could crash the module on web/PWA where the plugin
// is shimmed but may not be fully functional.
const getPushPlugin = async () => {
  if (
    typeof window !== 'undefined' &&
    window.Capacitor &&
    typeof window.Capacitor.isPluginAvailable === 'function' &&
    window.Capacitor.isPluginAvailable('PushNotifications')
  ) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  }
  return null;
};

export const pushNotificationService = {
  /**
   * Initializes push notifications. Call this once on app startup (in App.jsx).
   * @param {function} onNotificationReceived - Callback when notification arrives while app is open
   */
  async initialize(userId, onNotificationReceived) {
    const Push = await getPushPlugin();
    if (!Push) {
      // Not in Capacitor — use Web Notifications API fallback for PWA/browser
      this._initWebNotifications();
      return;
    }

    try {
      // 1. Check and request permission (non-blocking)
      try {
        const permResult = await Push.requestPermissions();
        console.log('[Push] Permission request result:', permResult);
      } catch (permErr) {
        console.warn('[Push] Failed to request permissions:', permErr);
      }

      // 2. Save FCM token when received (Must add listeners BEFORE register)
      Push.addListener('registration', async (token) => {
        console.log('[Push] FCM Token received:', token.value);
        localStorage.setItem('gymix_fcm_token', token.value);
        localStorage.removeItem('gymix_fcm_error');
        if (userId && token.value) {
          await this._saveTokenToDatabase(userId, token.value);
        }
      });

      // 3. Handle registration errors
      Push.addListener('registrationError', (err) => {
        console.error('[Push] FCM Registration error:', err);
        localStorage.setItem('gymix_fcm_error', err.message || JSON.stringify(err) || String(err));
        localStorage.removeItem('gymix_fcm_token');
      });

      // 4. Notification received while app is OPEN (foreground)
      Push.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Foreground notification:', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      // 5. User TAPPED a notification (app was in background/closed)
      Push.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Push] Notification tapped:', action);
        // Navigate to the appropriate page
        const route = action.notification?.data?.route || '/notifications';
        try {
          window.dispatchEvent(new CustomEvent('push-notification-tap', { detail: { route } }));
        } catch (e) {
          console.warn('[Push] Could not dispatch nav event:', e);
        }
      });

      // 6. Register with FCM to get a device push token
      await Push.register();

    } catch (err) {
      console.error('[Push] Failed to initialize push notifications:', err);
    }
  },

  /**
   * Save/update FCM token in Supabase so the backend can send targeted push notifications.
   * Uses upsert by device_id so a reinstall or token refresh updates the row instead of duplicating.
   */
  async _saveTokenToDatabase(userId, fcmToken) {
    try {
      const deviceId = this._getDeviceId();
      const platform = window.Capacitor?.getPlatform?.() || 'android';

      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            fcm_token: fcmToken,
            device_id: deviceId,
            platform: platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_id' }
        );

      if (error) {
        console.error('[Push] Failed to save FCM token:', error);
      } else {
        console.log('[Push] FCM token saved to Supabase');
      }
    } catch (err) {
      console.error('[Push] Error saving FCM token:', err);
    }
  },

  /**
   * Remove FCM token on logout so the user stops receiving notifications on this device.
   */
  async removeToken(userId) {
    try {
      const deviceId = this._getDeviceId();
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (!error) {
        console.log('[Push] FCM token removed from Supabase');
      }
    } catch (err) {
      console.warn('[Push] Failed to remove FCM token:', err);
    }
  },

  /**
   * Get or create a stable device ID persisted in localStorage.
   * Ensures the same row is upserted across token refreshes.
   */
  _getDeviceId() {
    let deviceId = localStorage.getItem('gymix_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('gymix_device_id', deviceId);
    }
    return deviceId;
  },

  /**
   * Check current push notification permission status.
   * Returns: 'granted' | 'denied' | 'prompt' | 'default'
   */
  async checkPermissionStatus() {
    const Push = await getPushPlugin();
    if (!Push) {
      if ('Notification' in window) {
        return Notification.permission; // 'granted' | 'denied' | 'default'
      }
      return 'denied';
    }
    try {
      const permResult = await Push.checkPermissions();
      return permResult.receive; // 'granted' | 'denied' | 'prompt'
    } catch (err) {
      console.warn('[Push] Error checking permissions:', err);
      return 'denied';
    }
  },

  /**
   * Web Notifications fallback for PWA / browser users (non-Capacitor).
   */
  _initWebNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission()
          .then((perm) => console.log('[Push] Web notification permission:', perm))
          .catch(() => {});
      }, 3000);
    }
  },

  /**
   * Sends real-time push notification via Supabase Edge Function (non-blocking).
   */
  async sendPushNotification({ userIds, title, message, body, gymId, type, relatedMemberId, data = {} }) {
    if (!userIds || !userIds.length) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds,
          title: title || 'Gymix',
          message: message || body || '',
          body: body || message || '',
          gymId,
          type,
          relatedMemberId,
          data: { route: '/notifications', ...data }
        })
      });
      return await res.json();
    } catch (err) {
      console.warn('[Push] Error sending real-time push notification:', err);
    }
  },

  /**
   * Instant Push: Check-In recorded for Athlete / Member
   */
  async notifyCheckIn(gymId, member) {
    if (!member?.profile_id) return;
    return this.sendPushNotification({
      userIds: [member.profile_id],
      title: 'Workout Started! 💪',
      message: `Check-in recorded successfully. Have a powerful session!`,
      gymId,
      type: 'check_in',
      relatedMemberId: member.id,
      data: { route: '/dashboard', type: 'check_in' }
    });
  },

  /**
   * Instant Push: Payment received / recorded
   */
  async notifyPaymentReceived(gymId, member, amount) {
    if (!member?.profile_id) return;
    return this.sendPushNotification({
      userIds: [member.profile_id],
      title: 'Payment Received 💳',
      message: `Payment of ₹${amount} recorded successfully. Thank you!`,
      gymId,
      type: 'payment_received',
      relatedMemberId: member.id,
      data: { route: '/dashboard', type: 'payment_received' }
    });
  },

  /**
   * Instant Push: New Connection Request for Gym Owner
   */
  async notifyNewConnectionRequest(gymId, ownerUserId, athleteName) {
    if (!ownerUserId) return;
    return this.sendPushNotification({
      userIds: [ownerUserId],
      title: 'New Athlete Request 🔔',
      message: `${athleteName || 'An athlete'} requested to join your gym!`,
      gymId,
      type: 'new_connection_request',
      data: { route: '/dashboard', type: 'connection_request' }
    });
  },

  /**
   * Instant Push: Connection Request Approved for Athlete
   */
  async notifyConnectionApproved(gymId, profileId, gymName) {
    if (!profileId) return;
    return this.sendPushNotification({
      userIds: [profileId],
      title: 'Welcome to the Gym! 🎉',
      message: `Your membership at ${gymName || 'Gym'} has been activated!`,
      gymId,
      type: 'connection_approved',
      data: { route: '/dashboard', type: 'connection_approved' }
    });
  }
};
