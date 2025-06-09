
import { apiRequest } from './queryClient';

export class NotificationManager {
  private static vapidPublicKey: string | null = null;
  private static registration: ServiceWorkerRegistration | null = null;

  static async initialize(): Promise<boolean> {
    console.log('🔄 Initializing NotificationManager...');
    
    // Check for basic browser support
    if (!('serviceWorker' in navigator)) {
      console.warn('❌ Service Workers not supported by this browser');
      return false;
    }

    if (!('PushManager' in window)) {
      console.warn('❌ Push messaging not supported by this browser');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('❌ Notifications not supported by this browser');
      return false;
    }

    try {
      // Get VAPID public key first
      console.log('🔑 Fetching VAPID public key...');
      const response = await fetch('/api/notifications/vapid-key');
      if (!response.ok) {
        throw new Error(`Failed to fetch VAPID key: ${response.status}`);
      }
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      console.log('✅ VAPID public key obtained:', this.vapidPublicKey?.substring(0, 20) + '...');

      // Unregister any existing service workers to avoid conflicts
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.scope.includes('/sw.js') || registration.scope.includes('sw.js')) {
            console.log('🗑️ Unregistering existing service worker');
            await registration.unregister();
          }
        }
      }

      // Register service worker
      console.log('📝 Registering service worker...');
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('✅ Service Worker registered with scope:', this.registration.scope);

      // Wait for service worker to be ready
      console.log('⏳ Waiting for service worker to be ready...');
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker is ready');

      // Test if service worker is responding
      await this.testServiceWorker();

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      return false;
    }
  }

  private static async testServiceWorker(): Promise<void> {
    if (!this.registration) return;

    try {
      console.log('🧪 Testing service worker communication...');
      
      // Send a test message to service worker
      if (this.registration.active) {
        this.registration.active.postMessage({
          type: 'TEST_NOTIFICATION'
        });
        console.log('✅ Service worker test message sent');
      }
    } catch (error) {
      console.warn('⚠️ Service worker test failed:', error);
    }
  }

  static async requestPermission(): Promise<NotificationPermission> {
    console.log('🔔 Requesting notification permission...');
    
    if (!('Notification' in window)) {
      console.warn('❌ Notifications not supported');
      return 'denied';
    }

    let permission = Notification.permission;
    console.log('📊 Current permission status:', permission);

    if (permission === 'default') {
      console.log('❓ Permission is default, requesting...');
      permission = await Notification.requestPermission();
      console.log('📊 New permission status:', permission);
    }

    return permission;
  }

  static async subscribe(): Promise<boolean> {
    console.log('🔔 Starting subscription process...');
    
    if (!this.registration || !this.vapidPublicKey) {
      console.error('❌ Notification manager not properly initialized');
      return false;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.warn('❌ Notification permission not granted:', permission);
      return false;
    }

    try {
      // Check if already subscribed
      console.log('🔍 Checking existing subscription...');
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('🔄 Unsubscribing from existing subscription...');
        await existingSubscription.unsubscribe();
      }

      // Create new subscription
      console.log('📝 Creating new push subscription...');
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      console.log('✅ Push subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Send subscription to server
      console.log('📤 Sending subscription to server...');
      const subscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')),
      };

      console.log('📤 Subscription data:', {
        endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
        p256dhLength: subscriptionData.p256dh.length,
        authLength: subscriptionData.auth.length
      });

      await apiRequest('POST', '/api/notifications/subscribe', subscriptionData);

      console.log('✅ Successfully subscribed to push notifications');
      
      // Send a test notification after subscription
      await this.sendTestNotification();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  static async sendTestNotification(): Promise<void> {
    try {
      console.log('🧪 Sending test notification...');
      
      // Create a local test notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 Notifications Enabled!', {
          body: 'You will now receive hotel management notifications.',
          icon: '/favicon.ico',
          tag: 'test-notification'
        });
        console.log('✅ Test notification sent');
      }
    } catch (error) {
      console.warn('⚠️ Failed to send test notification:', error);
    }
  }

  static async unsubscribe(): Promise<boolean> {
    console.log('🔕 Starting unsubscribe process...');
    
    if (!this.registration) {
      console.warn('⚠️ No registration found');
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        console.log('🔄 Unsubscribing from push manager...');
        await subscription.unsubscribe();
        
        // Remove subscription from server
        console.log('📤 Removing subscription from server...');
        await apiRequest('DELETE', '/api/notifications/unsubscribe', {
          endpoint: subscription.endpoint,
        });
        
        console.log('✅ Successfully unsubscribed from push notifications');
      } else {
        console.log('ℹ️ No active subscription found');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  static async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      const isSubscribed = subscription !== null;
      console.log('📊 Subscription status:', isSubscribed);
      return isSubscribed;
    } catch (error) {
      console.error('❌ Failed to check subscription status:', error);
      return false;
    }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    try {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      
      return outputArray;
    } catch (error) {
      console.error('❌ Failed to convert VAPID key:', error);
      throw error;
    }
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      return window.btoa(binary);
    } catch (error) {
      console.error('❌ Failed to convert buffer to base64:', error);
      return '';
    }
  }
}
