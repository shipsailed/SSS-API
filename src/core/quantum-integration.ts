import { CryptoService } from '../shared/crypto/index.js';
import { QuantumCryptoService } from '../shared/crypto/quantum.js';
import { RedisCache } from '../infrastructure/cache/RedisCache.js';

export interface QuantumConfig {
  useQuantumForStage1?: boolean;
  useQuantumForStage2?: boolean;
  cacheQuantumSignatures?: boolean;
  parallelSigning?: boolean;
}

/**
 * Optimized quantum-resistant integration for SSS-API
 * Balances security and performance based on operation criticality
 */
export class QuantumIntegration {
  private classical: CryptoService;
  private quantum: QuantumCryptoService;
  private cache: RedisCache;
  private config: QuantumConfig;

  constructor(config: QuantumConfig = {}) {
    this.classical = new CryptoService();
    this.quantum = new QuantumCryptoService(this.classical);
    this.cache = RedisCache.getInstance();
    
    this.config = {
      useQuantumForStage1: false, // Stage 1 uses classical for speed
      useQuantumForStage2: true,   // Stage 2 uses quantum for security
      cacheQuantumSignatures: true,
      parallelSigning: true,
      ...config
    };
  }

  /**
   * Smart signing based on operation type and performance requirements
   */
  async sign(
    message: string,
    operationType: 'stage1' | 'stage2' | 'critical'
  ): Promise<{
    signature: string;
    type: 'classical' | 'quantum' | 'hybrid';
    metadata?: any;
  }> {
    // Critical operations always use hybrid
    if (operationType === 'critical') {
      return this.hybridSign(message);
    }

    // Stage 1: Use classical for speed (thousands of ops/sec)
    if (operationType === 'stage1' && !this.config.useQuantumForStage1) {
      const signature = await this.classical.sign(message);
      return {
        signature,
        type: 'classical',
        metadata: { algorithm: 'Ed25519', securityLevel: 128 }
      };
    }

    // Stage 2: Use quantum or hybrid based on config
    if (operationType === 'stage2' && this.config.useQuantumForStage2) {
      // Check cache first
      if (this.config.cacheQuantumSignatures) {
        const cached = await this.getCachedSignature(message, 'quantum');
        if (cached) return cached;
      }

      const signature = await this.quantum.quantumSign(message);
      const result = {
        signature,
        type: 'quantum' as const,
        metadata: { algorithm: 'ML-DSA-44', securityLevel: 128, quantumSecure: true }
      };

      // Cache the result
      if (this.config.cacheQuantumSignatures) {
        await this.cacheSignature(message, result);
      }

      return result;
    }

    // Default to classical
    const signature = await this.classical.sign(message);
    return {
      signature,
      type: 'classical',
      metadata: { algorithm: 'Ed25519', securityLevel: 128 }
    };
  }

  /**
   * Hybrid signing for maximum security
   */
  private async hybridSign(message: string): Promise<{
    signature: string;
    type: 'hybrid';
    metadata: any;
  }> {
    // Check cache
    if (this.config.cacheQuantumSignatures) {
      const cached = await this.getCachedSignature(message, 'hybrid');
      if (cached) return cached as any;
    }

    const hybrid = await this.quantum.hybridSign(message);
    const result = {
      signature: hybrid.hybrid,
      type: 'hybrid' as const,
      metadata: {
        classical: { algorithm: 'Ed25519', signature: hybrid.classical },
        quantum: { algorithm: 'ML-DSA-44', signature: hybrid.quantum },
        securityLevel: 128,
        quantumSecure: true
      }
    };

    // Cache the result
    if (this.config.cacheQuantumSignatures) {
      await this.cacheSignature(message, result);
    }

    return result;
  }

  /**
   * Batch signing with parallelization
   */
  async batchSign(
    messages: { message: string; type: 'stage1' | 'stage2' | 'critical' }[]
  ): Promise<any[]> {
    if (!this.config.parallelSigning) {
      // Sequential processing
      const results = [];
      for (const { message, type } of messages) {
        results.push(await this.sign(message, type));
      }
      return results;
    }

    // Parallel processing for better performance
    const promises = messages.map(({ message, type }) => 
      this.sign(message, type)
    );
    
    return Promise.all(promises);
  }

  /**
   * Verify signature with automatic type detection
   */
  async verify(
    message: string,
    signature: string,
    type: 'classical' | 'quantum' | 'hybrid',
    publicKey?: string
  ): Promise<boolean> {
    switch (type) {
      case 'classical':
        return this.classical.verify(message, signature, publicKey);
      
      case 'quantum':
        return this.quantum.quantumVerify(message, signature, publicKey);
      
      case 'hybrid':
        return this.quantum.hybridVerify(message, signature, publicKey);
      
      default:
        // Try to auto-detect based on signature length
        if (signature.length < 200) {
          return this.classical.verify(message, signature, publicKey);
        } else {
          return this.quantum.quantumVerify(message, signature, publicKey);
        }
    }
  }

  /**
   * Key exchange using ML-KEM-768
   */
  async setupSecureChannel() {
    const kemKeypair = await this.quantum.generateKemKeypair();
    return {
      publicKey: kemKeypair.publicKey,
      encapsulate: async (peerPublicKey: string) => {
        return this.quantum.kemEncapsulate(peerPublicKey);
      },
      decapsulate: async (cipherText: string) => {
        return this.quantum.kemDecapsulate(cipherText, kemKeypair.secretKey);
      }
    };
  }

  /**
   * Cache management
   */
  private async getCachedSignature(
    message: string,
    type: string
  ): Promise<any | null> {
    const key = `quantum:sig:${type}:${this.classical.hash(message)}`;
    const cached = await this.cache.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheSignature(
    message: string,
    result: any
  ): Promise<void> {
    const key = `quantum:sig:${result.type}:${this.classical.hash(message)}`;
    await this.cache.set(key, JSON.stringify(result), 3600); // 1 hour TTL
  }

  /**
   * Performance metrics
   */
  async getPerformanceMetrics() {
    const benchmark = await this.quantum.benchmark(100);
    
    return {
      classical: {
        opsPerSecond: benchmark.classical.opsPerSecond,
        avgLatency: benchmark.classical.perOp,
        quantumVulnerable: true
      },
      quantum: {
        opsPerSecond: benchmark.quantum.opsPerSecond,
        avgLatency: benchmark.quantum.perOp,
        quantumSecure: true,
        signatureSize: 2420
      },
      hybrid: {
        opsPerSecond: benchmark.hybrid.opsPerSecond,
        avgLatency: benchmark.hybrid.perOp,
        quantumSecure: true,
        signatureSize: 2484
      },
      recommendations: {
        stage1: 'classical',
        stage2: 'quantum or hybrid',
        criticalOps: 'hybrid',
        keyExchange: 'ML-KEM-768'
      }
    };
  }

  /**
   * Migration helper for transitioning to quantum
   */
  async migrateToQuantum(data: any): Promise<any> {
    // Re-sign data with quantum signatures
    if (data.signature && data.type === 'classical' && data.message) {
      const newSig = await this.quantum.quantumSign(data.message);
      return {
        ...data,
        signature: newSig,
        type: 'quantum',
        migratedAt: new Date().toISOString(),
        originalSignature: data.signature
      };
    }
    return data;
  }
}

// Export singleton for convenience
export const quantumIntegration = new QuantumIntegration();