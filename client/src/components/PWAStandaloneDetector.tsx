import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, AlertTriangle, CheckCircle } from 'lucide-react';

export function PWAStandaloneDetector() {
  const [pwaInfo, setPwaInfo] = useState<{
    isStandalone: boolean;
    isIOS: boolean;
    isiOSSafari: boolean;
    displayMode: string;
    userAgent: string;
    platform: string;
    installable: boolean;
  } | null>(null);

  useEffect(() => {
    // Enhanced iOS detection including all iOS versions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Check if running in standalone mode
    const isStandalone = (window.navigator as any).standalone === true || 
                        window.matchMedia('(display-mode: standalone)').matches ||
                        window.matchMedia('(display-mode: fullscreen)').matches;
    
    // Check if iOS Safari
    const isiOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
    
    // Get display mode
    let displayMode = 'browser';
    if (window.matchMedia('(display-mode: standalone)').matches) {
      displayMode = 'standalone';
    } else if (window.matchMedia('(display-mode: fullscreen)').matches) {
      displayMode = 'fullscreen';
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      displayMode = 'minimal-ui';
    }
    
    // Check if PWA is installable
    const installable = isIOS ? isiOSSafari && !isStandalone : true;
    
    setPwaInfo({
      isStandalone,
      isIOS,
      isiOSSafari,
      displayMode,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      installable
    });
  }, []);

  if (!pwaInfo) return null;

  // Only show on iOS devices for debugging
  if (!pwaInfo.isIOS) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className={`${
        pwaInfo.isStandalone 
          ? 'border-green-200 bg-green-50' 
          : 'border-orange-200 bg-orange-50'
      } shadow-lg`}>
        <div className="flex items-start gap-2">
          {pwaInfo.isStandalone ? (
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4" />
              <span className="font-semibold text-sm">iOS PWA Status</span>
            </div>
            <AlertDescription className="text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span>Standalone Mode:</span>
                <Badge variant={pwaInfo.isStandalone ? 'default' : 'secondary'}>
                  {pwaInfo.isStandalone ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Display Mode:</span>
                <Badge variant="outline">{pwaInfo.displayMode}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>iOS Safari:</span>
                <Badge variant={pwaInfo.isiOSSafari ? 'default' : 'secondary'}>
                  {pwaInfo.isiOSSafari ? 'Yes' : 'No'}
                </Badge>
              </div>
              {!pwaInfo.isStandalone && pwaInfo.isiOSSafari && (
                <div className="mt-2 p-2 bg-blue-100 rounded text-xs">
                  <strong>To enable standalone mode:</strong>
                  <br />1. Tap Share button (□↗)
                  <br />2. Select "Add to Home Screen"
                  <br />3. Open from home screen (not Safari)
                </div>
              )}
              {!pwaInfo.isStandalone && !pwaInfo.isiOSSafari && (
                <div className="mt-2 p-2 bg-orange-100 rounded text-xs">
                  <strong>For iOS PWA:</strong> Must use Safari browser
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}