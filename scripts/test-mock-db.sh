#!/bin/bash

echo "SSS-API Test Runner (Mock Database Mode)"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Set environment variables to use mock connections
export NODE_ENV=test
export TEST_MODE=true
export DB_HOST=mock
export REDIS_HOST=mock

echo -e "${YELLOW}Running tests with mocked database connections${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Run tests
echo -e "${YELLOW}Running test suite...${NC}"
npm test

# Run performance tests
if [ "$1" = "--with-benchmarks" ]; then
    echo ""
    echo -e "${YELLOW}Running performance benchmarks...${NC}"
    npm run test:performance:quick
fi

echo ""
echo -e "${GREEN}Test execution complete!${NC}"