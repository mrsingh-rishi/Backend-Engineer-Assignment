#!/bin/bash

# Food Delivery Backend Deployment Script
# Supports Heroku, Render, and Railway deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git is required but not installed."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required but not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is required but not installed."
        exit 1
    fi
    
    print_success "All requirements met."
}

# Deploy to Heroku
deploy_heroku() {
    print_status "Deploying to Heroku..."
    
    if ! command -v heroku &> /dev/null; then
        print_error "Heroku CLI is required. Install from: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Login check
    if ! heroku auth:whoami &> /dev/null; then
        print_status "Please login to Heroku..."
        heroku login
    fi
    
    # Create apps
    print_status "Creating Heroku apps..."
    
    APP_SUFFIX=${HEROKU_APP_SUFFIX:-$(date +%s)}
    USER_APP="food-delivery-user-${APP_SUFFIX}"
    RESTAURANT_APP="food-delivery-restaurant-${APP_SUFFIX}"
    DELIVERY_APP="food-delivery-delivery-${APP_SUFFIX}"
    
    heroku create $USER_APP --region us || print_warning "User app might already exist"
    heroku create $RESTAURANT_APP --region us || print_warning "Restaurant app might already exist"
    heroku create $DELIVERY_APP --region us || print_warning "Delivery app might already exist"
    
    # Add PostgreSQL addon
    print_status "Adding PostgreSQL addon..."
    heroku addons:create heroku-postgresql:essential-0 --app $USER_APP || print_warning "PostgreSQL addon might already exist"
    heroku addons:create heroku-postgresql:essential-0 --app $RESTAURANT_APP || print_warning "PostgreSQL addon might already exist"
    heroku addons:create heroku-postgresql:essential-0 --app $DELIVERY_APP || print_warning "PostgreSQL addon might already exist"
    
    # Add Redis addon
    print_status "Adding Redis addon..."
    heroku addons:create heroku-redis:mini --app $USER_APP || print_warning "Redis addon might already exist"
    heroku addons:create heroku-redis:mini --app $RESTAURANT_APP || print_warning "Redis addon might already exist"
    heroku addons:create heroku-redis:mini --app $DELIVERY_APP || print_warning "Redis addon might already exist"
    
    # Set environment variables
    print_status "Setting environment variables..."
    
    JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}
    
    # User Service
    heroku config:set NODE_ENV=production --app $USER_APP
    heroku config:set PORT=80 --app $USER_APP
    heroku config:set JWT_SECRET="$JWT_SECRET" --app $USER_APP
    
    # Restaurant Service
    heroku config:set NODE_ENV=production --app $RESTAURANT_APP
    heroku config:set PORT=80 --app $RESTAURANT_APP
    heroku config:set JWT_SECRET="$JWT_SECRET" --app $RESTAURANT_APP
    
    # Delivery Service
    heroku config:set NODE_ENV=production --app $DELIVERY_APP
    heroku config:set PORT=80 --app $DELIVERY_APP
    heroku config:set JWT_SECRET="$JWT_SECRET" --app $DELIVERY_APP
    
    # Deploy services
    print_status "Deploying services..."
    
    # User Service
    cd services/user-service
    git init
    git add .
    git commit -m "Initial deployment" || true
    heroku git:remote -a $USER_APP
    git push heroku main --force
    cd ../..
    
    # Restaurant Service
    cd services/restaurant-service
    git init
    git add .
    git commit -m "Initial deployment" || true
    heroku git:remote -a $RESTAURANT_APP
    git push heroku main --force
    cd ../..
    
    # Delivery Service
    cd services/delivery-service
    git init
    git add .
    git commit -m "Initial deployment" || true
    heroku git:remote -a $DELIVERY_APP
    git push heroku main --force
    cd ../..
    
    print_success "Deployment to Heroku completed!"
    print_status "URLs:"
    print_status "User Service: https://$USER_APP.herokuapp.com"
    print_status "Restaurant Service: https://$RESTAURANT_APP.herokuapp.com"
    print_status "Delivery Service: https://$DELIVERY_APP.herokuapp.com"
}

