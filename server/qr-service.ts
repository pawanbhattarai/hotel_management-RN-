import QRCode from 'qrcode';
import { storage } from './storage';
import { restaurantStorage } from './restaurant-storage';

export class QRService {
  static getBaseUrl(): string {
    // In production, this would be your actual domain
    return process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
  }

  static async generateTableQR(tableId: number): Promise<string> {
    const table = await restaurantStorage.getRestaurantTable(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const qrUrl = `${this.getBaseUrl()}/order/${table.qrToken}`;
    const qrCode = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCode;
  }

  static async generateRoomQR(roomId: number): Promise<string> {
    const room = await storage.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const qrUrl = `${this.getBaseUrl()}/order/${room.qrToken}`;
    const qrCode = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCode;
  }

  static async validateQRToken(token: string): Promise<{ type: 'table' | 'room', id: number, branchId: number, name: string } | null> {
    try {
      // Check if it's a table
      const tables = await restaurantStorage.getRestaurantTables();
      const table = tables.find(t => t.qrToken === token);
      if (table) {
        return {
          type: 'table',
          id: table.id,
          branchId: table.branchId,
          name: table.name
        };
      }

      // Check if it's a room
      const rooms = await storage.getRooms();
      const room = rooms.find(r => r.qrToken === token);
      if (room) {
        return {
          type: 'room',
          id: room.id,
          branchId: room.branchId,
          name: `Room ${room.number}`
        };
      }

      return null;
    } catch (error) {
      console.error('Error validating QR token:', error);
      return null;
    }
  }

  static async regenerateTableQR(tableId: number): Promise<{ qrToken: string, qrCode: string }> {
    const newToken = crypto.randomUUID();
    await restaurantStorage.updateRestaurantTable(tableId, { qrToken: newToken });
    const qrCode = await this.generateTableQR(tableId);
    return { qrToken: newToken, qrCode };
  }

  static async regenerateRoomQR(roomId: number): Promise<{ qrToken: string, qrCode: string }> {
    const newToken = crypto.randomUUID();
    await storage.updateRoom(roomId, { qrToken: newToken });
    const qrCode = await this.generateRoomQR(roomId);
    return { qrToken: newToken, qrCode };
  }
}