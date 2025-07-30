# Food Delivery Backend - Microservices Architecture

A production-ready, scalable food delivery backend built with TypeScript, Express.js, PostgreSQL, Redis, and Kafka following microservices architecture.

## 🏗️ Architecture Overview

The system consists of three main microservices:

### 1. User Service (Port: 3001)
- User authentication and management
- Retrieve available restaurants
- Place orders
- Submit ratings for orders and delivery agents

### 2. Restaurant Service (Port: 3002)
- Restaurant management
- Menu and pricing updates
- Online/offline status management
- Order acceptance/rejection
- Auto-assign delivery agents to accepted orders

### 3. Delivery Agent Service (Port: 3003)
- Delivery agent management
- Update delivery status (assigned, picked up, delivered)
- Location tracking

## 🛠️ Tech Stack

- **Backend**: TypeScript, Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Message Queue**: Kafka
- **Validation**: Zod
- **Documentation**: Swagger (OpenAPI)
- **Containerization**: Docker & Docker Compose
- **Testing**: Postman Collection

## 📋 Prerequisites

- Node.js (v18 or higher)
- Docker & Docker Compose
- PostgreSQL
- Redis
- Kafka (optional, for production scalability)

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd backend-assignment-wellfound
```

2. Start all services:
```bash
docker-compose up --build
```

3. Services will be available at:
   - User Service: http://localhost:3001
   - Restaurant Service: http://localhost:3002
   - Delivery Agent Service: http://localhost:3003
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - Kafka: localhost:9092

### Manual Setup

1. Install dependencies for each service:
```bash
# Install dependencies for all services
npm run install:all
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start PostgreSQL and Redis:
```bash
docker-compose up postgres redis -d
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start all services in development mode:
```bash
npm run dev
```

## 📚 API Documentation

### User Service APIs

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

#### Restaurants
- `GET /api/restaurants` - Get available restaurants
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu

#### Orders
- `POST /api/orders` - Place a new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/cancel` - Cancel an order

#### Ratings
- `POST /api/ratings` - Submit rating for order/delivery agent
- `GET /api/ratings` - Get user's ratings

### Restaurant Service APIs

#### Restaurant Management
- `PUT /api/restaurant/status` - Update online/offline status
- `GET /api/restaurant/profile` - Get restaurant profile
- `PUT /api/restaurant/profile` - Update restaurant profile

#### Menu Management
- `GET /api/menu` - Get restaurant menu
- `POST /api/menu/items` - Add menu item
- `PUT /api/menu/items/:id` - Update menu item
- `DELETE /api/menu/items/:id` - Delete menu item

#### Order Management
- `GET /api/orders` - Get restaurant orders
- `PUT /api/orders/:id/accept` - Accept an order
- `PUT /api/orders/:id/reject` - Reject an order
- `PUT /api/orders/:id/ready` - Mark order as ready

### Delivery Agent Service APIs

#### Agent Management
- `POST /api/auth/register` - Register delivery agent
- `POST /api/auth/login` - Agent login
- `GET /api/profile` - Get agent profile
- `PUT /api/profile` - Update agent profile

