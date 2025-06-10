
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
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: Client = { ws };
      this.clients.add(client);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'auth') {
            client.userId = data.userId;
            client.branchId = data.branchId;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(client);
      });
    });
  }

  broadcast(event: string, data: any, branchId?: string) {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // If branchId is specified, only send to clients in that branch
        if (!branchId || client.branchId === branchId) {
          client.ws.send(message);
        }
      }
    });
  }

  broadcastDataUpdate(type: string, branchId?: string) {
    this.broadcast('data_update', { type }, branchId);
  }
}

export const wsManager = new WebSocketManager();
