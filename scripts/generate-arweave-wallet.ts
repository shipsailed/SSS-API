#!/usr/bin/env tsx

import { ArweaveService } from '../src/infrastructure/arweave/ArweaveService.js';
import { OnePasswordKeyManager } from '../src/infrastructure/security/OnePasswordKeyManager.js';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

async function generateAndSaveWallet() {
  try {
    const arweave = ArweaveService.getInstance();
    const keyManager = OnePasswordKeyManager.getInstance();
    
    console.log('Generating new Arweave wallet...');
    const { wallet, address } = await arweave.generateNewWallet();
    
    console.log('✓ Wallet generated successfully!');
    console.log('  Address:', address);
    
    // Save wallet to 1Password
    console.log('\nSaving wallet to 1Password...');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Save the wallet JSON
    const walletString = JSON.stringify(wallet);
    
    // Create wallet item in 1Password
    try {
      await execAsync(`op item create \
        --category="API Credential" \
        --title="arweave-wallet-key" \
        --vault="SSS-API" \
        password="${walletString}" \
        type="arweave-wallet"`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('Updating existing wallet...');
        await execAsync(`op item edit "arweave-wallet-key" --vault="SSS-API" password="${walletString}"`);
      } else {
        throw error;
      }
    }
    
    // Save the address separately for easy access
    try {
      await execAsync(`op item create \
        --category="API Credential" \
        --title="arweave-wallet-address" \
        --vault="SSS-API" \
        password="${address}" \
        type="arweave-address"`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        await execAsync(`op item edit "arweave-wallet-address" --vault="SSS-API" password="${address}"`);
      } else {
        throw error;
      }
    }
    
    console.log('✓ Wallet saved to 1Password');
    
    // Save backup to file
    const backupPath = './.arweave-wallet.json';
    await fs.writeFile(backupPath, JSON.stringify(wallet, null, 2));
    await fs.chmod(backupPath, 0o600); // Read/write for owner only
    
    console.log('✓ Backup saved to:', backupPath);
    console.log('\n⚠️  IMPORTANT:');
    console.log('  1. This wallet has no AR tokens yet');
    console.log('  2. To use Arweave, send AR tokens to:', address);
    console.log('  3. Keep the backup file safe and private');
    console.log('\nWallet setup complete!');
    
  } catch (error) {
    console.error('Error generating wallet:', error);
    process.exit(1);
  }
}

generateAndSaveWallet();