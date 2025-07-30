const axios = require('axios');

const RESTAURANT_SERVICE_URL = 'http://localhost:3002';
let restaurantId = '';

describe('Restaurant Service API Tests', () => {

  // Test Health Check
  test('Health Check', async () => {
    try {
      const response = await axios.get(`${RESTAURANT_SERVICE_URL}/health`);
      console.log('✅ Restaurant Health Check:', response.data);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('OK');
    } catch (error) {
      console.error('❌ Restaurant Health Check failed:', error.message);
      throw error;
    }
  });

  // Test Get All Restaurants
  test('Get All Restaurants', async () => {
    try {
      const response = await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants`);
      console.log('✅ Get Restaurants:', response.data);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        restaurantId = response.data[0].id;
      }
    } catch (error) {
      console.error('❌ Get Restaurants failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get Restaurant by ID
  test('Get Restaurant by ID', async () => {
    try {
      const response = await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants/${restaurantId || '1'}`);
      console.log('✅ Get Restaurant by ID:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBeDefined();
    } catch (error) {
      console.error('❌ Get Restaurant by ID failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get Restaurant Menu
  test('Get Restaurant Menu', async () => {
    try {
      const response = await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants/${restaurantId || '1'}/menu`);
      console.log('✅ Get Menu:', response.data);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    } catch (error) {
      console.error('❌ Get Menu failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Create Restaurant
  test('Create Restaurant', async () => {
    try {
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
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe('Test Restaurant');
      
      restaurantId = response.data.id;
    } catch (error) {
      console.error('❌ Create Restaurant failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update Restaurant
  test('Update Restaurant', async () => {
    try {
      const updateData = {
        name: 'Updated Test Restaurant',
        cuisine: 'Mediterranean',
        rating: 4.5
      };
      
      const response = await axios.put(`${RESTAURANT_SERVICE_URL}/restaurants/${restaurantId}`, updateData);
      console.log('✅ Update Restaurant:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.name).toBe('Updated Test Restaurant');
    } catch (error) {
      console.error('❌ Update Restaurant failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Add Menu Item
  test('Add Menu Item', async () => {
    try {
      const menuItem = {
        name: 'Test Pizza',
        description: 'Delicious test pizza',
        price: 15.99,
        category: 'Pizza',
        available: true
      };
      
      const response = await axios.post(`${RESTAURANT_SERVICE_URL}/restaurants/${restaurantId}/menu`, menuItem);
      console.log('✅ Add Menu Item:', response.data);
      
      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      expect(response.data.name).toBe('Test Pizza');
    } catch (error) {
      console.error('❌ Add Menu Item failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Get Orders for Restaurant
  test('Get Restaurant Orders', async () => {
    try {
      const response = await axios.get(`${RESTAURANT_SERVICE_URL}/orders`);
      console.log('✅ Get Restaurant Orders:', response.data);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    } catch (error) {
      console.error('❌ Get Restaurant Orders failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Update Order Status
  test('Update Order Status', async () => {
    try {
      const statusUpdate = {
        status: 'confirmed'
      };
      
      const response = await axios.put(`${RESTAURANT_SERVICE_URL}/orders/1/status`, statusUpdate);
      console.log('✅ Update Order Status:', response.data);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('confirmed');
    } catch (error) {
      console.error('❌ Update Order Status failed:', error.response?.data || error.message);
      throw error;
    }
  });

  // Test Invalid Restaurant ID
  test('Get Non-existent Restaurant', async () => {
    try {
      await axios.get(`${RESTAURANT_SERVICE_URL}/restaurants/999999`);
      throw new Error('Should have failed');
    } catch (error) {
      console.log('✅ Non-existent Restaurant correctly rejected:', error.response?.status);
      expect(error.response?.status).toBe(404);
    }
  });

});

module.exports = { RESTAURANT_SERVICE_URL };
