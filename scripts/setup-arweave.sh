#!/bin/bash

echo "Setting up Arweave integration with 1Password..."

# Check if 1Password is signed in
if ! op account list &>/dev/null; then
    echo "Please sign in to 1Password first:"
    eval $(op signin)
fi

# Function to create Arweave wallet in 1Password
create_arweave_wallet() {
    echo "Checking for existing Arweave wallet..."
    
    if op item get "arweave-wallet-key" --vault="SSS-API" &>/dev/null; then
        echo "✓ Arweave wallet already exists in 1Password"
        
        # Get the wallet address
        ADDRESS=$(op read "op://SSS-API/arweave-wallet-address/password" 2>/dev/null || echo "")
        if [ -n "$ADDRESS" ]; then
            echo "  Address: $ADDRESS"
        fi
    else
        echo "No Arweave wallet found. Would you like to:"
        echo "  1) Generate a new wallet"
        echo "  2) Import existing wallet from file"
        echo "  3) Skip for now"
        
        read -p "Choice (1-3): " CHOICE
        
        case $CHOICE in
            1)
                echo "Generating new Arweave wallet..."
                # We'll use a Node.js script to generate the wallet
                node -e "
                const Arweave = require('arweave');
                const arweave = Arweave.init({
                    host: 'arweave.net',
                    port: 443,
                    protocol: 'https'
                });
                
                (async () => {
                    const wallet = await arweave.wallets.generate();
                    const address = await arweave.wallets.jwkToAddress(wallet);
                    
                    console.log('WALLET:' + JSON.stringify(wallet));
                    console.log('ADDRESS:' + address);
                })();
                " > /tmp/arweave-gen.txt
                
                WALLET=$(grep "WALLET:" /tmp/arweave-gen.txt | sed 's/WALLET://')
                ADDRESS=$(grep "ADDRESS:" /tmp/arweave-gen.txt | sed 's/ADDRESS://')
                
                if [ -n "$WALLET" ] && [ -n "$ADDRESS" ]; then
                    # Save wallet to 1Password
                    op item create \
                        --category="API Credential" \
                        --title="arweave-wallet-key" \
                        --vault="SSS-API" \
                        wallet="$WALLET" \
                        type="arweave-wallet" >/dev/null 2>&1
                    
                    # Save address separately for easy access
                    op item create \
                        --category="API Credential" \
                        --title="arweave-wallet-address" \
                        --vault="SSS-API" \
                        password="$ADDRESS" \
                        type="arweave-address" >/dev/null 2>&1
                    
                    echo "✓ New Arweave wallet created and saved to 1Password"
                    echo "  Address: $ADDRESS"
                    echo ""
                    echo "⚠️  IMPORTANT: This wallet has no AR tokens yet!"
                    echo "  To use Arweave, you'll need to fund this wallet."
                    echo "  Send AR tokens to: $ADDRESS"
                    
                    # Save wallet to local file as backup
                    mkdir -p ~/.sss-api
                    echo "$WALLET" > ~/.sss-api/arweave-wallet.json
                    chmod 600 ~/.sss-api/arweave-wallet.json
                    echo ""
                    echo "  Backup saved to: ~/.sss-api/arweave-wallet.json"
                fi
                
                rm -f /tmp/arweave-gen.txt
                ;;
                
            2)
                read -p "Enter path to wallet JSON file: " WALLET_PATH
                if [ -f "$WALLET_PATH" ]; then
                    WALLET=$(cat "$WALLET_PATH")
                    
                    # Get address from wallet
                    ADDRESS=$(node -e "
                    const Arweave = require('arweave');
                    const arweave = Arweave.init({});
                    const wallet = $WALLET;
                    arweave.wallets.jwkToAddress(wallet).then(addr => console.log(addr));
                    ")
                    
                    # Save to 1Password
                    op item create \
                        --category="API Credential" \
                        --title="arweave-wallet-key" \
                        --vault="SSS-API" \
                        wallet="$WALLET" \
                        type="arweave-wallet" >/dev/null 2>&1
                    
                    op item create \
                        --category="API Credential" \
                        --title="arweave-wallet-address" \
                        --vault="SSS-API" \
                        password="$ADDRESS" \
                        type="arweave-address" >/dev/null 2>&1
                    
                    echo "✓ Arweave wallet imported and saved to 1Password"
                    echo "  Address: $ADDRESS"
                else
                    echo "✗ File not found: $WALLET_PATH"
                fi
                ;;
                
            3)
                echo "Skipping Arweave wallet setup..."
                ;;
        esac
    fi
}

# Create additional Arweave-related credentials
echo ""
echo "Creating Arweave configuration..."

# Arweave gateway configuration
if ! op item get "arweave-gateway-config" --vault="SSS-API" &>/dev/null; then
    op item create \
        --category="API Credential" \
        --title="arweave-gateway-config" \
        --vault="SSS-API" \
        host="arweave.net" \
        port="443" \
        protocol="https" \
        type="config" >/dev/null 2>&1
    echo "✓ Arweave gateway configuration saved"
fi

# Create wallet
create_arweave_wallet

echo ""
echo "Arweave setup complete!"
echo ""
echo "To use Arweave in your application:"
echo "  1. The ArweaveService will automatically load the wallet from 1Password"
echo "  2. Make sure your wallet has AR tokens for transactions"
echo "  3. Use arweaveService.storeData() to save data permanently"
echo ""
echo "Available items in 1Password:"
op item list --vault="SSS-API" | grep arweave