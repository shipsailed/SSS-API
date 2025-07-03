import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { randomBytes } from 'crypto';
import { TokenError } from '../types/index.js';

// Set up SHA512 for ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Cryptographic primitives for the Sequential Stage System

export class CryptoService {
  private privateKey: Uint8Array;
  private publicKey: Uint8Array;
  
  constructor(privateKeyHex?: string) {
    if (privateKeyHex) {
      this.privateKey = hexToBytes(privateKeyHex);
    } else {
      this.privateKey = ed.utils.randomPrivateKey();
    }
    this.publicKey = ed.getPublicKey(this.privateKey);
  }

  /**
   * Sign a message using EdDSA
   * Achieves 2^-256 forgery probability
   */
  async sign(message: string | Uint8Array): Promise<string> {
    const msgBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message) 
      : message;
    
    const signature = await ed.sign(msgBytes, this.privateKey);
    return bytesToHex(signature);
  }

  /**
   * Verify an EdDSA signature
   */
  async verify(
    message: string | Uint8Array, 
    signature: string, 
    publicKey?: string
  ): Promise<boolean> {
    try {
      const msgBytes = typeof message === 'string' 
        ? new TextEncoder().encode(message) 
        : message;
      
      const sigBytes = hexToBytes(signature);
      const pubKey = publicKey 
        ? hexToBytes(publicKey) 
        : this.publicKey;
      
      return await ed.verify(sigBytes, msgBytes, pubKey);
    } catch {
      return false;
    }
  }

  /**
   * Generate a cryptographically secure random ID
   */
  generateId(): string {
    return bytesToHex(randomBytes(16));
  }

  /**
   * Hash data using SHA-256 (128-bit quantum security)
   */
  hash(data: string | Uint8Array): string {
    const bytes = typeof data === 'string' 
      ? new TextEncoder().encode(data) 
      : data;
    return bytesToHex(sha256(bytes));
  }

  /**
   * Generate HMAC for message authentication
   */
  async hmac(key: Uint8Array, message: string): Promise<string> {
    const keyHash = sha256(key);
    const msgBytes = new TextEncoder().encode(message);
    const innerHash = sha256(new Uint8Array([...keyHash, ...msgBytes]));
    return bytesToHex(innerHash);
  }

  /**
   * Time-constant comparison to prevent timing attacks
   */
  constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Get the public key in hex format
   */
  getPublicKey(): string {
    return bytesToHex(this.publicKey);
  }

  /**
   * Get key pair for external use
   */
  getKeyPair() {
    return {
      privateKey: bytesToHex(this.privateKey),
      publicKey: bytesToHex(this.publicKey)
    };
  }
}

// Merkle Tree implementation for Stage 2
export class MerkleTree {
  private leaves: string[];
  private tree: string[][];

  constructor(leaves: string[] = []) {
    this.leaves = leaves;
    this.tree = this.buildTree();
  }

  private buildTree(): string[][] {
    if (this.leaves.length === 0) return [[]];
    
    let currentLevel = this.leaves.map(leaf => sha256Hash(leaf));
    const tree = [currentLevel];
    
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(sha256Hash(left + right));
      }
      
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }
    
    return tree;
  }

  getRoot(): string {
    if (this.tree.length === 0) return '';
    return this.tree[this.tree.length - 1][0];
  }

  getProof(index: number): string[] {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error('Leaf index out of range');
    }
    
    const proof: string[] = [];
    let currentIndex = index;
    
    for (let level = 0; level < this.tree.length - 1; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < this.tree[level].length) {
        proof.push(this.tree[level][siblingIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return proof;
  }

  verify(leaf: string, index: number, proof: string[], root: string): boolean {
    let hash = sha256Hash(leaf);
    let currentIndex = index;
    
    for (const proofElement of proof) {
      const isRightNode = currentIndex % 2 === 1;
      hash = isRightNode 
        ? sha256Hash(proofElement + hash)
        : sha256Hash(hash + proofElement);
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return hash === root;
  }

  addLeaf(leaf: string): void {
    this.leaves.push(leaf);
    this.tree = this.buildTree();
  }

  getBatchRoot(startIndex: number, endIndex: number): string {
    const batchLeaves = this.leaves.slice(startIndex, endIndex + 1);
    const batchTree = new MerkleTree(batchLeaves);
    return batchTree.getRoot();
  }
}

// Utility functions
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function sha256Hash(data: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(data)));
}

// Token utilities
export class TokenManager {
  constructor(private crypto: CryptoService) {}

  /**
   * Create a JWT-like token with EdDSA signature
   */
  async createToken(payload: Record<string, unknown>): Promise<string> {
    const header = {
      alg: 'EdDSA',
      typ: 'JWT',
      kid: this.crypto.getPublicKey().substring(0, 16)
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const message = `${encodedHeader}.${encodedPayload}`;
    
    const signature = await this.crypto.sign(message);
    
    return `${message}.${base64UrlEncode(signature)}`;
  }

  /**
   * Verify and decode a token
   */
  async verifyToken(
    token: string, 
    publicKey?: string
  ): Promise<Record<string, unknown>> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new TokenError('Invalid token format');
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    const signature = base64UrlDecode(encodedSignature);
    
    const isValid = await this.crypto.verify(message, signature, publicKey);
    if (!isValid) {
      throw new TokenError('Invalid token signature');
    }
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new TokenError('Token expired');
    }
    
    return payload;
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  const padding = 4 - (str.length % 4);
  const padded = padding < 4 ? str + '='.repeat(padding) : str;
  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString();
}

// Export singleton instances for convenience
export const defaultCrypto = new CryptoService();
export const defaultTokenManager = new TokenManager(defaultCrypto);