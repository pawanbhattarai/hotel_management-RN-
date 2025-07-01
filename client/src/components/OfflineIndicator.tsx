import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show offline message if starting offline
    if (!navigator.onLine) {
      setShowOfflineMessage(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowOfflineMessage(false);
  };

  // Connection status indicator in header
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-green-600 hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-600" />
          <span className="text-red-600 hidden sm:inline">Offline</span>
        </>
      )}
      {isStandalone && (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full hidden sm:inline">
          PWA
        </span>
      )}
    </div>
  );

  // Offline banner
  const OfflineBanner = () => {
    if (!showOfflineMessage || isOnline) return null;

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5" />
            <div className="text-sm">
              <p className="font-medium">You're currently offline</p>
              <p className="text-red-100 text-xs">
                Some features may be limited. Cached data will be used when available.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-white text-white hover:bg-white hover:text-red-600 text-xs px-3 py-1"
              onClick={handleRetry}
            >
              Retry
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-red-500 rounded"
              aria-label="Dismiss offline message"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Offline page fallback
  const OfflinePage = () => {
    if (isOnline) return null;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              You're Offline
            </h2>
            <p className="text-gray-600 mb-6">
              Check your internet connection and try again. Some cached data may still be available.
            </p>
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="w-full"
              >
                Go Back
              </Button>
            </div>
            
            {isStandalone && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">PWA Mode Active</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  Your app is installed and running in standalone mode. 
                  Cached data will help you continue working offline.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return {
    ConnectionStatus,
    OfflineBanner,
    OfflinePage,
    isOnline,
    isStandalone
  };
}

// Hook for using offline status in components
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isStandalone };
}