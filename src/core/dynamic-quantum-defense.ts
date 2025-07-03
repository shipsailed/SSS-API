import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa';
import { slh_dsa_sha2_128f, slh_dsa_sha2_192f, slh_dsa_sha2_256f } from '@noble/post-quantum/slh-dsa';
import { randomBytes as nobleRandomBytes } from '@noble/post-quantum/utils';
import { ed25519 } from '@noble/curves/ed25519';
import { secp256k1 } from '@noble/curves/secp256k1';
import { p256 } from '@noble/curves/p256';
import { p384 } from '@noble/curves/p384';
import { p521 } from '@noble/curves/p521';
import { sha256 } from '@noble/hashes/sha256';
import { sha3_256 } from '@noble/hashes/sha3';

/**
 * DYNAMIC QUANTUM DEFENSE SYSTEM
 * 
 * "The longer you wait, the more secure you are"
 * 
 * This system dynamically selects algorithms based on:
 * 1. User's time tolerance (100ms to 10s+)
 * 2. Data sensitivity level
 * 3. Threat assessment
 * 4. Network conditions
 * 
 * Perfect for decentralized cloud where trust must be earned through computation
 */

export interface DynamicDefenseConfig {
  minAlgorithms?: number;           // Minimum algorithms to use (default: 2)
  maxAlgorithms?: number;           // Maximum algorithms cap (default: 50)
  targetTime?: number;              // Target execution time in ms
  adaptiveMode?: boolean;           // Adjust based on actual performance
  prioritizeSpeed?: boolean;        // Prefer fast algorithms
  prioritizeDiversity?: boolean;    // Prefer mathematical diversity
  trustMode?: 'low' | 'medium' | 'high' | 'paranoid' | 'custom';
  decentralizedCloud?: boolean;     // Enable special cloud features
}

export interface AlgorithmProfile {
  name: string;
  type: 'lattice' | 'hash' | 'ecc' | 'code' | 'symmetric' | 'zk';
  family: string;
  avgTime: number;        // Average execution time in ms
  worstTime: number;      // Worst case time
  securityBits: number;   // Classical security level
  quantumBits: number;    // Quantum security level
  signatureSize: number;  // Bytes
  priority: number;       // Selection priority (higher = better)
  implementation: (key: Uint8Array, message: Uint8Array) => Promise<Uint8Array>;
}

export class DynamicQuantumDefense {
  private availableAlgorithms: Map<string, AlgorithmProfile> = new Map();
  private config: DynamicDefenseConfig;
  private performanceHistory: Map<string, number[]> = new Map();
  private keys: Map<string, any> = new Map();
  
  constructor(config: DynamicDefenseConfig = {}) {
    this.config = {
      minAlgorithms: 2,
      maxAlgorithms: 50,
      targetTime: 1000, // 1 second default
      adaptiveMode: true,
      prioritizeSpeed: false,
      prioritizeDiversity: true,
      trustMode: 'medium',
      decentralizedCloud: true,
      ...config
    };
    
    this.initializeAlgorithmProfiles();
    this.generateKeys();
  }
  
