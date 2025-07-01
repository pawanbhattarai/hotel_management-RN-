
import { NotificationService } from './notifications';

export async function testNotifications() {
  console.log('🧪 Testing notification system...');
  
  try {
    // Test notification data
    const testNotification = {
      title: '🧪 Test Notification',
      body: 'This is a test notification to verify the system is working correctly.',
      icon: '/favicon.ico',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Sending test notification to all admins...');
    await NotificationService.sendToAllAdmins(testNotification, 'test');
    console.log('✅ Test notification sent successfully');
    
    return { success: true, message: 'Test notification sent successfully' };
  } catch (error: any) {
    console.error('❌ Test notification failed:', error);
    return { 
      success: false, 
      error: error?.message || 'Unknown error occurred',
      details: error?.stack || 'No stack trace available'
    };
  }
}
