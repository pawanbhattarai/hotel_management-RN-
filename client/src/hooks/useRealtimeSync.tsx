import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeSync(user: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    // Set up real-time sync with periodic updates
    const syncData = () => {
      // Invalidate all data queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/super-admin-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/revenue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/guests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/operations'] });
    };

    // Initial sync
    syncData();

    // Set up periodic sync every 30 seconds for real-time updates
    intervalRef.current = setInterval(syncData, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, queryClient]);

  // Manual sync function for immediate updates
  const syncNow = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Invalidate all queries immediately
    queryClient.invalidateQueries();

    // Show success notification
    toast({
      title: "Data Synchronized",
      description: "All data has been updated with the latest information.",
    });

    // Start periodic sync for critical data
    // Use more frequent polling in development since WebSocket is disabled
    const pollInterval = import.meta.env.DEV ? 5000 : 30000; // 5s in dev, 30s in prod

    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/super-admin-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/revenue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/occupancy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/guests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/operations'] });
    }, pollInterval);
  };

  return { syncNow };
}