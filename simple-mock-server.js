const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'user';

// Mock data
const mockUsers = [
  { id: '1', email: 'john@example.com', name: 'John Doe', phone: '+1234567890', address: '123 Main St' }
];

const mockRestaurants = [
  { 
    id: '1', 
    name: 'Pizza Palace', 
    cuisine: 'Italian',
    address: '456 Food St',
    rating: 4.5,
    isOpen: true,
    menu: [
      { id: '1', name: 'Margherita Pizza', price: 12.99, category: 'Pizza', available: true },
      { id: '2', name: 'Pasta Carbonara', price: 14.99, category: 'Pasta', available: true }
    ]
  }
];

const mockAgents = [
  { 
    id: '1', 
    name: 'Mike Driver', 
    phone: '+1987654321',
    vehicleType: 'bike',
    location: { lat: 40.7128, lng: -74.0060 },
    isAvailable: true,
    isActive: true
  }
];

const mockOrders = [
  {
    id: '1',
    userId: '1',
    restaurantId: '1',
    items: [{ menuItemId: '1', quantity: 2, price: 12.99 }],
    totalAmount: 25.98,
    status: 'pending',
    deliveryAddress: '123 Main St',
    createdAt: new Date().toISOString()
  }
];

// Common routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: SERVICE_TYPE, port: PORT });
});

// User Service Routes
if (SERVICE_TYPE === 'user') {
  app.post('/api/auth/register', (req, res) => {
    const newUser = { id: Date.now().toString(), ...req.body };
    mockUsers.push(newUser);
    res.status(201).json({ user: newUser, token: 'mock-jwt-token' });
  });

  app.post('/api/auth/login', (req, res) => {
    const user = mockUsers.find(u => u.email === req.body.email);
    if (user) {
      res.json({ user, token: 'mock-jwt-token' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.get('/api/auth/profile', (req, res) => {
    res.json(mockUsers[0]);
  });

  app.put('/api/auth/profile', (req, res) => {
    Object.assign(mockUsers[0], req.body);
    res.json(mockUsers[0]);
  });

  // Order management
  app.post('/api/orders', (req, res) => {
    const newOrder = { id: Date.now().toString(), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
    mockOrders.push(newOrder);
    res.status(201).json(newOrder);
  });

  app.get('/api/orders', (req, res) => {
    res.json(mockOrders);
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = mockOrders.find(o => o.id === req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });
}

// Restaurant Service Routes
if (SERVICE_TYPE === 'restaurant') {
  app.get('/restaurants', (req, res) => {
    res.json(mockRestaurants);
  });

  app.get('/restaurants/:id', (req, res) => {
    const restaurant = mockRestaurants.find(r => r.id === req.params.id);
    if (restaurant) {
      res.json(restaurant);
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  });

  app.get('/restaurants/:id/menu', (req, res) => {
    const restaurant = mockRestaurants.find(r => r.id === req.params.id);
    if (restaurant) {
      res.json(restaurant.menu);
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  });

  app.post('/restaurants', (req, res) => {
    const newRestaurant = { id: Date.now().toString(), ...req.body };
    mockRestaurants.push(newRestaurant);
    res.status(201).json(newRestaurant);
  });

  app.put('/restaurants/:id', (req, res) => {
    const restaurant = mockRestaurants.find(r => r.id === req.params.id);
    if (restaurant) {
      Object.assign(restaurant, req.body);
      res.json(restaurant);
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  });

  // Menu management
  app.post('/restaurants/:id/menu', (req, res) => {
    const restaurant = mockRestaurants.find(r => r.id === req.params.id);
    if (restaurant) {
      const newItem = { id: Date.now().toString(), ...req.body };
      restaurant.menu.push(newItem);
      res.status(201).json(newItem);
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  });

  // Order management for restaurants
  app.get('/orders', (req, res) => {
    res.json(mockOrders);
  });

  app.put('/orders/:id/status', (req, res) => {
    const order = mockOrders.find(o => o.id === req.params.id);
    if (order) {
      order.status = req.body.status;
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });
}

// Delivery Agent Service Routes
if (SERVICE_TYPE === 'delivery') {
  app.post('/agents/register', (req, res) => {
    const newAgent = { id: Date.now().toString(), ...req.body, isAvailable: true, isActive: true };
    mockAgents.push(newAgent);
    res.status(201).json({ agent: newAgent, token: 'mock-agent-token' });
  });

  app.post('/agents/login', (req, res) => {
    const agent = mockAgents.find(a => a.phone === req.body.phone);
    if (agent) {
      res.json({ agent, token: 'mock-agent-token' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.get('/agents/profile', (req, res) => {
    res.json(mockAgents[0]);
  });

  app.put('/agents/profile', (req, res) => {
    Object.assign(mockAgents[0], req.body);
    res.json(mockAgents[0]);
  });

  app.put('/agents/location', (req, res) => {
    mockAgents[0].location = req.body.location;
    res.json({ message: 'Location updated' });
  });

  app.put('/agents/availability', (req, res) => {
    mockAgents[0].isAvailable = req.body.isAvailable;
    res.json({ message: 'Availability updated' });
  });

  // Delivery management
  app.get('/deliveries', (req, res) => {
    const deliveries = mockOrders.filter(o => o.status === 'confirmed' || o.status === 'in_transit');
    res.json(deliveries);
  });

  app.post('/deliveries/:orderId/accept', (req, res) => {
    const order = mockOrders.find(o => o.id === req.params.orderId);
    if (order) {
      order.status = 'in_transit';
      order.agentId = mockAgents[0].id;
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  app.put('/deliveries/:orderId/status', (req, res) => {
    const order = mockOrders.find(o => o.id === req.params.orderId);
    if (order) {
      order.status = req.body.status;
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });
}

app.listen(PORT, () => {
  console.log(`${SERVICE_TYPE.toUpperCase()} Service running on port ${PORT}`);
});
