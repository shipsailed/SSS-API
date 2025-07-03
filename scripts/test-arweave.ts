#!/usr/bin/env tsx

import { ArweaveService } from '../src/infrastructure/arweave/ArweaveService.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testArweave() {
  try {
    const arweave = ArweaveService.getInstance();
    
    // Load wallet
    await arweave.loadWalletFromOnePassword();
    
    // Check if wallet has funds
    const balance = await arweave.getBalance();
    const ar = arweave.getArweaveInstance().ar.winstonToAr(balance);
    
    console.log('Wallet balance:', ar, 'AR');
    
    if (parseFloat(ar) === 0) {
      console.log('\n⚠️  Your wallet has no AR tokens!');
      console.log('To test Arweave storage, you need to:');
      console.log('1. Get some AR tokens (from an exchange or faucet)');
      console.log('2. Send them to:', arweave.getAddress());
      console.log('\nFor testing, you can use the Arweave testnet:');
      console.log('https://www.arweave.org/technology#testnet');
      return;
    }
    
    // Test storing a small piece of data
    console.log('\nStoring test data on Arweave...');
    
    const testData = {
      type: 'SSS-API-TEST',
      timestamp: Date.now(),
      message: 'Hello from SSS-API!',
      system: 'Sequential Stage System'
    };
    
    const txId = await arweave.storeData(
      JSON.stringify(testData, null, 2),
      [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'SSS-API' },
        { name: 'Type', value: 'Test' }
      ]
    );
    
    console.log('✓ Data stored successfully!');
    console.log('Transaction ID:', txId);
    console.log('View on Arweave:', `https://viewblock.io/arweave/tx/${txId}`);
    
    // Wait a bit for propagation
    console.log('\nWaiting for transaction to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to retrieve it
    console.log('Retrieving data...');
    const retrievedData = await arweave.getData(txId);
    console.log('Retrieved:', retrievedData);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testArweave();