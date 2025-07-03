import { jwtVerify, importJWK, JWK } from 'jose';
import { 
  TokenPayload,
  TokenError,
  Stage2Config
} from '../../shared/types/index.js';

interface TokenCache {
  payload: TokenPayload;
  verified: number;
}

export class TokenVerifier {
  private publicKeys: Map<string, JWK> = new Map();
  private tokenCache: Map<string, TokenCache> = new Map();
  private replayCache: Set<string> = new Set();
  
  constructor(private config: Stage2Config) {
    this.startCacheCleanup();
  }

  /**
   * Mandatory token verification - prevents consensus without valid token
   * This is the cryptographic enforcement mechanism
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    if (!token) {
      throw new TokenError('No token provided');
    }
    
    // Check token format
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new TokenError('Invalid token format');
    }
    
    try {
      // Decode header to get key ID
      const header = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString()
      );
      
      // Get public key for verification
      const publicKey = await this.getPublicKey(header.kid);
      if (!publicKey) {
        throw new TokenError('Unknown key ID');
      }
      
      // Verify signature and decode payload
      const key = await importJWK(publicKey, 'EdDSA');
      const { payload } = await jwtVerify(token, key, {
        issuer: 'stage1.sss.gov.uk',
        audience: 'stage2.consensus.network',
        clockTolerance: 5 // 5 seconds clock tolerance
      });
      
      const tokenPayload = payload as unknown as TokenPayload;
      
      // Additional validations
      this.validatePayload(tokenPayload);
      
      // Check for replay attack
      if (this.replayCache.has(tokenPayload.jti)) {
        throw new TokenError('Token replay detected');
      }
      
      // Add to replay cache
      this.replayCache.add(tokenPayload.jti);
      
      // Cache verified token
      this.tokenCache.set(token, {
        payload: tokenPayload,
        verified: Date.now()
      });
      
      return tokenPayload;
      
    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }
      
      // Log verification failure for security monitoring
      console.error('Token verification failed:', error);
      
      throw new TokenError(
        'Token verification failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Batch verification for high throughput
   */
  async verifyBatch(tokens: string[]): Promise<(TokenPayload | null)[]> {
    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          return await this.verifyToken(token);
        } catch {
          return null;
        }
      })
    );
    
    return results;
  }

  private async getPublicKey(keyId: string): Promise<JWK | undefined> {
    // Check cache first
    if (this.publicKeys.has(keyId)) {
      return this.publicKeys.get(keyId);
    }
    
    // In production, fetch from Stage 1 key endpoint
    // For testing, use a static key
    const testKey: JWK = {
      kty: 'OKP',
      crv: 'Ed25519',
      x: 'test-public-key-x-coordinate', // Would be actual key
    };
    
    this.publicKeys.set(keyId, testKey);
    return testKey;
  }

  private validatePayload(payload: TokenPayload): void {
    // Check expiration (max 300 seconds validity)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new TokenError('Token expired');
    }
    
    if (payload.exp - payload.iat > 300) {
      throw new TokenError('Token validity exceeds maximum (300s)');
    }
    
    // Validate required fields
    if (!payload.jti || !payload.validation_results) {
      throw new TokenError('Missing required token fields');
    }
    
    // Check validation score
    if (payload.validation_results.score < 0.5) {
      throw new TokenError('Validation score too low');
    }
    
    // Check permissions
    if (payload.permissions === 0) {
      throw new TokenError('No permissions granted');
    }
  }

  private startCacheCleanup(): void {
    // Clean up expired tokens and replay cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const fiveMinutesAgo = now - 300000;
      
      // Clean token cache
      for (const [token, cache] of this.tokenCache.entries()) {
        if (cache.verified < fiveMinutesAgo) {
          this.tokenCache.delete(token);
        }
      }
      
      // Clean replay cache (tokens older than 10 minutes)
      const tenMinutesAgo = Math.floor((now - 600000) / 1000);
      for (const jti of this.replayCache) {
        // JTI format includes timestamp, so we can parse and check
        if (this.isExpiredJti(jti, tenMinutesAgo)) {
          this.replayCache.delete(jti);
        }
      }
    }, 300000); // 5 minutes
  }

  private isExpiredJti(jti: string, cutoffTime: number): boolean {
    // In production, JTI would include timestamp
    // For now, return false to keep all JTIs
    return false;
  }

  /**
   * Check if a token has specific permissions
   */
  hasPermission(payload: TokenPayload, permission: number): boolean {
    return (payload.permissions & permission) === permission;
  }

  /**
   * Get verification metrics
   */
  getMetrics(): {
    verifiedTokens: number;
    rejectedTokens: number;
    replayCacheSize: number;
    publicKeysLoaded: number;
  } {
    return {
      verifiedTokens: this.tokenCache.size,
      rejectedTokens: 0, // Would track in production
      replayCacheSize: this.replayCache.size,
      publicKeysLoaded: this.publicKeys.size
    };
  }

  /**
   * Clear all caches (for testing)
   */
  clearCaches(): void {
    this.tokenCache.clear();
    this.replayCache.clear();
  }
}