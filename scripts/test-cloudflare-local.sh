#!/bin/bash

echo "🧪 Testing Cloudflare Workers Locally"
echo "====================================="
echo ""

cd "$(dirname "$0")/../cloudflare" || exit 1

echo "📦 Installing dependencies..."
npm init -y > /dev/null 2>&1
npm install --save-dev wrangler miniflare > /dev/null 2>&1

echo ""
echo "🚀 Starting local worker..."
echo "Visit http://localhost:8787 to test"
echo ""
echo "API Endpoints:"
echo "  GET  http://localhost:8787/health"
echo "  POST http://localhost:8787/api/v1/authenticate"
echo "  POST http://localhost:8787/api/v1/quantum/sign-dynamic"
echo "  POST http://localhost:8787/api/v1/ai/analyze-threat"
echo ""

# Run the local dev server
npx wrangler dev worker.js --local --port 8787