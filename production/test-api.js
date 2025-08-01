const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';

let testResults = [];
let authToken = '';
let agentToken = '';

// Helper function to make HTTP requests
const makeRequest = (url, method = 'GET', data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsedBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

// Test function
const runTest = async (testName, testFn) => {
  try {
    console.log(`🧪 Testing: ${testName}`);
    const result = await testFn();
    testResults.push({ test: testName, status: 'PASS', details: result });
    console.log(`✅ PASS: ${testName}`);
    return result;
  } catch (error) {
    testResults.push({ test: testName, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${testName} - ${error.message}`);
    return null;
  }
};

// Test suite for production API
const runProductionTests = async () => {
  console.log('🚀 Starting Production API Tests...');
  console.log(`📍 Testing API at: ${BASE_URL}\n`);

  // Test root endpoint
  await runTest('Root Endpoint', async () => {
    const response = await makeRequest(`${BASE_URL}/`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.success) throw new Error('Response success should be true');
    return response.data;
  });

  // Test health endpoint
  await runTest('Health Check', async () => {
    const response = await makeRequest(`${BASE_URL}/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (response.data.status !== 'OK') throw new Error('Health status should be OK');
    return response.data;
  });

  // Test detailed health endpoint
  await runTest('Detailed Health Check', async () => {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (response.data.status !== 'OK') throw new Error('Health status should be OK');
    return response.data;
  });

  // Test user registration
  await runTest('User Registration', async () => {
    const timestamp = Date.now();
    const userData = {
      email: `test-${timestamp}@example.com`,
      password: 'SecurePassword123!',
      name: 'Test User',
      phone: '+1-555-0123',
      address: '123 Test Street'
    };
    
    const response = await makeRequest(`${BASE_URL}/api/auth/register`, 'POST', userData);
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    if (!response.data.token) throw new Error('Token should be provided');
    
    authToken = response.data.token;
    console.log(`   🔑 Initial auth token: ${authToken.substring(0, 20)}...`);
    
    // Store email for login test
    global.testEmail = userData.email;
    return response.data;
  });

  // Test user login
  await runTest('User Login', async () => {
    const loginData = {
      email: global.testEmail || 'test@example.com',
      password: 'SecurePassword123!'
    };
    
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, 'POST', loginData);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.token) throw new Error('Token should be provided');
    
    // Always use the latest token from login
    authToken = response.data.token;
    console.log(`   🔑 Auth token updated: ${authToken.substring(0, 20)}...`);
    return response.data;
  });

  // Test get user profile
  await runTest('Get User Profile', async () => {
    console.log(`   🔍 Using auth token: ${authToken.substring(0, 20)}...`);
    const response = await makeRequest(`${BASE_URL}/api/auth/profile`, 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (response.status !== 200) {
      console.log(`   ❌ Profile response:`, response.data);
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (!response.data.user) throw new Error('User data should be provided');
    return response.data;
  });

  // Test get restaurants
  await runTest('Get Restaurants', async () => {
    const response = await makeRequest(`${BASE_URL}/api/restaurants`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data.restaurants)) throw new Error('Restaurants should be an array');
    return response.data;
  });

  // Test get restaurant menu
  await runTest('Get Restaurant Menu', async () => {
    const response = await makeRequest(`${BASE_URL}/api/restaurants/1/menu`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data.menu)) throw new Error('Menu should be an array');
    return response.data;
  });

  // Test create order
  await runTest('Create Order', async () => {
    const orderData = {
      restaurantId: '1',
      items: [
        {
          menuItemId: '1',
          quantity: 2,
          price: 12.99
        }
      ],
      deliveryAddress: '123 Test Street',
      totalAmount: 25.98
    };
    
    const response = await makeRequest(`${BASE_URL}/api/orders`, 'POST', orderData, {
      'Authorization': `Bearer ${authToken}`
    });
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    if (!response.data.order) throw new Error('Order data should be provided');
    return response.data;
  });

  // Test get user orders
  await runTest('Get User Orders', async () => {
    const response = await makeRequest(`${BASE_URL}/api/orders`, 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!Array.isArray(response.data.orders)) throw new Error('Orders should be an array');
    return response.data;
  });

  // Test update order status
  await runTest('Update Order Status', async () => {
    const response = await makeRequest(`${BASE_URL}/api/orders/1/status`, 'PUT', {
      status: 'confirmed'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Test register delivery agent
  await runTest('Register Delivery Agent', async () => {
    const agentData = {
      name: 'Test Agent',
      phone: '+1-555-0987',
      vehicleType: 'bike'
    };
    
    const response = await makeRequest(`${BASE_URL}/api/agents/register`, 'POST', agentData);
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    if (!response.data.token) throw new Error('Agent token should be provided');
    
    agentToken = response.data.token;
    console.log(`   🔑 Agent token: ${agentToken.substring(0, 20)}...`);
    return response.data;
  });

  // Test update agent location
  await runTest('Update Agent Location', async () => {
    const locationData = {
      location: {
        lat: 40.7128,
        lng: -74.0060
      }
    };
    
    const response = await makeRequest(`${BASE_URL}/api/agents/location`, 'PUT', locationData, {
      'Authorization': `Bearer ${agentToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Test accept delivery
  await runTest('Accept Delivery', async () => {
    const response = await makeRequest(`${BASE_URL}/api/deliveries/1/accept`, 'POST', null, {
      'Authorization': `Bearer ${agentToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Test 404 handling
  await runTest('404 Error Handling', async () => {
    const response = await makeRequest(`${BASE_URL}/api/nonexistent`);
    if (response.status !== 404) throw new Error(`Expected 404, got ${response.status}`);
    return response.data;
  });

  // Summary
  console.log('\n📊 PRODUCTION API TEST RESULTS');
  console.log('================================');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${successRate}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`   - ${r.test}: ${r.error}`));
  }
  
  console.log(`\n${successRate >= 90 ? '✅' : '⚠️'} Production API is ${successRate >= 90 ? 'ready for deployment' : 'needs attention'}!`);
  
  return {
    total,
    passed,
    failed,
    successRate: parseFloat(successRate),
    results: testResults
  };
};

// Run tests if called directly
if (require.main === module) {
  runProductionTests().catch(console.error);
}
