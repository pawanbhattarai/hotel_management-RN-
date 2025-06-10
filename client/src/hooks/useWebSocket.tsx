
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket(user: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!user) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        // Send authentication info
        try {
          wsRef.current?.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            branchId: user.branchId
          }));
        } catch (error) {
          console.error('Error sending auth message:', error);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.event === 'data_update') {
            // Invalidate specific queries based on update type
            switch (message.data.type) {
              case 'reservations':
                queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/super-admin-metrics'] });
                break;
              case 'rooms':
                queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
                queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/rooms'] });
                break;
              case 'guests':
                queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/guests'] });
                break;
              case 'analytics':
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/revenue'] });
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/occupancy'] });
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/guests'] });
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/rooms'] });
                queryClient.invalidateQueries({ queryKey: ['/api/analytics/operations'] });
                break;
              default:
                // Invalidate all queries for unknown updates
                queryClient.invalidateQueries();
            }
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
        // Only reconnect if it wasn't a manual close
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user) { // Check if user is still available
              connect();
            }
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket client error:', error);
      };
    } catch (error) {
      console.error('WebSocket connection setup error:', error);
      // Retry connection after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        if (user) {
          connect();
        }
      }, 5000);
    }
  };

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}
