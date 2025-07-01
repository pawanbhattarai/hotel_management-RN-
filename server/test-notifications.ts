
import { NotificationService } from './notifications';

export async function testNotifications() {
  console.log('🧪 Testing notification system...');
  
  try {
    const { storage } = await import('./storage');
    
    // Check subscription counts first
    const allSubscriptions = await storage.getAllPushSubscriptions();
    const adminSubscriptions = await storage.getAllAdminSubscriptions();
    
    console.log(`📊 Subscription counts: ${allSubscriptions.length} total, ${adminSubscriptions.length} admin`);
    
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
    
    return { 
      success: true, 
      message: `Test notification sent successfully to ${adminSubscriptions.length} admin subscribers`,
      subscriptionCounts: {
        total: allSubscriptions.length,
        admins: adminSubscriptions.length
      }
    };
  } catch (error: any) {
    console.error('❌ Test notification failed:', error);
    return { 
      success: false, 
      error: error?.message || 'Unknown error occurred',
      details: error?.stack || 'No stack trace available'
    };
  }
}
