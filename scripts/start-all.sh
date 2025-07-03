#!/bin/bash

# Add Docker to PATH for macOS
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Start all services using Docker Compose
echo "Starting SSS-API infrastructure..."

# Check if Docker Desktop is running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! /Applications/Docker.app/Contents/Resources/bin/docker info &> /dev/null; then
        echo "Docker Desktop is not running. Starting Docker Desktop..."
        open -a Docker
        echo "Waiting for Docker to start..."
        while ! /Applications/Docker.app/Contents/Resources/bin/docker info &> /dev/null; do
            sleep 2
        done
        echo "Docker Desktop started!"
    fi
fi

# Set Docker command path
DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"

# Check if docker-compose is available
if $DOCKER compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="$DOCKER compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    # Docker Compose is built into newer Docker versions
    COMPOSE_CMD="$DOCKER compose"
fi

# Start only infrastructure services first
echo "Starting PostgreSQL and Redis..."
$COMPOSE_CMD up -d postgres redis

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Check PostgreSQL
echo "Checking PostgreSQL..."
$DOCKER exec sss-api-postgres pg_isready -U postgres

# Check Redis
echo "Checking Redis..."
$DOCKER exec sss-api-redis redis-cli -a redis-secure-password ping

# Optional: Start monitoring tools
read -p "Start monitoring tools (pgAdmin and Redis Commander)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $COMPOSE_CMD up -d pgadmin redis-commander
    echo "pgAdmin available at: http://localhost:5050"
    echo "Redis Commander available at: http://localhost:8081"
fi

echo ""
echo "Infrastructure is ready!"
echo ""
echo "Connection details:"
echo "PostgreSQL: localhost:5432 (user: postgres, pass: sss-secure-password)"
echo "Redis: localhost:6379 (pass: redis-secure-password)"