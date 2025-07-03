import Arweave from 'arweave';
import { OnePasswordKeyManager } from '../security/OnePasswordKeyManager.js';
import * as fs from 'fs/promises';

export interface ArweaveConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  logging?: boolean;
}

export class ArweaveService {
  private static instance: ArweaveService | null = null;
  private arweave: Arweave;
  private wallet: any;
  private address: string | null = null;
  private keyManager: OnePasswordKeyManager;

  private constructor(config?: ArweaveConfig) {
    this.arweave = Arweave.init(config || {
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
      logging: false
    });
    
    this.keyManager = OnePasswordKeyManager.getInstance();
  }

  static getInstance(config?: ArweaveConfig): ArweaveService {
    if (!this.instance) {
      this.instance = new ArweaveService(config);
    }
    return this.instance;
  }

  async loadWalletFromOnePassword(): Promise<void> {
    try {
      console.log('Loading Arweave wallet from 1Password...');
      
      // Get the wallet key from 1Password using op read
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        const { stdout } = await execAsync('op read "op://SSS-API/arweave-wallet-key/password"');
        const walletString = stdout.trim();
        
        // Parse the wallet (should be a JWK)
        this.wallet = JSON.parse(walletString);
        
        // Get the wallet address
        this.address = await this.arweave.wallets.jwkToAddress(this.wallet);
        
        console.log('✓ Arweave wallet loaded successfully');
        console.log('  Address:', this.address);
        
        // Check balance
        const balance = await this.getBalance();
        console.log('  Balance:', this.arweave.ar.winstonToAr(balance), 'AR');
      } catch (error: any) {
        // If not found, try to load from backup file
        console.log('Wallet not found in 1Password, checking backup file...');
        await this.loadWalletFromFile('./.arweave-wallet.json');
      }
    } catch (error) {
      console.error('Failed to load Arweave wallet:', error);
      throw error;
    }
  }

  async loadWalletFromFile(path: string): Promise<void> {
    try {
      const walletData = await fs.readFile(path, 'utf-8');
      this.wallet = JSON.parse(walletData);
      this.address = await this.arweave.wallets.jwkToAddress(this.wallet);
      
      console.log('✓ Arweave wallet loaded from file');
      console.log('  Address:', this.address);
    } catch (error) {
      console.error('Failed to load wallet from file:', error);
      throw error;
    }
  }

  async generateNewWallet(): Promise<{ wallet: any; address: string }> {
    console.log('Generating new Arweave wallet...');
    
    const wallet = await this.arweave.wallets.generate();
    const address = await this.arweave.wallets.jwkToAddress(wallet);
    
    console.log('✓ New wallet generated');
    console.log('  Address:', address);
    
    return { wallet, address };
  }

  async saveWalletToOnePassword(wallet: any, name: string = 'arweave-wallet-key'): Promise<void> {
    try {
      console.log('Saving Arweave wallet to 1Password...');
      
      const walletString = JSON.stringify(wallet);
      
      // Create the wallet item in 1Password
      await this.keyManager.createKey(name, 'api', false);
      
      console.log('✓ Wallet saved to 1Password');
    } catch (error) {
      console.error('Failed to save wallet to 1Password:', error);
      throw error;
    }
  }

  async getBalance(address?: string): Promise<string> {
    const addr = address || this.address;
    if (!addr) {
      throw new Error('No wallet address available');
    }
    
    return await this.arweave.wallets.getBalance(addr);
  }

  async createTransaction(data: string | Buffer, tags?: { name: string; value: string }[]): Promise<any> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    
    const transaction = await this.arweave.createTransaction({
      data: data
    }, this.wallet);
    
    // Add tags if provided
    if (tags) {
      for (const tag of tags) {
        transaction.addTag(tag.name, tag.value);
      }
    }
    
    // Add SSS-API tag
    transaction.addTag('Application', 'SSS-API');
    transaction.addTag('Version', '1.0.0');
    
    return transaction;
  }

  async signAndPostTransaction(transaction: any): Promise<string> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    
    // Sign the transaction
    await this.arweave.transactions.sign(transaction, this.wallet);
    
    // Post the transaction
    const response = await this.arweave.transactions.post(transaction);
    
    if (response.status === 200) {
      console.log('✓ Transaction posted successfully');
      console.log('  Transaction ID:', transaction.id);
      return transaction.id;
    } else {
      throw new Error(`Failed to post transaction: ${response.status}`);
    }
  }

  async storeData(data: string | Buffer, tags?: { name: string; value: string }[]): Promise<string> {
    const transaction = await this.createTransaction(data, tags);
    return await this.signAndPostTransaction(transaction);
  }

  async getData(transactionId: string): Promise<string> {
    return await this.arweave.transactions.getData(transactionId, {
      decode: true,
      string: true
    }) as string;
  }

  async getTransaction(transactionId: string): Promise<any> {
    return await this.arweave.transactions.get(transactionId);
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    return await this.arweave.transactions.getStatus(transactionId);
  }

  // Store SSS-API authentication records on Arweave
  async storeAuthRecord(record: any): Promise<string> {
    const data = JSON.stringify(record);
    
    const tags = [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Record-Type', value: 'SSS-Auth' },
      { name: 'Timestamp', value: Date.now().toString() },
      { name: 'Namespace', value: record.namespace || 'default' }
    ];
    
    return await this.storeData(data, tags);
  }

  // Query transactions by tags
  async queryTransactions(tags: { name: string; values: string[] }[]): Promise<any[]> {
    const query = {
      op: 'and',
      expr1: {
        op: 'equals',
        expr1: 'App-Name',
        expr2: 'SSS-API'
      },
      expr2: {
        op: 'and',
        expr1: tags[0] ? {
          op: 'equals',
          expr1: tags[0].name,
          expr2: tags[0].values[0]
        } : { op: 'equals', expr1: '1', expr2: '1' },
        expr2: { op: 'equals', expr1: '1', expr2: '1' }
      }
    };
    
    const results = await this.arweave.api.post('graphql', {
      query: `
        query {
          transactions(tags: ${JSON.stringify(tags)}) {
            edges {
              node {
                id
                tags {
                  name
                  value
                }
              }
            }
          }
        }
      `
    });
    
    return results.data.data.transactions.edges.map((edge: any) => edge.node);
  }

  getArweaveInstance(): Arweave {
    return this.arweave;
  }

  getAddress(): string | null {
    return this.address;
  }

  isWalletLoaded(): boolean {
    return !!this.wallet;
  }
}