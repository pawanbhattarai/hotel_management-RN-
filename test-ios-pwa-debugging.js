/**
 * Comprehensive iOS PWA Debugging Test Script
 * Tests all iOS PWA requirements and compatibility issues
 */

async function testIOSPWACompatibility() {
  console.log('🧪 Starting iOS PWA Compatibility Test');
  console.log('=====================================');

  const results = {
    manifestTests: {},
    serviceWorkerTests: {},
    metaTagTests: {},
    iconTests: {},
    installabilityTests: {},
    notificationTests: {},
    offlineTests: {}
  };

  try {
    // 1. Test Manifest.json
    console.log('\n📋 Testing Manifest.json...');
    const manifestResponse = await fetch('/manifest.json');
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      results.manifestTests = {
        exists: true,
        hasName: !!manifest.name,
        hasShortName: !!manifest.short_name,
        hasStartUrl: !!manifest.start_url,
        hasDisplay: manifest.display === 'standalone',
        hasIcons: manifest.icons && manifest.icons.length > 0,
        hasThemeColor: !!manifest.theme_color,
        hasBackgroundColor: !!manifest.background_color,
        hasScope: !!manifest.scope,
        preferRelatedApps: manifest.prefer_related_applications === false
      };
      console.log('✅ Manifest loaded successfully');
      console.log('   - Name:', manifest.name);
      console.log('   - Display mode:', manifest.display);
      console.log('   - Icons count:', manifest.icons?.length || 0);
      console.log('   - Has shortcuts:', manifest.shortcuts?.length || 0);
    } else {
      results.manifestTests.exists = false;
      console.log('❌ Manifest.json not found');
    }

    // 2. Test Service Worker
    console.log('\n🔧 Testing Service Worker...');
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        results.serviceWorkerTests = {
          supported: true,
          registered: !!registration,
          scope: registration?.scope || null,
          state: registration?.active?.state || null
        };
        console.log('✅ Service Worker supported');
        console.log('   - Registered:', !!registration);
        console.log('   - Scope:', registration?.scope);
        console.log('   - State:', registration?.active?.state);
      } catch (error) {
        results.serviceWorkerTests = { supported: true, error: error.message };
        console.log('⚠️ Service Worker error:', error.message);
      }
    } else {
      results.serviceWorkerTests.supported = false;
      console.log('❌ Service Worker not supported');
    }

    // 3. Test Meta Tags
    console.log('\n📱 Testing iOS Meta Tags...');
    const metaTags = {
      appleMobileWebAppCapable: document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
      appleMobileWebAppStatusBar: document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]'),
      appleMobileWebAppTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]'),
      themeColor: document.querySelector('meta[name="theme-color"]'),
      viewport: document.querySelector('meta[name="viewport"]')
    };

    results.metaTagTests = {
      appleMobileWebAppCapable: metaTags.appleMobileWebAppCapable?.content === 'yes',
      appleMobileWebAppStatusBar: !!metaTags.appleMobileWebAppStatusBar?.content,
      appleMobileWebAppTitle: !!metaTags.appleMobileWebAppTitle?.content,
      themeColor: !!metaTags.themeColor?.content,
      viewport: metaTags.viewport?.content?.includes('viewport-fit=cover')
    };

    console.log('✅ Meta tags checked');
    Object.entries(results.metaTagTests).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
    });

    // 4. Test Apple Touch Icons
    console.log('\n🎨 Testing Apple Touch Icons...');
    const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
    results.iconTests = {
      count: appleTouchIcons.length,
      sizes: Array.from(appleTouchIcons).map(icon => icon.getAttribute('sizes')),
      hasMultipleSizes: appleTouchIcons.length > 3
    };
    console.log('✅ Apple touch icons:', appleTouchIcons.length);

    // 5. Test iOS PWA Detection
    console.log('\n📱 Testing iOS PWA Detection...');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches ||
                        window.matchMedia('(display-mode: fullscreen)').matches;
    const isiOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);

    results.installabilityTests = {
      isIOS,
      isStandalone,
      isiOSSafari,
      canInstall: isIOS && isiOSSafari && !isStandalone,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints
    };

    console.log('✅ iOS detection results:');
    console.log('   - Is iOS:', isIOS);
    console.log('   - Is Standalone:', isStandalone);
    console.log('   - Is iOS Safari:', isiOSSafari);
    console.log('   - Can Install:', results.installabilityTests.canInstall);

    // 6. Test Push Notifications (if supported)
    console.log('\n🔔 Testing Push Notifications...');
    if ('Notification' in window) {
      results.notificationTests = {
        supported: true,
        permission: Notification.permission,
        serviceWorkerPushManager: 'serviceWorker' in navigator && 'PushManager' in window
      };
      console.log('✅ Notifications supported');
      console.log('   - Permission:', Notification.permission);
      console.log('   - Push Manager:', results.notificationTests.serviceWorkerPushManager);
    } else {
      results.notificationTests.supported = false;
      console.log('❌ Notifications not supported');
    }

    // 7. Test Offline Capabilities
    console.log('\n📡 Testing Offline Capabilities...');
    results.offlineTests = {
      cacheAPISupported: 'caches' in window,
      onlineStatus: navigator.onLine,
      connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
    };
    console.log('✅ Offline capabilities:');
    console.log('   - Cache API:', results.offlineTests.cacheAPISupported);
    console.log('   - Online status:', results.offlineTests.onlineStatus);

    // 8. Final iOS PWA Compliance Score
    console.log('\n🎯 iOS PWA Compliance Analysis');
    console.log('===============================');
    
    const compliance = {
      manifest: Object.values(results.manifestTests).filter(Boolean).length / Object.keys(results.manifestTests).length * 100,
      metaTags: Object.values(results.metaTagTests).filter(Boolean).length / Object.keys(results.metaTagTests).length * 100,
      serviceWorker: results.serviceWorkerTests.registered ? 100 : 0,
      icons: results.iconTests.hasMultipleSizes ? 100 : 50,
      notifications: results.notificationTests.supported ? 100 : 0
    };

    const overallScore = Object.values(compliance).reduce((sum, score) => sum + score, 0) / Object.keys(compliance).length;

    console.log(`📊 Compliance Scores:`);
    console.log(`   - Manifest: ${compliance.manifest.toFixed(1)}%`);
    console.log(`   - Meta Tags: ${compliance.metaTags.toFixed(1)}%`);
    console.log(`   - Service Worker: ${compliance.serviceWorker}%`);
    console.log(`   - Icons: ${compliance.icons}%`);
    console.log(`   - Notifications: ${compliance.notifications}%`);
    console.log(`🏆 Overall iOS PWA Score: ${overallScore.toFixed(1)}%`);

    if (overallScore >= 90) {
      console.log('✅ iOS PWA is highly compliant and should work properly');
    } else if (overallScore >= 70) {
      console.log('⚠️ iOS PWA has some issues but should mostly work');
    } else {
      console.log('❌ iOS PWA needs significant improvements');
    }

    // 9. Specific iOS Issues and Recommendations
    console.log('\n🔧 iOS-Specific Recommendations:');
    if (!results.metaTagTests.appleMobileWebAppCapable) {
      console.log('❌ Add: <meta name="apple-mobile-web-app-capable" content="yes">');
    }
    if (!results.metaTagTests.viewport) {
      console.log('❌ Add viewport-fit=cover to viewport meta tag');
    }
    if (!results.iconTests.hasMultipleSizes) {
      console.log('❌ Add more Apple touch icon sizes (180x180, 152x152, 144x144)');
    }
    if (!results.installabilityTests.isStandalone && results.installabilityTests.isIOS) {
      console.log('📱 App is not installed as PWA on iOS - show installation instructions');
    }

    return results;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
}

// Auto-run test when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testIOSPWACompatibility);
} else {
  testIOSPWACompatibility();
}

// Export for manual testing
window.testIOSPWACompatibility = testIOSPWACompatibility;