#!/bin/bash

echo "🚀 SSS-API Performance Test"
echo "=========================="
echo ""

# Start server in background
echo "Starting server..."
cd "/Volumes/My Passport/SSS-API"
npm run dev > server.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Server is ready!"
        break
    fi
    sleep 1
done

# Run a simple authentication test first
echo ""
echo "Testing authentication endpoint..."
curl -s -X POST http://localhost:3000/api/v1/authenticate \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","credentials":"test","biometric":"test","deviceFingerprint":"test_device"}' | jq

# Run performance test
echo ""
echo "Running performance test..."
npm run test:performance:quick

# Kill server
kill $SERVER_PID 2>/dev/null
echo ""
echo "✅ Test complete!"