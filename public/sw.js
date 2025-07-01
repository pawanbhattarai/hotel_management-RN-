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
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: "default-notification",
      };
    }
  } catch (error) {
    console.error("❌ Error parsing push data:", error);
    notificationData = {
      title: "Hotel Management",
      body: "You have a new notification",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: "default-notification",
    };
  }

  // Detect iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent);
  
  // iOS Safari-optimized notification options
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || "/icon-192x192.png",
    badge: notificationData.badge || "/icon-192x192.png",
    tag: notificationData.tag || "hotel-notification",
    data: notificationData.data || {},
    requireInteraction: isIOS ? true : false, // iOS needs true for reliable display
    silent: false,
    timestamp: Date.now(),
  };

  // Add iOS-specific options
  if (isIOS) {
    // iOS Safari requires simpler notification options
    notificationOptions.actions = undefined; // Remove actions for iOS
    notificationOptions.image = undefined; // Remove image for iOS
  } else {
    // Add features for non-iOS devices
    notificationOptions.vibrate = [200, 100, 200];
    notificationOptions.actions = notificationData.actions || [
      {
        action: "view",
        title: "View",
      }
    ];
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
        
        // For iOS, also log to help debug
        if (isIOS) {
          console.log("🍎 iOS notification displayed with options:", notificationOptions);
        }
      })
      .catch((error) => {
        console.error("❌ Error showing notification:", error);
        
        // iOS-specific fallback with minimal options
        const fallbackOptions = {
          body: notificationData.body,
          icon: "/icon-192x192.png",
          tag: "hotel-notification-fallback",
          requireInteraction: true,
          silent: false
        };
        
        console.log("🔄 Trying fallback notification options:", fallbackOptions);
        return self.registration.showNotification(notificationData.title, fallbackOptions);
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
