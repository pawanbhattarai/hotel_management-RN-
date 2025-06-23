
// Test QR functionality
async function testQRFunctionality() {
  console.log('🧪 Testing QR functionality...');
  
  try {
    // Test 1: Check if tables exist and have QR tokens
    const tablesResponse = await fetch('http://localhost:5000/api/restaurant/tables', {
      headers: {
        'Cookie': 'connect.sid=your-session-id' // You'd need to get this from browser
      }
    });
    
    if (tablesResponse.ok) {
      const tables = await tablesResponse.json();
      console.log('📋 Tables found:', tables.length);
      
      tables.forEach(table => {
        console.log(`Table ${table.name}: QR Token = ${table.qrToken || 'MISSING'}`);
      });
      
      // Test 2: Try to get QR info for first table with token
      const tableWithToken = tables.find(t => t.qrToken);
      if (tableWithToken) {
        console.log(`🔍 Testing QR token: ${tableWithToken.qrToken}`);
        
        const qrInfoResponse = await fetch(`http://localhost:5000/api/order/info/${tableWithToken.qrToken}`);
        console.log('QR Info Response Status:', qrInfoResponse.status);
        
        if (qrInfoResponse.ok) {
          const qrData = await qrInfoResponse.json();
          console.log('✅ QR Info Data:', JSON.stringify(qrData, null, 2));
        } else {
          const error = await qrInfoResponse.text();
          console.log('❌ QR Info Error:', error);
        }
      } else {
        console.log('❌ No tables with QR tokens found');
      }
    } else {
      console.log('❌ Could not fetch tables (authentication required)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testQRFunctionality();
