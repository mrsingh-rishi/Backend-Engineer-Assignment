# Food Delivery Backend - API Testing Guide

## Running Services

All three microservices are now running:

- **User Service**: http://localhost:3001
- **Restaurant Service**: http://localhost:3002  
- **Delivery Agent Service**: http://localhost:3003

### Service Status
```bash
# Check if all services are healthy
curl http://localhost:3001/health
curl http://localhost:3002/health  
curl http://localhost:3003/health
```

## Postman Collection

Import the `postman-collection.json` file into Postman to test all APIs.

### Collection Structure

1. **User Service APIs**
   - Authentication (register, login)
   - Profile management
   - Order management

2. **Restaurant Service APIs**
   - Restaurant CRUD operations
   - Menu management
   - Order status updates

3. **Delivery Agent Service APIs**
   - Agent registration/login
   - Profile and location updates
   - Delivery management

### Environment Variables

Set these variables in Postman:

- `USER_SERVICE_URL`: http://localhost:3001
- `RESTAURANT_SERVICE_URL`: http://localhost:3002
- `DELIVERY_SERVICE_URL`: http://localhost:3003
- `auth_token`: (will be set automatically after login)
- `agent_token`: (will be set automatically after agent login)

### Testing Workflow

1. **Setup Phase**
   - Register a user → Login → Get auth token
   - Register a delivery agent → Login → Get agent token
   - Create a restaurant → Add menu items

2. **Order Flow**
   - User places an order
   - Restaurant confirms the order
   - Delivery agent accepts the order
   - Track order status updates

3. **Management Operations**
   - Update user profile
   - Manage restaurant menu
   - Update agent availability

## Quick API Tests

### User Registration
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "phone": "+1234567890"
  }'
```

### List Restaurants
```bash
curl http://localhost:3002/restaurants
```

### Register Delivery Agent
```bash
curl -X POST http://localhost:3003/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mike Driver",
    "phone": "+9876543210",
    "vehicleType": "bike"
  }'
```

## Mock Data

The services include sample data:
- 1 sample user
- 1 sample restaurant with menu items
- 1 sample delivery agent
- Sample orders for testing

## Stopping Services

To stop all services:
```bash
# Find and kill the processes
lsof -ti:3001,3002,3003 | xargs kill
```

## Infrastructure (Optional)

Docker containers are also available:
```bash
# Start infrastructure only
docker-compose up -d postgres redis kafka zookeeper

# Stop infrastructure
docker-compose down
```

The mock servers work independently and don't require the Docker infrastructure.
