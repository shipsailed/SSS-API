#!/bin/bash

# Add Docker to PATH for macOS
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"

# Start PostgreSQL using Docker CLI
echo "Starting PostgreSQL container..."

# Stop and remove existing container if it exists
$DOCKER stop sss-api-postgres 2>/dev/null
$DOCKER rm sss-api-postgres 2>/dev/null

# Get absolute path to schema file
SCHEMA_PATH="$(pwd)/src/infrastructure/database/schema.sql"

# Run PostgreSQL container
$DOCKER run -d \
  --name sss-api-postgres \
  -p 5432:5432 \
  -v sss-postgres-data:/var/lib/postgresql/data \
  -v "$SCHEMA_PATH":/docker-entrypoint-initdb.d/01-schema.sql:ro \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=sss-secure-password \
  -e POSTGRES_DB=sss_api \
  postgres:15-alpine

echo "PostgreSQL started on port 5432"
echo "Database: sss_api"
echo "User: postgres"
echo "Password: sss-secure-password"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Test PostgreSQL connection
echo "Testing PostgreSQL connection..."
$DOCKER run --rm --network host postgres:15-alpine psql -h localhost -U postgres -d sss_api -c "SELECT 'PostgreSQL is ready!' as status;"