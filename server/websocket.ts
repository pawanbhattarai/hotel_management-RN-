
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface Client {
  ws: WebSocket;
  userId?: string;
  branchId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<Client> = new Set();

  init(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      perMessageDeflate: false,
      maxPayload: 16 * 1024
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: Client = { ws };
      this.clients.add(client);

      // Set up ping/pong to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'auth') {
            client.userId = data.userId;
            client.branchId = data.branchId;
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
          // Don't close connection for parse errors
        }
      });

      ws.on('pong', () => {
        // Connection is alive
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} - ${reason}`);
        clearInterval(pingInterval);
        this.clients.delete(client);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error (handled):', error.message);
        clearInterval(pingInterval);
        this.clients.delete(client);
        // Gracefully close the connection
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Server error');
          }
        } catch (closeError) {
          // Ignore close errors
        }
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket Server error (handled):', error.message);
    });
  }

  broadcast(event: string, data: any, branchId?: string) {
    try {
      const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
      
      this.clients.forEach(client => {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            // If branchId is specified, only send to clients in that branch
            if (!branchId || client.branchId === branchId) {
              client.ws.send(message);
            }
          } else {
            // Remove dead connections
            this.clients.delete(client);
          }
        } catch (error) {
          console.error('Error sending message to client:', error.message);
          this.clients.delete(client);
        }
      });
    } catch (error) {
      console.error('Error in broadcast:', error.message);
    }
  }

  broadcastDataUpdate(type: string, branchId?: string) {
    this.broadcast('data_update', { type }, branchId);
  }
}

export const wsManager = new WebSocketManager();
