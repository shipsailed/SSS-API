#!/bin/bash

echo "Starting SSS-API with 1Password secrets..."

# Check if 1Password is signed in
if ! op account list &>/dev/null; then
    echo "Signing in to 1Password..."
    eval $(op signin)
fi

# Load secrets into .env
echo "Loading secrets from 1Password..."
./scripts/load-secrets.sh

# Check if infrastructure is running
echo ""
echo "Checking infrastructure..."
if ! /Applications/Docker.app/Contents/Resources/bin/docker ps | grep -q sss-api-postgres; then
    echo "PostgreSQL not running. Starting infrastructure..."
    ./scripts/start-all.sh
fi

if ! /Applications/Docker.app/Contents/Resources/bin/docker ps | grep -q sss-api-redis; then
    echo "Redis not running. Starting Redis..."
    /Applications/Docker.app/Contents/Resources/bin/docker compose up -d redis
fi

# Run the application
echo ""
echo "Starting application with loaded secrets..."
npm run dev