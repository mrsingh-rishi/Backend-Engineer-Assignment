#!/usr/bin/env node

const BASE_URL = 'https://food-delivery-9zla5h5hr-rishi-singhs-projects.vercel.app';

console.log('🚀 Starting Final Live Production API Tests...');
console.log(`📍 Testing API at: ${BASE_URL}\n`);

let testsPassed = 0;
let testsFailed = 0;
let authToken = '';
let agentToken = '';

// Helper function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      jsonData = { raw: data };
    }
    
    return {
      status: response.status,
      data: jsonData,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      ok: false
    };
  }
}

// Test function
async function test(name, testFn) {
  console.log(`🧪 Testing: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${name} - ${error.message}`);
    testsFailed++;
  }
  console.log('');
}

// Run all tests
async function runTests() {
  // 1. Health Checks
  await test('Health Check', async () => {
    const response = await makeRequest('/health');
    if (!response.ok || response.data.status !== 'OK') {
      throw new Error(`Expected OK status, got: ${JSON.stringify(response.data)}`);
    }
  });

  // 2. User Registration
  await test('User Registration', async () => {
    const timestamp = Date.now();
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Final Test User',
        email: `finaltest${timestamp}@example.com`,
        password: 'password123',
        phone: '+1234567890',
        address: '123 Final Test St'
      })
    });
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Registration failed: ${JSON.stringify(response.data)}`);
    }
    
    authToken = response.data.token;
    console.log(`   🔑 Auth token: ${authToken.substring(0, 20)}...`);
  });

  // 3. User Profile
  await test('User Profile', async () => {
    const response = await makeRequest('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Profile fetch failed: ${JSON.stringify(response.data)}`);
    }
  });

  // 4. Restaurants
  await test('Get Restaurants', async () => {
    const response = await makeRequest('/api/restaurants');
    if (!response.ok || !response.data.success || !Array.isArray(response.data.restaurants)) {
      throw new Error(`Expected restaurants array, got: ${JSON.stringify(response.data)}`);
    }
  });

  // 5. Restaurant Menu
  await test('Restaurant Menu', async () => {
    const response = await makeRequest('/api/restaurants/1/menu');
    if (!response.ok || !response.data.success || !Array.isArray(response.data.menu)) {
      throw new Error(`Expected menu array, got: ${JSON.stringify(response.data)}`);
    }
  });

  // 6. Create Order
  await test('Create Order', async () => {
    const response = await makeRequest('/api/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        restaurantId: '1',
        items: [
          {
            id: 1,
            name: 'Test Pizza',
            quantity: 1,
            price: 12.99
          }
        ],
        deliveryAddress: '123 Final Test Street',
        totalAmount: 12.99
      })
    });
    
    console.log(`   🔍 Order creation response: ${JSON.stringify(response.data)}`);
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Order creation failed: ${JSON.stringify(response.data)}`);
    }
  });

  // 7. Get Orders
  await test('Get User Orders', async () => {
    const response = await makeRequest('/api/orders', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Get orders failed: ${JSON.stringify(response.data)}`);
    }
  });

  // 8. Register Agent
  await test('Register Delivery Agent', async () => {
    const timestamp = Date.now();
    const response = await makeRequest('/api/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Final Test Agent',
        phone: `+1234${timestamp.toString().slice(-6)}`,
        vehicleType: 'bike'
      })
    });
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Agent registration failed: ${JSON.stringify(response.data)}`);
    }
    
    agentToken = response.data.token;
    console.log(`   🔑 Agent token: ${agentToken.substring(0, 20)}...`);
  });

  // 9. Update Agent Location
  await test('Update Agent Location', async () => {
    const response = await makeRequest('/api/agents/location', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${agentToken}`
      },
      body: JSON.stringify({
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      })
    });
    
    console.log(`   🔍 Location update response: ${JSON.stringify(response.data)}`);
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Location update failed: ${JSON.stringify(response.data)}`);
    }
  });

  // 10. Accept Delivery
  await test('Accept Delivery', async () => {
    const response = await makeRequest('/api/deliveries/1/accept', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agentToken}`
      }
    });
    
    if (!response.ok || !response.data.success) {
      throw new Error(`Delivery acceptance failed: ${JSON.stringify(response.data)}`);
    }
  });
}

// Main execution
async function main() {
  try {
    await runTests();
    
    console.log('\n📊 FINAL LIVE PRODUCTION API TEST RESULTS');
    console.log('==========================================');
    console.log(`📍 API URL: ${BASE_URL}`);
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    
    if (testsFailed === 0) {
      console.log('\n✅ ALL TESTS PASSED! Production API is fully functional!');
    } else {
      console.log(`\n⚠️  ${testsFailed} test(s) failed. Debugging information provided above.`);
    }
    
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();
