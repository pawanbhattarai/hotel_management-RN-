
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('📬 Push message received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('📄 Push data:', data);
      
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
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      };

      event.waitUntil(
        self.registration.showNotification(data.title, notificationOptions)
      );
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
      
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification('Hotel Management System', {
          body: 'You have a new notification',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'fallback-notification'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/';
  
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
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
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
