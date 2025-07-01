console.log("🔧 Service Worker loaded");

// iOS PWA detection
const isIOSPWA = () => {
  return ('standalone' in window.navigator) && (window.navigator.standalone) ||
         window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
};

// Cache names
const CACHE_NAME = "hotel-pwa-v4";
const STATIC_CACHE = "hotel-static-v4";
const DYNAMIC_CACHE = "hotel-dynamic-v4";
const API_CACHE = "hotel-api-v4";

// Resources to cache
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-384x384.png'
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  '/api/auth/user',
  '/api/branches',
  '/api/hotel-settings',
  '/api/restaurant/orders',
  '/api/restaurant/categories',
  '/api/restaurant/dishes',
  '/api/reservations'
];

// Install event
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...");
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log("📦 Caching static assets...");
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn("⚠️ Some static assets failed to cache:", err);
          // Continue without failing the installation
        });
      }),
      // Initialize other caches
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE)
    ]).then(() => {
      console.log("✅ Service Worker installed successfully");
      // For iOS Safari and better PWA experience, skip waiting immediately
      return self.skipWaiting();
    }).catch(err => {
      console.error("❌ Service Worker installation failed:", err);
    })
  );
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
        const currentCaches = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, API_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
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

// Fetch event handler for offline functionality
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and non-HTTP(S) URLs
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      // networkFirst strategy for API calls
      fetch(event.request)
        .then(response => {
          // Cache successful responses for offline access
          if (response.ok && CACHEABLE_API_PATTERNS.some(pattern => url.pathname.startsWith(pattern))) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache when network fails
          return caches.match(event.request).then(response => {
            if (response) {
              console.log("📤 Serving API from cache:", url.pathname);
              return response;
            }
            // Return offline response for critical API calls
            if (url.pathname === '/api/auth/user') {
              return new Response(JSON.stringify({ error: 'Offline' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            throw new Error('Network unavailable and no cached response');
          });
        })
    );
    return;
  }

  // Handle static assets (cacheFirst strategy)
  if (url.pathname.includes('.') || STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          console.log("📤 Serving static asset from cache:", url.pathname);
          return response;
        }
        
        // Fetch and cache static assets
        return fetch(event.request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Handle navigation requests (network-first with cache fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Serve cached page or offline fallback
          return caches.match(event.request).then(response => {
            if (response) {
              console.log("📤 Serving page from cache:", url.pathname);
              return response;
            }
            // Serve cached main page as fallback for PWA navigation
            return caches.match('/');
          });
        })
    );
  }
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
