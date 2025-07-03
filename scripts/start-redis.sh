#!/bin/bash

# Add Docker to PATH for macOS
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"

# Start Redis using Docker CLI
echo "Starting Redis container..."

# Stop and remove existing container if it exists
$DOCKER stop sss-api-redis 2>/dev/null
$DOCKER rm sss-api-redis 2>/dev/null

# Run Redis container
$DOCKER run -d \
  --name sss-api-redis \
  -p 6379:6379 \
  -v sss-redis-data:/data \
  -e REDIS_PASSWORD=redis-secure-password \
  redis:7-alpine \
  redis-server --appendonly yes --requirepass redis-secure-password

echo "Redis started on port 6379"
echo "Password: redis-secure-password"

# Test Redis connection using redis-cli from Docker
echo "Testing Redis connection..."
$DOCKER run --rm --network host redis:7-alpine redis-cli -h localhost -a redis-secure-password ping