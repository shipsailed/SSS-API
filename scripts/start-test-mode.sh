#!/bin/bash

# Start SSS-API in Test Mode for Performance Testing
# WARNING: This bypasses signature validation - DO NOT USE IN PRODUCTION

echo "=========================================="
echo "  Starting SSS-API in TEST MODE"
echo "  WARNING: Signature validation bypassed"
echo "  FOR PERFORMANCE TESTING ONLY"
echo "=========================================="
echo ""

# Check if Redis and PostgreSQL are running
if ! nc -z localhost 6379 2>/dev/null; then
    echo "Error: Redis is not running on port 6379"
    echo "Please start Redis first: ./scripts/start-redis.sh"
    exit 1
fi

if ! nc -z localhost 5432 2>/dev/null; then
    echo "Error: PostgreSQL is not running on port 5432"
    echo "Please start PostgreSQL first: ./scripts/start-postgres.sh"
    exit 1
fi

# Load test environment variables
export $(cat .env.test | grep -v '^#' | xargs)

# Show test mode configuration
echo "Test Mode Configuration:"
echo "- TEST_MODE: $TEST_MODE"
echo "- TEST_MODE_BYPASS_SIGNATURES: $TEST_MODE_BYPASS_SIGNATURES"
echo "- NODE_ENV: $NODE_ENV"
echo "- PORT: $PORT"
echo ""

# Start the server
echo "Starting server..."
npm run dev