# Deploy to Render
deploy_render() {
    print_status "Setting up for Render deployment..."
    
    # Create render.yaml for Infrastructure as Code
    cat > render.yaml << EOF
services:
  - type: web
    name: food-delivery-user-service
    env: node
    buildCommand: cd services/user-service && npm install && npm run build
    startCommand: cd services/user-service && npm start
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: food-delivery-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: food-delivery-redis
          type: redis
          property: connectionString

  - type: web
    name: food-delivery-restaurant-service
    env: node
    buildCommand: cd services/restaurant-service && npm install && npm run build
    startCommand: cd services/restaurant-service && npm start
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: food-delivery-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: food-delivery-redis
          type: redis
          property: connectionString

  - type: web
    name: food-delivery-delivery-service
    env: node
    buildCommand: cd services/delivery-service && npm install && npm run build
    startCommand: cd services/delivery-service && npm start
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: food-delivery-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: food-delivery-redis
          type: redis
          property: connectionString

databases:
  - name: food-delivery-db
    databaseName: food_delivery
    user: food_delivery_user
    plan: free

  - name: food-delivery-redis
    plan: free
EOF
    
    print_success "render.yaml created successfully!"
    print_status "To deploy to Render:"
    print_status "1. Push your code to GitHub"
    print_status "2. Connect your GitHub repository to Render"
    print_status "3. Render will automatically deploy using the render.yaml file"
    print_status "4. Or manually create services using the Render dashboard"
}

# Build and test locally
build_local() {
    print_status "Building and testing locally..."
    
    # Install root dependencies
    npm install
    
    # Build all services
    print_status "Building User Service..."
    cd services/user-service
    npm install
    npm run build
    cd ../..
    
    print_status "Building Restaurant Service..."
    cd services/restaurant-service
    npm install
    npm run build
    cd ../..
    
    print_status "Building Delivery Service..."
    cd services/delivery-service
    npm install
    npm run build
    cd ../..
    
    print_success "All services built successfully!"
}

# Start services locally
start_local() {
    print_status "Starting services locally..."
    
    # Check if Docker is available
    if command -v docker &> /dev/null; then
        print_status "Starting infrastructure with Docker..."
        docker-compose up -d postgres redis kafka
        sleep 10
    else
        print_warning "Docker not found. Please ensure PostgreSQL, Redis, and Kafka are running manually."
    fi
    
    # Start all services
    npm run dev
}

# Deploy to Railway
deploy_railway() {
    print_status "Setting up for Railway deployment..."
    
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is required. Install from: https://docs.railway.app/develop/cli"
        exit 1
    fi
    
    # Login check
    if ! railway whoami &> /dev/null; then
        print_status "Please login to Railway..."
        railway login
    fi
    
    # Create project
    railway project new food-delivery-backend
    
    # Deploy services
    print_status "Deploying to Railway..."
    
    # Add PostgreSQL and Redis
    railway add postgresql
    railway add redis
    
    # Set environment variables
    railway variables set NODE_ENV=production
    railway variables set JWT_SECRET=$(openssl rand -base64 32)
    
    # Deploy
    railway up
    
    print_success "Deployment to Railway completed!"
}

# Main menu
show_menu() {
    echo "=================================="
    echo "Food Delivery Backend Deployment"
    echo "=================================="
    echo "1. Build and test locally"
    echo "2. Start services locally"
    echo "3. Deploy to Heroku"
    echo "4. Setup for Render"
    echo "5. Deploy to Railway"
    echo "6. Check requirements"
    echo "7. Exit"
    echo "=================================="
}

# Main execution
main() {
    check_requirements
    
    while true; do
        show_menu
        read -p "Select an option (1-7): " choice
        
        case $choice in
            1)
                build_local
                ;;
            2)
                start_local
                ;;
            3)
                deploy_heroku
                ;;
            4)
                deploy_render
                ;;
            5)
                deploy_railway
                ;;
            6)
                check_requirements
                ;;
            7)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-7."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Handle script arguments
if [ $# -eq 0 ]; then
    main
else
    case $1 in
        "build")
            build_local
            ;;
        "start")
            start_local
            ;;
        "heroku")
            deploy_heroku
            ;;
        "render")
            deploy_render
            ;;
        "railway")
            deploy_railway
            ;;
        *)
            echo "Usage: $0 [build|start|heroku|render|railway]"
            exit 1
            ;;
    esac
fi
