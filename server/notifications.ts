import webpush from 'web-push';
import { storage } from './storage';
import type { Branch, Room, Guest, User, InsertNotificationHistory } from '@shared/schema';

// Generate VAPID keys if not provided
let VAPID_PUBLIC_KEY: string;
let VAPID_PRIVATE_KEY: string;

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log('🔑 Generating new VAPID keys...');
  const vapidKeys = webpush.generateVAPIDKeys();
  VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  console.log('📋 New VAPID Public Key:', VAPID_PUBLIC_KEY);
  console.log('🔐 New VAPID Private Key:', VAPID_PRIVATE_KEY);
  console.log('💡 Consider setting these as environment variables for production');
  console.log('⚠️ All existing push subscriptions will be cleared due to key change');
  
  // Clear all existing subscriptions since VAPID keys changed
  setTimeout(async () => {
    try {
      const { storage } = await import('./storage');
      await storage.clearAllPushSubscriptions();
      console.log('🗑️ Cleared all existing push subscriptions due to VAPID key change');
    } catch (error) {
      console.warn('⚠️ Could not clear existing subscriptions:', error);
    }
  }, 100);
} else {
  VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
  VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
  console.log('✅ Using existing VAPID keys from environment variables');
}

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@hotel.com';

// Configure web-push
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export class NotificationService {
  static async sendToAllAdmins(notification: NotificationData, notificationType?: string, additionalData?: any) {
    try {
      const subscriptions = await storage.getAllAdminSubscriptions();
      
      // Save notification to history for each admin user
      const savePromises = subscriptions.map(async (sub) => {
        try {
          const historyData: InsertNotificationHistory = {
            userId: sub.userId,
            type: notificationType as any || 'new-reservation',
            title: notification.title,
            body: notification.body,
            data: notification.data,
            ...additionalData
          };
          await storage.createNotificationHistory(historyData);
        } catch (error) {
          console.error(`Failed to save notification history for user ${sub.userId}:`, error);
        }
      });
      
      await Promise.allSettled(savePromises);
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/favicon.ico',
        badge: notification.badge || '/favicon.ico',
        tag: notification.tag || 'hotel-notification',
        data: notification.data || {},
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Details'
          }
        ]
      });

      console.log(`Attempting to send notifications to ${subscriptions.length} subscribers`);

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          const pushConfig = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          };

          const result = await webpush.sendNotification(pushConfig, payload);
          console.log(`Notification sent to user ${sub.userId}`);
          return { success: true, userId: sub.userId };
        } catch (error: any) {
          console.error(`Failed to send notification to user ${sub.userId}:`, error.message);
          
          // If subscription is invalid or VAPID mismatch, remove it
          if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
            console.log(`Removing invalid subscription for user ${sub.userId}`);
            await storage.deletePushSubscription(sub.userId, sub.endpoint);
          }
          
          return { success: false, userId: sub.userId, error: error.message };
        }
      });

      const results = await Promise.allSettled(sendPromises);
      console.log(`Notification results: ${results.filter(r => r.status === 'fulfilled').length}/${results.length} sent successfully`);
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }
  }

  static async sendNewReservationNotification(
    guest: Guest,
    room: Room & { roomType: { name: string } },
    branch: Branch,
    reservationId: string,
    checkIn: string,
    checkOut: string
  ) {
    const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const notification: NotificationData = {
      title: '🆕 New Reservation Created',
      body: `${guest.firstName} ${guest.lastName} has booked Room ${room.number} (${room.roomType.name}) at ${branch.name} from ${checkInDate} to ${checkOutDate}`,
      tag: 'new-reservation',
      data: {
        type: 'new_reservation',
        reservationId,
        branchId: branch.id,
        roomId: room.id,
        guestId: guest.id,
      }
    };

    await this.sendToAllAdmins(notification, 'new-reservation', {
      reservationId,
      roomId: room.id,
      branchId: branch.id
    });
  }

  static async sendCheckInNotification(
    guest: Guest,
    room: Room & { roomType: { name: string } },
    branch: Branch,
    reservationId: string
  ) {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const notification: NotificationData = {
      title: '🏨 Guest Check-In',
      body: `Room ${room.number} has been checked in at ${branch.name} on ${currentDate} (${guest.firstName} ${guest.lastName})`,
      tag: 'check-in',
      data: {
        type: 'check_in',
        reservationId,
        branchId: branch.id,
        roomId: room.id,
        guestId: guest.id,
      }
    };

    await this.sendToAllAdmins(notification);
  }

  static async sendCheckOutNotification(
    guest: Guest,
    room: Room & { roomType: { name: string } },
    branch: Branch,
    reservationId: string
  ) {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const notification: NotificationData = {
      title: '🚪 Guest Check-Out',
      body: `Room ${room.number} has been checked out at ${branch.name} on ${currentDate} (${guest.firstName} ${guest.lastName})`,
      tag: 'check-out',
      data: {
        type: 'check_out',
        reservationId,
        branchId: branch.id,
        roomId: room.id,
        guestId: guest.id,
      }
    };

    await this.sendToAllAdmins(notification);
  }

  static async sendMaintenanceNotification(
    room: Room & { roomType: { name: string } },
    branch: Branch,
    maintenanceType: string = 'maintenance'
  ) {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const statusText = maintenanceType === 'out-of-order' ? 'out of order' : 'under maintenance';

    const notification: NotificationData = {
      title: '🔧 Room Maintenance Alert',
      body: `Room ${room.number} is ${statusText} at ${branch.name} on ${currentDate}`,
      tag: 'maintenance',
      data: {
        type: 'room_maintenance',
        branchId: branch.id,
        roomId: room.id,
        maintenanceType,
      }
    };

    await this.sendToAllAdmins(notification);
  }

  static getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }
}