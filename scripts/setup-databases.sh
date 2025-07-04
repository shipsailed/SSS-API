#!/bin/bash

echo "SSS-API Database Setup Script"
echo "============================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed. Please install it first.${NC}"
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}Redis is not installed. Please install it first.${NC}"
    echo "On macOS: brew install redis"
    echo "On Ubuntu: sudo apt-get install redis-server"
    exit 1
fi

# Start PostgreSQL if not running (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! brew services list | grep postgresql | grep started &> /dev/null; then
        echo -e "${YELLOW}Starting PostgreSQL...${NC}"
        brew services start postgresql
        sleep 2
    fi
fi

# Start Redis if not running (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! brew services list | grep redis | grep started &> /dev/null; then
        echo -e "${YELLOW}Starting Redis...${NC}"
        brew services start redis
        sleep 2
    fi
fi

# Check PostgreSQL connection
echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
if psql -U postgres -c '\l' &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ Cannot connect to PostgreSQL${NC}"
    echo "Trying to create postgres user..."
    createuser -s postgres 2>/dev/null || true
fi

# Check Redis connection
echo -e "${YELLOW}Checking Redis connection...${NC}"
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Cannot connect to Redis${NC}"
    exit 1
fi

# Create database
echo -e "${YELLOW}Creating SSS-API database...${NC}"
createdb -U postgres sss_api 2>/dev/null || echo "Database 'sss_api' already exists"

# Run schema
echo -e "${YELLOW}Running database schema...${NC}"
psql -U postgres -d sss_api -f src/infrastructure/database/schema.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create database schema${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sss_api
DB_USER=postgres
DB_PASSWORD=
DB_POOL_SIZE=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=sss:

# API Configuration
PORT=3000
NODE_ENV=development
API_URL=http://localhost:3000

# Security
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

echo ""
echo -e "${GREEN}Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the .env file and update any settings if needed"
echo "2. Run 'npm install' to install dependencies"
echo "3. Run 'npm test' to run the test suite"
echo "4. Run 'npm run dev' to start the development server"