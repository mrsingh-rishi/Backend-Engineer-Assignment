import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
let users: any[] = [];
let restaurants: any[] = [
  {
    id: "rest-1",
    name: "Italian Bistro",
    cuisine: "Italian",
    rating: 4.5,
    address: "123 Main St, San Francisco, CA",
    coordinates: { lat: 37.7749, lng: -122.4194 },
    isOpen: true,
    deliveryTime: "30-45 min",
    deliveryFee: 2.99
  },
  {
    id: "rest-2", 
    name: "Sushi Master",
    cuisine: "Japanese",
    rating: 4.8,
    address: "456 Oak Ave, San Francisco, CA", 
    coordinates: { lat: 37.7849, lng: -122.4094 },
    isOpen: true,
    deliveryTime: "25-40 min",
    deliveryFee: 3.99
  }
];
let orders: any[] = [];
let deliveryAgents: any[] = [];
let menuItems: any[] = [
  {
    id: "item-1",
    restaurantId: "rest-1",
    name: "Margherita Pizza",
    description: "Classic pizza with tomato sauce, mozzarella, and fresh basil",
    price: 14.99,
    category: "main",
    isAvailable: true
  },
  {
    id: "item-2",
    restaurantId: "rest-2",
    name: "Salmon Sashimi",
    description: "Fresh salmon sashimi, 6 pieces",
    price: 18.99,
    category: "main",
    isAvailable: true
  }
];

let authToken = "mock-jwt-token-12345";

// Health checks
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'food-delivery-mock-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// USER SERVICE APIS (Port 3001)
if (process.env.SERVICE_TYPE === 'user' || !process.env.SERVICE_TYPE) {
  
  // Auth endpoints
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, password, name, phone, address } = req.body;
    
    const user = {
      id: `user-${Date.now()}`,
      email,
      name,
      phone,
      address,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token: authToken
      }
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token: authToken
      }
    });
  });

  // Restaurant discovery
  app.get('/api/restaurants', (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    
    res.json({
      success: true,
      data: restaurants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: restaurants.length,
        pages: Math.ceil(restaurants.length / Number(limit))
      }
    });
  });

  app.get('/api/restaurants/search', (req: Request, res: Response) => {
    const { lat, lng, radius, cuisine } = req.query;
    
    let filtered = restaurants;
    
    if (cuisine) {
      filtered = filtered.filter(r => r.cuisine.toLowerCase().includes((cuisine as string).toLowerCase()));
    }
    
    res.json({
      success: true,
      data: filtered
    });
  });

  app.get('/api/restaurants/:restaurantId', (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const restaurant = restaurants.find(r => r.id === restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    res.json({
      success: true,
      data: restaurant
    });
  });

  app.get('/api/restaurants/:restaurantId/menu', (req: Request, res: Response) => {
    const { restaurantId } = req.params;
    const restaurant = restaurants.find(r => r.id === restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }
    
    const menu = menuItems.filter(item => item.restaurantId === restaurantId);
    
    res.json({
      success: true,
      data: menu
    });
  });

  // Order management
  app.post('/api/orders', (req: Request, res: Response) => {
    const { restaurantId, items, deliveryAddress, paymentMethod } = req.body;
    
    const order = {
      id: `order-${Date.now()}`,
      userId: 'user-1',
      restaurantId,
      items,
      deliveryAddress,
      paymentMethod,
      status: 'pending',
      totalAmount: 29.98,
      deliveryFee: 2.99,
      estimatedDeliveryTime: new Date(Date.now() + 45 * 60000).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    orders.push(order);
    
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  });

  app.get('/api/orders/:orderId', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  });

  app.get('/api/orders', (req: Request, res: Response) => {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filtered = orders;
    
    if (status) {
      filtered = filtered.filter(o => o.status === status);
    }
    
    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / Number(limit))
      }
    });
  });

  app.put('/api/orders/:orderId/cancel', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = 'cancelled';
    order.cancellationReason = reason;
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  });

  // User profile
  app.get('/api/user/profile', (req: Request, res: Response) => {
    const user = users[0] || {
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
      phone: '+1234567890',
      address: '123 Main St, City, State'
    };
    
    res.json({
      success: true,
      data: user
    });
  });

  app.put('/api/user/profile', (req: Request, res: Response) => {
    const updates = req.body;
    
    if (users[0]) {
      Object.assign(users[0], updates);
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: users[0]
    });
  });
}

