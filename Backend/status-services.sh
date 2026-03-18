#!/bin/bash

# Share Bazaar Microservices Status Check Script

echo "=========================================="
echo "Share Bazaar Microservices Status"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check service status
check_service() {
    local service_name=$1
    local port=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "$service_name (port $port): ${GREEN}RUNNING${NC}"
        return 0
    else
        echo -e "$service_name (port $port): ${RED}STOPPED${NC}"
        return 1
    fi
}

# Check each service
check_service "Eureka Server    " 8761
check_service "API Gateway      " 8080
check_service "Auth Service     " 8081
check_service "Stock Service    " 8082
check_service "Portfolio Service" 8083

echo ""
echo "Useful URLs:"
echo "  - Eureka Dashboard: http://localhost:8761"
echo "  - API Gateway:      http://localhost:8080"
echo ""

# Check if PID file exists
if [ -f .service-pids ]; then
    echo "Process IDs:"
    cat .service-pids
fi
