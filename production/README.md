# Food Delivery API - Production Ready

This is a production-ready Food Delivery API server that combines all three microservices into a single deployable application.

## 🚀 Quick Deploy

### Deploy to Render (Recommended - Free)
1. Fork this repository or create a new GitHub repo with the `production/` folder contents
2. Go to [Render.com](https://render.com) and create a new account
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Use these settings:
   - **Root Directory**: `production` (if deploying from main repo) or leave empty if production is root
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node.js

### Deploy to Railway
```bash
npm run deploy:railway
```

### Deploy to Vercel
```bash
npm run deploy:vercel
```

## 🧪 API Testing

Run comprehensive tests:
```bash
node test-api.js
```

**Latest Test Results: 15/15 tests passing (100% success rate)**

## 📊 API Endpoints

### Health & Info
- `GET /` - API documentation
- `GET /health` - Simple health check
- `GET /health/detailed` - Detailed service status

### User Service
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile (requires auth)

### Restaurant Service
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id/menu` - Get restaurant menu

### Order Service
- `POST /api/orders` - Create new order (requires auth)
- `GET /api/orders/user` - Get user orders (requires auth)
- `PUT /api/orders/:id/status` - Update order status

### Delivery Service
- `POST /api/delivery/agents/register` - Register delivery agent
- `PUT /api/delivery/agents/:id/location` - Update agent location
- `POST /api/delivery/accept` - Accept delivery assignment

## 🔐 Authentication

The API uses JWT-like tokens. Get a token by registering/logging in, then include it in headers:
```
Authorization: user_token_1_1754032...
```

## 🌍 Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

## 📝 Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Run tests
npm test
```
