# Food Delivery Backend - System Design Document

## 1. Executive Summary

This document outlines the architecture and design decisions for a scalable food delivery backend system built using microservices architecture. The system consists of three core services: User Service, Restaurant Service, and Delivery Agent Service, each designed to handle specific business domains while maintaining loose coupling through event-driven communication.

## 2. Architecture Overview

### 2.1 Microservices Architecture

The system follows a microservices architecture pattern with the following key principles:

- **Domain-Driven Design**: Each service represents a bounded context
- **Single Responsibility**: Each service has a specific business purpose
- **Loose Coupling**: Services communicate through well-defined APIs and events
- **High Cohesion**: Related functionality is grouped within services
- **Independent Deployment**: Each service can be deployed independently

### 2.2 Service Breakdown

#### 2.2.1 User Service (Port: 3001)
**Responsibilities:**
- User authentication and authorization
- User profile management
- Restaurant discovery and browsing
- Order placement and tracking
- Rating and review submission

**Key Features:**
- JWT-based authentication
- Restaurant search and filtering
- Order management with status tracking
- Rating system for restaurants and delivery agents
- Comprehensive API documentation with Swagger

#### 2.2.2 Restaurant Service (Port: 3002)
**Responsibilities:**
- Restaurant authentication and profile management
- Menu management (CRUD operations)
- Online/offline status management
- Order acceptance/rejection
- Delivery agent assignment

**Key Features:**
- Restaurant dashboard functionality
- Dynamic menu pricing
- Order queue management
- Automatic delivery agent assignment
- Real-time status updates

#### 2.2.3 Delivery Agent Service (Port: 3003)
**Responsibilities:**
- Delivery agent authentication and profile management
- Location tracking and updates
- Delivery status management
- Route optimization support

**Key Features:**
- Real-time location tracking
- Delivery status workflow
- Agent availability management
- Performance metrics tracking

## 3. Technology Stack

### 3.1 Backend Technologies
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript (v5.3+)
- **Framework**: Express.js (v4.18+)
- **Database**: PostgreSQL (v15+)
- **Cache**: Redis (v7+)
- **Message Broker**: Kafka (v2.8+)
- **Validation**: Zod (v3.22+)
- **Documentation**: Swagger/OpenAPI (v3.0)

### 3.2 Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Management**: PM2 (production)
- **Monitoring**: Winston (logging)
- **Testing**: Jest & Supertest

### 3.3 External Services
- **Maps API**: Google Maps API (for location services)
- **Notifications**: WebSocket/Server-Sent Events
- **File Storage**: AWS S3 (for images)

## 4. Database Design

### 4.1 Database Strategy
- **Single Database Approach**: All services share a PostgreSQL database but access only their domain-specific tables
- **Future Consideration**: Database per service for true microservices isolation

### 4.2 Core Tables

#### Users Table
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

#### Restaurants Table
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
    opening_time TIME,
    closing_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Menu Items Table
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

#### Orders Table
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

### 4.3 Indexing Strategy
- Primary keys (UUID) with B-tree indexes
- Foreign key indexes for join performance
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., is_online = true)

## 5. Event-Driven Architecture

### 5.1 Kafka Topics

| Topic | Purpose | Producer | Consumer |
|-------|---------|----------|----------|
| `order-placed` | User places new order | User Service | Restaurant Service |
| `order-accepted` | Restaurant accepts order | Restaurant Service | User Service, Delivery Service |
| `order-rejected` | Restaurant rejects order | Restaurant Service | User Service |
| `delivery-assigned` | Delivery agent assigned | Restaurant Service | User Service, Delivery Service |
| `delivery-status-updated` | Delivery status change | Delivery Service | User Service, Restaurant Service |
| `rating-submitted` | User submits rating | User Service | Restaurant Service, Delivery Service |

### 5.2 Event Flow Examples

#### Order Placement Flow
1. User places order → `order-placed` event
2. Restaurant receives notification
3. Restaurant accepts → `order-accepted` event
4. System assigns delivery agent → `delivery-assigned` event
5. Agent updates status → `delivery-status-updated` events
6. Order delivered → User can rate → `rating-submitted` event

## 6. API Design

### 6.1 RESTful API Principles
- Resource-based URLs
- HTTP methods for operations (GET, POST, PUT, DELETE)
- Consistent response format
- Proper HTTP status codes
- Pagination for list endpoints

### 6.2 Response Format
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

### 6.3 Authentication
- JWT tokens for stateless authentication
- Role-based access control (user, restaurant, delivery_agent)
- Token expiration and refresh mechanism

