console.log("🔧 Service Worker loaded");

// Cache name
const CACHE_NAME = "hotel-notifications-v2";

// Install event
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...");
  // For iOS Safari, skip waiting immediately
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("🔧 Service Worker activating...");
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log("🔧 Claiming clients...");
        return self.clients.claim();
      })
      .then(() => {
        console.log("🔧 Cleaning up old caches...");
        return caches.keys();
      })
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("✅ Service Worker activated and ready");
      })
      .catch((error) => {
        console.error("❌ Service Worker activation error:", error);
      })
  );
});

// Push event handler
self.addEventListener("push", (event) => {
  console.log("📨 Push event received:", event);

  let notificationData;

  try {
    if (event.data) {
      notificationData = event.data.json();
      console.log("📨 Push notification data:", notificationData);
    } else {
      console.warn("⚠️ Push event has no data");
      notificationData = {
        title: "Hotel Management",
        body: "You have a new notification",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "default-notification",
      };
    }
  } catch (error) {
    console.error("❌ Error parsing push data:", error);
    notificationData = {
      title: "Hotel Management",
      body: "You have a new notification",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "default-notification",
    };
  }

  // iOS Safari-optimized notification options
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || "/favicon.ico",
    badge: notificationData.badge || "/favicon.ico",
    tag: notificationData.tag || "hotel-notification",
    data: notificationData.data || {},
    requireInteraction: false, // iOS Safari works better with false
    actions: notificationData.actions || [
      {
        action: "view",
        title: "View",
      }
    ],
    silent: false,
    timestamp: Date.now(),
  };

  // Add vibration only for non-iOS devices
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) {
    notificationOptions.vibrate = [200, 100, 200];
  }

  console.log("📤 Showing notification:", notificationData.title, notificationOptions);

  event.waitUntil(
    Promise.resolve()
      .then(() => {
        console.log("📋 Attempting to show notification...");
        return self.registration.showNotification(notificationData.title, notificationOptions);
      })
      .then(() => {
        console.log("✅ Notification shown successfully");
      })
      .catch((error) => {
        console.error("❌ Error showing notification:", error);
        // Fallback: try with minimal options for iOS
        return self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: "/favicon.ico",
          tag: "hotel-notification-fallback"
        });
      })
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ Notification clicked:", event.notification);

  event.notification.close();

  if (event.action === "dismiss") {
    console.log("🚫 Notification dismissed");
    return;
  }

  // Open or focus the app window
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        console.log("👥 Available clients:", clientList.length);

        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            console.log("🎯 Focusing existing window");
            return client.focus();
          }
        }

        // Open new window if none found
        if (clients.openWindow) {
          console.log("🆕 Opening new window");
          return clients.openWindow("/dashboard");
        }
      })
      .catch((error) => {
        console.error("❌ Error handling notification click:", error);
      }),
  );
});

// Message handler (ready for future use)
self.addEventListener("message", (event) => {
  console.log("💬 Service Worker received message:", event.data);
  // Ready for custom message handling if needed
});

console.log("✅ Service Worker setup complete");
