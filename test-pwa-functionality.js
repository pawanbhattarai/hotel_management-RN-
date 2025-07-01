/**
 * Comprehensive PWA Functionality Test Script
 * Tests all PWA features including notifications, offline capability, and installation
 */

const API_BASE = 'http://localhost:5000';

async function testPWAFunctionality() {
  console.log('🧪 Starting PWA Functionality Tests...');
  console.log('=' .repeat(50));

  // Test 1: Service Worker Registration
  console.log('\n1. Testing Service Worker Registration...');
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('✅ Service Worker is registered');
        console.log(`   - Scope: ${registration.scope}`);
        console.log(`   - State: ${registration.active?.state || 'inactive'}`);
      } else {
        console.log('❌ Service Worker not registered');
      }
    } else {
      console.log('❌ Service Worker not supported');
    }
  } catch (error) {
    console.log('❌ Service Worker registration check failed:', error.message);
  }

  // Test 2: PWA Installation Capability
  console.log('\n2. Testing PWA Installation Capability...');
  try {
    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      console.log('✅ Manifest link found');
      
      const response = await fetch(manifestLink.href);
      const manifest = await response.json();
      console.log(`   - Name: ${manifest.name}`);
      console.log(`   - Display: ${manifest.display}`);
      console.log(`   - Icons: ${manifest.icons?.length || 0} defined`);
    } else {
      console.log('❌ Manifest link not found');
    }

    // Check if app is installable
    if ('BeforeInstallPromptEvent' in window) {
      console.log('✅ PWA installation supported');
    } else {
      console.log('⚠️  PWA installation may not be supported on this browser');
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone ||
                         document.referrer.includes('android-app://');
    
    if (isStandalone) {
      console.log('✅ App is running in standalone mode (installed)');
    } else {
      console.log('📱 App is running in browser mode');
    }
  } catch (error) {
    console.log('❌ PWA installation check failed:', error.message);
  }

  // Test 3: Push Notification Support
  console.log('\n3. Testing Push Notification Support...');
  try {
    if ('Notification' in window) {
      console.log('✅ Notification API supported');
      console.log(`   - Permission: ${Notification.permission}`);
      
      if ('PushManager' in window) {
        console.log('✅ Push Manager supported');
        
        // Check if user is subscribed
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            console.log('✅ User has active push subscription');
            console.log(`   - Endpoint: ${subscription.endpoint.substring(0, 50)}...`);
          } else {
            console.log('📬 No push subscription found');
          }
        }
      } else {
        console.log('❌ Push Manager not supported');
      }
    } else {
      console.log('❌ Notification API not supported');
    }
  } catch (error) {
    console.log('❌ Push notification check failed:', error.message);
  }

  // Test 4: Offline Capability
  console.log('\n4. Testing Offline Capability...');
  try {
    const cacheNames = await caches.keys();
    console.log(`✅ Cache API supported - ${cacheNames.length} caches found:`);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      console.log(`   - ${cacheName}: ${keys.length} cached resources`);
    }

    // Test if critical resources are cached
    const criticalResources = ['/', '/manifest.json', '/icon-192x192.png'];
    for (const resource of criticalResources) {
      const response = await caches.match(resource);
      if (response) {
        console.log(`✅ ${resource} is cached`);
      } else {
        console.log(`⚠️  ${resource} not in cache`);
      }
    }
  } catch (error) {
    console.log('❌ Cache check failed:', error.message);
  }

  // Test 5: Network Status Detection
  console.log('\n5. Testing Network Status Detection...');
  try {
    console.log(`✅ Online status: ${navigator.onLine ? 'Online' : 'Offline'}`);
    
    if ('connection' in navigator) {
      const connection = navigator.connection;
      console.log(`   - Connection type: ${connection.effectiveType || 'unknown'}`);
      console.log(`   - Downlink: ${connection.downlink || 'unknown'} Mbps`);
    } else {
      console.log('   - Network Information API not supported');
    }
  } catch (error) {
    console.log('❌ Network status check failed:', error.message);
  }

  // Test 6: Authentication and API Endpoints
  console.log('\n6. Testing API Endpoints...');
  try {
    // Test auth endpoint
    const authResponse = await fetch(`${API_BASE}/api/auth/user`, {
      credentials: 'include'
    });
    console.log(`✅ Auth endpoint accessible (${authResponse.status})`);

    // Test public endpoints
    const publicEndpoints = [
      '/api/branches',
      '/api/hotel-settings'
    ];

    for (const endpoint of publicEndpoints) {
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          credentials: 'include'
        });
        console.log(`✅ ${endpoint} accessible (${response.status})`);
      } catch (error) {
        console.log(`⚠️  ${endpoint} failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ API endpoint tests failed:', error.message);
  }

  // Test 7: iOS-Specific Features
  console.log('\n7. Testing iOS-Specific Features...');
  try {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform);
    
    if (isIOS && !isMacOS) {
      console.log('✅ Running on iOS device');
      
      // Check iOS-specific meta tags
      const iosMetaTags = [
        'apple-mobile-web-app-capable',
        'apple-mobile-web-app-status-bar-style',
        'apple-mobile-web-app-title'
      ];
      
      for (const metaName of iosMetaTags) {
        const meta = document.querySelector(`meta[name="${metaName}"]`);
        if (meta) {
          console.log(`✅ ${metaName}: ${meta.getAttribute('content')}`);
        } else {
          console.log(`⚠️  ${metaName} meta tag not found`);
        }
      }

      // Check apple-touch-icon
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleTouchIcon) {
        console.log('✅ Apple touch icon defined');
      } else {
        console.log('⚠️  Apple touch icon not found');
      }
    } else {
      console.log('📱 Not running on iOS device');
    }
  } catch (error) {
    console.log('❌ iOS feature check failed:', error.message);
  }

  // Test 8: Performance Metrics
  console.log('\n8. Testing Performance Metrics...');
  try {
    if ('performance' in window && performance.timing) {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      console.log(`✅ Page load time: ${loadTime}ms`);
      console.log(`✅ DOM ready time: ${domReady}ms`);
      
      if (loadTime < 3000) {
        console.log('✅ Good load performance');
      } else {
        console.log('⚠️  Load time could be improved');
      }
    } else {
      console.log('⚠️  Performance timing not available');
    }
  } catch (error) {
    console.log('❌ Performance check failed:', error.message);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🧪 PWA Functionality Tests Complete!');
  console.log('\nTo test notifications manually:');
  console.log('1. Go to Settings > Mobile App');
  console.log('2. Click "Enable Notifications"');
  console.log('3. Use "Send Test Notification" button');
  console.log('\nTo test offline functionality:');
  console.log('1. Enable notifications first');
  console.log('2. Disconnect from internet');
  console.log('3. Navigate through the app');
  console.log('4. Check cached content loads');
}

// Auto-run test if this script is executed directly
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPWAFunctionality);
  } else {
    testPWAFunctionality();
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testPWAFunctionality };
}