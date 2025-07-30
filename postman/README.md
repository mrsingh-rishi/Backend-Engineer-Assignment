# 📬 Postman Collection for Food Delivery Backend

This directory contains comprehensive Postman collections for testing all APIs in the Food Delivery Backend system.

## 📁 Collection Files

### 🎯 Main Collection
- **`food-delivery-api-collection.json`** - Complete collection with all endpoints, examples, and tests

### 📊 Environment Files  
- **`development-environment.json`** - Development environment variables
- **`production-environment.json`** - Production environment variables (template)

### 📚 Documentation
- **`API-Examples.md`** - Detailed API usage examples
- **`Testing-Guide.md`** - Testing workflows and scenarios

## 🚀 Quick Start

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select `food-delivery-api-collection.json`
4. Import `development-environment.json` as environment

### 2. Set Environment
1. Click environment dropdown (top-right)
2. Select **"Food Delivery - Development"**
3. Verify all URLs are set correctly:
   - `user_service_url`: http://localhost:3001
   - `restaurant_service_url`: http://localhost:3002  
   - `delivery_service_url`: http://localhost:3003

### 3. Test APIs
1. Start with **🏥 Health Checks** folder
2. Run **👤 User Service APIs → 🔐 Authentication → Register User**
3. Follow the logical workflow through each service

## 📋 Collection Structure

```
📁 Food Delivery Backend API
├── 🏥 Health Checks
│   ├── User Service Health
│   ├── Restaurant Service Health
│   └── Delivery Service Health
├── 👤 User Service APIs
│   ├── 🔐 Authentication
│   │   ├── Register User
│   │   ├── Login User
│   │   ├── Get User Profile
│   │   ├── Update User Profile
│   │   └── Logout User
│   ├── 📦 Order Management
│   │   ├── Create Order
│   │   ├── Get User Orders
│   │   ├── Get Order by ID
│   │   └── Cancel Order
│   └── ⭐ Rating & Reviews
│       ├── Rate Restaurant
│       ├── Rate Delivery
│       └── Get User Reviews
├── 🏪 Restaurant Service APIs
│   ├── 🔍 Restaurant Discovery
│   │   ├── Get All Restaurants
│   │   ├── Get Restaurant by ID
│   │   ├── Search Restaurants
│   │   └── Filter by Cuisine
│   ├── 🍽️ Menu Management
│   │   ├── Get Restaurant Menu
│   │   ├── Get Menu Item
│   │   ├── Add Menu Item
│   │   ├── Update Menu Item
│   │   └── Delete Menu Item
│   ├── 🏪 Restaurant Management
│   │   ├── Create Restaurant
│   │   ├── Update Restaurant
│   │   ├── Get Restaurant Profile
│   │   └── Update Operating Hours
│   └── 📋 Order Processing
│       ├── Get Restaurant Orders
│       ├── Update Order Status
│       ├── Accept Order
│       └── Reject Order
└── 🚚 Delivery Agent Service APIs
    ├── 🔐 Agent Authentication
    │   ├── Register Agent
    │   ├── Login Agent
    │   ├── Get Agent Profile
    │   └── Update Agent Profile
    ├── 📍 Location & Availability
    │   ├── Update Location
    │   ├── Set Availability
    │   ├── Get Current Status
    │   └── Update Vehicle Info
    └── 🚚 Delivery Management
        ├── Get Available Deliveries
        ├── Accept Delivery
        ├── Update Delivery Status
        ├── Complete Delivery
        └── Get Delivery History
```

## 🔧 Environment Variables

The collection uses the following environment variables:

### 🌐 Service URLs
- `user_service_url` - User Service base URL
- `restaurant_service_url` - Restaurant Service base URL  
- `delivery_service_url` - Delivery Agent Service base URL

### 🔑 Authentication
- `auth_token` - JWT token for user authentication
- `agent_token` - JWT token for delivery agent authentication

### 📊 Dynamic Data
- `user_id` - Current user ID
- `restaurant_id` - Current restaurant ID
- `order_id` - Current order ID
- `agent_id` - Current delivery agent ID
- `timestamp` - Current timestamp for dynamic data

## 🧪 Testing Workflows

### 1. **Complete Order Flow**
```
Register User → Login → Browse Restaurants → Create Order → 
Restaurant Accepts → Agent Delivers → Order Complete
```

### 2. **Restaurant Operations**
```
Create Restaurant → Add Menu Items → Receive Orders → 
Process Orders → Update Status
```

### 3. **Delivery Operations** 
```
Register Agent → Set Available → Accept Delivery → 
Update Location → Complete Delivery
```

## 📝 Example Requests

### User Registration
```json
POST {{user_service_url}}/api/auth/register
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "phone": "+1-555-0123",
  "address": "123 Main Street, Anytown, USA"
}
```

### Create Order
```json
POST {{user_service_url}}/api/orders
{
  "restaurantId": "rest_123",
  "items": [
    {
      "menuItemId": "item_456",
      "quantity": 2,
      "price": 12.99,
      "customizations": ["Extra cheese", "No onions"]
    }
  ],
  "deliveryAddress": "123 Main Street, Anytown, USA",
  "paymentMethod": "credit_card",
  "specialInstructions": "Ring doorbell twice"
}
```

### Update Delivery Status
```json
PUT {{delivery_service_url}}/deliveries/{{order_id}}/status
{
  "status": "in_transit",
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "estimatedArrival": "2025-07-31T15:30:00Z"
}
```

## 🛠️ Pre-request Scripts

The collection includes automatic setup scripts:
- Auto-sets base URLs if not configured
- Generates dynamic timestamps
- Extracts tokens from responses
- Sets up test data

## ✅ Test Scripts

Each request includes test scripts to:
- Verify HTTP status codes
- Validate response structure
- Extract and store tokens/IDs
- Check business logic

## 🔄 Running Tests

### Individual Tests
- Right-click any request → **Send**
- View results in **Test Results** tab

### Folder Tests
- Right-click any folder → **Run Folder**
- Configure iterations and delays

### Collection Runner
1. Click **Runner** button
2. Select collection/folder
3. Choose environment
4. Set iterations and delay
5. Click **Run**

## 🐛 Troubleshooting

### Common Issues

1. **Service Not Running**
   - Check health endpoints first
   - Ensure all services are started
   - Verify port numbers

2. **Authentication Errors**
   - Run login request first
   - Check token is saved in environment
   - Verify token format in headers

3. **Environment Variables**
   - Ensure correct environment is selected
   - Check all required variables are set
   - Verify URLs don't have trailing slashes

### Error Codes

- **401 Unauthorized** - Authentication required or invalid token
- **403 Forbidden** - Insufficient permissions  
- **404 Not Found** - Resource doesn't exist
- **400 Bad Request** - Invalid request data
- **500 Internal Server Error** - Server-side issue

## 📊 Performance Testing

Use Postman's performance features:
- **Collection Runner** for load testing
- **Monitors** for uptime checking
- **Newman** for CI/CD integration

## 🔗 Additional Resources

- [Postman Documentation](https://learning.postman.com/)
- [API Testing Best Practices](https://www.postman.com/api-testing/)
- [Newman CLI Tool](https://github.com/postmanlabs/newman)

## 🤝 Contributing

To update the collection:
1. Make changes in Postman
2. Export updated collection
3. Replace the JSON file
4. Update this README if needed
5. Commit changes to repository

---

**Happy Testing!** 🚀