#### Delivery Management
- `GET /api/deliveries` - Get assigned deliveries
- `PUT /api/deliveries/:id/status` - Update delivery status
- `PUT /api/location` - Update current location

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Restaurants Table
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT NOT NULL,
  cuisine_type VARCHAR(50),
  is_online BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Menu Items Table
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Delivery Agents Table
```sql
CREATE TABLE delivery_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_available BOOLEAN DEFAULT true,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  delivery_agent_id UUID REFERENCES delivery_agents(id),
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_address TEXT NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Ratings Table
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id),
  delivery_agent_id UUID REFERENCES delivery_agents(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Message Queue Architecture

### Kafka Topics

1. **order-placed** - When a user places an order
2. **order-accepted** - When restaurant accepts an order
3. **order-rejected** - When restaurant rejects an order
4. **delivery-assigned** - When delivery agent is assigned
5. **delivery-status-updated** - When delivery status changes
6. **rating-submitted** - When user submits a rating

### Event Flow

1. User places order → `order-placed` event
2. Restaurant receives notification → Accept/Reject
3. If accepted → `order-accepted` event → Auto-assign delivery agent
4. Delivery agent receives assignment → `delivery-assigned` event
5. Status updates flow through respective events

## 📦 Docker Setup

### Individual Service Dockerfiles

Each service has its own Dockerfile optimized for production:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### Docker Compose

The `docker-compose.yml` includes:
- All three microservices
- PostgreSQL database
- Redis cache
- Kafka with Zookeeper
- Environment variables
- Health checks
- Volume mounts

## 🧪 Testing

### Postman Collection

Import the Postman collection from `./postman/Food-Delivery-API.postman_collection.json`

The collection includes:
- All API endpoints for each service
- Pre-request scripts for authentication
- Test scripts for response validation
- Environment variables setup

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific service
npm run test:user
npm run test:restaurant
npm run test:delivery
```

## 🚀 Deployment

### Heroku Deployment

1. Create Heroku apps for each service:
```bash
heroku create food-delivery-user-service
heroku create food-delivery-restaurant-service
heroku create food-delivery-delivery-service
```

2. Set environment variables:
```bash
heroku config:set NODE_ENV=production --app food-delivery-user-service
heroku config:set DATABASE_URL=<your-postgres-url> --app food-delivery-user-service
```

3. Deploy:
```bash
git subtree push --prefix=services/user-service heroku-user main
git subtree push --prefix=services/restaurant-service heroku-restaurant main
git subtree push --prefix=services/delivery-service heroku-delivery main
```

### Live Deployment URLs

- User Service: https://food-delivery-user-service.herokuapp.com
- Restaurant Service: https://food-delivery-restaurant-service.herokuapp.com
- Delivery Agent Service: https://food-delivery-delivery-service.herokuapp.com

## 📋 Environment Variables

### User Service
```env
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/food_delivery
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

### Restaurant Service
```env
PORT=3002
DATABASE_URL=postgresql://username:password@localhost:5432/food_delivery
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

### Delivery Agent Service
```env
PORT=3003
DATABASE_URL=postgresql://username:password@localhost:5432/food_delivery
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-jwt-secret
NODE_ENV=development
```

## 🏗️ System Design Decisions

### 1. Microservices Architecture
- **Why**: Better scalability, independent deployments, technology diversity
- **How**: Separate services with their own databases and business logic

### 2. Event-Driven Architecture
- **Why**: Loose coupling, better scalability, resilience
- **How**: Kafka for asynchronous communication between services

### 3. Caching Strategy
- **Why**: Improved performance, reduced database load
- **How**: Redis for caching frequently accessed data (restaurant listings, user sessions)

### 4. Database Design
- **Why**: ACID compliance, complex relationships, structured data
- **How**: PostgreSQL with proper indexing and foreign key constraints

### 5. Authentication
- **Why**: Stateless, scalable, secure
- **How**: JWT tokens with proper expiration and refresh mechanisms

## 📈 Scalability Considerations

1. **Horizontal Scaling**: Each service can be scaled independently
2. **Database Sharding**: Future implementation for high load
3. **Load Balancing**: Nginx/HAProxy for production
4. **Caching**: Multi-level caching strategy
5. **CDN**: For static assets and images
6. **Monitoring**: Prometheus + Grafana for metrics

## 🔍 Monitoring & Logging

### Health Checks
- `/health` endpoint for each service
- Database connectivity checks
- Redis connectivity checks
- Kafka connectivity checks

### Logging
- Structured logging with Winston
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized logging with ELK stack (production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the coding standards
4. Write tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, email support@fooddelivery.com or create an issue in the repository.
