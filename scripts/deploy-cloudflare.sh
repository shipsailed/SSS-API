#!/bin/bash

echo "Deploying SSS-API to Cloudflare Workers..."
echo ""

# Check if already signed in to 1Password
if ! op account list &>/dev/null; then
    echo "Please sign in to 1Password first:"
    eval $(op signin)
fi

# Function to get secret from 1Password
get_secret() {
    local item=$1
    op read "op://SSS-API/$item/password" 2>/dev/null || echo ""
}

# Get Cloudflare credentials
CLOUDFLARE_API_TOKEN=$(get_secret "cloudflare-api-token")
CLOUDFLARE_ACCOUNT_ID=$(get_secret "cloudflare-account-id")
CLOUDFLARE_ZONE_ID=$(get_secret "cloudflare-zone-id")

# Check if credentials exist
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Cloudflare API Token not found in 1Password"
    echo "   Please run ./scripts/setup-cloudflare.sh first"
    exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "❌ Cloudflare Account ID not found in 1Password"
    echo "   Please run ./scripts/setup-cloudflare.sh first"
    exit 1
fi

echo "✓ Cloudflare credentials loaded from 1Password"
echo ""

# Export for wrangler
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

# Change to cloudflare directory
cd cloudflare || exit 1

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
fi

echo "Creating KV namespaces..."
echo ""

# Function to create KV namespace
create_kv_namespace() {
    local name=$1
    local binding=$2
    
    echo "Creating KV namespace: $name"
    
    # Create namespace and capture the ID
    output=$(wrangler kv:namespace create "$binding" 2>&1)
    
    if echo "$output" | grep -q "already exists"; then
        echo "  → Namespace already exists"
        # Try to list and find the ID
        namespace_id=$(wrangler kv:namespace list | grep "$name" | awk '{print $2}')
    else
        # Extract ID from creation output
        namespace_id=$(echo "$output" | grep -oE 'id = "[^"]+' | cut -d'"' -f2)
        echo "  ✓ Created with ID: $namespace_id"
    fi
    
    # Create preview namespace
    echo "Creating preview namespace: ${name}_preview"
    preview_output=$(wrangler kv:namespace create "${binding}" --preview 2>&1)
    
    if echo "$preview_output" | grep -q "already exists"; then
        echo "  → Preview namespace already exists"
        preview_id=$(wrangler kv:namespace list --preview | grep "${name}_preview" | awk '{print $2}')
    else
        preview_id=$(echo "$preview_output" | grep -oE 'id = "[^"]+' | cut -d'"' -f2)
        echo "  ✓ Created preview with ID: $preview_id"
    fi
    
    echo ""
    
    # Return the IDs
    echo "$namespace_id|$preview_id"
}

# Create all required KV namespaces
echo "Setting up KV namespaces..."
AUTH_CACHE_IDS=$(create_kv_namespace "sss-auth-cache" "AUTH_CACHE")
TOKEN_CACHE_IDS=$(create_kv_namespace "sss-token-cache" "TOKEN_CACHE")
THREAT_CACHE_IDS=$(create_kv_namespace "sss-threat-cache" "THREAT_CACHE")

# Extract IDs
AUTH_CACHE_ID=$(echo "$AUTH_CACHE_IDS" | cut -d'|' -f1)
AUTH_CACHE_PREVIEW_ID=$(echo "$AUTH_CACHE_IDS" | cut -d'|' -f2)
TOKEN_CACHE_ID=$(echo "$TOKEN_CACHE_IDS" | cut -d'|' -f1)
TOKEN_CACHE_PREVIEW_ID=$(echo "$TOKEN_CACHE_IDS" | cut -d'|' -f2)
THREAT_CACHE_ID=$(echo "$THREAT_CACHE_IDS" | cut -d'|' -f1)
THREAT_CACHE_PREVIEW_ID=$(echo "$THREAT_CACHE_IDS" | cut -d'|' -f2)

# Update wrangler.toml with actual IDs
echo "Updating wrangler.toml with KV namespace IDs..."

# Create updated wrangler.toml
cat > wrangler.toml << EOF
name = "sss-api-edge"
main = "worker.js"
compatibility_date = "2024-01-01"
account_id = "$CLOUDFLARE_ACCOUNT_ID"

# Development environment
[env.development]
vars = { ORIGIN_URL = "http://localhost:3000" }
kv_namespaces = [
  { binding = "AUTH_CACHE", id = "$AUTH_CACHE_ID", preview_id = "$AUTH_CACHE_PREVIEW_ID" },
  { binding = "TOKEN_CACHE", id = "$TOKEN_CACHE_ID", preview_id = "$TOKEN_CACHE_PREVIEW_ID" },
  { binding = "THREAT_CACHE", id = "$THREAT_CACHE_ID", preview_id = "$THREAT_CACHE_PREVIEW_ID" }
]

# Staging environment
[env.staging]
vars = { ORIGIN_URL = "https://staging.sss.gov.uk" }
kv_namespaces = [
  { binding = "AUTH_CACHE", id = "$AUTH_CACHE_ID" },
  { binding = "TOKEN_CACHE", id = "$TOKEN_CACHE_ID" },
  { binding = "THREAT_CACHE", id = "$THREAT_CACHE_ID" }
]

# Production environment
[env.production]
vars = { ORIGIN_URL = "https://core.sss.gov.uk" }
kv_namespaces = [
  { binding = "AUTH_CACHE", id = "$AUTH_CACHE_ID" },
  { binding = "TOKEN_CACHE", id = "$TOKEN_CACHE_ID" },
  { binding = "THREAT_CACHE", id = "$THREAT_CACHE_ID" }
]

# Durable Objects for regional state
[[durable_objects.bindings]]
name = "AUTH"
class_name = "AuthenticationState"
script_name = "sss-api-edge"

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
script_name = "sss-api-edge"

# Analytics Engine for real-time metrics
[[analytics_engine_datasets]]
binding = "METRICS"

# R2 bucket for audit logs
[[r2_buckets]]
binding = "AUDIT_LOGS"
bucket_name = "sss-api-audit-logs"

# Routes (uncomment when domain is configured)
# [[routes]]
# pattern = "sss.gov.uk/api/*"
# zone_id = "$CLOUDFLARE_ZONE_ID"

# [[routes]]
# pattern = "api.sss.gov.uk/*"
# zone_id = "$CLOUDFLARE_ZONE_ID"

# Performance settings
[build]
command = "npm install"

[miniflare]
kv_persist = true
EOF

echo "✓ wrangler.toml updated"
echo ""

# Deploy to development first
echo "Deploying to development environment..."
wrangler deploy --env development

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully deployed to Cloudflare Workers (development)"
    echo ""
    echo "Worker URL: https://sss-api-edge.{your-subdomain}.workers.dev"
    echo ""
    echo "Next steps:"
    echo "1. Test the worker with: node performance-test.js"
    echo "2. Deploy to staging: wrangler deploy --env staging"
    echo "3. Deploy to production: wrangler deploy --env production"
    echo ""
    echo "To add secrets to the worker:"
    echo "  wrangler secret put SIGNING_KEY --env production"
    echo "  wrangler secret put JWT_SECRET --env production"
else
    echo ""
    echo "❌ Deployment failed"
    echo "Please check the error messages above"
fi