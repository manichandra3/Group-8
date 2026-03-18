#!/bin/bash

# Share Bazaar Microservices Stop Script
# This script stops all running microservices

echo "=========================================="
echo "Stopping Share Bazaar Microservices"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
            echo -e "${RED}✗ Force killing $service_name${NC}"
            kill -9 $pid 2>/dev/null
        else
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        fi
    else
        echo -e "${YELLOW}  $service_name is not running (PID: $pid)${NC}"
    fi
}

# Function to kill process by port
kill_by_port() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti :$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        for pid in $pids; do
            echo "Stopping $service_name on port $port (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            sleep 1
            if ! kill -0 $pid 2>/dev/null; then
                echo -e "${GREEN}✓ $service_name stopped${NC}"
            else
                echo -e "${RED}✗ Force killing $service_name${NC}"
                kill -9 $pid 2>/dev/null
            fi
        done
    fi
}

# Check if PID file exists
if [ ! -f .service-pids ]; then
    echo -e "${YELLOW}No PID file found. Services may not be running.${NC}"
    echo "Attempting to kill services by port..."
    echo ""
    
    # Kill by port if PID file not found
    kill_by_port 8761 "Eureka Server"
    kill_by_port 8080 "API Gateway"
    kill_by_port 8081 "Auth Service"
    kill_by_port 8082 "Stock Service"
    kill_by_port 8083 "Portfolio Service"
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Cleanup complete${NC}"
    echo "=========================================="
    exit 0
fi

# Source the PID file
source .service-pids

# Stop services in reverse order
stop_service "Portfolio Service" $PORTFOLIO_SERVICE_PID
stop_service "Stock Service" $STOCK_SERVICE_PID
stop_service "Auth Service" $AUTH_SERVICE_PID
stop_service "API Gateway" $API_GATEWAY_PID
stop_service "Eureka Server" $EUREKA_PID

# Double-check ports are clear
echo ""
echo "Verifying all ports are released..."
PORTS_TO_CHECK="8761 8080 8081 8082 8083"
PORTS_STILL_IN_USE=false

for port in $PORTS_TO_CHECK; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Port $port is still in use${NC}"
        PORTS_STILL_IN_USE=true
        kill_by_port $port "Unknown service"
    fi
done

if [ "$PORTS_STILL_IN_USE" = false ]; then
    echo -e "${GREEN}✓ All ports are clear${NC}"
fi

# Remove PID file
rm -f .service-pids

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All services stopped${NC}"
echo "=========================================="