  private initializeAlgorithmProfiles() {
    // Define all available algorithms with their profiles
    const algorithms: AlgorithmProfile[] = [
      // Lattice-based (fast, quantum-secure)
      {
        name: 'ML-DSA-44',
        type: 'lattice',
        family: 'ML-DSA',
        avgTime: 7,
        worstTime: 15,
        securityBits: 128,
        quantumBits: 128,
        signatureSize: 2420,
        priority: 90,
        implementation: async (key, msg) => ml_dsa44.sign(key, msg)
      },
      {
        name: 'ML-DSA-65',
        type: 'lattice',
        family: 'ML-DSA',
        avgTime: 9,
        worstTime: 20,
        securityBits: 192,
        quantumBits: 192,
        signatureSize: 3309,
        priority: 95,
        implementation: async (key, msg) => ml_dsa65.sign(key, msg)
      },
      {
        name: 'ML-DSA-87',
        type: 'lattice',
        family: 'ML-DSA',
        avgTime: 11,
        worstTime: 25,
        securityBits: 256,
        quantumBits: 256,
        signatureSize: 4627,
        priority: 100,
        implementation: async (key, msg) => ml_dsa87.sign(key, msg)
      },
      
      // Hash-based (slower but different math)
      {
        name: 'SLH-DSA-128f',
        type: 'hash',
        family: 'SLH-DSA',
        avgTime: 40,
        worstTime: 80,
        securityBits: 128,
        quantumBits: 128,
        signatureSize: 17088,
        priority: 70,
        implementation: async (key, msg) => slh_dsa_sha2_128f.sign(key, msg)
      },
      {
        name: 'SLH-DSA-192f',
        type: 'hash',
        family: 'SLH-DSA',
        avgTime: 65,
        worstTime: 130,
        securityBits: 192,
        quantumBits: 192,
        signatureSize: 35664,
        priority: 75,
        implementation: async (key, msg) => slh_dsa_sha2_192f.sign(key, msg)
      },
      {
        name: 'SLH-DSA-256f',
        type: 'hash',
        family: 'SLH-DSA',
        avgTime: 110,
        worstTime: 220,
        securityBits: 256,
        quantumBits: 256,
        signatureSize: 49856,
        priority: 80,
        implementation: async (key, msg) => slh_dsa_sha2_256f.sign(key, msg)
      },
      
      // Classical ECC (very fast, not quantum-secure)
      {
        name: 'Ed25519',
        type: 'ecc',
        family: 'Edwards',
        avgTime: 0.3,
        worstTime: 1,
        securityBits: 128,
        quantumBits: 64,
        signatureSize: 64,
        priority: 60,
        implementation: async (key, msg) => ed25519.sign(msg, key)
      },
      {
        name: 'Secp256k1',
        type: 'ecc',
        family: 'Secp',
        avgTime: 1.2,
        worstTime: 3,
        securityBits: 128,
        quantumBits: 64,
        signatureSize: 64,
        priority: 55,
        implementation: async (key, msg) => {
          const msgHash = sha256(msg);
          const sig = secp256k1.sign(msgHash, key);
          return sig.toCompactBytes();
        }
      },
      {
        name: 'P-256',
        type: 'ecc',
        family: 'NIST',
        avgTime: 1.0,
        worstTime: 2,
        securityBits: 128,
        quantumBits: 64,
        signatureSize: 64,
        priority: 50,
        implementation: async (key, msg) => {
          const msgHash = sha256(msg);
          const sig = p256.sign(msgHash, key);
          return new Uint8Array(sig.toCompactBytes());
        }
      },
      {
        name: 'P-384',
        type: 'ecc',
        family: 'NIST',
        avgTime: 2.5,
        worstTime: 5,
        securityBits: 192,
        quantumBits: 96,
        signatureSize: 96,
        priority: 52,
        implementation: async (key, msg) => {
          const msgHash = sha256(msg);
          const sig = p384.sign(msgHash, key);
          return new Uint8Array(sig.toCompactBytes());
        }
      },
      {
        name: 'P-521',
        type: 'ecc',
        family: 'NIST',
        avgTime: 4.0,
        worstTime: 8,
        securityBits: 256,
        quantumBits: 128,
        signatureSize: 132,
        priority: 54,
        implementation: async (key, msg) => {
          const msgHash = sha256(msg);
          const sig = p521.sign(msgHash, key);
          // P-521 returns hex, convert to bytes
          const hex = sig.toCompactHex();
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
          }
          return bytes;
        }
      },
      
      // Symmetric constructions (ultra-fast)
      {
        name: 'HMAC-SHA256',
        type: 'symmetric',
        family: 'HMAC',
        avgTime: 0.1,
        worstTime: 0.5,
        securityBits: 256,
        quantumBits: 128,
        signatureSize: 32,
        priority: 40,
        implementation: async (key, msg) => {
          // Simplified HMAC for demo
          const combined = new Uint8Array([...key, ...msg]);
          return sha256(combined);
        }
      },
      {
        name: 'HMAC-SHA3-256',
        type: 'symmetric',
        family: 'HMAC',
        avgTime: 0.2,
        worstTime: 0.5,
        securityBits: 256,
        quantumBits: 128,
        signatureSize: 32,
        priority: 42,
        implementation: async (key, msg) => {
          const combined = new Uint8Array([...key, ...msg]);
          return sha3_256(combined);
        }
      }
    ];
    
