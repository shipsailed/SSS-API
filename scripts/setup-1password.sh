#!/bin/bash

echo "Setting up 1Password CLI for SSS-API..."

# Check if already signed in
if op account list &>/dev/null; then
    echo "✓ Already signed in to 1Password"
else
    echo "Please sign in to 1Password:"
    eval $(op signin)
fi

# Create SSS-API vault if it doesn't exist
echo "Checking for SSS-API vault..."
if op vault get "SSS-API" &>/dev/null; then
    echo "✓ SSS-API vault already exists"
else
    echo "Creating SSS-API vault..."
    op vault create "SSS-API"
    echo "✓ SSS-API vault created"
fi

# Function to create a secure credential
create_credential() {
    local name=$1
    local type=$2
    local value=$3
    
    echo "Creating $name..."
    
    # Check if item already exists
    if op item get "$name" --vault="SSS-API" &>/dev/null; then
        echo "  → $name already exists, skipping"
    else
        # Create item using op CLI format
        op item create \
            --category="API Credential" \
            --title="$name" \
            --vault="SSS-API" \
            password="$value" \
            type="$type" >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "  ✓ $name created"
        else
            echo "  ✗ Failed to create $name"
        fi
    fi
}

# Generate secure keys if they don't exist
echo ""
echo "Creating SSS-API credentials..."

# Core signing and encryption keys
create_credential "sss-api-signing-key" "signing" "$(openssl rand -hex 32)"
create_credential "sss-api-encryption-key" "encryption" "$(openssl rand -base64 32)"

# JWT and session keys
create_credential "sss-api-jwt-secret" "jwt" "$(openssl rand -base64 48)"
create_credential "sss-api-session-secret" "session" "$(openssl rand -base64 32)"

# Database passwords (matching Docker setup)
create_credential "sss-api-db-password" "database" "sss-secure-password"
create_credential "sss-api-redis-password" "redis" "redis-secure-password"

# Government API keys (mock for now)
create_credential "nhs-api-key" "api" "mock-nhs-key-$(openssl rand -hex 16)"
create_credential "hmrc-api-key" "api" "mock-hmrc-key-$(openssl rand -hex 16)"
create_credential "dvla-api-key" "api" "mock-dvla-key-$(openssl rand -hex 16)"
create_credential "border-force-api-key" "api" "mock-border-force-key-$(openssl rand -hex 16)"

# Consensus node keys
for i in {1..5}; do
    create_credential "consensus-node-${i}-key" "node" "$(openssl rand -hex 32)"
done

echo ""
echo "Testing 1Password integration..."

# Test retrieving a key
TEST_KEY=$(op item get "sss-api-signing-key" --vault="SSS-API" --fields label=password 2>/dev/null || echo "")
if [ -n "$TEST_KEY" ]; then
    echo "✓ Successfully retrieved test key"
else
    echo "✗ Failed to retrieve test key"
    echo "  Trying alternate method..."
    if op read "op://SSS-API/sss-api-signing-key/password" &>/dev/null; then
        echo "  ✓ Retrieved using op:// reference"
    else
        echo "  ✗ Could not retrieve key"
    fi
fi

echo ""
echo "1Password setup complete!"
echo ""
echo "To use in your application:"
echo "  1. Set OP_SERVICE_ACCOUNT_TOKEN for production"
echo "  2. Or use 'eval \$(op signin)' for development"
echo ""
echo "Available credentials in SSS-API vault:"
op item list --vault="SSS-API" --format=json | jq -r '.[].title' | sort