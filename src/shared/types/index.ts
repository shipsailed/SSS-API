import { z } from 'zod';

// Core Types
export interface AuthenticationRequest {
  id: string;
  timestamp: number;
  data: Record<string, unknown>;
  signatures?: string[];
  metadata?: RequestMetadata;
}

export interface RequestMetadata {
  origin: string;
  userAgent?: string;
  ipAddress?: string;
  department?: string; // UK Government department
  purpose?: string;
}

// Validation Types
export interface ValidationResult {
  success: boolean;
  score: number; // 0-1
  checksPassed: number;
  totalChecks: number;
  fraudScore: number;
  details: ValidationDetails;
  duration: number; // milliseconds
}

export interface ValidationDetails {
  cryptoVerification?: boolean;
  databaseCheck?: boolean;
  mlFraudScore?: number;
  patternAnalysis?: boolean;
  biometricMatch?: number;
  complianceCheck?: boolean;
  customChecks?: Record<string, unknown>;
}

// Validation Record (Stage 1)
export interface ValidationRecord {
  requestId: string;
  validatorType: string;
  namespace: string;
  identifier: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  fraudScore?: number;
  isEmergency?: boolean;
  validationResult: ValidationResult;
}

// Auth Record (Stage 2)
export interface AuthRecord {
  id: string;
  tokenId: string;
  namespace: string;
  identifier: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Token Types
export interface TokenPayload {
  jti: string; // Unique token ID
  iss: string; // Issuer
  aud: string[]; // Audience
  exp: number; // Expiry timestamp
  iat: number; // Issued at timestamp
  validation_results: {
    score: number;
    checks_passed: number;
    fraud_score: number;
  };
  permissions: number; // Bitmap
  quantum_ready?: boolean;
  department?: string;
}

export interface Token {
  header: {
    alg: string;
    typ: string;
    kid?: string;
  };
  payload: TokenPayload;
  signature: string;
}

// Consensus Types
export interface ConsensusMessage {
  type: 'PRE_PREPARE' | 'PREPARE' | 'COMMIT';
  view: number;
  sequence: number;
  digest: string;
  nodeId: string;
  signature: string;
  token?: string;
}

export interface ConsensusState {
  view: number;
  sequence: number;
  phase: 'IDLE' | 'PRE_PREPARE' | 'PREPARE' | 'COMMIT' | 'COMMITTED';
  prepares: Map<string, ConsensusMessage>;
  commits: Map<string, ConsensusMessage>;
}

// Storage Types
export interface PermanentRecord {
  id: string;
  timestamp: number;
  tokenId: string;
  data: Record<string, unknown>;
  merkleProof?: string[];
  blockHeight?: number;
  hash: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  stage1Latency: number;
  tokenGeneration: number;
  stage2Latency: number;
  totalLatency: number;
  throughput: number;
  successRate: number;
  timestamp: number;
}

// UK Government Specific Types
export interface NHSPatientAuth {
  nhsNumber: string;
  biometricData?: BiometricData;
  emergencyAccess?: boolean;
  department?: string;
  practitionerId?: string;
}

export interface BiometricData {
  type: 'fingerprint' | 'face' | 'iris';
  template: string;
  quality: number;
  captureTime: number;
}

export interface HMRCTaxAuth {
  utr?: string; // Unique Taxpayer Reference
  nino?: string; // National Insurance Number
  companyNumber?: string;
  vatNumber?: string;
  authType: 'individual' | 'business' | 'agent';
}

export interface DVLAVehicleAuth {
  vrm: string; // Vehicle Registration Mark
  v5cReference?: string;
  drivingLicenseNumber?: string;
  authPurpose: 'ownership' | 'tax' | 'transfer' | 'scrap';
}

// Validation Schemas
export const AuthRequestSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().positive(),
  data: z.record(z.unknown()),
  signatures: z.array(z.string()).optional(),
  metadata: z.object({
    origin: z.string(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    department: z.string().optional(),
    purpose: z.string().optional(),
  }).optional(),
});

export const TokenPayloadSchema = z.object({
  jti: z.string(),
  iss: z.string(),
  aud: z.array(z.string()),
  exp: z.number(),
  iat: z.number(),
  validation_results: z.object({
    score: z.number().min(0).max(1),
    checks_passed: z.number(),
    fraud_score: z.number().min(0).max(1),
  }),
  permissions: z.number(),
  quantum_ready: z.boolean().optional(),
  department: z.string().optional(),
});

// Error Types
export class SSSError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SSSError';
  }
}

export class ValidationError extends SSSError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class TokenError extends SSSError {
  constructor(message: string, details?: unknown) {
    super('TOKEN_ERROR', message, 401, details);
  }
}

export class ConsensusError extends SSSError {
  constructor(message: string, details?: unknown) {
    super('CONSENSUS_ERROR', message, 500, details);
  }
}

// Configuration Types
export interface Stage1Config {
  minValidators: number;
  maxValidators: number;
  scaleThresholdCpu: number;
  timeoutMs: number;
  parallelChecks: number;
  fraudThreshold: number;
  tokenValiditySeconds: number;
  regions: string[];
}

export interface Stage2Config {
  byzantineFaultTolerance: number; // f value
  shardCount: number;
  replicationFactor: number;
  consensusTimeoutMs: number;
  merkleTreeDepth: number;
}

export interface SystemConfig {
  stage1: Stage1Config;
  stage2: Stage2Config;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  hsm?: {
    provider: string;
    keyId: string;
    region?: string;
  };
}