    // Add all algorithms to the map
    for (const algo of algorithms) {
      this.availableAlgorithms.set(algo.name, algo);
    }
  }
  
  /**
   * DYNAMIC ALGORITHM SELECTION
   * The core innovation: select algorithms to fill available time
   */
  async selectOptimalAlgorithms(
    targetTime: number,
    requirements?: {
      minSecurity?: number;
      mustInclude?: string[];
      mustExclude?: string[];
      preferFamilies?: string[];
    }
  ): Promise<AlgorithmProfile[]> {
    const selected: AlgorithmProfile[] = [];
    const selectedFamilies = new Set<string>();
    const selectedTypes = new Set<string>();
    let totalTime = 0;
    
    // Sort algorithms by priority and performance
    const candidates = Array.from(this.availableAlgorithms.values())
      .filter(algo => {
        if (requirements?.mustExclude?.includes(algo.name)) return false;
        if (requirements?.minSecurity && algo.quantumBits < requirements.minSecurity) return false;
        return true;
      })
      .sort((a, b) => {
        // Prioritize diversity if configured
        if (this.config.prioritizeDiversity) {
          const aNew = !selectedFamilies.has(a.family);
          const bNew = !selectedFamilies.has(b.family);
          if (aNew && !bNew) return -1;
          if (!aNew && bNew) return 1;
        }
        
        // Then sort by priority/speed ratio
        const aScore = a.priority / (this.config.prioritizeSpeed ? a.avgTime : 1);
        const bScore = b.priority / (this.config.prioritizeSpeed ? b.avgTime : 1);
        return bScore - aScore;
      });
    
    // Add must-include algorithms first
    if (requirements?.mustInclude) {
      for (const name of requirements.mustInclude) {
        const algo = this.availableAlgorithms.get(name);
        if (algo) {
          selected.push(algo);
          selectedFamilies.add(algo.family);
          selectedTypes.add(algo.type);
          totalTime = Math.max(totalTime, algo.avgTime); // Parallel execution
        }
      }
    }
    
    // Fill remaining time with optimal algorithms
    for (const algo of candidates) {
      // Check if adding this algorithm stays within time budget
      const newTime = Math.max(totalTime, algo.avgTime);
      
      if (newTime > targetTime) {
        // Skip algorithms that would exceed time budget
        continue;
      }
      
      // Check if we've hit the algorithm limit
      if (selected.length >= (this.config.maxAlgorithms || 50)) {
        break;
      }
      
      // Add algorithm
      selected.push(algo);
      selectedFamilies.add(algo.family);
      selectedTypes.add(algo.type);
      totalTime = newTime;
      
      // If we're close to target time, we can stop
      if (totalTime >= targetTime * 0.9 && selected.length >= this.config.minAlgorithms) {
        break;
      }
    }
    
    // Ensure minimum algorithms
    while (selected.length < this.config.minAlgorithms && candidates.length > selected.length) {
      const nextAlgo = candidates.find(a => !selected.includes(a));
      if (nextAlgo) {
        selected.push(nextAlgo);
        totalTime = Math.max(totalTime, nextAlgo.avgTime);
      } else {
        break;
      }
    }
    
    return selected;
  }
  
  /**
   * Sign with dynamic algorithm selection based on time tolerance
   */
  async signDynamic(
    message: string | Uint8Array,
    options: {
      maxTime?: number;          // Maximum time willing to wait (ms)
      minAlgorithms?: number;    // Minimum algorithms required
      sensitivity?: 'low' | 'medium' | 'high' | 'critical';
      trustLevel?: number;       // 0-100, higher = more algorithms
    } = {}
  ): Promise<{
    signatures: Map<string, string>;
    algorithms: string[];
    executionTime: number;
    securityLevel: string;
    trustScore: number;
    metadata: any;
  }> {
    const startTime = Date.now();
    const msgBytes = typeof message === 'string' 
      ? new TextEncoder().encode(message) 
      : message;
    
    // Calculate target time based on options
    const targetTime = options.maxTime || this.calculateTargetTime(options);
    
    // Select optimal algorithms for the time budget
    const selectedAlgos = await this.selectOptimalAlgorithms(targetTime, {
      minSecurity: this.getMinSecurityForSensitivity(options.sensitivity)
    });
    
    console.log(`Selected ${selectedAlgos.length} algorithms for ${targetTime}ms time budget`);
    
    // Execute signatures in parallel
    const signatures = new Map<string, string>();
    const sigPromises = selectedAlgos.map(async algo => {
      const key = this.keys.get(algo.name);
      if (!key) throw new Error(`No key for ${algo.name}`);
      
      const sigStart = Date.now();
      const signature = await algo.implementation(key, msgBytes);
      const sigTime = Date.now() - sigStart;
      
      // Update performance history
      this.updatePerformanceHistory(algo.name, sigTime);
      
      return {
        name: algo.name,
        signature: Buffer.from(signature).toString('hex'),
        time: sigTime
      };
    });
    
    const results = await Promise.all(sigPromises);
    
    // Collect results
    for (const result of results) {
      signatures.set(result.name, result.signature);
    }
    
    const executionTime = Date.now() - startTime;
    
    // Calculate trust score (0-100)
    const trustScore = this.calculateTrustScore(selectedAlgos, executionTime);
    
    // Determine security level
    const securityLevel = this.determineSecurityLevel(selectedAlgos);
    
    return {
      signatures,
      algorithms: selectedAlgos.map(a => a.name),
      executionTime,
      securityLevel,
      trustScore,
      metadata: {
        targetTime,
        algorithmCount: selectedAlgos.length,
        families: [...new Set(selectedAlgos.map(a => a.family))],
        types: [...new Set(selectedAlgos.map(a => a.type))],
        totalSignatureSize: selectedAlgos.reduce((sum, a) => sum + a.signatureSize, 0),
        quantumResistant: selectedAlgos.some(a => a.quantumBits >= 128),
        breakProbability: Math.pow(2, -128 * selectedAlgos.length),
        decentralizedCloudReady: true
      }
    };
  }
  
  /**
   * Calculate target time based on trust requirements
   */
  private calculateTargetTime(options: any): number {
    // Base times for different trust modes
    const baseTimes = {
      low: 100,
      medium: 500,
      high: 1000,
      paranoid: 5000,
      custom: 1000
    };
    
    let targetTime = baseTimes[this.config.trustMode || 'medium'];
    
    // Adjust based on sensitivity
    if (options.sensitivity === 'critical') {
      targetTime *= 2;
    } else if (options.sensitivity === 'high') {
      targetTime *= 1.5;
    }
    
    // Adjust based on trust level (0-100)
    if (options.trustLevel !== undefined) {
      targetTime = 100 + (options.trustLevel / 100) * 9900; // 100ms to 10s
    }
    
    // For decentralized cloud, add extra time
    if (this.config.decentralizedCloud) {
      targetTime *= 1.2;
    }
    
    return Math.min(targetTime, 10000); // Cap at 10 seconds
  }
  
  /**
   * Get minimum security bits for sensitivity level
   */
  private getMinSecurityForSensitivity(sensitivity?: string): number {
    switch (sensitivity) {
      case 'critical': return 256;
      case 'high': return 192;
      case 'medium': return 128;
      case 'low': return 0;
      default: return 128;
    }
  }
  
  /**
   * Calculate trust score based on algorithms used
   */
  private calculateTrustScore(algorithms: AlgorithmProfile[], executionTime: number): number {
    let score = 0;
    
    // Points for number of algorithms (up to 30 points)
    score += Math.min(algorithms.length * 3, 30);
    
    // Points for diversity (up to 20 points)
    const families = new Set(algorithms.map(a => a.family)).size;
    score += families * 4;
    
    // Points for quantum resistance (up to 20 points)
    const quantumAlgos = algorithms.filter(a => a.quantumBits >= 128).length;
    score += (quantumAlgos / algorithms.length) * 20;
    
    // Points for execution time (up to 20 points)
    score += Math.min(executionTime / 50, 20);
    
    // Points for high-security algorithms (up to 10 points)
    const highSec = algorithms.filter(a => a.securityBits >= 192).length;
    score += (highSec / algorithms.length) * 10;
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * Determine overall security level
   */
  private determineSecurityLevel(algorithms: AlgorithmProfile[]): string {
    const avgQuantumBits = algorithms.reduce((sum, a) => sum + a.quantumBits, 0) / algorithms.length;
    const minQuantumBits = Math.min(...algorithms.map(a => a.quantumBits));
    
    if (algorithms.length >= 15 && minQuantumBits >= 128) {
      return 'ALIEN_DEFENSE';
    } else if (algorithms.length >= 10 && minQuantumBits >= 128) {
      return 'MAXIMUM';
    } else if (algorithms.length >= 6 && avgQuantumBits >= 128) {
      return 'HIGH';
    } else if (algorithms.length >= 4 && avgQuantumBits >= 64) {
      return 'MEDIUM';
    } else {
      return 'BASIC';
    }
  }
  
  /**
   * Update performance history for adaptive mode
   */
  private updatePerformanceHistory(algorithmName: string, time: number) {
    if (!this.config.adaptiveMode) return;
    
    const history = this.performanceHistory.get(algorithmName) || [];
    history.push(time);
    
    // Keep last 100 measurements
    if (history.length > 100) {
      history.shift();
    }
    
    this.performanceHistory.set(algorithmName, history);
    
    // Update algorithm profile with real performance data
    const algo = this.availableAlgorithms.get(algorithmName);
    if (algo && history.length >= 10) {
      algo.avgTime = history.reduce((a, b) => a + b, 0) / history.length;
      algo.worstTime = Math.max(...history);
    }
  }
  
  /**
   * Generate keys for all algorithms
   */
  private generateKeys() {
    // ML-DSA keys
    const mlDsa44Seed = nobleRandomBytes(32);
    const mlDsa44Keys = ml_dsa44.keygen(mlDsa44Seed);
    this.keys.set('ML-DSA-44', mlDsa44Keys.secretKey);
    
    const mlDsa65Seed = nobleRandomBytes(32);
    const mlDsa65Keys = ml_dsa65.keygen(mlDsa65Seed);
    this.keys.set('ML-DSA-65', mlDsa65Keys.secretKey);
    
    const mlDsa87Seed = nobleRandomBytes(32);
    const mlDsa87Keys = ml_dsa87.keygen(mlDsa87Seed);
    this.keys.set('ML-DSA-87', mlDsa87Keys.secretKey);
    
    // SLH-DSA keys
    const slh128Seed = nobleRandomBytes(48);
    const slh128Keys = slh_dsa_sha2_128f.keygen(slh128Seed);
    this.keys.set('SLH-DSA-128f', slh128Keys.secretKey);
    
    const slh192Seed = nobleRandomBytes(72);
    const slh192Keys = slh_dsa_sha2_192f.keygen(slh192Seed);
    this.keys.set('SLH-DSA-192f', slh192Keys.secretKey);
    
    const slh256Seed = nobleRandomBytes(96);
    const slh256Keys = slh_dsa_sha2_256f.keygen(slh256Seed);
    this.keys.set('SLH-DSA-256f', slh256Keys.secretKey);
    
    // ECC keys
    this.keys.set('Ed25519', ed25519.utils.randomPrivateKey());
    this.keys.set('Secp256k1', secp256k1.utils.randomPrivateKey());
    this.keys.set('P-256', p256.utils.randomPrivateKey());
    this.keys.set('P-384', p384.utils.randomPrivateKey());
    this.keys.set('P-521', p521.utils.randomPrivateKey());
    
    // Symmetric keys
    this.keys.set('HMAC-SHA256', nobleRandomBytes(32));
    this.keys.set('HMAC-SHA3-256', nobleRandomBytes(32));
  }
  
  /**
   * Get recommendations for decentralized cloud scenarios
   */
  getDecentralizedCloudRecommendations(scenario: string): any {
    const recommendations = {
      'untrusted-storage': {
        minAlgorithms: 6,
        targetTime: 1000,
        sensitivity: 'high',
        reason: 'Multiple algorithms prevent single point of failure in untrusted environment'
      },
      'distributed-compute': {
        minAlgorithms: 8,
        targetTime: 2000,
        sensitivity: 'critical',
        reason: 'Higher algorithm count protects against compromised nodes'
      },
      'public-blockchain': {
        minAlgorithms: 4,
        targetTime: 500,
        sensitivity: 'medium',
        reason: 'Balance between security and transaction costs'
      },
      'private-cloud': {
        minAlgorithms: 3,
        targetTime: 300,
        sensitivity: 'medium',
        reason: 'Moderate protection for semi-trusted environment'
      },
      'hostile-network': {
        minAlgorithms: 10,
        targetTime: 5000,
        sensitivity: 'critical',
        reason: 'Maximum protection against active adversaries'
      }
    };
    
    return recommendations[scenario] || recommendations['untrusted-storage'];
  }
}

// Export preset configurations
export const DYNAMIC_PRESETS = {
  // For normal cloud storage
  CLOUD_STANDARD: {
    targetTime: 500,
    minAlgorithms: 4,
    trustMode: 'medium' as const,
    adaptiveMode: true
  },
  
  // For decentralized/untrusted environments
  DECENTRALIZED_SECURE: {
    targetTime: 2000,
    minAlgorithms: 8,
    trustMode: 'high' as const,
    prioritizeDiversity: true,
    decentralizedCloud: true
  },
  
  // For maximum paranoia
  ZERO_TRUST: {
    targetTime: 10000,
    minAlgorithms: 15,
    maxAlgorithms: 50,
    trustMode: 'paranoid' as const,
    prioritizeDiversity: true,
    decentralizedCloud: true
  },
  
  // For time-sensitive operations
  SPEED_OPTIMIZED: {
    targetTime: 100,
    minAlgorithms: 2,
    maxAlgorithms: 5,
    trustMode: 'low' as const,
    prioritizeSpeed: true
  }
};