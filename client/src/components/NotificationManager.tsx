import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { NotificationManager } from '@/lib/notifications';
import { useQuery } from '@tanstack/react-query';

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
      const supported = await NotificationManager.initialize();
      setIsSupported(supported);
      
      if (supported) {
        const subscribed = await NotificationManager.isSubscribed();
        setIsSubscribed(subscribed);
      }
    };

    if (isAdmin) {
      initializeNotifications();
    }
  }, [isAdmin]);

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        const success = await NotificationManager.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          toast({
            title: 'Notifications Disabled',
            description: 'You will no longer receive push notifications.',
          });
        } else {
          throw new Error('Failed to unsubscribe');
        }
      } else {
        const success = await NotificationManager.subscribe();
        if (success) {
          setIsSubscribed(true);
          toast({
            title: 'Notifications Enabled',
            description: 'You will now receive push notifications for hotel events.',
          });
        } else {
          throw new Error('Failed to subscribe');
        }
      }
    } catch (error) {
      console.error('Notification toggle error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show for admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <Button
      variant={isSubscribed ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggleNotifications}
      disabled={isLoading || !isSupported}
      className="flex items-center gap-2"
    >
      {isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isLoading ? 'Loading...' : isSubscribed ? 'Notifications On' : 'Enable Notifications'}
    </Button>
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