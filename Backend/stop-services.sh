#!/bin/bash

# Share Bazaar Microservices Stop Script
# This script stops all running microservices

echo "=========================================="
echo "Stopping Share Bazaar Microservices"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if PID file exists
if [ ! -f .service-pids ]; then
    echo -e "${RED}No PID file found. Services may not be running.${NC}"
    echo "Attempting to kill services by port..."
    
    # Kill by port if PID file not found
    for port in 8761 8080 8081 8082 8083; do
        PID=$(lsof -ti :$port)
        if [ ! -z "$PID" ]; then
            echo "Killing process on port $port (PID: $PID)"
            kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null
        fi
    done
    exit 0
fi

# Source the PID file
source .service-pids

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid=$2
    
    if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
        echo "Stopping $service_name (PID: $pid)..."
        kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
        
        # Wait for process to stop
        local count=0
        while kill -0 $pid 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if kill -0 $pid 2>/dev/null; then
            echo -e "${RED}Force killing $service_name${NC}"
            kill -9 $pid 2>/dev/null
        else
            echo -e "${GREEN}$service_name stopped${NC}"
        fi
    else
        echo "$service_name is not running"
    fi
}

# Stop services in reverse order
stop_service "Portfolio Service" $PORTFOLIO_SERVICE_PID
stop_service "Stock Service" $STOCK_SERVICE_PID
stop_service "Auth Service" $AUTH_SERVICE_PID
stop_service "API Gateway" $API_GATEWAY_PID
stop_service "Eureka Server" $EUREKA_PID

# Remove PID file
rm -f .service-pids

echo ""
echo "=========================================="
echo -e "${GREEN}All services stopped${NC}"
echo "=========================================="
