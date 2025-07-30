const http = require('http');

// Test configuration
const SERVICES = {
  user: 'http://localhost:3001',
  restaurant: 'http://localhost:3002',
  delivery: 'http://localhost:3003'
};

let authToken = '';
let agentToken = '';
let testResults = [];

// Helper function to make HTTP requests
const makeRequest = (url, method = 'GET', data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
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

// Test suite
const runTests = async () => {
  console.log('🚀 Starting comprehensive API tests...\n');

  // Health check tests
  await runTest('User Service Health Check', async () => {
    const response = await makeRequest(`${SERVICES.user}/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  await runTest('Restaurant Service Health Check', async () => {
    const response = await makeRequest(`${SERVICES.restaurant}/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  await runTest('Delivery Service Health Check', async () => {
    const response = await makeRequest(`${SERVICES.delivery}/health`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // User authentication tests
  await runTest('User Registration', async () => {
    const userData = {
      email: 'john.doe@example.com',
      password: 'SecurePassword123!',
      name: 'John Doe',
      phone: '+1-555-0123',
      address: '123 Main Street, Anytown, USA'
    };
    
    const response = await makeRequest(`${SERVICES.user}/api/auth/register`, 'POST', userData);
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    
    authToken = response.data.token;
    return response.data;
  });

  await runTest('User Login', async () => {
    const loginData = {
      email: 'john.doe@example.com',
      password: 'SecurePassword123!'
    };
    
    const response = await makeRequest(`${SERVICES.user}/api/auth/login`, 'POST', loginData);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    if (response.data.token) {
      authToken = response.data.token;
    }
    return response.data;
  });

  await runTest('Get User Profile', async () => {
    const response = await makeRequest(`${SERVICES.user}/api/auth/profile`, 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Restaurant service tests
  await runTest('Get All Restaurants', async () => {
    const response = await makeRequest(`${SERVICES.restaurant}/restaurants`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  await runTest('Get Restaurant Menu', async () => {
    const response = await makeRequest(`${SERVICES.restaurant}/restaurants/1/menu`);
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Order management tests
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
      deliveryAddress: '123 Main Street, Anytown, USA',
      totalAmount: 25.98
    };
    
    const response = await makeRequest(`${SERVICES.user}/api/orders`, 'POST', orderData, {
      'Authorization': `Bearer ${authToken}`
    });
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    return response.data;
  });

  await runTest('Get User Orders', async () => {
    const response = await makeRequest(`${SERVICES.user}/api/orders`, 'GET', null, {
      'Authorization': `Bearer ${authToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  await runTest('Update Order Status', async () => {
    const response = await makeRequest(`${SERVICES.restaurant}/orders/1/status`, 'PUT', {
      status: 'confirmed'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Delivery agent tests
  await runTest('Register Delivery Agent', async () => {
    const agentData = {
      name: 'Mike Driver',
      phone: '+1-555-0987',
      vehicleType: 'bike'
    };
    
    const response = await makeRequest(`${SERVICES.delivery}/agents/register`, 'POST', agentData);
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    
    agentToken = response.data.token;
    return response.data;
  });

  await runTest('Update Agent Location', async () => {
    const locationData = {
      location: {
        lat: 40.7128,
        lng: -74.0060
      }
    };
    
    const response = await makeRequest(`${SERVICES.delivery}/agents/location`, 'PUT', locationData, {
      'Authorization': `Bearer ${agentToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  await runTest('Accept Delivery', async () => {
    const response = await makeRequest(`${SERVICES.delivery}/deliveries/1/accept`, 'POST', null, {
      'Authorization': `Bearer ${agentToken}`
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    return response.data;
  });

  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const total = testResults.length;
  const successRate = ((passed / total) * 100).toFixed(1);
  
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
  
  console.log(`\n${successRate >= 85 ? '✅' : '⚠️'} All critical API endpoints are ${successRate >= 85 ? 'working correctly' : 'mostly functional'}!`);
};

runTests().catch(console.error);
