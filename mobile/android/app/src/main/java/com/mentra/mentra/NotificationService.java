package com.mentra.mentra;

import android.app.Notification;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;

import com.facebook.react.bridge.ReactApplicationContext;
import android.service.notification.StatusBarNotification;
import android.util.Log;

// import androidx.preference.PreferenceManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import android.os.Handler;
import android.os.Looper;

import java.util.HashMap;
import java.util.Map;

import org.greenrobot.eventbus.EventBus;

public class NotificationService extends NotificationListenerService {

    private static final String TAG = "NotificationListener";
    private static ReactApplicationContext reactContext;

    public static void setReactApplicationContext(ReactApplicationContext context) {
        reactContext = context;
    }

    private final List<String> packageBlacklist = Arrays.asList(
            "com.android.systemui",
            "com.samsung.android.app.smartcapture",
            "com.sec.android.app.camera",
            "com.sec.android.gallery3d",
            "com.mentra.mentra",
            "com.osp.app.signin",
            "com.mentra.mentra",
            "com.github.welldomax.tunnelshare"
            );

    private final List<String> categoryBlacklist = Arrays.asList(
            Notification.CATEGORY_REMINDER,
            Notification.CATEGORY_ALARM,
            Notification.CATEGORY_EVENT,
            Notification.CATEGORY_SERVICE);

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service Created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service Started");
        return super.onStartCommand(intent, flags, startId);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service Destroyed");
    }

    @Override
    public boolean onUnbind(Intent intent) {
        // Perform cleanup here
        stopSelf(); // This will stop the NotificationListenerService
        return super.onUnbind(intent);
    }

    private final Map<String, Runnable> notificationBuffer = new HashMap<>();
    private final Handler notificationHandler = new Handler(Looper.getMainLooper());
    private static final long DUPLICATE_THRESHOLD_MS = 200;
    
    // Track active notifications for dismissal detection
    private final Map<String, NotificationInfo> activeNotifications = new HashMap<>();
    
    // Helper class to store notification information
    private static class NotificationInfo {
        String appName;
        String title;
        String text;
        String packageName;
        long timestamp;
        
        NotificationInfo(String appName, String title, String text, String packageName) {
            this.appName = appName;
            this.title = title;
            this.text = text;
            this.packageName = packageName;
            this.timestamp = System.currentTimeMillis();
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();

        // 🚨 Filter out blacklisted packages
        if (packageBlacklist.contains(packageName)) {
            Log.d(TAG, "Ignoring blacklisted package: " + packageName);
            return;
        }
        
        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        
        // 🚨 Filter by notification category
        String category = notification.category;
        if (category != null && categoryBlacklist.contains(category)) {
            Log.d(TAG, "Ignoring notification with category: " + category);
            return;
        }

        // 🚨 Log full notification for debugging
        Log.d(TAG, "---- New Notification Received ----");
        Log.d(TAG, "Package: " + packageName);
        Log.d(TAG, "Notification Dump: " + extras.toString());

        // Extract title and text
        final String title = extras.getString(Notification.EXTRA_TITLE, "");
        CharSequence textCharSequence = extras.getCharSequence(Notification.EXTRA_TEXT, "");
        final String text = textCharSequence != null ? textCharSequence.toString() : "";

        // 🚨 Ignore empty notifications
        if (title.isEmpty() || text.isEmpty()) {
            Log.d(TAG, "Ignoring notification with no content.");
            return;
        }

        // 🚨 Ignore WhatsApp summary notifications like "5 new messages"
        if (text.matches("^\\d+ new messages$")) {
            Log.d(TAG, "Ignoring summary notification: " + text);
            return;
        }

        // 🚨 Ignore WhatsApp notifications with a `null` ID if they look like summaries
        if (sbn.getKey().contains("|null|") && text.matches("^\\d+ new messages$")) {
            Log.d(TAG, "Ignoring WhatsApp summary notification with null ID.");
            return;
        }

        // Unique key for deduplication across multiple notifications
        String notificationKey = packageName + "|" + title + "|" + text;

        synchronized (notificationBuffer) {
            // If a previous notification with the same key exists, remove it
            if (notificationBuffer.containsKey(notificationKey)) {
                notificationHandler.removeCallbacks(notificationBuffer.get(notificationKey));
                notificationBuffer.remove(notificationKey);
            }

            // Create a delayed task to send the notification
            Runnable task = new Runnable() {
                @Override
                public void run() {
                    sendNotification(sbn, title, text);
                    synchronized (notificationBuffer) {
                        notificationBuffer.remove(notificationKey);
                    }
                }
            };

            // Store in buffer and schedule for 300ms delay
            notificationBuffer.put(notificationKey, task);
            notificationHandler.postDelayed(task, DUPLICATE_THRESHOLD_MS);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        String notificationKey = sbn.getKey();
        String packageName = sbn.getPackageName();

        Log.d(TAG, "Notification Removed: " + packageName + " (Key: " + notificationKey + ")");

        // Check if this was a notification we were tracking
        NotificationInfo trackedNotification = activeNotifications.get(notificationKey);
        if (trackedNotification != null) {
            Log.d(TAG, "🚨 Notification dismissed: " + trackedNotification.title + " - " + trackedNotification.text);
            
            // Post dismissal event to EventBus
            NotificationDismissedEvent dismissalEvent = new NotificationDismissedEvent(
                trackedNotification.appName,
                trackedNotification.title,
                trackedNotification.text,
                notificationKey
            );
            EventBus.getDefault().post(dismissalEvent);
            
            // Send dismissal to React Native
            // if (reactContext != null) {
            //     try {
            //         JSONObject obj = new JSONObject();
            //         obj.put("appName", trackedNotification.appName);
            //         obj.put("title", trackedNotification.title);
            //         obj.put("text", trackedNotification.text);
            //         obj.put("notificationKey", notificationKey);
            //         obj.put("timestamp", System.currentTimeMillis());
                    
            //         NotificationServiceModule notificationUtils = new NotificationServiceModule(reactContext);
            //         notificationUtils.onNotificationDismissed(obj.toString());
                    
            //         Log.d(TAG, "✅ Sent notification dismissal to React Native");
            //     } catch (JSONException e) {
            //         Log.d(TAG, "❌ JSONException in dismissal: " + e.getMessage());
            //     }
            // }
            
            // Remove from tracking
            activeNotifications.remove(notificationKey);
            Log.d(TAG, "📝 Removed notification from tracking: " + notificationKey);
        } else {
            Log.d(TAG, "⚠️ Notification removed but not tracked: " + notificationKey);
        }
    }

    // Function to send notification
    private void sendNotification(StatusBarNotification sbn, String title, String text) {
        try {
            String appName = getAppName(sbn.getPackageName());
            String notificationKey = sbn.getKey();
            
            JSONObject obj = new JSONObject();
            obj.put("appName", appName);
            obj.put("title", title);
            obj.put("text", text);
            obj.put("timestamp", System.currentTimeMillis());
            obj.put("uuid", UUID.randomUUID().toString());

            if (reactContext != null) {
                NotificationServiceModule notificationUtils = new NotificationServiceModule(reactContext);
                notificationUtils.onNotificationPosted(obj.toString());

                // Track this notification for dismissal detection
                activeNotifications.put(notificationKey, new NotificationInfo(appName, title, text, sbn.getPackageName()));
                Log.d(TAG, "✅ Sent notification: " + title + " - " + text);
                Log.d(TAG, "📝 Tracking notification with key: " + notificationKey);
            } else {
                Log.d(TAG, "Could not send notification- reactContext is null");
            }
        } catch (JSONException e) {
            Log.d(TAG, "❌ JSONException occurred: " + e.getMessage());
        }
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "Listener Connected");
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.d(TAG, "Listener Disconnected");
    }

    private String getAppName(String packageName) {
        PackageManager packageManager = getPackageManager();
        try {
            ApplicationInfo appInfo = packageManager.getApplicationInfo(packageName, 0);
            return (String) packageManager.getApplicationLabel(appInfo);
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
            return packageName;
        }
    }
}
