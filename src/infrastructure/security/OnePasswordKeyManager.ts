import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface SecureKey {
  id: string;
  value: string;
  type: 'signing' | 'encryption' | 'api';
  created: Date;
  vault?: string;
}

export class OnePasswordKeyManager {
  private static instance: OnePasswordKeyManager | null = null;
  private vault: string;
  private cache: Map<string, SecureKey> = new Map();
  private cacheTimeout: number = 300000; // 5 minutes

  private constructor(vault: string = 'SSS-API') {
    this.vault = vault;
  }

  static getInstance(vault?: string): OnePasswordKeyManager {
    if (!this.instance) {
      this.instance = new OnePasswordKeyManager(vault);
    }
    return this.instance;
  }

  private async executeOp(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(`op ${command}`);
      if (stderr) {
        console.error('1Password CLI error:', stderr);
      }
      return stdout.trim();
    } catch (error) {
      console.error('Failed to execute 1Password command:', error);
      throw error;
    }
  }

  async signin(): Promise<boolean> {
    try {
      // Check if already signed in
      const { stdout } = await execAsync('op account list');
      if (stdout.trim()) {
        return true;
      }
      
      // If not signed in, return false (user needs to sign in manually)
      console.log('Please sign in to 1Password using: eval $(op signin)');
      return false;
    } catch (error) {
      console.error('Failed to check 1Password status:', error);
      return false;
    }
  }

  async getItem(itemName: string): Promise<any> {
    try {
      const result = await this.executeOp(
        `item get "${itemName}" --vault="${this.vault}" --format=json`
      );
      return JSON.parse(result);
    } catch (error) {
      console.error(`Failed to get item ${itemName}:`, error);
      throw error;
    }
  }

  async getKey(keyName: string, field: string = 'password'): Promise<SecureKey> {
    // Check cache first
    const cacheKey = `${keyName}:${field}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.created.getTime() + this.cacheTimeout > Date.now()) {
      return cached;
    }

    try {
      const result = await this.executeOp(
        `item get "${keyName}" --vault="${this.vault}" --fields label=${field} --format=json`
      );
      
      const item = JSON.parse(result);
      const key: SecureKey = {
        id: item.id,
        value: item.value,
        type: this.inferKeyType(keyName),
        created: new Date(),
        vault: this.vault
      };

      // Cache the key
      this.cache.set(cacheKey, key);
      
      return key;
    } catch (error) {
      console.error(`Failed to get key ${keyName}:`, error);
      throw error;
    }
  }

  async createKey(
    keyName: string, 
    keyType: 'signing' | 'encryption' | 'api',
    generate: boolean = true
  ): Promise<SecureKey> {
    let value: string;
    
    if (generate) {
      switch (keyType) {
        case 'signing':
          // Generate Ed25519 private key
          value = crypto.randomBytes(32).toString('hex');
          break;
        case 'encryption':
          // Generate AES-256 key
          value = crypto.randomBytes(32).toString('base64');
          break;
        case 'api':
          // Generate API key
          value = crypto.randomBytes(32).toString('base64url');
          break;
      }
    } else {
      throw new Error('Manual key creation not implemented');
    }

    try {
      // Create item in 1Password
      const template = {
        title: keyName,
        category: 'API_CREDENTIAL',
        vault: { id: this.vault },
        fields: [
          {
            type: 'CONCEALED',
            label: 'password',
            value: value
          },
          {
            type: 'STRING',
            label: 'type',
            value: keyType
          }
        ]
      };

      await this.executeOp(
        `item create --template='${JSON.stringify(template)}'`
      );

      return {
        id: keyName,
        value,
        type: keyType,
        created: new Date(),
        vault: this.vault
      };
    } catch (error) {
      console.error(`Failed to create key ${keyName}:`, error);
      throw error;
    }
  }

  async rotateKey(keyName: string): Promise<SecureKey> {
    const existingKey = await this.getKey(keyName);
    const newKey = await this.createKey(
      `${keyName}-${Date.now()}`,
      existingKey.type,
      true
    );

    // Update references to use new key
    // This would need to be implemented based on your key usage

    return newKey;
  }

  async deleteKey(keyName: string): Promise<void> {
    try {
      await this.executeOp(
        `item delete "${keyName}" --vault="${this.vault}"`
      );
      
      // Remove from cache
      for (const [key] of this.cache) {
        if (key.startsWith(keyName)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error(`Failed to delete key ${keyName}:`, error);
      throw error;
    }
  }

  private inferKeyType(keyName: string): 'signing' | 'encryption' | 'api' {
    if (keyName.includes('sign') || keyName.includes('ed25519')) {
      return 'signing';
    } else if (keyName.includes('encrypt') || keyName.includes('aes')) {
      return 'encryption';
    }
    return 'api';
  }

  // Specific methods for SSS-API
  async getSigningKey(): Promise<string> {
    const key = await this.getKey('sss-api-signing-key');
    return key.value;
  }

  async getEncryptionKey(): Promise<string> {
    const key = await this.getKey('sss-api-encryption-key');
    return key.value;
  }

  async getConsensusKeys(): Promise<Map<string, string>> {
    const keys = new Map<string, string>();
    
    // Get all consensus node keys
    for (let i = 1; i <= 5; i++) {
      const key = await this.getKey(`consensus-node-${i}-key`);
      keys.set(`node-${i}`, key.value);
    }
    
    return keys;
  }

  async getGovernmentAPIKeys(): Promise<Map<string, string>> {
    const keys = new Map<string, string>();
    
    const services = ['nhs', 'hmrc', 'dvla', 'border-force'];
    for (const service of services) {
      try {
        const key = await this.getKey(`${service}-api-key`);
        keys.set(service, key.value);
      } catch (error) {
        console.warn(`No API key found for ${service}`);
      }
    }
    
    return keys;
  }

  clearCache(): void {
    this.cache.clear();
  }
}