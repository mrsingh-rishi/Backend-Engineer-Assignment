const axios = require('axios');

// Test runner for all services
async function runAllTests() {
  console.log('🚀 Starting API Tests for Food Delivery Backend\n');
  
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Mock Jest functions for simple testing
  global.describe = (name, fn) => {
    console.log(`\n📁 ${name}`);
    console.log('=' .repeat(50));
    return fn();
  };

  global.test = async (name, fn) => {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`✅ ${name}`);
    } catch (error) {
      failedTests++;
      console.log(`❌ ${name}`);
      console.error(`   Error: ${error.message}`);
    }
  };

  global.expect = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, but got undefined`);
      }
    }
  });

  // Run tests for each service
  try {
    console.log('🔍 Testing User Service...\n');
    require('./user-service.test.js');
    
    console.log('\n🔍 Testing Restaurant Service...\n');
    require('./restaurant-service.test.js');
    
    console.log('\n🔍 Testing Delivery Agent Service...\n');
    require('./delivery-service.test.js');
    
  } catch (error) {
    console.error('Error running tests:', error.message);
  }

  // Test Summary
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`📋 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! The API is working correctly.');
  } else {
    console.log(`\n⚠️  ${failedTests} test(s) failed. Please check the errors above.`);
  }
}

// Individual service test functions
async function testUserService() {
  console.log('🔍 Testing User Service APIs...\n');
  
  const USER_SERVICE_URL = 'http://localhost:3001';
  let authToken = '';

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const response = await axios.get(`${USER_SERVICE_URL}/health`);
        console.log('✅ Health:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'User Registration',
      test: async () => {
        const userData = {
          email: 'testuser@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '+1234567890'
        };
        const response = await axios.post(`${USER_SERVICE_URL}/api/auth/register`, userData);
        console.log('✅ Register:', response.data);
        authToken = response.data.token;
        return response.status === 201;
      }
    },
    {
      name: 'User Login',
      test: async () => {
        const loginData = { email: 'testuser@example.com', password: 'password123' };
        const response = await axios.post(`${USER_SERVICE_URL}/api/auth/login`, loginData);
        console.log('✅ Login:', response.data);
        authToken = response.data.token;
        return response.status === 200;
      }
    },
    {
      name: 'Get Profile',
      test: async () => {
        const response = await axios.get(`${USER_SERVICE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Profile:', response.data);
        return response.status === 200;
      }
    }
  ];

  for (const { name, test } of tests) {
    try {
      await test();
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      console.log(`❌ ${name} - FAILED:`, error.response?.data || error.message);
    }
  }
}

async function testRestaurantService() {
  console.log('\n🔍 Testing Restaurant Service APIs...\n');
  
  const RESTAURANT_SERVICE_URL = 'http://localhost:3002';
  let createdRestaurantId = '';

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const response = await axios.get(`${RESTAURANT_SERVICE_URL}/health`);
        console.log('✅ Health:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Get All Restaurants',
      test: async () => {
        const response = await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants`);
        console.log('✅ Get All Restaurants:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Get Restaurant by ID',
      test: async () => {
        const response = await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants/1`);
        console.log('✅ Get Restaurant by ID:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Get Restaurant Menu',
      test: async () => {
        const response = await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants/1/menu`);
        console.log('✅ Get Restaurant Menu:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Create Restaurant',
      test: async () => {
        const restaurantData = {
          name: 'Test Restaurant',
          cuisine: 'Italian',
          address: '456 Restaurant St',
          phone: '+1234567890',
          email: 'test@restaurant.com',
          description: 'A test restaurant'
        };
        const response = await axios.post(`${RESTAURANT_SERVICE_URL}/restaurants`, restaurantData);
        console.log('✅ Create Restaurant:', response.data);
        createdRestaurantId = response.data.id;
        return response.status === 201;
      }
    },
    {
      name: 'Update Restaurant',
      test: async () => {
        if (!createdRestaurantId) {
          createdRestaurantId = '1'; // fallback to existing restaurant
        }
        const updateData = {
          name: 'Updated Test Restaurant',
          description: 'Updated description'
        };
        const response = await axios.put(`${RESTAURANT_SERVICE_URL}/restaurants/${createdRestaurantId}`, updateData);
        console.log('✅ Update Restaurant:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Add Menu Item',
      test: async () => {
        const restaurantId = createdRestaurantId || '1';
        const menuItem = {
          name: 'Test Pizza',
          description: 'A delicious test pizza',
          price: 15.99,
          category: 'Pizza',
          available: true
        };
        const response = await axios.post(`${RESTAURANT_SERVICE_URL}/restaurants/${restaurantId}/menu`, menuItem);
        console.log('✅ Add Menu Item:', response.data);
        return response.status === 201;
      }
    },
    {
      name: 'Get Restaurant Orders',
      test: async () => {
        const response = await axios.get(`${RESTAURANT_SERVICE_URL}/orders`);
        console.log('✅ Get Restaurant Orders:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Update Order Status',
      test: async () => {
        const statusUpdate = { status: 'confirmed' };
        const response = await axios.put(`${RESTAURANT_SERVICE_URL}/orders/1/status`, statusUpdate);
        console.log('✅ Update Order Status:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Get Non-existent Restaurant',
      test: async () => {
        try {
          await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants/999`);
          return false; // Should not reach here
        } catch (error) {
          console.log('✅ Non-existent Restaurant correctly rejected:', error.response?.status);
          return error.response?.status === 404;
        }
      }
    }
  ];

  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        console.log(`✅ ${name} - PASSED`);
      } else {
        console.log(`❌ ${name} - FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${name} - FAILED:`, error.response?.data || error.message);
    }
  }
}

async function testDeliveryService() {
  console.log('\n🔍 Testing Delivery Agent Service APIs...\n');
  
  const DELIVERY_SERVICE_URL = 'http://localhost:3003';

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const response = await axios.get(`${DELIVERY_SERVICE_URL}/health`);
        console.log('✅ Health:', response.data);
        return response.status === 200;
      }
    },
    {
      name: 'Agent Registration',
      test: async () => {
        const agentData = {
          name: 'Test Driver',
          phone: '+9876543210',
          vehicleType: 'bike'
        };
        const response = await axios.post(`${DELIVERY_SERVICE_URL}/agents/register`, agentData);
        console.log('✅ Agent Register:', response.data);
        return response.status === 201;
      }
    }
  ];

  for (const { name, test } of tests) {
    try {
      await test();
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      console.log(`❌ ${name} - FAILED:`, error.response?.data || error.message);
    }
  }
}

// Export functions
module.exports = {
  runAllTests,
  testUserService,
  testRestaurantService,
  testDeliveryService
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
