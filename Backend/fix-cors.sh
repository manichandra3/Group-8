#!/bin/bash

# CORS Fix - Complete Rebuild and Restart Script
# This ensures all CORS changes take effect

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "CORS Fix - Rebuild and Restart"
echo "=========================================="
echo ""

echo -e "${YELLOW}This will:${NC}"
echo "1. Stop all running services"
echo "2. Clean build all services (skip tests)"
echo "3. Restart all services"
echo "4. Verify CORS configuration"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Stop services
echo ""
echo -e "${BLUE}Step 1: Stopping all services...${NC}"
./stop-services.sh || true

# Wait for cleanup
sleep 3

# Step 2: Clean build
echo ""
echo -e "${BLUE}Step 2: Clean building all services (skipping tests)...${NC}"
mvn clean install -DskipTests

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"

# Step 3: Start services
echo ""
echo -e "${BLUE}Step 3: Starting all services...${NC}"
./start-services.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to start services!${NC}"
    exit 1
fi

# Step 4: Wait for services to fully start
echo ""
echo -e "${BLUE}Step 4: Waiting for services to fully initialize...${NC}"
sleep 10

# Step 5: Verify CORS
echo ""
echo -e "${BLUE}Step 5: Verifying CORS configuration...${NC}"
echo ""

echo "Testing OPTIONS preflight request..."
CORS_RESPONSE=$(curl -s -i -X OPTIONS http://localhost:8080/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>&1)

# Check HTTP status
if echo "$CORS_RESPONSE" | grep -q "HTTP/1.1 200"; then
    echo -e "${GREEN}✓ OPTIONS request returned 200 OK${NC}"
elif echo "$CORS_RESPONSE" | grep -q "HTTP/1.1 403"; then
    echo -e "${RED}✗ OPTIONS request returned 403 Forbidden${NC}"
    echo "CORS is not properly configured"
else
    echo -e "${YELLOW}⚠ Unexpected response status${NC}"
fi

# Check for CORS headers
CORS_HEADERS=$(echo "$CORS_RESPONSE" | grep -i "access-control-allow")
if [ ! -z "$CORS_HEADERS" ]; then
    echo -e "${GREEN}✓ CORS headers found:${NC}"
    echo "$CORS_HEADERS" | sed 's/^/  /'
    
    # Check for duplicate headers
    ORIGIN_COUNT=$(echo "$CORS_HEADERS" | grep -i "access-control-allow-origin" | wc -l)
    if [ "$ORIGIN_COUNT" -gt 1 ]; then
        echo -e "${RED}✗ ERROR: Multiple Access-Control-Allow-Origin headers detected!${NC}"
        echo "This means services still have CORS configuration."
        exit 1
    else
        echo -e "${GREEN}✓ No duplicate CORS headers${NC}"
    fi
else
    echo -e "${RED}✗ ERROR: No CORS headers in response${NC}"
    echo "Gateway CORS configuration may not be working"
    echo ""
    echo "Check gateway logs:"
    echo "  tail -f logs/api-gateway.log"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ CORS fix complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Open frontend: cd ../frontend && npm run dev"
echo "2. Login first before accessing protected routes"
echo "3. Check browser console for any remaining errors"
echo ""
echo "If you still see CORS errors:"
echo "  - Hard refresh browser (Ctrl+Shift+R)"
echo "  - Clear browser cache"
echo "  - Check that frontend uses http://localhost:5173"
echo "  - Verify gateway logs: tail -f logs/api-gateway.log"
