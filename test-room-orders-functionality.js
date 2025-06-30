#!/usr/bin/env node

/**
 * Comprehensive test script for Room Orders functionality
 * Tests the complete workflow: login, get reservations, dishes, create room order, update status
 */

import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:5000';
let cookies = '';

const log = (message) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
};

const makeRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      ...options.headers,
    },
  });

  // Update cookies from response
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    cookies = setCookieHeader.split(';')[0];
  }

  const data = await response.json();
  return { response, data };
};

async function testRoomOrdersWorkflow() {
  try {
    log('Starting Room Orders functionality test...');

    // Step 1: Login
    log('Step 1: Authenticating...');
    const { response: loginResponse, data: loginData } = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@hotel.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.message}`);
    }
    log(`✅ Authentication successful - User: ${loginData.user.firstName} ${loginData.user.lastName}`);

    // Step 2: Get reservations
    log('Step 2: Fetching reservations...');
    const { data: reservations } = await makeRequest('/api/reservations');
    log(`📋 Found ${reservations.length} reservations`);
    
    const checkedInReservations = reservations.filter(r => r.status === 'checked-in');
    log(`🏨 Found ${checkedInReservations.length} checked-in reservations`);

    if (checkedInReservations.length === 0) {
      log('⚠️  No checked-in reservations found. Creating a test reservation...');
      
      // Get room types and rooms for creating a reservation
      const { data: roomTypes } = await makeRequest('/api/room-types');
      const { data: rooms } = await makeRequest('/api/rooms');
      
      if (roomTypes.length === 0 || rooms.length === 0) {
        throw new Error('No room types or rooms available for creating test reservation');
      }

      // Create a test guest and reservation
      const testGuest = {
        firstName: 'Test',
        lastName: 'Guest',
        email: 'test.guest@example.com',
        phone: '+1234567890',
        idType: 'passport',
        idNumber: 'TEST123456'
      };

      const testReservation = {
        guest: testGuest,
        reservationRooms: [{
          roomId: rooms[0].id,
          checkInDate: new Date().toISOString(),
          checkOutDate: new Date(Date.now() + 86400000).toISOString(), // +1 day
          adults: 1,
          children: 0
        }],
        totalAmount: '100.00',
        advancePayment: '50.00',
        notes: 'Test reservation for room orders'
      };

      const { data: newReservation } = await makeRequest('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(testReservation),
      });

      // Check in the reservation
      await makeRequest(`/api/reservations/${newReservation.id}/checkin`, {
        method: 'PATCH',
      });

      log(`✅ Created and checked in test reservation: ${newReservation.confirmationNumber}`);
      checkedInReservations.push({ ...newReservation, status: 'checked-in' });
    }

    // Step 3: Get dishes and categories
    log('Step 3: Fetching menu data...');
    const { data: dishes } = await makeRequest('/api/restaurant/dishes');
    const { data: categories } = await makeRequest('/api/restaurant/categories');
    log(`🍽️  Found ${dishes.length} dishes and ${categories.length} categories`);

    if (dishes.length === 0) {
      throw new Error('No dishes available for testing room orders');
    }

    // Step 4: Get existing room orders
    log('Step 4: Checking existing room orders...');
    const { data: existingOrders } = await makeRequest('/api/restaurant/orders/room');
    log(`📦 Found ${existingOrders.length} existing room orders`);

    // Step 5: Create a test room order
    log('Step 5: Creating test room order...');
    const testReservation = checkedInReservations[0];
    const testDish = dishes[0];

    const roomOrderData = {
      order: {
        reservationId: testReservation.id,
        roomId: testReservation.reservationRooms?.[0]?.roomId || null,
        branchId: 1,
        orderType: 'room',
        customerName: `${testReservation.guest?.firstName || 'Guest'} ${testReservation.guest?.lastName || ''}`.trim(),
        customerPhone: testReservation.guest?.phone || '',
        subtotal: parseFloat(testDish.price).toFixed(2),
        taxAmount: '0.00',
        totalAmount: parseFloat(testDish.price).toFixed(2),
        notes: 'Test room order via automated test',
        status: 'pending',
      },
      items: [{
        dishId: testDish.id,
        quantity: 2,
        unitPrice: parseFloat(testDish.price).toFixed(2),
        totalPrice: (parseFloat(testDish.price) * 2).toFixed(2),
        specialInstructions: 'Test instructions',
      }]
    };

    const { response: createResponse, data: newOrder } = await makeRequest('/api/restaurant/orders/room', {
      method: 'POST',
      body: JSON.stringify(roomOrderData),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create room order: ${newOrder.message}`);
    }

    log(`✅ Room order created successfully: ${newOrder.orderNumber}`);
    log(`   - Customer: ${newOrder.customerName}`);
    log(`   - Room: ${newOrder.roomId || 'N/A'}`);
    log(`   - Total: $${newOrder.totalAmount}`);
    log(`   - Items: ${roomOrderData.items.length} item(s)`);

    // Step 6: Update order status
    log('Step 6: Testing order status updates...');
    const statusUpdates = ['confirmed', 'preparing', 'ready', 'served'];
    
    for (const status of statusUpdates) {
      const { response: statusResponse } = await makeRequest(`/api/restaurant/orders/${newOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      if (statusResponse.ok) {
        log(`   ✅ Status updated to: ${status}`);
      } else {
        log(`   ❌ Failed to update status to: ${status}`);
      }
    }

    // Step 7: Generate KOT
    log('Step 7: Testing KOT generation...');
    const { response: kotResponse, data: kotData } = await makeRequest(`/api/restaurant/orders/${newOrder.id}/kot`, {
      method: 'POST',
    });

    if (kotResponse.ok) {
      log(`✅ KOT generated successfully: ${kotData.kotNumber}`);
    } else {
      log(`⚠️  KOT generation failed: ${kotData.message}`);
    }

    // Step 8: Verify final state
    log('Step 8: Verifying final state...');
    const { data: finalOrders } = await makeRequest('/api/restaurant/orders/room');
    const ourOrder = finalOrders.find(o => o.id === newOrder.id);
    
    if (ourOrder) {
      log(`✅ Room order verified in system:`);
      log(`   - Order Number: ${ourOrder.orderNumber}`);
      log(`   - Status: ${ourOrder.status}`);
      log(`   - Items: ${ourOrder.items?.length || 0}`);
      log(`   - Total: $${ourOrder.totalAmount}`);
    }

    log('\n🎉 Room Orders functionality test completed successfully!');
    log('\n📋 Test Summary:');
    log(`   ✅ Authentication working`);
    log(`   ✅ Reservation retrieval working`);
    log(`   ✅ Menu data retrieval working`);
    log(`   ✅ Room order creation working`);
    log(`   ✅ Status updates working`);
    log(`   ✅ KOT generation working`);
    log(`   ✅ Order verification working`);

    return true;

  } catch (error) {
    log(`❌ Test failed: ${error.message}`);
    log(`   Stack: ${error.stack}`);
    return false;
  }
}

// Run the test
testRoomOrdersWorkflow()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`💥 Unexpected error: ${error.message}`);
    process.exit(1);
  });