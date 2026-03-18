#!/bin/bash

# Share Bazaar Microservices Startup Script
# This script starts all microservices in the correct order

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
BUILD_SERVICES=false
SKIP_DB_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build|-b)
            BUILD_SERVICES=true
            shift
            ;;
        --skip-db-check)
            SKIP_DB_CHECK=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -b, --build         Build all services before starting"
            echo "  --skip-db-check     Skip PostgreSQL database connectivity check"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --build          # Build and start all services"
            echo "  $0                  # Start services without building"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "Starting Share Bazaar Microservices"
echo "=========================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}Warning: Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to wait for a service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=60
    local attempt=0
    
    echo "Waiting for $service_name to start on port $port..."
    while [ $attempt -lt $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            echo -e "${GREEN}✓ $service_name is ready!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo -e "${RED}✗ Warning: $service_name did not start within the expected time${NC}"
    echo -e "${YELLOW}Check logs at: logs/$service_name.log${NC}"
    return 1
}

# Check for required tools
echo "Checking prerequisites..."
if ! command_exists mvn; then
    echo -e "${RED}✗ Maven is not installed or not in PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Maven found${NC}"

if ! command_exists java; then
    echo -e "${RED}✗ Java is not installed or not in PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Java found ($(java -version 2>&1 | head -n 1))${NC}"

if ! command_exists nc; then
    echo -e "${YELLOW}Warning: netcat (nc) not found. Service readiness checks may not work.${NC}"
fi

# Check PostgreSQL connection
if [ "$SKIP_DB_CHECK" = false ]; then
    echo ""
    echo "Checking PostgreSQL database connectivity..."
    if command_exists psql; then
        if PGPASSWORD=postgres psql -h localhost -U postgres -d sharebazaar -c '\q' >/dev/null 2>&1; then
            echo -e "${GREEN}✓ PostgreSQL database 'sharebazaar' is accessible${NC}"
        else
            echo -e "${RED}✗ Cannot connect to PostgreSQL database${NC}"
            echo -e "${YELLOW}Please ensure:"
            echo "  1. PostgreSQL is running"
            echo "  2. Database 'sharebazaar' exists"
            echo "  3. User 'postgres' has access with password 'postgres' or 'password'"
            echo ""
            echo "To create the database:"
            echo "  psql -U postgres -c 'CREATE DATABASE sharebazaar;'"
            echo ""
            echo "Or use: $0 --skip-db-check to skip this check${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}psql not found. Skipping database connectivity check.${NC}"
        echo -e "${YELLOW}Use --skip-db-check to suppress this warning${NC}"
    fi
fi

# Build services if requested
if [ "$BUILD_SERVICES" = true ]; then
    echo ""
    echo "=========================================="
    echo "Building all services..."
    echo "=========================================="
    mvn clean install -DskipTests
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Build completed successfully${NC}"
    else
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    fi
fi

# Check required ports
echo ""
echo "Checking if required ports are available..."
PORTS_OK=true
check_port 8761 || PORTS_OK=false
check_port 8080 || PORTS_OK=false
check_port 8081 || PORTS_OK=false
check_port 8082 || PORTS_OK=false

if [ "$PORTS_OK" = false ]; then
    echo -e "${YELLOW}Some ports are in use. You may need to stop existing services first.${NC}"
    echo -e "${YELLOW}Run: ./stop-services.sh${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Step 1: Starting Eureka Server (Service Discovery)"
echo "=========================================="
cd eureka-server
mvn spring-boot:run > ../logs/eureka-server.log 2>&1 &
EUREKA_PID=$!
cd ..
echo -e "${BLUE}Eureka Server PID: $EUREKA_PID${NC}"
wait_for_service "Eureka Server" 8761

echo ""
echo "=========================================="
echo "Step 2: Starting API Gateway"
echo "=========================================="
cd api-gateway
mvn spring-boot:run > ../logs/api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
cd ..
echo -e "${BLUE}API Gateway PID: $API_GATEWAY_PID${NC}"
wait_for_service "API Gateway" 8080

echo ""
echo "=========================================="
echo "Step 3: Starting Auth Service"
echo "=========================================="
cd auth-service
mvn spring-boot:run > ../logs/auth-service.log 2>&1 &
AUTH_SERVICE_PID=$!
cd ..
echo -e "${BLUE}Auth Service PID: $AUTH_SERVICE_PID${NC}"
wait_for_service "Auth Service" 8081

echo ""
echo "=========================================="
echo "Step 4: Starting Stock Service"
echo "=========================================="
cd stock-service
mvn spring-boot:run > ../logs/stock-service.log 2>&1 &
STOCK_SERVICE_PID=$!
cd ..
echo -e "${BLUE}Stock Service PID: $STOCK_SERVICE_PID${NC}"
wait_for_service "Stock Service" 8082

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  - Eureka Dashboard: http://localhost:8761"
echo "  - API Gateway:      http://localhost:8080"
echo "  - Auth Service:     http://localhost:8081/swagger-ui.html"
echo "  - Stock Service:    http://localhost:8082/swagger-ui.html"
echo ""
echo "Process IDs:"
echo "  - Eureka Server:     $EUREKA_PID"
echo "  - API Gateway:       $API_GATEWAY_PID"
echo "  - Auth Service:      $AUTH_SERVICE_PID"
echo "  - Stock Service:     $STOCK_SERVICE_PID"
echo ""
echo "Logs are available in the 'logs' directory"
echo "  - To view all logs: tail -f logs/*.log"
echo "  - To view specific: tail -f logs/eureka-server.log"
echo ""
echo "Useful commands:"
echo "  - Stop services:    ./stop-services.sh"
echo "  - Check status:     ./status-check.sh"
echo ""

# Save PIDs to a file for the stop script
cat > .service-pids <<EOF
EUREKA_PID=$EUREKA_PID
API_GATEWAY_PID=$API_GATEWAY_PID
AUTH_SERVICE_PID=$AUTH_SERVICE_PID
STOCK_SERVICE_PID=$STOCK_SERVICE_PID
EOF
