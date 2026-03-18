#!/bin/bash

# Share Bazaar Microservices Startup Script
# This script starts all microservices in the correct order

set -e

echo "=========================================="
echo "Starting Share Bazaar Microservices"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
            echo -e "${GREEN}$service_name is ready!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo "Warning: $service_name did not start within the expected time"
    return 1
}

# Check required ports
echo "Checking if required ports are available..."
check_port 8761 || echo "  Eureka Server port (8761) in use"
check_port 8080 || echo "  API Gateway port (8080) in use"
check_port 8081 || echo "  Auth Service port (8081) in use"
check_port 8082 || echo "  Stock Service port (8082) in use"
check_port 8083 || echo "  Portfolio Service port (8083) in use"

echo ""
echo "=========================================="
echo "Step 1: Starting Eureka Server (Service Discovery)"
echo "=========================================="
cd eureka-server
mvn spring-boot:run > ../logs/eureka-server.log 2>&1 &
EUREKA_PID=$!
cd ..
echo "Eureka Server PID: $EUREKA_PID"
wait_for_service "Eureka Server" 8761

echo ""
echo "=========================================="
echo "Step 2: Starting API Gateway"
echo "=========================================="
cd api-gateway
mvn spring-boot:run > ../logs/api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
cd ..
echo "API Gateway PID: $API_GATEWAY_PID"
wait_for_service "API Gateway" 8080

echo ""
echo "=========================================="
echo "Step 3: Starting Auth Service"
echo "=========================================="
cd auth-service
mvn spring-boot:run > ../logs/auth-service.log 2>&1 &
AUTH_SERVICE_PID=$!
cd ..
echo "Auth Service PID: $AUTH_SERVICE_PID"
wait_for_service "Auth Service" 8081

echo ""
echo "=========================================="
echo "Step 4: Starting Stock Service"
echo "=========================================="
cd stock-service
mvn spring-boot:run > ../logs/stock-service.log 2>&1 &
STOCK_SERVICE_PID=$!
cd ..
echo "Stock Service PID: $STOCK_SERVICE_PID"
wait_for_service "Stock Service" 8082

echo ""
echo "=========================================="
echo "Step 5: Starting Portfolio Service"
echo "=========================================="
cd portfolio-service
mvn spring-boot:run > ../logs/portfolio-service.log 2>&1 &
PORTFOLIO_SERVICE_PID=$!
cd ..
echo "Portfolio Service PID: $PORTFOLIO_SERVICE_PID"
wait_for_service "Portfolio Service" 8083

echo ""
echo "=========================================="
echo -e "${GREEN}All services started successfully!${NC}"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  - Eureka Dashboard: http://localhost:8761"
echo "  - API Gateway:      http://localhost:8080"
echo "  - Auth Service:     http://localhost:8081"
echo "  - Stock Service:    http://localhost:8082"
echo "  - Portfolio Service: http://localhost:8083"
echo ""
echo "Process IDs:"
echo "  - Eureka Server:     $EUREKA_PID"
echo "  - API Gateway:       $API_GATEWAY_PID"
echo "  - Auth Service:      $AUTH_SERVICE_PID"
echo "  - Stock Service:     $STOCK_SERVICE_PID"
echo "  - Portfolio Service: $PORTFOLIO_SERVICE_PID"
echo ""
echo "Logs are available in the 'logs' directory"
echo ""
echo "To stop all services, run: ./stop-services.sh"
echo ""

# Save PIDs to a file for the stop script
cat > .service-pids <<EOF
EUREKA_PID=$EUREKA_PID
API_GATEWAY_PID=$API_GATEWAY_PID
AUTH_SERVICE_PID=$AUTH_SERVICE_PID
STOCK_SERVICE_PID=$STOCK_SERVICE_PID
PORTFOLIO_SERVICE_PID=$PORTFOLIO_SERVICE_PID
EOF

echo "Press Ctrl+C to view logs or run 'tail -f logs/*.log' in another terminal"