## 7. Caching Strategy

### 7.1 Redis Usage
- **Session Storage**: User sessions and authentication tokens
- **Data Caching**: Frequently accessed data (restaurant lists, menu items)
- **Rate Limiting**: API rate limiting per user/service
- **Real-time Data**: Order status, delivery tracking

### 7.2 Cache Patterns
- **Cache-Aside**: Application manages cache
- **Write-Through**: Write to cache and database simultaneously
- **TTL Strategy**: Time-based expiration for different data types

## 8. Scalability Considerations

### 8.1 Horizontal Scaling
- **Load Balancing**: Nginx/HAProxy for request distribution
- **Service Scaling**: Independent scaling of each microservice
- **Database Scaling**: Read replicas, connection pooling

### 8.2 Performance Optimization
- **Database Optimization**: Proper indexing, query optimization
- **Caching**: Multi-level caching strategy
- **Async Processing**: Event-driven architecture for non-blocking operations

### 8.3 Future Scalability
- **Database Sharding**: Horizontal partitioning by geography/user
- **CQRS**: Separate read and write models
- **Event Sourcing**: For audit trails and state reconstruction

## 9. Security Considerations

### 9.1 Authentication & Authorization
- JWT tokens with proper expiration
- Role-based access control (RBAC)
- Password hashing with bcrypt

### 9.2 Data Protection
- Input validation with Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection with proper sanitization
- CORS configuration for cross-origin requests

### 9.3 API Security
- Rate limiting to prevent abuse
- HTTPS enforcement in production
- API key management for external services
- Audit logging for sensitive operations

## 10. Monitoring & Observability

### 10.1 Logging Strategy
- **Structured Logging**: JSON format with Winston
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Centralized Logging**: ELK stack in production
- **Correlation IDs**: Request tracking across services

### 10.2 Health Checks
- Application health endpoints
- Database connectivity checks
- External service dependency checks
- Kubernetes-ready health probes

### 10.3 Metrics & Monitoring
- **Application Metrics**: Response times, error rates
- **Business Metrics**: Orders per minute, conversion rates
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Alerting**: Automated alerts for critical issues

## 11. Deployment Strategy

### 11.1 Containerization
- Docker containers for each service
- Multi-stage builds for optimization
- Health checks in Dockerfiles
- Security scanning of images

### 11.2 Orchestration
- Docker Compose for local development
- Kubernetes for production deployment
- Service mesh (Istio) for advanced networking

### 11.3 CI/CD Pipeline
- **Continuous Integration**: Automated testing, linting
- **Continuous Deployment**: Automated deployment to staging/production
- **Blue-Green Deployment**: Zero-downtime deployments
- **Rollback Strategy**: Quick rollback capabilities

## 12. Testing Strategy

### 12.1 Testing Pyramid
- **Unit Tests**: Individual functions and methods
- **Integration Tests**: Service interactions and database
- **End-to-End Tests**: Complete user workflows
- **Contract Tests**: API contract validation

### 12.2 Test Automation
- Jest for unit and integration testing
- Supertest for API testing
- Test databases for isolation
- CI/CD integration for automated testing

## 13. Error Handling & Resilience

### 13.1 Error Handling
- Centralized error handling middleware
- Proper HTTP status codes
- User-friendly error messages
- Error logging and tracking

### 13.2 Resilience Patterns
- **Circuit Breaker**: Prevent cascading failures
- **Retry Logic**: Automatic retry with exponential backoff
- **Timeout Management**: Prevent hanging requests
- **Graceful Degradation**: Fallback mechanisms

## 14. Development Guidelines

### 14.1 Code Quality
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Clean Architecture principles
- SOLID design principles

### 14.2 Documentation
- Comprehensive README files
- API documentation with Swagger
- Code comments for business logic
- Architecture decision records (ADRs)

## 15. Future Enhancements

### 15.1 Technical Improvements
- GraphQL API for flexible data fetching
- WebSocket for real-time updates
- Machine learning for recommendations
- Advanced analytics and reporting

### 15.2 Business Features
- Multi-tenant architecture
- International expansion support
- Advanced promotional systems
- Loyalty programs and rewards

## 16. Conclusion

This system design provides a solid foundation for a scalable food delivery platform. The microservices architecture ensures maintainability and scalability, while the event-driven approach enables loose coupling between services. The comprehensive technology stack supports both current requirements and future growth, making this system production-ready and enterprise-grade.
