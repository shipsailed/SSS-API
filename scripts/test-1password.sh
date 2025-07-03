#!/bin/bash

echo "Testing 1Password CLI integration..."
echo ""

# Check if 1Password CLI is installed
if ! command -v op &> /dev/null; then
    echo "✗ 1Password CLI not found"
    echo "  Install with: brew install --cask 1password-cli"
    exit 1
fi

echo "✓ 1Password CLI found: $(op --version)"

# Check if signed in
if op account list &>/dev/null; then
    echo "✓ Signed in to 1Password"
    ACCOUNTS=$(op account list --format=json | jq -r '.[].email' | paste -sd ", " -)
    echo "  Accounts: $ACCOUNTS"
else
    echo "✗ Not signed in to 1Password"
    echo "  Run: eval \$(op signin)"
    exit 1
fi

# Check for SSS-API vault
echo ""
if op vault get "SSS-API" &>/dev/null; then
    echo "✓ SSS-API vault exists"
    ITEM_COUNT=$(op item list --vault="SSS-API" --format=json | jq '. | length')
    echo "  Items: $ITEM_COUNT"
else
    echo "✗ SSS-API vault not found"
    echo "  Run: ./scripts/setup-1password.sh"
    exit 1
fi

# Test retrieving keys
echo ""
echo "Testing key retrieval..."

test_key() {
    local key_name=$1
    if op item get "$key_name" --vault="SSS-API" --fields password &>/dev/null; then
        echo "  ✓ $key_name"
    else
        echo "  ✗ $key_name not found"
    fi
}

test_key "sss-api-signing-key"
test_key "sss-api-encryption-key"
test_key "sss-api-jwt-secret"
test_key "sss-api-db-password"
test_key "sss-api-redis-password"

echo ""
echo "Testing Node.js integration..."

# Create a simple test script
cat > /tmp/test-op-node.js << 'EOF'
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function test() {
    try {
        // Test getting a key
        const { stdout } = await execAsync('op item get "sss-api-signing-key" --vault="SSS-API" --fields password');
        console.log('✓ Successfully retrieved key from Node.js');
        console.log(`  Key length: ${stdout.trim().length} characters`);
    } catch (error) {
        console.log('✗ Failed to retrieve key from Node.js');
        console.log(`  Error: ${error.message}`);
    }
}

test();
EOF

node /tmp/test-op-node.js
rm /tmp/test-op-node.js

echo ""
echo "1Password integration test complete!"