import { AuthenticationRequest } from '../../shared/types/index.js';

interface FeatureVector {
  timeDelta: number;
  requestSize: number;
  signatureCount: number;
  dataComplexity: number;
  sourceEntropy: number;
  velocityScore: number;
  geoAnomaly: number;
  behaviorScore: number;
}

interface ModelWeights {
  timeDelta: number;
  requestSize: number;
  signatureCount: number;
  dataComplexity: number;
  sourceEntropy: number;
  velocityScore: number;
  geoAnomaly: number;
  behaviorScore: number;
  bias: number;
}

export class FraudDetector {
  private weights: ModelWeights;
  private threshold: number;
  private requestHistory: Map<string, AuthenticationRequest[]>;
  
  constructor(threshold = 0.95) {
    this.threshold = threshold;
    this.requestHistory = new Map();
    
    // Pre-trained weights (in production, load from model file)
    this.weights = {
      timeDelta: -0.23,
      requestSize: 0.15,
      signatureCount: -0.45,
      dataComplexity: 0.18,
      sourceEntropy: 0.31,
      velocityScore: 0.52,
      geoAnomaly: 0.67,
      behaviorScore: 0.41,
      bias: -0.12
    };
  }

  /**
   * Analyze request for fraud patterns
   * Returns fraud score 0-1 (0 = legitimate, 1 = fraudulent)
   */
  async analyze(request: AuthenticationRequest): Promise<number> {
    const features = await this.extractFeatures(request);
    const score = this.computeScore(features);
    
    // Store for velocity analysis
    this.updateHistory(request);
    
    return Math.max(0, Math.min(1, score));
  }

  private async extractFeatures(request: AuthenticationRequest): Promise<FeatureVector> {
    const now = Date.now();
    
    return {
      timeDelta: this.normalizeTimeDelta(now - request.timestamp),
      requestSize: this.normalizeSize(JSON.stringify(request).length),
      signatureCount: this.normalizeCount(request.signatures?.length || 0),
      dataComplexity: this.calculateDataComplexity(request.data),
      sourceEntropy: this.calculateSourceEntropy(request),
      velocityScore: await this.calculateVelocity(request),
      geoAnomaly: this.detectGeoAnomaly(request),
      behaviorScore: this.analyzeBehavior(request)
    };
  }

  private computeScore(features: FeatureVector): number {
    let score = this.weights.bias;
    
    for (const [feature, value] of Object.entries(features)) {
      score += value * this.weights[feature as keyof ModelWeights];
    }
    
    // Apply sigmoid activation
    return 1 / (1 + Math.exp(-score));
  }

  private normalizeTimeDelta(delta: number): number {
    // Normalize to 0-1 where 0 is current, 1 is >5 minutes old
    return Math.min(delta / 300000, 1);
  }

  private normalizeSize(size: number): number {
    // Normalize request size (typical: 500-5000 bytes)
    return Math.min(size / 5000, 1);
  }

  private normalizeCount(count: number): number {
    // Normalize signature count (typical: 1-3)
    return Math.min(count / 3, 1);
  }

  private calculateDataComplexity(data: Record<string, unknown>): number {
    // Calculate Shannon entropy of data structure
    const json = JSON.stringify(data);
    const frequencies = new Map<string, number>();
    
    for (const char of json) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    const total = json.length;
    
    for (const count of frequencies.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }
    
    // Normalize entropy (typical: 3-6 bits)
    return Math.min(entropy / 6, 1);
  }

  private calculateSourceEntropy(request: AuthenticationRequest): number {
    const source = request.metadata?.origin || 'unknown';
    
    // Check if source follows expected patterns
    const validPatterns = [
      /^https:\/\/[a-z0-9-]+\.gov\.uk/,
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      /^192\.168\.\d{1,3}\.\d{1,3}$/
    ];
    
    const isValid = validPatterns.some(pattern => pattern.test(source));
    return isValid ? 0 : 0.8;
  }

  private async calculateVelocity(request: AuthenticationRequest): Promise<number> {
    const key = request.metadata?.origin || 'global';
    const history = this.requestHistory.get(key) || [];
    
    // Count requests in last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = history.filter(r => r.timestamp > oneMinuteAgo);
    
    // Velocity score (requests per minute)
    // Normal: 1-10, Suspicious: 10-100, Fraudulent: >100
    const velocity = recentRequests.length;
    
    if (velocity < 10) return 0;
    if (velocity < 100) return (velocity - 10) / 90;
    return 1;
  }

  private detectGeoAnomaly(request: AuthenticationRequest): number {
    if (!request.metadata?.ipAddress) return 0;
    
    // In production, use GeoIP database
    // For now, simulate based on IP format
    const ip = request.metadata.ipAddress;
    
    // UK IP ranges (simplified)
    const ukPatterns = [
      /^81\./,
      /^82\./,
      /^185\./, 
      /^2a0[0-9a-f]:/i
    ];
    
    const isUK = ukPatterns.some(pattern => pattern.test(ip));
    return isUK ? 0 : 0.3;
  }

  private analyzeBehavior(request: AuthenticationRequest): number {
    // Analyze request patterns for anomalies
    const scores: number[] = [];
    
    // Check for automated patterns
    if (request.timestamp % 1000 === 0) {
      scores.push(0.5); // Suspiciously round timestamp
    }
    
    // Check user agent
    if (request.metadata?.userAgent) {
      const ua = request.metadata.userAgent.toLowerCase();
      if (ua.includes('bot') || ua.includes('scraper')) {
        scores.push(0.8);
      }
    }
    
    // Check request structure
    if (Object.keys(request.data).length > 50) {
      scores.push(0.6); // Unusually complex request
    }
    
    return scores.length > 0 
      ? scores.reduce((a, b) => a + b) / scores.length 
      : 0;
  }

  private updateHistory(request: AuthenticationRequest): void {
    const key = request.metadata?.origin || 'global';
    const history = this.requestHistory.get(key) || [];
    
    // Keep last 1000 requests or 10 minutes
    const tenMinutesAgo = Date.now() - 600000;
    const filtered = history
      .filter(r => r.timestamp > tenMinutesAgo)
      .slice(-999);
    
    filtered.push(request);
    this.requestHistory.set(key, filtered);
  }

  /**
   * Get current fraud detection metrics
   */
  getMetrics(): {
    accuracy: number;
    falsePositiveRate: number;
    detectionRate: number;
  } {
    // In production, calculate from actual data
    return {
      accuracy: 0.98,
      falsePositiveRate: 0.02,
      detectionRate: 0.95
    };
  }

  /**
   * Update model weights (for retraining)
   */
  updateWeights(newWeights: Partial<ModelWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }
}