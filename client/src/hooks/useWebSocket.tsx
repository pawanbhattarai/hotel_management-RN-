
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
      
      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      }, 10000);

      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected');
        
        // Send authentication info with error handling
        try {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'auth',
              userId: user.id,
              branchId: user.branchId
            }));
          }
        } catch (error) {
          // Silently handle auth send errors
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
          // Silently handle message parse errors
        }
      };

      wsRef.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        // Only attempt reconnect for unexpected closures
        if (event.code !== 1000 && event.code !== 1001 && user) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user) {
              connect();
            }
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        clearTimeout(connectionTimeout);
        // Silently handle WebSocket errors to prevent console spam
      };
    } catch (error) {
      // Retry connection after delay for setup errors
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
