#!/bin/bash

echo "🚀 SSS-API Cloudflare Workers Test"
echo "=================================="
echo ""
echo "This will test Cloudflare Workers locally without deployment"
echo ""

cd "$(dirname "$0")/cloudflare" || exit 1

# Start the worker in background
echo "Starting local worker..."
npx wrangler dev worker.js --local --port 8787 > worker.log 2>&1 &
WORKER_PID=$!

# Wait for worker to start
echo "Waiting for worker to start..."
sleep 5

# Test health endpoint
echo ""
echo "Testing health endpoint..."
curl -s http://localhost:8787/health | jq

# Test authentication
echo ""
echo "Testing authentication..."
curl -s -X POST http://localhost:8787/api/v1/authenticate \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","credentials":"test","biometric":"test","deviceFingerprint":"test_device"}' | jq

# Test quantum signing
echo ""
echo "Testing quantum signing..."
curl -s -X POST http://localhost:8787/api/v1/quantum/sign-dynamic \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message","options":{"maxTime":1000,"minAlgorithms":5,"sensitivity":"high"}}' | jq

# Performance test
echo ""
echo "Running quick performance test..."
echo "Sending 1000 requests..."

START_TIME=$(date +%s)
for i in {1..1000}; do
  curl -s -X POST http://localhost:8787/api/v1/authenticate \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"user_$i\",\"credentials\":\"test\",\"biometric\":\"test\",\"deviceFingerprint\":\"test_device\"}" > /dev/null &
  
  # Limit concurrent requests
  if (( i % 50 == 0 )); then
    wait
  fi
done
wait

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Performance Results:"
echo "==================="
echo "Total requests: 1000"
echo "Duration: ${DURATION}s"
echo "Requests/sec: $((1000 / DURATION))"

# Cleanup
kill $WORKER_PID 2>/dev/null

echo ""
echo "✅ Test complete!"
echo ""
echo "To deploy to Cloudflare:"
echo "1. Run: wrangler login"
echo "2. Run: ./scripts/quick-cloudflare-deploy.sh"