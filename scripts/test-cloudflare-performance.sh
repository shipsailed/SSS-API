#!/bin/bash

echo "Testing Cloudflare Workers Performance..."
echo ""

# Check if worker URL is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <worker-url>"
    echo "Example: $0 https://sss-api-edge.example.workers.dev"
    exit 1
fi

WORKER_URL=$1

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Worker URL: $WORKER_URL"
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{time_total}" "$WORKER_URL/health")
HEALTH_TIME=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

echo "Response: $HEALTH_BODY"
echo "Time: ${HEALTH_TIME}s"
echo ""

# Test 2: Authentication Endpoint
echo "2. Testing Authentication Endpoint..."
AUTH_PAYLOAD='{
  "userId": "test_user_001",
  "credentials": "test_credentials",
  "biometric": "test_biometric_hash",
  "deviceFingerprint": "test_device"
}'

AUTH_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$AUTH_PAYLOAD" \
  -w "\n%{time_total}" \
  "$WORKER_URL/api/v1/authenticate")

AUTH_TIME=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | head -n -1)

echo "Response: $AUTH_BODY"
echo "Time: ${AUTH_TIME}s"
echo ""

# Test 3: Quantum Sign Endpoint
echo "3. Testing Quantum Sign Endpoint..."
QUANTUM_PAYLOAD='{
  "message": "test message for quantum signing",
  "options": {
    "minAlgorithms": 5,
    "maxTime": 1000
  }
}'

QUANTUM_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$QUANTUM_PAYLOAD" \
  -w "\n%{time_total}" \
  "$WORKER_URL/api/v1/quantum/sign-dynamic")

QUANTUM_TIME=$(echo "$QUANTUM_RESPONSE" | tail -1)
QUANTUM_BODY=$(echo "$QUANTUM_RESPONSE" | head -n -1)

echo "Response: $QUANTUM_BODY"
echo "Time: ${QUANTUM_TIME}s"
echo ""

# Test 4: AI Threat Analysis
echo "4. Testing AI Threat Analysis..."
AI_PAYLOAD='{
  "attack": {
    "type": "quantum_brute_force",
    "sophistication": 8,
    "quantumPowered": true,
    "vectors": ["shor", "grover"]
  }
}'

AI_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$AI_PAYLOAD" \
  -w "\n%{time_total}" \
  "$WORKER_URL/api/v1/ai/analyze-threat")

AI_TIME=$(echo "$AI_RESPONSE" | tail -1)
AI_BODY=$(echo "$AI_RESPONSE" | head -n -1)

echo "Response: $AI_BODY"
echo "Time: ${AI_TIME}s"
echo ""

# Test 5: Token Validation
echo "5. Testing Token Validation..."
# Extract token from auth response if available
TOKEN=$(echo "$AUTH_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    VALIDATE_RESPONSE=$(curl -s -X POST \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{time_total}" \
      "$WORKER_URL/api/v1/validate")
    
    VALIDATE_TIME=$(echo "$VALIDATE_RESPONSE" | tail -1)
    VALIDATE_BODY=$(echo "$VALIDATE_RESPONSE" | head -n -1)
    
    echo "Response: $VALIDATE_BODY"
    echo "Time: ${VALIDATE_TIME}s"
else
    echo "No token available for validation test"
fi
echo ""

# Performance Summary
echo "========================================="
echo "Performance Summary"
echo "========================================="
echo -e "Health Check:      ${GREEN}${HEALTH_TIME}s${NC}"
echo -e "Authentication:    ${GREEN}${AUTH_TIME}s${NC}"
echo -e "Quantum Sign:      ${GREEN}${QUANTUM_TIME}s${NC}"
echo -e "AI Analysis:       ${GREEN}${AI_TIME}s${NC}"
if [ -n "$TOKEN" ]; then
    echo -e "Token Validation:  ${GREEN}${VALIDATE_TIME}s${NC}"
fi
echo ""

# Check if all response times are under 10ms
TOTAL_TIME=$(echo "$HEALTH_TIME + $AUTH_TIME + $QUANTUM_TIME + $AI_TIME" | bc)
AVG_TIME=$(echo "scale=3; $TOTAL_TIME / 4" | bc)

echo -e "Average Response Time: ${YELLOW}${AVG_TIME}s${NC}"

if (( $(echo "$AVG_TIME < 0.010" | bc -l) )); then
    echo -e "${GREEN}✓ Excellent! Average response time is under 10ms${NC}"
elif (( $(echo "$AVG_TIME < 0.050" | bc -l) )); then
    echo -e "${YELLOW}✓ Good! Average response time is under 50ms${NC}"
else
    echo -e "${RED}⚠ Warning: Average response time is over 50ms${NC}"
fi

echo ""
echo "Note: These times include network latency from your location to the edge."