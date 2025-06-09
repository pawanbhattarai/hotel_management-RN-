import { useEffect, useState } from 'react';
import { Bell, BellOff, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { NotificationManager } from '@/lib/notifications';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function NotificationToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();

  // Check if user is admin (only show for admin users)
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  const isAdmin = (user as any)?.role === 'superadmin' || (user as any)?.role === 'branch-admin';

  useEffect(() => {
    const initializeNotifications = async () => {
      console.log('🔄 Initializing notifications for admin user...');
      const supported = await NotificationManager.initialize();
      console.log('🔧 Notification support:', supported);
      setIsSupported(supported);

      if (supported) {
        const subscribed = await NotificationManager.isSubscribed();
        console.log('📊 Current subscription status:', subscribed);
        setIsSubscribed(subscribed);
      }
    };

    if (isAdmin) {
      console.log('👑 User is admin, initializing notifications...');
      initializeNotifications();
    } else {
      console.log('👤 User is not admin, skipping notification initialization');
    }
  }, [isAdmin]);

  const handleToggleNotifications = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🔔 Notification toggle clicked!', { isSupported, isSubscribed, isLoading });

    if (!isSupported) {
      console.warn('❌ Browser not supported');
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    if (isLoading) {
      console.log('⏳ Already loading, skipping...');
      return;
    }

    setIsLoading(true);
    console.log('🚀 Starting notification toggle process...');

    try {
      if (isSubscribed) {
        console.log('🔕 Attempting to unsubscribe...');
        const success = await NotificationManager.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          console.log('✅ Successfully unsubscribed');
          toast({
            title: 'Notifications Disabled',
            description: 'You will no longer receive push notifications.',
          });
        } else {
          throw new Error('Failed to unsubscribe');
        }
      } else {
        console.log("🔔 Attempting to subscribe...");

        // Check notification permission first
        const permission = await NotificationManager.requestPermission();
        console.log("🔐 Notification permission:", permission);

        if (permission !== 'granted') {
          throw new Error(`Notification permission ${permission}. Please enable notifications in your browser settings.`);
        }

        const success = await NotificationManager.subscribe();
        if (success) {
          console.log("✅ Successfully subscribed to notifications");
          setIsSubscribed(true);
          toast({
            title: "Notifications Enabled",
            description: "You will now receive push notifications for hotel events.",
          });

          // Send a test notification to verify it works
          console.log("🧪 Sending test notification...");
          try {
            const response = await fetch('/api/notifications/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
              console.log("✅ Test notification sent");
            } else {
              console.warn("⚠️ Failed to send test notification");
            }
          } catch (testError) {
            console.warn("⚠️ Error sending test notification:", testError);
          }
        } else {
          throw new Error("Failed to subscribe");
        }
      }
    } catch (error) {
      console.error('❌ Notification toggle error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 Notification toggle process finished');
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/notifications/test", {});
      console.log("✅ Test notification sent");
    } catch (error) {
      console.error("❌ Failed to send test notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoNotification = async (type: string) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/notifications/test", { type });
      console.log(`✅ ${type} demo notification sent`);
    } catch (error) {
      console.error(`❌ Failed to send ${type} demo notification:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show for admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggleNotifications}
        disabled={isLoading || !isSupported}
        className={`
          flex items-center gap-2 w-full justify-start text-sm font-medium 
          min-h-[36px] px-3 py-2 rounded-md border transition-colors duration-200
          ${isSubscribed 
            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
            : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
          }
          ${(isLoading || !isSupported) 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
          }
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        `}
        style={{ pointerEvents: 'auto' }}
      >
        {isSubscribed ? (
          <Bell className="h-4 w-4 flex-shrink-0" />
        ) : (
          <BellOff className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="truncate">
          {isLoading ? 'Loading...' : isSubscribed ? 'Notifications On' : 'Enable Notifications'}
        </span>
      </button>

      {isSubscribed && (
          <div className="ml-2 flex gap-1">
            <button
              onClick={handleTestNotification}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
            >
              {isLoading ? "Sending..." : "Test"}
            </button>
            <details className="relative">
              <summary className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded cursor-pointer transition-colors">
                Demo
              </summary>
              <div className="absolute top-8 left-0 bg-white border border-gray-300 rounded shadow-lg p-2 z-50 min-w-[150px]">
                <button
                  onClick={() => handleDemoNotification('new_reservation')}
                  disabled={isLoading}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                >
                  📋 New Reservation
                </button>
                <button
                  onClick={() => handleDemoNotification('check_in')}
                  disabled={isLoading}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                >
                  🏨 Check-In
                </button>
                <button
                  onClick={() => handleDemoNotification('check_out')}
                  disabled={isLoading}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                >
                  🚪 Check-Out
                </button>
                <button
                  onClick={() => handleDemoNotification('maintenance')}
                  disabled={isLoading}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                >
                  🔧 Maintenance
                </button>
              </div>
            </details>
          </div>
        )}
      {user?.role === "superadmin" && (
        <div className="mt-2 space-x-2">
          <button
            onClick={handleTestNotification}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Send Test Notification
          </button>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/notifications/debug/clear', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                });

                if (response.ok) {
                  setIsSubscribed(false);
                  toast({
                    title: "Debug",
                    description: "All push subscriptions cleared",
                  });
                }
              } catch (error) {
                console.error("Failed to clear subscriptions:", error);
              }
            }}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear All Subscriptions
          </button>
        </div>
      )}
    </div>
  );
}

export function NotificationStatus() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground">
        Push notifications not supported
      </div>
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      Notifications: {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not requested'}
    </div>
  );
}