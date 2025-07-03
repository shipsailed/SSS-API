#!/bin/bash

# Add Docker to PATH for macOS
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
DOCKER="/Applications/Docker.app/Contents/Resources/bin/docker"

# Redis CLI helper script
REDIS_PASSWORD="${REDIS_PASSWORD:-redis-secure-password}"

# Check if redis-cli is installed locally
if command -v redis-cli &> /dev/null; then
    redis-cli -a "$REDIS_PASSWORD" "$@"
else
    # Use Docker to run redis-cli
    $DOCKER run --rm -it --network host redis:7-alpine redis-cli -h localhost -a "$REDIS_PASSWORD" "$@"
fi