package com.gymix.fit;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create notification channel required for Android 8.0+ (API 26+)
        // Must be created before any notification is sent
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "gymix_default",             // channel ID (must match FCM payload)
                "Gymix Notifications",        // human-readable name shown in Settings
                NotificationManager.IMPORTANCE_HIGH  // show heads-up popup + sound
            );
            channel.setDescription("Member alerts, payment reminders, and gym updates");
            channel.enableVibration(true);

            NotificationManager notifManager = getSystemService(NotificationManager.class);
            notifManager.createNotificationChannel(channel);
        }
    }
}
