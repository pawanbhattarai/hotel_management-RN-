
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, TestTube, CheckCircle, XCircle } from 'lucide-react';
import NotificationManagerService from '@/lib/notifications';

export function NotificationDebugger() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    const info: any = {
      browserSupport: {},
      serviceWorker: {},
      permission: {},
      subscription: {}
    };

    try {
      // Check browser support
      info.browserSupport = {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notifications: 'Notification' in window
      };

      // Check service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          info.serviceWorker = {
            registered: !!registration,
            active: !!registration?.active,
            scope: registration?.scope || 'none'
          };
        } catch (error) {
          info.serviceWorker = { error: error.message };
        }
      }

      // Check permission
      info.permission = {
        current: Notification.permission,
        canRequest: Notification.permission === 'default'
      };

      // Check subscription
      try {
        const isSubscribed = await NotificationManagerService.isSubscribed();
        info.subscription = {
          subscribed: isSubscribed
        };
      } catch (error) {
        info.subscription = { error: error.message };
      }

      setDebugInfo(info);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const sendTestNotification = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Test Notification Sent",
          description: "Check your browser for the test notification",
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const StatusBadge = ({ condition, label }: { condition: boolean | undefined, label: string }) => (
    <Badge variant={condition ? "default" : "destructive"} className="flex items-center gap-1">
      {condition ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification System Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={testing} variant="outline">
            {testing ? "Running..." : "Run Diagnostics"}
          </Button>
          <Button onClick={sendTestNotification} disabled={testing}>
            <TestTube className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Browser Support</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge condition={debugInfo.browserSupport?.serviceWorker} label="Service Worker" />
                <StatusBadge condition={debugInfo.browserSupport?.pushManager} label="Push Manager" />
                <StatusBadge condition={debugInfo.browserSupport?.notifications} label="Notifications" />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Service Worker</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge condition={debugInfo.serviceWorker?.registered} label="Registered" />
                <StatusBadge condition={debugInfo.serviceWorker?.active} label="Active" />
              </div>
              {debugInfo.serviceWorker?.scope && (
                <p className="text-sm text-muted-foreground mt-1">
                  Scope: {debugInfo.serviceWorker.scope}
                </p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Permission & Subscription</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant={debugInfo.permission?.current === 'granted' ? "default" : "destructive"}>
                  Permission: {debugInfo.permission?.current}
                </Badge>
                <StatusBadge condition={debugInfo.subscription?.subscribed} label="Subscribed" />
              </div>
            </div>

            {(debugInfo.serviceWorker?.error || debugInfo.subscription?.error) && (
              <div>
                <h4 className="font-medium mb-2 text-destructive">Errors</h4>
                {debugInfo.serviceWorker?.error && (
                  <p className="text-sm text-destructive">SW: {debugInfo.serviceWorker.error}</p>
                )}
                {debugInfo.subscription?.error && (
                  <p className="text-sm text-destructive">Sub: {debugInfo.subscription.error}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
