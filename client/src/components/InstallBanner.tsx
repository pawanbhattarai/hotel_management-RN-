import React, { useState, useEffect } from 'react';
import { X, Download, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InstallBannerProps {
  onDismiss: () => void;
}

export function InstallBanner({ onDismiss }: InstallBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this is iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.platform);
    const isStandalone = (window.navigator as any).standalone || 
                        window.matchMedia('(display-mode: standalone)').matches;

    // Show banner for iOS users who haven't installed the app
    if (isIOS && !isMacOS && !isStandalone) {
      const dismissed = localStorage.getItem('installBannerDismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('installBannerDismissed', 'true');
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <Download className="h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Install Hotel PMS for the best experience</p>
            <p className="text-blue-100 text-xs">
              Add to home screen to enable push notifications and offline access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600 text-xs px-3 py-1"
            onClick={() => {
              // Scroll to help section or show instructions
              const element = document.getElementById('install-instructions');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            How to Install
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

// Instructions component that can be shown in settings or help page
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