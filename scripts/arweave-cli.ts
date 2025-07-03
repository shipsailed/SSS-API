#!/usr/bin/env tsx

import { ArweaveService } from '../src/infrastructure/arweave/ArweaveService.js';
import { program } from 'commander';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

dotenv.config();

const arweave = ArweaveService.getInstance();

program
  .name('arweave-cli')
  .description('CLI for Arweave operations with 1Password integration')
  .version('1.0.0');

program
  .command('wallet')
  .description('Wallet operations')
  .option('-g, --generate', 'Generate new wallet')
  .option('-l, --load', 'Load wallet from 1Password')
  .option('-b, --balance', 'Check wallet balance')
  .option('-a, --address', 'Show wallet address')
  .action(async (options) => {
    try {
      if (options.generate) {
        const { wallet, address } = await arweave.generateNewWallet();
        console.log('New wallet generated!');
        console.log('Address:', address);
        
        const save = await confirm('Save to 1Password? (y/n): ');
        if (save) {
          await arweave.saveWalletToOnePassword(wallet);
          console.log('✓ Wallet saved to 1Password');
        }
        
        const saveFile = await confirm('Save to file? (y/n): ');
        if (saveFile) {
          const path = './arweave-wallet.json';
          await fs.writeFile(path, JSON.stringify(wallet, null, 2));
          console.log(`✓ Wallet saved to ${path}`);
        }
      }
      
      if (options.load || options.balance || options.address) {
        await arweave.loadWalletFromOnePassword();
      }
      
      if (options.balance) {
        const balance = await arweave.getBalance();
        const ar = arweave.getArweaveInstance().ar.winstonToAr(balance);
        console.log('Balance:', ar, 'AR');
      }
      
      if (options.address) {
        console.log('Address:', arweave.getAddress());
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('store <file>')
  .description('Store a file on Arweave')
  .option('-t, --tags <tags>', 'Tags in format name:value,name2:value2')
  .action(async (file, options) => {
    try {
      await arweave.loadWalletFromOnePassword();
      
      const data = await fs.readFile(file);
      
      let tags = [];
      if (options.tags) {
        tags = options.tags.split(',').map((tag: string) => {
          const [name, value] = tag.split(':');
          return { name, value };
        });
      }
      
      // Add file metadata tags
      tags.push({ name: 'File-Name', value: file });
      tags.push({ name: 'File-Size', value: data.length.toString() });
      
      console.log('Storing file on Arweave...');
      const txId = await arweave.storeData(data, tags);
      
      console.log('✓ File stored successfully!');
      console.log('Transaction ID:', txId);
      console.log('View at: https://viewblock.io/arweave/tx/' + txId);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('get <txId>')
  .description('Retrieve data from Arweave')
  .option('-o, --output <file>', 'Save to file')
  .action(async (txId, options) => {
    try {
      console.log('Retrieving data from Arweave...');
      const data = await arweave.getData(txId);
      
      if (options.output) {
        await fs.writeFile(options.output, data);
        console.log(`✓ Data saved to ${options.output}`);
      } else {
        console.log('Data:', data);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('status <txId>')
  .description('Check transaction status')
  .action(async (txId) => {
    try {
      const status = await arweave.getTransactionStatus(txId);
      console.log('Transaction Status:', status);
      
      if (status.status === 200) {
        console.log('✓ Transaction confirmed');
        console.log('Block height:', status.block_height);
        console.log('Block hash:', status.block_indep_hash);
      } else {
        console.log('⏳ Transaction pending...');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('auth-record')
  .description('Store an SSS-API auth record on Arweave')
  .option('-n, --namespace <namespace>', 'Record namespace', 'default')
  .option('-i, --identifier <identifier>', 'Record identifier')
  .option('-d, --data <json>', 'Record data as JSON string')
  .action(async (options) => {
    try {
      await arweave.loadWalletFromOnePassword();
      
      const record = {
        namespace: options.namespace,
        identifier: options.identifier || `test-${Date.now()}`,
        data: options.data ? JSON.parse(options.data) : { test: true },
        timestamp: Date.now(),
        type: 'SSS-AUTH-RECORD'
      };
      
      console.log('Storing auth record on Arweave...');
      const txId = await arweave.storeAuthRecord(record);
      
      console.log('✓ Auth record stored successfully!');
      console.log('Transaction ID:', txId);
      console.log('Record:', JSON.stringify(record, null, 2));
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

async function confirm(message: string): Promise<boolean> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

program.parse();