import React, { useState, useEffect } from 'react';
import { X, Download, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallBannerProps {
  onDismiss: () => void;
}

export function InstallBanner({ onDismiss }: InstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  useEffect(() => {
    // Detect device type
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || 
                        window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isMacOS) {
      setDeviceType('ios');
    } else if (isAndroid) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Show banner for mobile users who haven't installed the app
    if ((isIOS || isAndroid) && !isStandalone) {
      const dismissed = localStorage.getItem('installBannerDismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }

    // Listen for the beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('installBannerDismissed', 'true');
    onDismiss();
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome - show native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsVisible(false);
        localStorage.setItem('installBannerDismissed', 'true');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback - scroll to instructions
      const element = document.getElementById('install-instructions');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getInstallText = () => {
    switch (deviceType) {
      case 'android':
        return deferredPrompt 
          ? 'Install Hotel PMS app' 
          : 'Add Hotel PMS to home screen';
      case 'ios':
        return 'Install Hotel PMS for the best experience';
      default:
        return 'Install Hotel PMS as web app';
    }
  };

  const getSubText = () => {
    switch (deviceType) {
      case 'android':
        return 'Get push notifications and offline access';
      case 'ios':
        return 'Add to home screen to enable push notifications and offline access';
      default:
        return 'Enable notifications and offline features';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <Download className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">{getInstallText()}</p>
            <p className="text-blue-100 text-xs">
              {getSubText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 text-xs px-3 py-1"
            onClick={handleInstallClick}
          >
            {deferredPrompt ? 'Install Now' : 'How to Install'}
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-blue-500 rounded"
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Android Installation Instructions
export function AndroidInstallInstructions() {
  return (
    <div id="install-instructions" className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <Bell className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-green-900 mb-3">
            How to Install Hotel PMS on Android
          </h3>
          <div className="space-y-4">
            <div className="bg-green-100 p-3 rounded-md">
              <h4 className="font-medium text-green-800 mb-2">Supported Browsers:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                <div>✅ Chrome (Recommended)</div>
                <div>✅ Edge</div>
                <div>✅ Samsung Internet</div>
                <div>✅ Firefox (limited)</div>
                <div>⚠️ Opera (basic)</div>
                <div>❌ UC Browser</div>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-green-800">
              <div className="flex items-start gap-2">
                <span className="font-medium bg-green-200 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">1</span>
                <p>Open this website in <strong>Chrome browser</strong> (best support for installation)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium bg-green-200 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">2</span>
                <p>Look for <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong> in the browser menu (⋮)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium bg-green-200 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">3</span>
                <p>If a popup appears asking to install, tap <strong>"Install"</strong> or <strong>"Add"</strong></p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium bg-green-200 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">4</span>
                <p>The app will be added to your home screen and app drawer</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium bg-green-200 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">5</span>
                <p>Open the app from your <strong>home screen</strong> (not the browser)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium bg-green-200 text-green-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">6</span>
                <p>Enable notifications when prompted to receive real-time alerts</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded-md">
            <p className="text-xs text-green-700">
              <strong>Note:</strong> On Android, "Add to Home Screen" and "Install App" are the same thing. 
              Once added, the app runs in standalone mode with full PWA features including push notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// iOS Installation Instructions  
export function IOSInstallInstructions() {
  return (
    <div id="install-instructions" className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <Bell className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-3">
            How to Install Hotel PMS on iOS
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="font-medium bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">1</span>
              <p>Open this website in <strong>Safari</strong> (installation only works in Safari)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">2</span>
              <p>Tap the <strong>Share button</strong> (□↗) at the bottom of your screen</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">3</span>
              <p>Scroll down and select <strong>"Add to Home Screen"</strong></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">4</span>
              <p>Tap <strong>"Add"</strong> to confirm the installation</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">5</span>
              <p>Open the app from your <strong>home screen</strong> (not Safari)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">6</span>
              <p>Enable push notifications when prompted to receive real-time alerts</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Push notifications on iOS require the app to be installed on your home screen. 
              This is an Apple requirement for all web apps on iOS devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}