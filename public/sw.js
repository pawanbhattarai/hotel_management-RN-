
// Service Worker for Push Notifications
console.log('🔧 Service Worker script loaded');

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('📨 Push message received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📨 Push data received:', data);
      
      const notificationOptions = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag || 'hotel-notification',
        data: data.data || {},
        requireInteraction: true,
        actions: data.actions || [
          {
            action: 'view',
            title: 'View Details',
            icon: '/favicon.ico'
          }
        ],
        vibrate: [300, 100, 300, 100, 300],
        timestamp: Date.now(),
        silent: false,
        renotify: true,
        sticky: true
      };

      console.log('📨 Showing notification with options:', notificationOptions);

      // Store notification in IndexedDB for history
      event.waitUntil(
        Promise.all([
          self.registration.showNotification(data.title, notificationOptions),
          storeNotificationInDB(data)
        ])
      );
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
      
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('Hotel Management System', {
          body: 'You have a new notification',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'fallback-notification',
          requireInteraction: true
        })
      );
    }
  } else {
    console.log('📨 Push event with no data, showing fallback notification');
    
    // Fallback for push events without data
    event.waitUntil(
      self.registration.showNotification('Hotel Management System', {
        body: 'You have a new notification',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'fallback-notification',
        requireInteraction: true
      })
    );
  }
});

// Store notification in IndexedDB for offline access
async function storeNotificationInDB(notificationData) {
  try {
    console.log('💾 Storing notification in IndexedDB:', notificationData);
    const db = await openNotificationDB();
    const transaction = db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');
    
    const notification = {
      id: Date.now(),
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data,
      timestamp: Date.now(),
      read: false
    };
    
    await store.add(notification);
    console.log('✅ Notification stored in IndexedDB');
  } catch (error) {
    console.error('❌ Failed to store notification:', error);
  }
}

// Open or create IndexedDB for notifications
function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HotelNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        const store = db.createObjectStore('notifications', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/dashboard';
  
  // Determine the URL based on notification type
  if (data && data.type) {
    switch (data.type) {
      case 'new_reservation':
        url = `/reservations?highlight=${data.reservationId}`;
        break;
      case 'check_in':
      case 'check_out':
        url = `/reservations?highlight=${data.reservationId}`;
        break;
      case 'room_maintenance':
        url = `/rooms?highlight=${data.roomId}`;
        break;
      default:
        url = '/dashboard';
    }
  }
  
  console.log('🔗 Opening URL:', url);
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
          console.log('🎯 Focusing existing window');
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        console.log('🆕 Opening new window');
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification closed:', event.notification.tag);
});

// Handle service worker errors
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker error:', event.error);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker unhandled rejection:', event.reason);
});

// Add message handling for testing
self.addEventListener('message', (event) => {
  console.log('📬 Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    // Send a test notification
    self.registration.showNotification('🧪 Test Notification', {
      body: 'This is a test notification to verify push notifications are working.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification',
      requireInteraction: true
    });
  }
});
