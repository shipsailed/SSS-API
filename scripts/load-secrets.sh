#!/bin/bash

# Load secrets from 1Password into environment variables
echo "Loading secrets from 1Password..."

# Check if signed in
if ! op account list &>/dev/null; then
    echo "Please sign in to 1Password first:"
    eval $(op signin)
fi

# Function to get secret from 1Password
get_secret() {
    local item=$1
    op read "op://SSS-API/$item/password" 2>/dev/null || echo ""
}

# Create .env file with secrets from 1Password
cat > .env << EOF
# Generated from 1Password - $(date)
# DO NOT COMMIT THIS FILE

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sss_api
DB_USER=postgres
DB_PASSWORD=$(get_secret "sss-api-db-password")

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$(get_secret "sss-api-redis-password")
REDIS_DB=0
REDIS_KEY_PREFIX=sss:

# Security Keys
SIGNING_KEY=$(get_secret "sss-api-signing-key")
ENCRYPTION_KEY=$(get_secret "sss-api-encryption-key")
JWT_SECRET=$(get_secret "sss-api-jwt-secret")
SESSION_SECRET=$(get_secret "sss-api-session-secret")

# Government APIs
NHS_API_KEY=$(get_secret "nhs-api-key")
HMRC_API_KEY=$(get_secret "hmrc-api-key")
DVLA_API_KEY=$(get_secret "dvla-api-key")
BORDER_FORCE_API_KEY=$(get_secret "border-force-api-key")

# Consensus Node Keys
CONSENSUS_NODE_1_KEY=$(get_secret "consensus-node-1-key")
CONSENSUS_NODE_2_KEY=$(get_secret "consensus-node-2-key")
CONSENSUS_NODE_3_KEY=$(get_secret "consensus-node-3-key")
CONSENSUS_NODE_4_KEY=$(get_secret "consensus-node-4-key")
CONSENSUS_NODE_5_KEY=$(get_secret "consensus-node-5-key")

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# 1Password Configuration
OP_VAULT=SSS-API
EOF

echo "✓ .env file created with secrets from 1Password"
echo ""
echo "Loaded secrets:"
echo "  - Database passwords"
echo "  - Redis password"
echo "  - Signing and encryption keys"
echo "  - JWT and session secrets"
echo "  - Government API keys"
echo "  - Consensus node keys"