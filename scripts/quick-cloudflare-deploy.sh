#!/bin/bash

echo "🚀 SSS-API Cloudflare Quick Deploy"
echo "=================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Check if user is logged in to Cloudflare
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    wrangler login
fi

echo ""
echo "✅ Logged in to Cloudflare"
echo ""

# Navigate to cloudflare directory
cd "$(dirname "$0")/../cloudflare" || exit 1

# Create KV namespaces
echo "📚 Creating KV namespaces..."
echo ""

# Create production namespace
echo "Creating AUTH_CACHE namespace..."
KV_CREATE_OUTPUT=$(wrangler kv:namespace create "AUTH_CACHE" 2>&1)
if [[ $KV_CREATE_OUTPUT == *"id"* ]]; then
    KV_ID=$(echo "$KV_CREATE_OUTPUT" | grep -oE 'id = "[^"]*"' | cut -d'"' -f2)
    echo "Created AUTH_CACHE with ID: $KV_ID"
    
    # Update wrangler.toml with the KV namespace ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" wrangler.toml
    else
        # Linux
        sed -i "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" wrangler.toml
    fi
else
    echo "AUTH_CACHE namespace might already exist"
fi

# Create preview namespace
echo ""
echo "Creating AUTH_CACHE preview namespace..."
KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "AUTH_CACHE" --preview 2>&1)
if [[ $KV_PREVIEW_OUTPUT == *"id"* ]]; then
    KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oE 'id = "[^"]*"' | cut -d'"' -f2)
    echo "Created preview namespace with ID: $KV_PREVIEW_ID"
    
    # Update wrangler.toml with the preview ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/id = \"your-staging-kv-id\"/id = \"$KV_PREVIEW_ID\"/" wrangler.toml
    else
        sed -i "s/id = \"your-staging-kv-id\"/id = \"$KV_PREVIEW_ID\"/" wrangler.toml
    fi
else
    echo "Preview namespace might already exist"
fi

echo ""
echo "🚀 Deploying Worker..."
echo ""

# Deploy the worker
wrangler publish

echo ""
echo "✅ Deployment complete!"
echo ""

# Get the worker URL
WORKER_URL=$(wrangler publish --dry-run 2>&1 | grep -oE 'https://[^[:space:]]+\.workers\.dev' | head -1)

if [ -n "$WORKER_URL" ]; then
    echo "🌐 Your worker URL: $WORKER_URL"
    echo ""
    echo "📊 Test your deployment:"
    echo "  curl $WORKER_URL/health"
    echo ""
    echo "🧪 Run performance test:"
    echo "  ./scripts/test-cloudflare-performance.sh $WORKER_URL"
else
    echo "🌐 Check your worker at: https://dash.cloudflare.com/workers"
fi

echo ""
echo "📈 Next steps:"
echo "1. Test the health endpoint"
echo "2. Run performance tests"
echo "3. Configure custom domain (optional)"
echo "4. Enable analytics"