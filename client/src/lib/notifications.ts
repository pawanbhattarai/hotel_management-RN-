import { apiRequest } from './queryClient';

export import { apiRequest } from './queryClient';

class NotificationManager {
  private static vapidPublicKey: string | null = null;
  private static registration: ServiceWorkerRegistration | null = null;

  static isSupported(): { supported: boolean; reason?: string; requiresHomescreenInstall?: boolean } {
    // Check for iOS devices (iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edge/.test(navigator.userAgent);
    
    // Check if running as PWA (iOS 16.4+ requirement)
    const isStandalone = (window.navigator as any).standalone || 
                        window.matchMedia('(display-mode: standalone)').matches ||
                        window.matchMedia('(display-mode: fullscreen)').matches ||
                        window.matchMedia('(display-mode: minimal-ui)').matches;

    // More robust iOS version detection
    const iOSVersionMatch = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/) || 
                           navigator.userAgent.match(/Version\/(\d+)\.(\d+)/);
    const iOSVersion = iOSVersionMatch ? parseFloat(`${iOSVersionMatch[1]}.${iOSVersionMatch[2]}`) : 0;
    
    console.log('🔍 Device detection:', {
      isIOS,
      isMacOS,
      isSafari,
      isStandalone,
      iOSVersion,
      userAgent: navigator.userAgent
    });

    if (isIOS && !isMacOS) {
      if (iOSVersion > 0 && iOSVersion < 16.4) {
        return { 
          supported: false, 
          reason: `iOS ${iOSVersion} detected. Push notifications require iOS 16.4 or later. Please update your device.` 
        };
      }
      
      if (!isStandalone) {
        return { 
          supported: true,
          requiresHomescreenInstall: true,
          reason: 'To receive push notifications on iOS Safari, you must add this app to your home screen first. Tap the Share button (□↗) and select "Add to Home Screen".' 
        };
      }
    }

    // Check basic browser support
    if (!('serviceWorker' in navigator)) {
      return { supported: false, reason: 'Service Workers not supported' };
    }

    if (!('PushManager' in window)) {
      return { supported: false, reason: 'Push messaging not supported' };
    }

    if (!('Notification' in window)) {
      return { supported: false, reason: 'Notifications not supported' };
    }

