#!/bin/bash

# Verify that test mode is working correctly
# This script sends a request without signatures and checks if it's accepted

echo "=========================================="
echo "  Verifying Test Mode Configuration"
echo "=========================================="
echo ""

# Check environment variables
if [ "$TEST_MODE" != "true" ]; then
    echo "❌ TEST_MODE is not set to 'true'"
    echo "   Please run: export TEST_MODE=true"
else
    echo "✅ TEST_MODE is enabled"
fi

if [ "$TEST_MODE_BYPASS_SIGNATURES" != "true" ]; then
    echo "❌ TEST_MODE_BYPASS_SIGNATURES is not set to 'true'"
    echo "   Please run: export TEST_MODE_BYPASS_SIGNATURES=true"
else
    echo "✅ TEST_MODE_BYPASS_SIGNATURES is enabled"
fi

echo ""
echo "Sending test request without signatures..."

# Send a test request without signatures
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-request-'$(date +%s)'",
    "timestamp": '$(date +%s%3N)',
    "data": {
      "type": "test-mode-verification",
      "source": "verify-script"
    },
    "signatures": []
  }' 2>&1)

# Check if request was successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Test mode is working! Request accepted without signatures."
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ Test mode verification failed!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "Make sure the server is running with test mode enabled:"
    echo "./scripts/start-test-mode.sh"
fi