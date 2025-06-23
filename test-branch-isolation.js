// Test script to verify branch data isolation
const testBranchIsolation = async () => {
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing branch data isolation...');
  
  try {
    // Test 1: Login as different users from different branches
    console.log('\n1. Testing user login and branch assignment...');
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pawankbhattarai67@gmail.com',
        password: 'password'
      }),
      credentials: 'include'
    });
    
    if (loginResponse.ok) {
      const user = await loginResponse.json();
      console.log(`✓ User logged in: ${user.email} - Role: ${user.role} - Branch: ${user.branchId}`);
      
      // Test 2: Fetch data and verify branch filtering
      console.log('\n2. Testing data access with branch filtering...');
      
      const endpoints = [
        '/api/guests',
        '/api/rooms', 
        '/api/reservations',
        '/api/restaurant/tables',
        '/api/restaurant/categories',
        '/api/inventory/stock-items',
        '/api/inventory/suppliers'
      ];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✓ ${endpoint}: Retrieved ${data.length} items`);
          
          // Check if all items belong to user's branch (for non-superadmin)
          if (user.role !== 'superadmin' && user.branchId && data.length > 0) {
            const wrongBranchItems = data.filter(item => 
              item.branchId && item.branchId !== user.branchId
            );
            
            if (wrongBranchItems.length > 0) {
              console.log(`✗ ISOLATION BREACH: Found ${wrongBranchItems.length} items from other branches`);
            } else {
              console.log(`✓ Branch isolation verified for ${endpoint}`);
            }
          }
        } else {
          console.log(`✗ ${endpoint}: ${response.status} ${response.statusText}`);
        }
      }
      
      console.log('\n3. Branch isolation test completed');
      
    } else {
      console.log('✗ Login failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

// Run the test
testBranchIsolation();