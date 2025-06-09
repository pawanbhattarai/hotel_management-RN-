import { useEffect, useState } from 'react';
import { Bell, BellOff, History, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { NotificationManager } from '@/lib/notifications';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

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


    </div>
  );
}

export function NotificationHistory() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  const isAdmin = (user as any)?.role === 'superadmin' || (user as any)?.role === 'branch-admin';

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications/history'],
    enabled: isAdmin,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAdmin,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const unreadCount = (unreadData as any)?.count || 0;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest('PATCH', `/api/notifications/history/${notificationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest('PATCH', '/api/notifications/history/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  if (!isAdmin) {
    return null;
  }

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new-reservation': return '📋';
      case 'check-in': return '🏨';
      case 'check-out': return '🚪';
      case 'maintenance': return '🔧';
      default: return '📢';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Notifications
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        {(notifications as any[]).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="h-8 px-2"
          >
            <CheckCheck className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : !(notifications as any[]).length ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {(notifications as any[]).map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.isRead 
                      ? 'bg-background border-border' 
                      : 'bg-muted border-primary/20'
                  }`}
                  onClick={() => !notification.isRead && markAsReadMutation.mutate(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatNotificationTime(notification.sentAt)}
                        </span>
                        {!notification.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
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