    return { supported: true };
  }

  static async initialize(): Promise<boolean> {
    console.log('🔄 Initializing NotificationManager...');

    const supportCheck = this.isSupported();
    console.log('📋 Support check result:', supportCheck);

    // Check for basic browser support first
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

      // For iOS Safari, be more gentle with service worker registration
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform);
      const isIOSDevice = isIOS && !isMacOS;

      if (isIOSDevice) {
        console.log('📱 iOS device detected, using iOS-optimized service worker registration...');
        
        // Check if already registered
        const existingRegistration = await navigator.serviceWorker.getRegistration('/');
        if (existingRegistration) {
          console.log('♻️ Using existing service worker registration');
          this.registration = existingRegistration;
        } else {
          // Register with iOS-specific options
          this.registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          console.log('✅ Service Worker registered for iOS');
        }
      } else {
        // Unregister any existing service workers for non-iOS to avoid conflicts
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.scope.includes('/sw.js') || registration.scope.includes('sw.js')) {
            console.log('🗑️ Unregistering existing service worker');
            await registration.unregister();
          }
        }

        // Register service worker for non-iOS devices
        console.log('📝 Registering service worker...');
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
      }

      console.log('✅ Service Worker registered with scope:', this.registration.scope);

      // Wait for service worker to be ready (with timeout for iOS)
      console.log('⏳ Waiting for service worker to be ready...');
      if (isIOSDevice) {
        // iOS Safari can be slow, add timeout
        const readyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service worker ready timeout')), 10000)
        );
        
        try {
          await Promise.race([readyPromise, timeoutPromise]);
        } catch (timeoutError) {
          console.warn('⚠️ Service worker ready timeout, but continuing...');
        }
      } else {
        await navigator.serviceWorker.ready;
      }
      
      console.log('✅ Service Worker is ready');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return false;
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
      // For iOS, check if we're in standalone mode
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform);
      const isIOSDevice = isIOS && !isMacOS;
      const isStandalone = (window.navigator as any).standalone || 
                          window.matchMedia('(display-mode: standalone)').matches;

      if (isIOSDevice && !isStandalone) {
        console.error('❌ iOS device not in standalone mode - push notifications require PWA installation');
        throw new Error('iOS push notifications require app installation to home screen');
      }

      // Check if already subscribed
      console.log('🔍 Checking existing subscription...');
      const existingSubscription = await this.registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        // For iOS, verify the existing subscription works
        if (isIOSDevice) {
          try {
            // Test the existing subscription by sending it to server
            const subscriptionData = {
              endpoint: existingSubscription.endpoint,
              p256dh: this.arrayBufferToBase64(existingSubscription.getKey('p256dh')),
              auth: this.arrayBufferToBase64(existingSubscription.getKey('auth')),
            };
            
            const response = await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriptionData)
            });
            
            if (response.ok) {
              console.log('✅ Existing iOS subscription verified and working');
              return true;
            }
          } catch (verifyError) {
            console.warn('⚠️ Existing subscription verification failed, creating new one');
          }
        }
        
        console.log('🔄 Found existing subscription, unsubscribing...');
        await existingSubscription.unsubscribe();
        console.log('✅ Unsubscribed from existing subscription');
      }

      // Wait for iOS Safari to process unsubscription
      if (isIOSDevice) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Create new subscription with iOS-specific options
      console.log('📝 Creating new push subscription...');
      console.log('🔑 Using VAPID key:', this.vapidPublicKey.substring(0, 20) + '...');

      const subscribeOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      };

      const subscription = await this.registration.pushManager.subscribe(subscribeOptions);

      console.log('✅ Push subscription created successfully!');
      console.log('🔧 Subscription details:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        p256dhLength: subscription.getKey('p256dh')?.byteLength || 0,
        authLength: subscription.getKey('auth')?.byteLength || 0
      });

      // Send subscription to server with retry for iOS
      console.log('📤 Sending subscription to server...');
      const subscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')),
      };

      let retries = isIOSDevice ? 3 : 1;
      let response;
      
      for (let i = 0; i < retries; i++) {
        try {
          response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscriptionData)
          });
          
          if (response.ok) {
            break;
          } else if (i === retries - 1) {
            throw new Error(`Server subscription failed: ${response.status}`);
          }
        } catch (fetchError) {
          if (i === retries - 1) throw fetchError;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const responseData = await response!.json();
      console.log('✅ Subscription saved to server:', responseData);

      // For iOS, send a test notification to verify it works
      if (isIOSDevice) {
        console.log('🧪 Testing iOS notification...');
        try {
          const testResponse = await fetch('/api/notifications/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (testResponse.ok) {
            console.log('✅ iOS test notification sent successfully');
          } else {
            console.warn('⚠️ iOS test notification failed, but subscription is active');
          }
        } catch (testError) {
          console.warn('⚠️ Could not send test notification:', testError);
        }
      }

      console.log('✅ Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);

      // Additional error details
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }

      return false;
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
      console.log('🔧 Converting VAPID key, input length:', base64String.length);
      
      // Ensure the base64 string is properly formatted
      let base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if necessary
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      base64 += padding;
      
      console.log('🔧 After padding, length:', base64.length);
      
      // For iOS Safari, ensure we handle the base64 conversion carefully
      let rawData: string;
      try {
        rawData = window.atob(base64);
      } catch (atobError) {
        console.error('❌ Base64 decode error:', atobError);
        // Try without padding as fallback
        rawData = window.atob(base64String.replace(/-/g, '+').replace(/_/g, '/'));
      }
      
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      console.log('✅ VAPID key converted successfully, output length:', outputArray.length);
      return outputArray;
    } catch (error) {
      console.error('❌ Failed to convert VAPID key:', error);
      console.error('Input string:', base64String);
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

class NotificationService {
  private vapidPublicKey: string | null = null;

  async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered successfully');

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker is ready');
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        throw error;
      }
    } else {
      console.error('❌ Service Worker not supported in this browser');
      throw new Error('Service Worker not supported');
    }

    // Get VAPID public key
    try {
      const response = await fetch('/api/notifications/vapid-key');
      if (!response.ok) {
        throw new Error(`Failed to fetch VAPID key: ${response.status}`);
      }
      const data = await response.json();
      this.vapidPublicKey = data.publicKey;
      console.log('✅ VAPID public key obtained');
    } catch (error) {
      console.error('❌ Failed to get VAPID public key:', error);
      throw error;
    }
  }

  async subscribe(): Promise<boolean> {
    try {
      console.log('🔔 Starting notification subscription process...');

      if (!this.vapidPublicKey) {
        console.error('❌ VAPID public key not available, initializing...');
        await this.initialize();
        if (!this.vapidPublicKey) {
          throw new Error('VAPID public key still not available');
        }
      }

      console.log('📋 Checking for existing subscription...');
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('♻️ Existing subscription found, verifying with server...');

        // Verify with server
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: existingSubscription.endpoint,
            p256dh: this.arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(existingSubscription.getKey('auth')!),
          }),
        });

        if (response.ok) {
          console.log('✅ Existing subscription verified with server');
          return true;
        }
      }

      console.log('📝 Creating new push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      console.log('📤 Sending subscription to server...');
      const subscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')!),
      };

      console.log('📊 Subscription data:', {
        endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
        p256dhLength: subscriptionData.p256dh.length,
        authLength: subscriptionData.auth.length
      });

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Server subscription failed: ${response.status} - ${errorData.message}`);
      }

      const responseData = await response.json();
      console.log('✅ Subscription successful:', responseData);
      return true;
    } catch (error) {
      console.error('❌ Subscription failed:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      console.log('🗑️ Starting unsubscribe process...');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        console.log('📤 Unsubscribing from push manager...');
        await subscription.unsubscribe();

        console.log('📤 Notifying server of unsubscription...');
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        if (response.ok) {
          console.log('✅ Successfully unsubscribed');
          return true;
        } else {
          console.error('❌ Server unsubscribe failed:', response.status);
          return false;
        }
      } else {
        console.log('ℹ️ No subscription found to unsubscribe');
        return true;
      }
    } catch (error) {
      console.error('❌ Unsubscribe failed:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return window.btoa(binary);
  }
}

// Create a default instance for backward compatibility
export const notificationService = new NotificationService();

// Export NotificationManager as default (only one export)
export default NotificationManager;