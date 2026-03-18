#!/bin/bash

# Share Bazaar Services Status Check Script
# Checks the status of all microservices

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Share Bazaar Services Status"
echo "=========================================="
echo ""

# Function to check if a port is listening
check_port_status() {
    local port=$1
    local service_name=$2
    local url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port)
        echo -e "${GREEN}✓${NC} $service_name"
        echo "    Port: $port | PID: $pid | URL: $url"
        
        # Try to get HTTP status
        if command -v curl &> /dev/null; then
            local http_status=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null || echo "000")
            if [ "$http_status" = "200" ]; then
                echo -e "    HTTP Status: ${GREEN}$http_status OK${NC}"
            elif [ "$http_status" = "000" ]; then
                echo -e "    HTTP Status: ${YELLOW}Connection refused${NC}"
            else
                echo -e "    HTTP Status: ${YELLOW}$http_status${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}✗${NC} $service_name"
        echo "    Port: $port | Status: Not running"
        return 1
    fi
}

# Check database
echo "Database:"
if command -v psql &> /dev/null; then
    if PGPASSWORD=postgres psql -h localhost -U postgres -d sharebazaar -c '\q' >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL (sharebazaar database)"
        echo "    Host: localhost:5432"
    else
        echo -e "${RED}✗${NC} PostgreSQL"
        echo "    Cannot connect to database 'sharebazaar'"
    fi
else
    echo -e "${YELLOW}?${NC} PostgreSQL"
    echo "    psql not available to check status"
fi

echo ""
echo "Microservices:"

# Check each service
SERVICES_RUNNING=0
SERVICES_TOTAL=4

check_port_status 8761 "Eureka Server      " "http://localhost:8761" && SERVICES_RUNNING=$((SERVICES_RUNNING+1))
echo ""
check_port_status 8080 "API Gateway        " "http://localhost:8080/actuator/health" && SERVICES_RUNNING=$((SERVICES_RUNNING+1))
echo ""
check_port_status 8081 "Auth Service       " "http://localhost:8081/actuator/health" && SERVICES_RUNNING=$((SERVICES_RUNNING+1))
echo ""
check_port_status 8082 "Stock Service      " "http://localhost:8082/actuator/health" && SERVICES_RUNNING=$((SERVICES_RUNNING+1))

echo ""
echo "=========================================="
echo "Summary: $SERVICES_RUNNING/$SERVICES_TOTAL services running"
echo "=========================================="

# Check if PID file exists
if [ -f .service-pids ]; then
    echo ""
    echo "PID file exists (.service-pids)"
    echo "PIDs from file:"
    cat .service-pids | sed 's/^/  /'
fi

echo ""
if [ $SERVICES_RUNNING -eq $SERVICES_TOTAL ]; then
    echo -e "${GREEN}✓ All services are running${NC}"
    echo ""
    echo "Useful URLs:"
    echo "  - Eureka Dashboard: http://localhost:8761"
    echo "  - API Gateway:      http://localhost:8080"
    echo "  - Auth API Docs:    http://localhost:8081/swagger-ui.html"
    echo "  - Stock API Docs:   http://localhost:8082/swagger-ui.html"
    exit 0
elif [ $SERVICES_RUNNING -eq 0 ]; then
    echo -e "${RED}✗ No services are running${NC}"
    echo ""
    echo "To start services:"
    echo "  ./start-services.sh"
    exit 1
else
    echo -e "${YELLOW}⚠ Some services are not running${NC}"
    echo ""
    echo "To start all services:"
    echo "  ./start-services.sh"
    echo ""
    echo "To stop running services:"
    echo "  ./stop-services.sh"
    exit 1
fi
