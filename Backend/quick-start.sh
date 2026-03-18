#!/bin/bash

# Share Bazaar Quick Start Script
# Builds and starts all services quickly for development

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Share Bazaar Quick Start"
echo "=========================================="
echo ""

# Check if services are already running
if [ -f .service-pids ]; then
    echo -e "${YELLOW}Services appear to be running already.${NC}"
    echo "Checking status..."
    ./status-check.sh
    echo ""
    read -p "Stop and restart services? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./stop-services.sh
        echo ""
        echo "Waiting for services to stop..."
        sleep 3
    else
        echo "Exiting..."
        exit 0
    fi
fi

# Check if already built
BUILD_NEEDED=false
if [ ! -d "eureka-server/target" ] || [ ! -d "api-gateway/target" ] || [ ! -d "auth-service/target" ] || [ ! -d "stock-service/target" ]; then
    echo -e "${YELLOW}Build artifacts not found. Building is required.${NC}"
    BUILD_NEEDED=true
else
    echo -e "${GREEN}Build artifacts found.${NC}"
    read -p "Rebuild services? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BUILD_NEEDED=true
    fi
fi

# Build if needed
if [ "$BUILD_NEEDED" = true ]; then
    echo ""
    echo "Building services (skipping tests for speed)..."
    ./build-all.sh --skip-tests
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build failed. Please fix the errors and try again.${NC}"
        exit 1
    fi
fi

# Start services
echo ""
echo "Starting all services..."
./start-services.sh --skip-db-check

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "Quick start completed successfully!"
    echo "==========================================${NC}"
    echo ""
    echo "Your services are now running."
    echo "Run './status-check.sh' to verify status."
else
    echo ""
    echo -e "${RED}Failed to start services.${NC}"
    echo "Check the logs in the 'logs' directory for details."
    exit 1
fi
