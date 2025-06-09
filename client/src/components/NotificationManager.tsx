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
        console.log('🔔 Attempting to subscribe...');
        const success = await NotificationManager.subscribe();
        if (success) {
          setIsSubscribed(true);
          console.log('✅ Successfully subscribed');
          toast({
            title: 'Notifications Enabled',
            description: 'You will now receive push notifications for hotel events.',
          });
        } else {
          throw new Error('Failed to subscribe');
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

  const handleTestNotification = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSubscribed) {
      toast({
        title: 'Not Subscribed',
        description: 'Please enable notifications first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/notifications/test', {});
      toast({
        title: 'Test Sent',
        description: 'A test notification has been sent to all admin users.',
      });
    } catch (error) {
      console.error('❌ Test notification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification.',
        variant: 'destructive',
      });
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
        <button
          type="button"
          onClick={handleTestNotification}
          className="flex items-center gap-2 w-full justify-start text-sm font-medium min-h-[36px] px-3 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{ pointerEvents: 'auto' }}
        >
          <TestTube className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Test Notification</span>
        </button>
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