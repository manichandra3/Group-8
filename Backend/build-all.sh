#!/bin/bash

# Share Bazaar Build Script
# Builds all microservices

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse command line arguments
SKIP_TESTS=false
CLEAN_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests|-s)
            SKIP_TESTS=true
            shift
            ;;
        --clean|-c)
            CLEAN_BUILD=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -s, --skip-tests    Skip running tests during build"
            echo "  -c, --clean         Perform a clean build (mvn clean install)"
            echo "  -h, --help          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                  # Build with tests"
            echo "  $0 --skip-tests     # Build without tests (faster)"
            echo "  $0 --clean          # Clean build with tests"
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
echo "Building Share Bazaar Microservices"
echo "=========================================="
echo ""

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo -e "${RED}✗ Maven is not installed or not in PATH${NC}"
    exit 1
fi

# Build command
BUILD_CMD="mvn"
if [ "$CLEAN_BUILD" = true ]; then
    BUILD_CMD="$BUILD_CMD clean"
fi
BUILD_CMD="$BUILD_CMD install"
if [ "$SKIP_TESTS" = true ]; then
    BUILD_CMD="$BUILD_CMD -DskipTests"
fi

echo -e "${BLUE}Build command: $BUILD_CMD${NC}"
echo ""

# Start build
START_TIME=$(date +%s)

echo "Building parent project and all modules..."
$BUILD_CMD

BUILD_EXIT_CODE=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    echo "=========================================="
    echo ""
    echo "Build duration: ${DURATION}s"
    echo ""
    echo "Built modules:"
    echo "  ✓ core-shared"
    echo "  ✓ eureka-server"
    echo "  ✓ api-gateway"
    echo "  ✓ auth-service"
    echo "  ✓ stock-service"
    echo ""
    echo "Next steps:"
    echo "  - Start services: ./start-services.sh"
    echo "  - Run with build:  ./start-services.sh --build"
else
    echo -e "${RED}✗ Build failed!${NC}"
    echo "=========================================="
    exit 1
fi
