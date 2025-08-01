# 🐳 Docker Deployment Guide

## 📦 Quick Docker Deployment

### Option 1: Local Docker Build & Run
```bash
# Navigate to production directory
cd production

# Build the Docker image
docker build -t food-delivery-api .

# Run the container
docker run -p 3000:3000 --name food-delivery-api -d food-delivery-api

# Check if it's running
docker ps
curl http://localhost:3000/health
```

### Option 2: Docker Compose (Recommended)
```bash
# From production directory
cd production
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ☁️ Cloud Deployment Options

### 🚀 Vercel Deployment (Serverless)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel --prod

# Follow the prompts:
# - Set up and deploy: Yes
# - Which scope: Your account
# - Link to existing project: No
# - Project name: food-delivery-api
# - Directory: ./
```

### 🌊 Railway Deployment (Docker)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up

# Set environment variables
railway variables set NODE_ENV=production
```

### 🔵 DigitalOcean App Platform
1. Push code to GitHub
2. Go to DigitalOcean → Apps → Create App
3. Connect GitHub repo
4. Select: Web Service
5. Configure:
   - Source Directory: `production`
   - Build Command: `docker build -t app .`
   - Run Command: `docker run -p 8080:3000 app`
   - Port: 3000

### 🟢 Heroku (Container Registry)
```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create food-delivery-api-your-name

# Set stack to container
heroku stack:set container -a food-delivery-api-your-name

# Deploy
git subtree push --prefix production heroku main
```

### ☁️ AWS ECS (Elastic Container Service)
1. Push image to ECR:
```bash
# Build and tag
docker build -t food-delivery-api ./production

# Tag for ECR
docker tag food-delivery-api:latest your-account.dkr.ecr.region.amazonaws.com/food-delivery-api:latest

# Push to ECR
docker push your-account.dkr.ecr.region.amazonaws.com/food-delivery-api:latest
```

2. Create ECS Service with the image

## 🔧 Environment Configuration

### Required Environment Variables
```env
NODE_ENV=production
PORT=3000
```

### Optional Environment Variables
```env
JWT_SECRET=your-secret-key
CORS_ORIGINS=https://yourdomain.com,https://anotherdomain.com
```

## 📊 Health Checks & Monitoring

### Health Check Endpoints
- `GET /health` - Basic health check
- `GET /api/health` - Detailed service status

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
```

### Monitoring Commands
```bash
# Check container status
docker ps

# View logs
docker logs food-delivery-api-prod

# Monitor resources
docker stats food-delivery-api-prod

# Exec into container
docker exec -it food-delivery-api-prod sh
```

## 🔄 CI/CD Pipeline Example (GitHub Actions)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    paths: [ 'production/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway up --service ${{ secrets.RAILWAY_SERVICE_ID }}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port binding issues**
   ```bash
   # Check if port 3000 is in use
   lsof -i :3000
   
   # Use different port
   docker run -p 8080:3000 food-delivery-api
   ```

2. **Container won't start**
   ```bash
   # Check logs
   docker logs food-delivery-api-prod
   
   # Debug with interactive shell
   docker run -it food-delivery-api sh
   ```

3. **Memory issues**
   ```bash
   # Limit memory usage
   docker run -m 512m food-delivery-api
   ```

## 🎯 Performance Optimization

### Production Dockerfile Optimizations
- Multi-stage builds for smaller images
- Non-root user for security
- Health checks for reliability
- .dockerignore for faster builds

### Resource Limits
```yaml
# docker-compose.yml
services:
  food-delivery-api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## 📝 Next Steps

1. **Choose your deployment platform**
2. **Set up monitoring and logging**
3. **Configure SSL/TLS certificates**
4. **Set up automated backups**
5. **Implement CI/CD pipeline**

---

🚀 **Your API is now ready for production deployment with Docker!**
