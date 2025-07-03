#!/bin/bash

echo "Setting up Cloudflare credentials in 1Password..."

# Check if already signed in
if ! op account list &>/dev/null; then
    echo "Please sign in to 1Password first:"
    eval $(op signin)
fi

# Function to create a credential
create_cloudflare_credential() {
    local name=$1
    local type=$2
    local prompt_text=$3
    
    echo ""
    echo "Checking for $name..."
    
    # Check if item already exists
    if op item get "$name" --vault="SSS-API" &>/dev/null; then
        echo "  → $name already exists"
        return 0
    else
        echo "  $prompt_text"
        echo "  Press Enter to skip (you can add it later)"
        read -s value
        
        if [ -n "$value" ]; then
            # Create item using op CLI
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
        else
            echo "  → Skipped $name (you can add it later)"
        fi
    fi
}

# Create Cloudflare credentials
echo "Creating Cloudflare credentials..."
create_cloudflare_credential "cloudflare-api-token" "api" "Enter your Cloudflare API Token:"
create_cloudflare_credential "cloudflare-account-id" "account" "Enter your Cloudflare Account ID:"
create_cloudflare_credential "cloudflare-zone-id" "zone" "Enter your Cloudflare Zone ID (for sss.gov.uk):"

echo ""
echo "Cloudflare setup complete!"
echo ""
echo "Next steps:"
echo "1. If you haven't already, create a Cloudflare API token at:"
echo "   https://dash.cloudflare.com/profile/api-tokens"
echo ""
echo "2. The token needs these permissions:"
echo "   - Account: Cloudflare Workers Scripts:Edit"
echo "   - Account: Workers KV Storage:Edit"
echo "   - Account: Workers R2 Storage:Edit"
echo "   - Zone: Zone:Read"
echo "   - Zone: DNS:Read"
echo ""
echo "3. Run this script again to add the credentials"
echo ""
echo "4. Then run ./deploy-cloudflare.sh to deploy"