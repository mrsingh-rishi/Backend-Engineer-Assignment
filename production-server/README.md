# 🚀 Food Delivery API - Production Server

This is the production-ready server that combines all three microservices into a single deployable application for easy hosting on platforms like Render, Railway, or Vercel.

## Features

- ✅ All three services in one application (User, Restaurant, Delivery)
- ✅ Environment-based configuration
- ✅ Health checks and monitoring endpoints
- ✅ CORS enabled for frontend integration
- ✅ Comprehensive error handling
- ✅ JWT authentication
- ✅ RESTful API design

## Environment Variables

Set these in your deployment platform:

- `PORT` - Server port (defaults to 3000)
- `NODE_ENV` - Environment (production/development)
- `JWT_SECRET` - Secret for JWT tokens (auto-generated if not provided)

## API Endpoints

### Health & Monitoring
- `GET /health` - Overall system health
- `GET /api/health` - Detailed service health

### User Service APIs
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders

### Restaurant Service APIs  
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id/menu` - Get restaurant menu
- `PUT /api/orders/:id/status` - Update order status

### Delivery Service APIs
- `POST /api/agents/register` - Register delivery agent
- `PUT /api/agents/location` - Update agent location
- `POST /api/deliveries/:id/accept` - Accept delivery

## Quick Deploy

### Render
1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `node production-server.js`
4. Deploy!

### Railway
1. Connect GitHub repository
2. Railway auto-detects Node.js
3. Deploys automatically

### Vercel (Serverless)
1. Connect GitHub repository  
2. Vercel auto-deploys
3. Uses api/ folder structure

## Local Development

```bash
npm install
node production-server.js
```

Server will be available at http://localhost:3000
