#!/bin/bash

echo "🚀 Starting SSS-API Performance Test in Test Mode"
echo "================================================"

# Set test mode environment variables
export TEST_MODE=true
export TEST_MODE_BYPASS_SIGNATURES=true
export NODE_ENV=development

# Check if server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Server already running on port 3000"
else
    echo "Starting server in test mode..."
    npm run dev &
    sleep 5
fi

echo ""
echo "🧪 Running performance test..."
echo ""

# Run the realistic performance test
npm run test:performance:scale

echo ""
echo "✅ Test complete!"