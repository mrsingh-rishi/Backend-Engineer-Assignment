const axios = require('axios');

const USER_SERVICE_URL = 'http://localhost:3001';
let authToken = '';
let userId = '';

describe('User Service API Tests', () => {
  
  // Test Health Check
  test('Health Check', async () => {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/health`);
      console.log('✅ Health Check:', response.data);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('OK');
    } catch (error) {
      console.error('❌ Health Check failed:', error.message);
      throw error;
    }
  });

  // Test User Registration
  test('User Registration', async () => {
    try {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '+1234567890',
        address: '123 Test Street'
      };
      
      const response = await axios.post(`${USER_SERVICE_URL}/api/auth/register`, userData);
      console.log('✅ User Registration:', response.data);
      
      expect(response.status).toBe(201);
      expect(response.data.user).toBeDefined();
      expect(response.data.token).toBeDefined();
      
      authToken = response.data.token;
      userId = response.data.user.id;
    } catch (error) {
      console.error('❌ User Registration failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test User Login
  test('User Login', async () => {
    try {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const response = await axios.post(`${USER_SERVICE_URL}/api/auth/login`, loginData);
      console.log('✅ User Login:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.user).toBeDefined();
      expect(response.data.token).toBeDefined();
      
      authToken = response.data.token;
    } catch (error) {
      console.error('❌ User Login failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get User Profile
  test('Get User Profile', async () => {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Get Profile:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.email).toBe('test@example.com');
    } catch (error) {
      console.error('❌ Get Profile failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update User Profile
  test('Update User Profile', async () => {
    try {
      const updateData = {
        name: 'Updated Test User',
        phone: '+9876543210'
      };
      
      const response = await axios.put(`${USER_SERVICE_URL}/api/auth/profile`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Update Profile:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Updated Test User');
    } catch (error) {
      console.error('❌ Update Profile failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Create Order
  test('Create Order', async () => {
    try {
      const orderData = {
        restaurantId: '1',
        items: [
          { menuItemId: '1', quantity: 2, price: 12.99 },
          { menuItemId: '2', quantity: 1, price: 14.99 }
        ],
        deliveryAddress: '123 Test Street',
        totalAmount: 40.97
      };
      
      const response = await axios.post(`${USER_SERVICE_URL}/api/orders`, orderData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Create Order:', response.data);
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.status).toBe('pending');
    } catch (error) {
      console.error('❌ Create Order failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get Orders
  test('Get User Orders', async () => {
    try {
      const response = await axios.get(`${USER_SERVICE_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Get Orders:', response.data);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    } catch (error) {
      console.error('❌ Get Orders failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Invalid Login
  test('Invalid Login', async () => {
    try {
      const invalidData = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };
      
      await axios.post(`${USER_SERVICE_URL}/api/auth/login`, invalidData);
      throw new Error('Should have failed');
    } catch (error) {
      console.log('✅ Invalid Login correctly rejected:', error.response?.status);
      expect(error.response?.status).toBe(401);
    }
  });

});

module.exports = { USER_SERVICE_URL, authToken };
