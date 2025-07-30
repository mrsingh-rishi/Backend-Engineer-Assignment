const axios = require('axios');

const DELIVERY_SERVICE_URL = 'http://localhost:3003';
let agentToken = '';
let agentId = '';

describe('Delivery Agent Service API Tests', () => {

  // Test Health Check
  test('Health Check', async () => {
    try {
      const response = await axios.get(`${DELIVERY_SERVICE_URL}/health`);
      console.log('✅ Delivery Health Check:', response.data);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('OK');
    } catch (error) {
      console.error('❌ Delivery Health Check failed:', error.message);
      throw error;
    }
  });

  // Test Agent Registration
  test('Agent Registration', async () => {
    try {
      const agentData = {
        name: 'Test Driver',
        email: 'driver@example.com',
        phone: '+1234567890',
        vehicleType: 'bike',
        licenseNumber: 'DL123456789'
      };
      
      const response = await axios.post(`${DELIVERY_SERVICE_URL}/agents/register`, agentData);
      console.log('✅ Agent Registration:', response.data);
      
      expect(response.status).toBe(201);
      expect(response.data.agent).toBeDefined();
      expect(response.data.token).toBeDefined();
      
      agentToken = response.data.token;
      agentId = response.data.agent.id;
    } catch (error) {
      console.error('❌ Agent Registration failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Agent Login
  test('Agent Login', async () => {
    try {
      const loginData = {
        phone: '+1234567890',
        password: 'password123'
      };
      
      const response = await axios.post(`${DELIVERY_SERVICE_URL}/agents/login`, loginData);
      console.log('✅ Agent Login:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.agent).toBeDefined();
      expect(response.data.token).toBeDefined();
      
      agentToken = response.data.token;
    } catch (error) {
      console.error('❌ Agent Login failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get Agent Profile
  test('Get Agent Profile', async () => {
    try {
      const response = await axios.get(`${DELIVERY_SERVICE_URL}/agents/profile`, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Get Agent Profile:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Test Driver');
    } catch (error) {
      console.error('❌ Get Agent Profile failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update Agent Profile
  test('Update Agent Profile', async () => {
    try {
      const updateData = {
        name: 'Updated Test Driver',
        vehicleType: 'car'
      };
      
      const response = await axios.put(`${DELIVERY_SERVICE_URL}/agents/profile`, updateData, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Update Agent Profile:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Updated Test Driver');
    } catch (error) {
      console.error('❌ Update Agent Profile failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update Agent Location
  test('Update Agent Location', async () => {
    try {
      const locationData = {
        location: {
          lat: 40.7128,
          lng: -74.0060
        }
      };
      
      const response = await axios.put(`${DELIVERY_SERVICE_URL}/agents/location`, locationData, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Update Location:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Location updated');
    } catch (error) {
      console.error('❌ Update Location failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update Agent Availability
  test('Update Agent Availability', async () => {
    try {
      const availabilityData = {
        isAvailable: true
      };
      
      const response = await axios.put(`${DELIVERY_SERVICE_URL}/agents/availability`, availabilityData, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Update Availability:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Availability updated');
    } catch (error) {
      console.error('❌ Update Availability failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get Available Deliveries
  test('Get Available Deliveries', async () => {
    try {
      const response = await axios.get(`${DELIVERY_SERVICE_URL}/deliveries`, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Get Deliveries:', response.data);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    } catch (error) {
      console.error('❌ Get Deliveries failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Accept Delivery
  test('Accept Delivery', async () => {
    try {
      const response = await axios.post(`${DELIVERY_SERVICE_URL}/deliveries/1/accept`, {}, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Accept Delivery:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('in_transit');
    } catch (error) {
      console.error('❌ Accept Delivery failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update Delivery Status
  test('Update Delivery Status', async () => {
    try {
      const statusUpdate = {
        status: 'delivered'
      };
      
      const response = await axios.put(`${DELIVERY_SERVICE_URL}/deliveries/1/status`, statusUpdate, {
        headers: { Authorization: `Bearer ${agentToken}` }
      });
      console.log('✅ Update Delivery Status:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('delivered');
    } catch (error) {
      console.error('❌ Update Delivery Status failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Invalid Agent Login
  test('Invalid Agent Login', async () => {
    try {
      const invalidData = {
        phone: '+9999999999',
        password: 'wrongpassword'
      };
      
      await axios.post(`${DELIVERY_SERVICE_URL}/agents/login`, invalidData);
      throw new Error('Should have failed');
    } catch (error) {
      console.log('✅ Invalid Agent Login correctly rejected:', error.response?.status);
      expect(error.response?.status).toBe(401);
    }
  });

});

module.exports = { DELIVERY_SERVICE_URL };
