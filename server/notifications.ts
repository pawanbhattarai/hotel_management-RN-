import webpush from 'web-push';
import { storage } from './storage';
import type { Branch, Room, Guest } from '@shared/schema';

// VAPID keys for web push (you'll need to generate these)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLWa7zH5FrZTVVhqyPHcMLUNzVq6P2FBhWAKgUhVhJGBUDbWOD7B2MM';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'ZJROCPGKjFWqhbGNJmwFJZgRjdAhQtOxZWWhPXz3w6s';
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
  static async sendToAllAdmins(notification: NotificationData) {
    try {
      const subscriptions = await storage.getAllAdminSubscriptions();
      
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

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          const pushConfig = {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          };

          await webpush.sendNotification(pushConfig, payload, {
            vapidDetails: {
              subject: VAPID_SUBJECT,
              publicKey: VAPID_PUBLIC_KEY,
              privateKey: VAPID_PRIVATE_KEY,
            },
            TTL: 86400, // 24 hours
          });
          
          console.log(`✅ Notification sent to user ${sub.userId}`);
        } catch (error: any) {
          console.error(`❌ Failed to send notification to user ${sub.userId}:`, error.message);
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await storage.deletePushSubscription(sub.userId, sub.endpoint);
            console.log(`🗑️ Removed invalid subscription for user ${sub.userId}`);
          }
        }
      });

      await Promise.allSettled(sendPromises);
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
    const notification: NotificationData = {
      title: '🆕 New Reservation',
      body: `${guest.firstName} ${guest.lastName} booked ${room.roomType.name} (Room ${room.number}) at ${branch.name} from ${new Date(checkIn).toLocaleDateString()} to ${new Date(checkOut).toLocaleDateString()}`,
      tag: 'new-reservation',
      data: {
        type: 'new_reservation',
        reservationId,
        branchId: branch.id,
        roomId: room.id,
        guestId: guest.id,
      }
    };

    await this.sendToAllAdmins(notification);
  }

  static async sendCheckInNotification(
    guest: Guest,
    room: Room & { roomType: { name: string } },
    branch: Branch,
    reservationId: string
  ) {
    const notification: NotificationData = {
      title: '🏨 Guest Checked In',
      body: `${guest.firstName} ${guest.lastName} has checked in to ${room.roomType.name} (Room ${room.number}) at ${branch.name} on ${new Date().toLocaleDateString()}`,
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
    const notification: NotificationData = {
      title: '🚪 Guest Checked Out',
      body: `${guest.firstName} ${guest.lastName} has checked out from ${room.roomType.name} (Room ${room.number}) at ${branch.name} on ${new Date().toLocaleDateString()}`,
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
    const notification: NotificationData = {
      title: '🔧 Room Maintenance',
      body: `${room.roomType.name} (Room ${room.number}) is under ${maintenanceType} at ${branch.name} on ${new Date().toLocaleDateString()}`,
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