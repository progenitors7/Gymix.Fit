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

// Lazily import PushNotifications only when running in Capacitor native context
const getPushPlugin = async () => {
  if (!window.Capacitor) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    return PushNotifications;
  } catch (err) {
    console.warn('[Push] @capacitor/push-notifications not available:', err);
    return null;
  }
};

export const pushNotificationService = {
  /**
   * Initializes push notifications. Call this once on app startup (in App.jsx).
   * @param {string} userId - The authenticated user's ID (to save token to DB)
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
        if (userId && token.value) {
          await this._saveTokenToDatabase(userId, token.value);
        }
      });

      // 3. Handle registration errors
      Push.addListener('registrationError', (err) => {
        console.error('[Push] FCM Registration error:', err);
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
};
