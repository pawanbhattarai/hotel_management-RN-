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
        status: Notification.permission,
        granted: Notification.permission === 'granted'
      };

      // Check user authentication
      info.authentication = {
        loggedIn: !!user,
        email: user?.email || 'Not logged in',
        role: user?.role || 'No role',
        isAdmin: user?.role === 'superadmin' || user?.role === 'branch-admin'
      };

      // Check subscription
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            info.subscription = {
              exists: !!subscription,
              endpoint: subscription?.endpoint.substring(0, 50) + '...' || 'none'
            };
          }
        } catch (error) {
          info.subscription = { error: error.message };
        }
      }

      // Check server subscription count
      try {
        const response = await fetch('/api/notifications/debug/subscriptions');
        if (response.ok) {
          const data = await response.json();
          info.serverSubscriptions = {
            total: data.total || 0,
            adminSubscriptions: data.adminSubscriptions || 0
          };
        } else {
          info.serverSubscriptions = { error: `HTTP ${response.status}` };
        }
      } catch (error) {
        info.serverSubscriptions = { error: error.message };
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

  const subscribeToNotifications = async () => {
    setTesting(true);
    try {
      const initialized = await NotificationManagerService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize notification service');
      }

      const subscribed = await NotificationManagerService.subscribe();
      if (subscribed) {
        toast({
          title: "Subscribed Successfully",
          description: "You will now receive push notifications",
        });
        // Refresh diagnostics
        await runDiagnostics();
      } else {
        throw new Error('Failed to subscribe to notifications');
      }
    } catch (error) {
      console.error('Subscription failed:', error);
      toast({
        title: "Subscription Failed",
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runDiagnostics} disabled={testing} size="sm">
            Run Diagnostics
          </Button>
          <Button onClick={subscribeToNotifications} disabled={testing} size="sm" variant="outline">
            Subscribe to Notifications
          </Button>
          <Button onClick={sendTestNotification} disabled={testing} size="sm" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Send Test Notification
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-2">Browser Support</h4>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge condition={debugInfo.browserSupport.serviceWorker} label="Service Worker" />
                <StatusBadge condition={debugInfo.browserSupport.pushManager} label="Push Manager" />
                <StatusBadge condition={debugInfo.browserSupport.notifications} label="Notifications" />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Service Worker</h4>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge condition={debugInfo.serviceWorker.registered} label="Registered" />
                <StatusBadge condition={debugInfo.serviceWorker.active} label="Active" />
              </div>
              {debugInfo.serviceWorker.scope && (
                <p className="text-sm text-muted-foreground mt-1">
                  Scope: {debugInfo.serviceWorker.scope}
                </p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Permission</h4>
              <Badge variant={debugInfo.permission.current === 'granted' ? 'default' : 'destructive'}>
                {debugInfo.permission.current}
              </Badge>
            </div>

            <div>
              <h4 className="font-medium mb-2">Subscription Status</h4>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge condition={debugInfo.subscription.exists} label="Browser Subscribed" />
                {debugInfo.subscription.endpoint && (
                  <Badge variant="outline">
                    {debugInfo.subscription.endpoint}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Server Subscriptions</h4>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  Total: {debugInfo.serverSubscriptions.total || 0}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  Admin: {debugInfo.serverSubscriptions.adminSubscriptions || 0}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}