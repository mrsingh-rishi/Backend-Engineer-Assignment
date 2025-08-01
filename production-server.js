const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// In-memory storage (replace with database in production)
let users = [];
let orders = [];
let agents = [];
let restaurants = [
  {
    id: '1',
    name: 'Pizza Palace',
    address: '456 Pizza Street',
    cuisine: 'Italian',
    rating: 4.5,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'
  },
  {
    id: '2',
    name: 'Burger Barn',
    address: '789 Burger Avenue', 
    cuisine: 'American',
    rating: 4.2,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400'
  },
  {
    id: '3',
    name: 'Sushi Spot',
    address: '321 Sushi Lane',
    cuisine: 'Japanese',
    rating: 4.8,
    isOpen: true,
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400'
  }
];

let menuItems = [
  {
    id: '1',
    restaurantId: '1',
    name: 'Margherita Pizza',
    description: 'Classic tomato sauce, mozzarella, and fresh basil',
    price: 12.99,
    category: 'Pizza',
    available: true,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300'
  },
  {
    id: '2',
    restaurantId: '1',
    name: 'Pepperoni Pizza',
    description: 'Tomato sauce, mozzarella, and pepperoni',
    price: 14.99,
    category: 'Pizza',
    available: true,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300'
  },
  {
    id: '3',
    restaurantId: '2',
    name: 'Classic Burger',
    description: 'Beef patty, lettuce, tomato, onion, pickles',
    price: 9.99,
    category: 'Burger',
    available: true,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300'
  },
  {
    id: '4',
    restaurantId: '2',
    name: 'Cheese Burger',
    description: 'Classic burger with melted cheese',
    price: 11.99,
    category: 'Burger',
    available: true,
    image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=300'
  },
  {
    id: '5',
    restaurantId: '3',
    name: 'California Roll',
    description: 'Crab, avocado, and cucumber',
    price: 8.99,
    category: 'Sushi',
    available: true,
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300'
  },
  {
    id: '6',
    restaurantId: '3',
    name: 'Salmon Nigiri',
    description: 'Fresh salmon over seasoned rice',
    price: 3.99,
    category: 'Sushi',
    available: true,
    image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=300'
  }
];

let userIdCounter = 1;
let orderIdCounter = 1;
let agentIdCounter = 1;

// Utility functions
const generateToken = (userId, type = 'user') => {
  return `${type}_token_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const verifyToken = (token) => {
  if (!token || !token.startsWith('user_token_') && !token.startsWith('agent_token_')) {
    return null;
  }
  const parts = token.split('_');
  return parts.length >= 3 ? { userId: parts[2], type: parts[1] } : null;
};

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Food Delivery API - Production Server',
    version: '1.0.0',
    status: 'running',
    services: ['user', 'restaurant', 'delivery'],
    endpoints: {
      health: '/health',
      documentation: '/api/docs',
      user: '/api/auth/*',
      restaurants: '/api/restaurants',
      orders: '/api/orders',
      agents: '/api/agents/*'
    }
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: {
      user: 'running',
      restaurant: 'running', 
      delivery: 'running'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      user: { status: 'running', endpoints: 5 },
      restaurant: { status: 'running', endpoints: 3 },
      delivery: { status: 'running', endpoints: 3 }
    },
    database: {
      users: users.length,
      orders: orders.length,
      agents: agents.length,
      restaurants: restaurants.length
    }
  });
});

// ===== USER SERVICE APIs =====

// Authentication
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, phone, address } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, password, name' 
      });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'User already exists with this email' 
      });
    }

    const user = {
      id: userIdCounter++,
      email,
      name,
      phone: phone || '',
      address: address || '',
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(user);
    const token = generateToken(user.id, 'user');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        phone: user.phone,
        address: user.address
      },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    const token = generateToken(user.id, 'user');

    res.json({
      success: true,
      message: 'Login successful',
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        phone: user.phone,
        address: user.address
      },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/auth/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    const user = users.find(u => u.id === parseInt(decoded.userId));
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Order Management
app.post('/api/orders', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    const { restaurantId, items, deliveryAddress, totalAmount } = req.body;
    
    if (!restaurantId || !items || !deliveryAddress || !totalAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const order = {
      id: orderIdCounter++,
      userId: parseInt(decoded.userId),
      restaurantId,
      items,
      deliveryAddress,
      totalAmount,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 30 * 60000).toISOString()
    };

    orders.push(order);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

    const userOrders = orders.filter(o => o.userId === parseInt(decoded.userId));

    res.json({
      success: true,
      orders: userOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ===== RESTAURANT SERVICE APIs =====

app.get('/api/restaurants', (req, res) => {
  try {
    res.json({
      success: true,
      restaurants
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/restaurants/:id/menu', (req, res) => {
  try {
    const id = req.params.id;
    const menu = menuItems.filter(item => item.restaurantId === id);
    
    res.json({
      success: true,
      menu
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status is required' 
      });
    }

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: 'Order not found' 
      });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ===== DELIVERY SERVICE APIs =====

app.post('/api/agents/register', (req, res) => {
  try {
    const { name, phone, vehicleType } = req.body;
    
    if (!name || !phone || !vehicleType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, phone, vehicleType' 
      });
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
    const token = generateToken(agent.id, 'agent');

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully',
      agent: { 
        id: agent.id, 
        name: agent.name, 
        vehicleType: agent.vehicleType 
      },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.put('/api/agents/location', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'agent') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid agent token' 
      });
    }

    const { location } = req.body;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid location with lat/lng is required' 
      });
    }

    const agent = agents.find(a => a.id === parseInt(decoded.userId));
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent not found' 
      });
    }

    agent.location = location;
    agent.lastLocationUpdate = new Date().toISOString();

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: agent.location
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/deliveries/:id/accept', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.type !== 'agent') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid agent token' 
      });
    }

    const deliveryId = req.params.id;

    res.json({
      success: true,
      message: 'Delivery accepted successfully',
      deliveryId,
      status: 'accepted',
      agentId: decoded.userId,
      acceptedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'GET /api/restaurants',
      'GET /api/restaurants/:id/menu',
      'POST /api/orders',
      'GET /api/orders',
      'PUT /api/orders/:id/status',
      'POST /api/agents/register',
      'PUT /api/agents/location',
      'POST /api/deliveries/:id/accept'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Food Delivery API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ All services initialized successfully!`);
});
