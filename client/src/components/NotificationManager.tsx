import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationManager as NotificationManagerService } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function NotificationManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSubscribeAttempted, setAutoSubscribeAttempted] = useState(false);

  // Only show for admin users
  const isAdmin = user?.role === 'superadmin' || user?.role === 'branch-admin';

  useEffect(() => {
    if (!isAdmin) return;

    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, [isAdmin]);

  // Auto-subscribe admin users on first load
  useEffect(() => {
    if (!isAdmin || !isSupported || autoSubscribeAttempted) return;

    const attemptAutoSubscribe = async () => {
      setAutoSubscribeAttempted(true);

      try {
        // Initialize the notification manager first
        const initialized = await NotificationManagerService.initialize();
        if (!initialized) {
          console.warn('❌ Failed to initialize notification manager');
          return;
        }

        const isAlreadySubscribed = await NotificationManagerService.isSubscribed();

        if (!isAlreadySubscribed) {
          console.log('🔔 Auto-subscribing admin user to notifications...');

          // Check if permission is already granted
          if (Notification.permission === 'granted') {
            console.log('✅ Notification permission already granted, subscribing...');
            await subscribe(false); // false = don't show toast for auto-subscribe
          } else if (Notification.permission === 'default') {
            console.log('📋 Requesting notification permission...');
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              console.log('✅ Permission granted, subscribing...');
              await subscribe(false); // false = don't show toast for auto-subscribe
            } else {
              console.log('❌ Notification permission denied');
              toast({
                title: "Notifications Disabled",
                description: "Enable notifications in your browser to receive real-time hotel updates.",
                variant: "destructive",
              });
            }
          }
        } else {
          console.log('✅ User already subscribed to notifications');
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error('❌ Auto-subscribe failed:', error);
      }
    };

    // Delay auto-subscribe to ensure everything is loaded
    const timer = setTimeout(attemptAutoSubscribe, 2000);
    return () => clearTimeout(timer);
  }, [isAdmin, isSupported, autoSubscribeAttempted]);

  const checkSubscriptionStatus = async () => {
    try {
      const isSubscribed = await NotificationManagerService.isSubscribed();
      setIsSubscribed(isSubscribed);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribe = async (showToast = true) => {
    if (!isSupported || !user) return;

    setLoading(true);
    try {
      const hasPermission = permission === 'granted' || await requestPermission();

      if (!hasPermission) {
        if (showToast) {
          toast({
            title: "Permission Required",
            description: "Please allow notifications to receive real-time updates.",
            variant: "destructive",
          });
        }
        return;
      }

      const success = await NotificationManagerService.subscribe();

      if (success) {
        setIsSubscribed(true);
        console.log(`✅ User ${user.email} successfully subscribed to notifications`);
        if (showToast) {
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive real-time hotel notifications.",
          });
        }
      } else {
        console.error('❌ Notification subscription failed');
        if (showToast) {
          toast({
            title: "Subscription Failed",
            description: "Could not enable notifications. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to enable notifications.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return;

    setLoading(true);
    try {
      const success = await NotificationManagerService.unsubscribe();

      if (success) {
        setIsSubscribed(false);
        console.log(`✅ User ${user?.email} unsubscribed from notifications`);
        toast({
          title: "Notifications Disabled",
          description: "You'll no longer receive push notifications.",
        });
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast({
        title: "Error",
        description: "Failed to disable notifications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!isSubscribed) {
      toast({
        title: "Not Subscribed",
        description: "Please enable notifications first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 Sending test notification...');
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Test notification sent to ${data.subscriberCount} subscribers`);
        toast({
          title: "Test Notification Sent",
          description: `Sent to ${data.subscriberCount} subscribers`,
        });
      } else {
        const error = await response.json();
        console.error('❌ Test notification failed:', error);
        toast({
          title: "Test Failed",
          description: error.message || "Could not send test notification.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin || !isSupported) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        {isSubscribed ? (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Bell className="h-3 w-3" />
            <span>Notifications On</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="flex items-center space-x-1">
            <BellOff className="h-3 w-3" />
            <span>Notifications Off</span>
          </Badge>
        )}
      </div>

      <div className="flex space-x-1">
        {!isSubscribed ? (
          <Button
            onClick={() => subscribe(true)}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            Enable Notifications
          </Button>
        ) : (
          <>
            <Button
              onClick={sendTestNotification}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              Test
            </Button>
            <Button
              onClick={unsubscribe}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              Disable
            </Button>
          </>
        )}
      </div>
    </div>
  );
}