const express = require('express');
const cors = require('cors');

// Create three separate servers for each service
const createMockService = (serviceName, port) => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      service: serviceName,
      port: port,
      timestamp: new Date().toISOString()
    });
  });
  
  // Mock user service endpoints
  if (serviceName === 'user') {
    let users = [];
    let orders = [];
    let userIdCounter = 1;
    let orderIdCounter = 1;
    
    // Auth endpoints
    app.post('/api/auth/register', (req, res) => {
      const { email, password, name, phone, address } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      const user = {
        id: userIdCounter++,
        email,
        name,
        phone,
        address,
        createdAt: new Date().toISOString()
      };
      
      users.push(user);
      
      const token = `mock_token_${user.id}_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: { id: user.id, email: user.email, name: user.name },
        token
      });
    });
    
    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      
      const user = users.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = `mock_token_${user.id}_${Date.now()}`;
      
      res.json({
        success: true,
        message: 'Login successful',
        user: { id: user.id, email: user.email, name: user.name },
        token
      });
    });
    
    app.get('/api/auth/profile', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      res.json({
        success: true,
        user: {
          id: 1,
          email: 'john.doe@example.com',
          name: 'John Doe',
          phone: '+1-555-0123',
          address: '123 Main Street, Anytown, USA'
        }
      });
    });
    
    // Order endpoints
    app.post('/api/orders', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const { restaurantId, items, deliveryAddress, totalAmount } = req.body;
      
      const order = {
        id: orderIdCounter++,
        restaurantId,
        items,
        deliveryAddress,
        totalAmount,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      orders.push(order);
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order
      });
    });
    
    app.get('/api/orders', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      res.json({
        success: true,
        orders
      });
    });
  }
  
  // Mock restaurant service endpoints
  if (serviceName === 'restaurant') {
    const restaurants = [
      {
        id: '1',
        name: 'Pizza Palace',
        address: '456 Pizza Street',
        cuisine: 'Italian',
        rating: 4.5,
        isOpen: true
      },
      {
        id: '2',
        name: 'Burger Barn',
        address: '789 Burger Avenue',
        cuisine: 'American',
        rating: 4.2,
        isOpen: true
      }
    ];
    
    const menuItems = [
      {
        id: '1',
        restaurantId: '1',
        name: 'Margherita Pizza',
        description: 'Classic tomato sauce, mozzarella, and basil',
        price: 12.99,
        category: 'Pizza',
        available: true
      },
      {
        id: '2',
        restaurantId: '1',
        name: 'Pepperoni Pizza',
        description: 'Tomato sauce, mozzarella, and pepperoni',
        price: 14.99,
        category: 'Pizza',
        available: true
      },
      {
        id: '3',
        restaurantId: '2',
        name: 'Classic Burger',
        description: 'Beef patty, lettuce, tomato, onion',
        price: 9.99,
        category: 'Burger',
        available: true
      }
    ];
    
    app.get('/restaurants', (req, res) => {
      res.json({
        success: true,
        restaurants
      });
    });
    
    app.get('/restaurants/:id/menu', (req, res) => {
      const id = req.params.id;
      const menu = menuItems.filter(item => item.restaurantId === id);
      
      res.json({
        success: true,
        menu
      });
    });
    
    // Simple route handler without complex patterns
    app.put('/orders/:id/status', (req, res) => {
      const orderId = req.params.id;
      const { status } = req.body;
      
      res.json({
        success: true,
        message: 'Order status updated',
        orderId,
        status
      });
    });
  }
  
  // Mock delivery service endpoints
  if (serviceName === 'delivery') {
    let agents = [];
    let deliveries = [];
    let agentIdCounter = 1;
    
    app.post('/agents/register', (req, res) => {
      const { name, phone, vehicleType } = req.body;
      
      if (!name || !phone || !vehicleType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const agent = {
        id: agentIdCounter++,
        name,
        phone,
        vehicleType,
        isActive: true,
        location: null,
        createdAt: new Date().toISOString()
      };
      
      agents.push(agent);
      
      const token = `agent_token_${agent.id}_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        message: 'Agent registered successfully',
        agent: { id: agent.id, name: agent.name, vehicleType: agent.vehicleType },
        token
      });
    });
    
    app.put('/agents/location', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const { location } = req.body;
      
      res.json({
        success: true,
        message: 'Location updated successfully',
        location
      });
    });
    
    app.post('/deliveries/:id/accept', (req, res) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const deliveryId = req.params.id;
      
      res.json({
        success: true,
        message: 'Delivery accepted successfully',
        deliveryId,
        status: 'accepted'
      });
    });
  }
  
  return app;
};

// Start all three services
const userService = createMockService('user', 3001);
const restaurantService = createMockService('restaurant', 3002);
const deliveryService = createMockService('delivery', 3003);

userService.listen(3001, () => {
  console.log('✅ User Service running on port 3001');
});

restaurantService.listen(3002, () => {
  console.log('✅ Restaurant Service running on port 3002');
});

deliveryService.listen(3003, () => {
  console.log('✅ Delivery Service running on port 3003');
});

console.log('\n🚀 All mock services started successfully!');
console.log('📊 Health check URLs:');
console.log('   User Service: http://localhost:3001/health');
console.log('   Restaurant Service: http://localhost:3002/health');
console.log('   Delivery Service: http://localhost:3003/health');