// RESTAURANT SERVICE APIS (Port 3002)
if (process.env.SERVICE_TYPE === 'restaurant' || !process.env.SERVICE_TYPE) {
  
  // Menu management
  app.get('/api/menu', (req: Request, res: Response) => {
    const { category, available } = req.query;
    
    let filtered = menuItems;
    
    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (available) {
      filtered = filtered.filter(item => item.isAvailable === (available === 'true'));
    }
    
    res.json({
      success: true,
      data: filtered
    });
  });

  app.post('/api/menu', (req: Request, res: Response) => {
    const menuItem = {
      id: `item-${Date.now()}`,
      restaurantId: 'rest-1',
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    menuItems.push(menuItem);
    
    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });
  });

  app.put('/api/menu/:menuItemId', (req: Request, res: Response) => {
    const { menuItemId } = req.params;
    const updates = req.body;
    
    const itemIndex = menuItems.findIndex(item => item.id === menuItemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    Object.assign(menuItems[itemIndex], updates);
    
    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItems[itemIndex]
    });
  });

  app.delete('/api/menu/:menuItemId', (req: Request, res: Response) => {
    const { menuItemId } = req.params;
    
    const itemIndex = menuItems.findIndex(item => item.id === menuItemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }
    
    menuItems.splice(itemIndex, 1);
    
    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  });

  // Order processing
  app.get('/api/orders', (req: Request, res: Response) => {
    const { status, page = 1, limit = 10 } = req.query;
    
    let filtered = orders;
    
    if (status) {
      filtered = filtered.filter(o => o.status === status);
    }
    
    res.json({
      success: true,
      data: filtered,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filtered.length,
        pages: Math.ceil(filtered.length / Number(limit))
      }
    });
  });

  app.put('/api/orders/:orderId/status', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status, estimatedReadyTime, notes } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = status;
    if (estimatedReadyTime) order.estimatedReadyTime = estimatedReadyTime;
    if (notes) order.notes = notes;
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  });

  app.post('/api/orders/:orderId/accept', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { estimatedPreparationTime, notes } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = 'accepted';
    order.estimatedPreparationTime = estimatedPreparationTime;
    if (notes) order.notes = notes;
    
    res.json({
      success: true,
      message: 'Order accepted successfully',
      data: order
    });
  });

  app.post('/api/orders/:orderId/reject', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason, estimatedAvailableTime } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = 'rejected';
    order.rejectionReason = reason;
    if (estimatedAvailableTime) order.estimatedAvailableTime = estimatedAvailableTime;
    
    res.json({
      success: true,
      message: 'Order rejected',
      data: order
    });
  });

  // Analytics
  app.get('/api/analytics', (req: Request, res: Response) => {
    const { period = 'week' } = req.query;
    
    const analytics = {
      period,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
      topSellingItems: menuItems.slice(0, 5)
    };
    
    res.json({
      success: true,
      data: analytics
    });
  });

  app.get('/api/analytics/sales', (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    const salesReport = {
      startDate,
      endDate,
      totalSales: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      orderCount: orders.length,
      dailySales: [
        { date: '2024-01-01', sales: 245.67, orders: 12 },
        { date: '2024-01-02', sales: 334.89, orders: 18 },
        { date: '2024-01-03', sales: 189.34, orders: 9 }
      ]
    };
    
    res.json({
      success: true,
      data: salesReport
    });
  });
}

// DELIVERY SERVICE APIS (Port 3003)
if (process.env.SERVICE_TYPE === 'delivery' || !process.env.SERVICE_TYPE) {
  
  // Agent management
  app.get('/api/agents/profile', (req: Request, res: Response) => {
    const agent = {
      id: 'agent-1',
      userId: 'user-agent-1',
      vehicleType: 'motorcycle',
      licenseNumber: 'DL123456789',
      isActive: true,
      isAvailable: true,
      isOnDelivery: false,
      currentLat: 37.7749,
      currentLng: -122.4194,
      rating: 4.8,
      totalDeliveries: 145,
      totalEarnings: 2890.50
    };
    
    res.json({
      success: true,
      data: agent
    });
  });

  app.put('/api/agents/profile', (req: Request, res: Response) => {
    const updates = req.body;
    
    res.json({
      success: true,
      message: 'Agent profile updated successfully',
      data: { ...updates, id: 'agent-1' }
    });
  });

  app.put('/api/agents/location', (req: Request, res: Response) => {
    const { latitude, longitude, speed, bearing } = req.body;
    
    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  });

  app.put('/api/agents/availability', (req: Request, res: Response) => {
    const { isAvailable } = req.body;
    
    res.json({
      success: true,
      message: 'Availability updated successfully'
    });
  });

  app.get('/api/agents/active-delivery', (req: Request, res: Response) => {
    const activeDelivery = orders.find(o => o.status === 'assigned' || o.status === 'accepted');
    
    res.json({
      success: true,
      data: activeDelivery || null
    });
  });

  app.get('/api/agents/stats', (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    
    const stats = {
      period: { startDate, endDate },
      totalDeliveries: 145,
      totalEarnings: 2890.50,
      averageRating: 4.8,
      completionRate: 98.6,
      averageDeliveryTime: 28.5,
      totalDistance: 1250.8
    };
    
    res.json({
      success: true,
      data: stats
    });
  });

  // Delivery orders
  app.get('/api/orders/:orderId', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  });

  app.post('/api/orders/:orderId/accept', (req: Request, res: Response) => {
    const { orderId } = req.params;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = 'accepted';
    order.deliveryAgentId = 'agent-1';
    
    res.json({
      success: true,
      message: 'Order accepted successfully',
      data: order
    });
  });

  app.post('/api/orders/:orderId/reject', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Order rejected successfully'
    });
  });

  app.put('/api/orders/:orderId/status', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { status, notes, proofOfDelivery } = req.body;
    
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = status;
    if (notes) order.notes = notes;
    if (proofOfDelivery) order.proofOfDelivery = proofOfDelivery;
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  });
}

// Start the server
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_TYPE || 'all-services';

app.listen(PORT, () => {
  console.log(`🚀 Mock Food Delivery API (${SERVICE_NAME}) running on port ${PORT}`);
  console.log(`📚 Test the APIs with the Postman collection!`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
