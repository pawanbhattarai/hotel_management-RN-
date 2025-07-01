import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Enhanced iOS PWA Service Worker Registration
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // iOS Safari PWA compatibility
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      console.log('🔧 Registering service worker...', { isIOS });
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('✅ Service Worker registered:', registration);
      
      // iOS-specific handling
      if (isIOS) {
        console.log('📱 iOS PWA mode detected - enhanced compatibility enabled');
        
        // Force update check for iOS
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🎯 New Service Worker ready for iOS');
              }
            });
          }
        });
      }
      
      // Check for updates every 5 minutes in iOS
      if (isIOS) {
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      }
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
}

// Register service worker
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
