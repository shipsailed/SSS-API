#!/bin/bash

echo "SSS-API Test Runner with Databases"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we should use Docker or local databases
USE_DOCKER=false
if ! command -v psql &> /dev/null || ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL or Redis not found locally. Will use Docker.${NC}"
    USE_DOCKER=true
fi

# Function to wait for services
wait_for_service() {
    local service=$1
    local host=$2
    local port=$3
    local max_attempts=30
    local attempt=1
    
    echo -n "Waiting for $service..."
    while ! nc -z $host $port 2>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo -e " ${RED}Failed${NC}"
            return 1
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e " ${GREEN}Ready${NC}"
    return 0
}

if [ "$USE_DOCKER" = true ]; then
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    # Start only PostgreSQL and Redis containers
    echo -e "${YELLOW}Starting PostgreSQL and Redis with Docker...${NC}"
    docker compose up -d postgres redis
    
    # Wait for services to be ready
    wait_for_service "PostgreSQL" localhost 5432
    wait_for_service "Redis" localhost 6379
    
    # Give PostgreSQL extra time to run init scripts
    echo "Waiting for database initialization..."
    sleep 5
else
    # Check if local services are running
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${RED}PostgreSQL is not running locally${NC}"
        exit 1
    fi
    
    if ! redis-cli ping &> /dev/null; then
        echo -e "${RED}Redis is not running locally${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Using local PostgreSQL and Redis${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Run different test suites
echo ""
echo -e "${YELLOW}Running test suites...${NC}"
echo ""

# Unit tests
echo -e "${YELLOW}1. Running unit tests...${NC}"
npm test -- --testPathPattern="unit|utils" --passWithNoTests || true

# Integration tests
echo -e "${YELLOW}2. Running API integration tests...${NC}"
npm test -- --testPathPattern="api" --passWithNoTests || true

# Performance tests (if requested)
if [ "$1" = "--performance" ] || [ "$1" = "-p" ]; then
    echo -e "${YELLOW}3. Running performance benchmarks...${NC}"
    npm run benchmark || true
fi

# Run all tests if no specific suite requested
if [ -z "$1" ]; then
    echo -e "${YELLOW}3. Running all tests...${NC}"
    npm test || true
fi

# Show test results summary
echo ""
echo -e "${GREEN}Test execution complete!${NC}"

# Cleanup if using Docker
if [ "$USE_DOCKER" = true ] && [ "$2" != "--keep-running" ]; then
    echo ""
    echo -e "${YELLOW}Stopping Docker containers...${NC}"
    docker compose down
    echo -e "${GREEN}✓ Cleanup complete${NC}"
else
    echo ""
    echo "Services are still running. To stop them:"
    if [ "$USE_DOCKER" = true ]; then
        echo "  docker compose down"
    else
        echo "  Stop your local PostgreSQL and Redis services"
    fi
fi