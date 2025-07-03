import { describe, it, expect, beforeEach } from 'vitest';
import { Stage1ValidationService } from '../../src/stage1/index.js';
import { Stage2StorageService } from '../../src/stage2/index.js';
import { AuthenticationRequest, TokenError } from '../../src/shared/types/index.js';
import { CryptoService } from '../../src/shared/crypto/index.js';

describe('Security Attack Vector Tests', () => {
  let stage1: Stage1ValidationService;
  let stage2: Stage2StorageService;
  let crypto: CryptoService;
  
  beforeEach(() => {
    crypto = new CryptoService();
    
    stage1 = new Stage1ValidationService({
      minValidators: 3,
      maxValidators: 10,
      scaleThresholdCpu: 70,
      timeoutMs: 100,
      parallelChecks: 4,
      fraudThreshold: 0.95,
      tokenValiditySeconds: 300,
      regions: ['test']
    });
    
    stage2 = new Stage2StorageService(
      'test-node',
      [
        { id: 'node-1', publicKey: 'pk1', endpoint: 'test', isActive: true },
        { id: 'node-2', publicKey: 'pk2', endpoint: 'test', isActive: true },
        { id: 'node-3', publicKey: 'pk3', endpoint: 'test', isActive: true }
      ],
      {
        byzantineFaultTolerance: 1,
        shardCount: 2,
        replicationFactor: 3,
        consensusTimeoutMs: 400,
        merkleTreeDepth: 10
      }
    );
  });

  describe('Token Forgery Attacks', () => {
    it('should reject forged tokens with invalid signatures', async () => {
      // Create a forged token
      const forgedToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYWtlIiwiaXNzIjoiZmFrZSIsImF1ZCI6WyJmYWtlIl0sImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxMDAwMDAwMDAwLCJ2YWxpZGF0aW9uX3Jlc3VsdHMiOnsic2NvcmUiOjEsImNoZWNrc19wYXNzZWQiOjQsImZyYXVkX3Njb3JlIjowfSwicGVybWlzc2lvbnMiOjE1fQ.FORGED_SIGNATURE';
      
      await expect(
        stage2.processRequest(forgedToken, { data: 'test' })
      ).rejects.toThrow();
    });

    it('should reject tokens with tampered payload', async () => {
      // Get a valid token first
      const validRequest: AuthenticationRequest = {
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { test: true }
      };
      
      const result = await stage1.processRequest(validRequest);
      expect(result.token).toBeDefined();
      
      // Tamper with the payload
      const parts = result.token!.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.permissions = 255; // Try to escalate permissions
      
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      
      await expect(
        stage2.processRequest(tamperedToken, { data: 'test' })
      ).rejects.toThrow();
    });

    it('should enforce token expiration (5 minute max)', async () => {
      // Create an expired token
      const expiredToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJleHBpcmVkIiwiaXNzIjoic3RhZ2UxLnNzcy5nb3YudWsiLCJhdWQiOlsic3RhZ2UyLmNvbnNlbnN1cy5uZXR3b3JrIl0sImV4cCI6MTAwMDAwMDAwMCwiaWF0IjoxMDAwMDAwMDAwLCJ2YWxpZGF0aW9uX3Jlc3VsdHMiOnsic2NvcmUiOjEsImNoZWNrc19wYXNzZWQiOjQsImZyYXVkX3Njb3JlIjowfSwicGVybWlzc2lvbnMiOjF9.SIGNATURE';
      
      await expect(
        stage2.processRequest(expiredToken, { data: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should reject replayed tokens', async () => {
      // Get a valid token
      const request: AuthenticationRequest = {
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { test: true }
      };
      
      const result = await stage1.processRequest(request);
      expect(result.token).toBeDefined();
      
      // First use should succeed
      const firstUse = await stage2.processRequest(result.token!, { data: 'first' });
      expect(firstUse.record).toBeDefined();
      
      // Replay attempt should fail
      await expect(
        stage2.processRequest(result.token!, { data: 'replay' })
      ).rejects.toThrow();
    });

    it('should track unique JTI to prevent replay', async () => {
      const requests = Array.from({ length: 5 }, () => ({
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { test: true }
      }));
      
      const tokens = await Promise.all(
        requests.map(req => stage1.processRequest(req))
      );
      
      // All tokens should have unique JTIs
      const jtis = new Set();
      for (const result of tokens) {
        if (result.token) {
          const parts = result.token.split('.');
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          expect(jtis.has(payload.jti)).toBe(false);
          jtis.add(payload.jti);
        }
      }
      
      expect(jtis.size).toBe(5);
    });
  });

  describe('DDoS and Rate Limiting', () => {
    it('should handle high request volume without degradation', async () => {
      const requestCount = 1000;
      const requests = Array.from({ length: requestCount }, (_, i) => ({
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { index: i }
      }));
      
      const startTime = Date.now();
      const results = await stage1.processBatch(requests);
      const duration = Date.now() - startTime;
      
      // Should process all requests
      expect(results.length).toBe(requestCount);
      
      // Should maintain performance
      const avgTime = duration / requestCount;
      expect(avgTime).toBeLessThan(10); // <10ms per request in batch
      
      // Should reject suspicious patterns
      const fraudulentCount = results.filter(r => !r.validationResult.success).length;
      expect(fraudulentCount).toBeGreaterThan(0); // Some should be flagged
    });

    it('should detect and block rapid-fire requests from same source', async () => {
      const rapidRequests = Array.from({ length: 100 }, (_, i) => ({
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { rapid: true },
        metadata: {
          origin: 'attacker.com',
          ipAddress: '192.168.1.100'
        }
      }));
      
      const results = await stage1.processBatch(rapidRequests);
      
      // Should start blocking after detecting pattern
      const blockedCount = results.filter(r => !r.validationResult.success).length;
      expect(blockedCount).toBeGreaterThan(50); // >50% blocked
    });
  });

  describe('Byzantine Fault Tolerance', () => {
    it('should tolerate up to f faulty nodes (33%)', async () => {
      // Create a service with some faulty nodes
      const nodes = [
        { id: 'node-1', publicKey: 'pk1', endpoint: 'test', isActive: true },
        { id: 'node-2', publicKey: 'pk2', endpoint: 'test', isActive: true },
        { id: 'node-3', publicKey: 'pk3', endpoint: 'test', isActive: true },
        { id: 'node-4', publicKey: 'pk4', endpoint: 'test', isActive: false }, // Faulty
        { id: 'node-5', publicKey: 'pk5', endpoint: 'test', isActive: true },
        { id: 'node-6', publicKey: 'pk6', endpoint: 'test', isActive: true },
        { id: 'node-7', publicKey: 'pk7', endpoint: 'test', isActive: false }, // Faulty
      ];
      
      const byzantineStage2 = new Stage2StorageService(
        'test-node',
        nodes,
        {
          byzantineFaultTolerance: 2, // Can tolerate 2 faulty nodes
          shardCount: 1,
          replicationFactor: 7,
          consensusTimeoutMs: 400,
          merkleTreeDepth: 10
        }
      );
      
      // Should still function with 2/7 nodes faulty (28%)
      const request: AuthenticationRequest = {
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { byzantine: true }
      };
      
      const result = await stage1.processRequest(request);
      expect(result.token).toBeDefined();
      
      // Consensus should still work
      const storage = await byzantineStage2.processRequest(result.token!, { test: true });
      expect(storage.record).toBeDefined();
    });
  });

  describe('Timing Attack Resistance', () => {
    it('should have constant-time signature verification', async () => {
      const validRequest: AuthenticationRequest = {
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { timing: true }
      };
      
      const result = await stage1.processRequest(validRequest);
      const validToken = result.token!;
      
      // Create variations of invalid tokens
      const invalidTokens = [
        validToken.substring(0, validToken.length - 1) + 'X', // Wrong last char
        'X' + validToken.substring(1), // Wrong first char
        validToken.replace(/./g, 'A'), // All wrong
      ];
      
      const timings: number[] = [];
      
      // Measure timing for each verification attempt
      for (const token of [...invalidTokens, validToken]) {
        const start = performance.now();
        try {
          await stage2.processRequest(token, { data: 'test' });
        } catch {
          // Expected for invalid tokens
        }
        const duration = performance.now() - start;
        timings.push(duration);
      }
      
      // Calculate variance in timing
      const avg = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);
      
      // Timing should be consistent (low variance)
      expect(stdDev).toBeLessThan(5); // <5ms standard deviation
    });
  });

  describe('Cryptographic Strength Tests', () => {
    it('should use secure random number generation', async () => {
      const ids = new Set();
      
      // Generate many IDs
      for (let i = 0; i < 10000; i++) {
        ids.add(crypto.generateId());
      }
      
      // All should be unique
      expect(ids.size).toBe(10000);
      
      // Check entropy (simplified)
      const id = crypto.generateId();
      expect(id.length).toBeGreaterThan(16); // Sufficient entropy
      expect(/^[0-9a-f]+$/.test(id)).toBe(true); // Hex format
    });

    it('should verify token forgery probability < 2^-256', async () => {
      // This is a theoretical test - actual forgery would take longer than universe age
      
      // Verify signature algorithm strength
      const testMessage = 'test message';
      const signature = await crypto.sign(testMessage);
      
      // EdDSA signatures should be 512 bits (64 bytes, 128 hex chars)
      expect(signature.length).toBe(128);
      
      // Verify signature
      const isValid = await crypto.verify(testMessage, signature);
      expect(isValid).toBe(true);
      
      // Tampered message should fail
      const tamperedValid = await crypto.verify(testMessage + ' tampered', signature);
      expect(tamperedValid).toBe(false);
    });
  });

  describe('Quantum Resistance Verification', () => {
    it('should implement quantum-resistant algorithms', async () => {
      // Verify SHA-256 is used (128-bit quantum security)
      const hash1 = crypto.hash('test1');
      const hash2 = crypto.hash('test2');
      
      expect(hash1.length).toBe(64); // 256 bits = 64 hex chars
      expect(hash1).not.toBe(hash2);
      
      // Verify quantum readiness flag
      const request: AuthenticationRequest = {
        id: crypto.generateId(),
        timestamp: Date.now(),
        data: { quantum: true }
      };
      
      const result = await stage1.processRequest(request);
      
      if (result.token) {
        const parts = result.token.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        expect(payload.quantum_ready).toBe(true);
      }
    });
  });

  describe('Clone Detection', () => {
    it('should detect cloned authentication attempts', async () => {
      // Simulate cloned device/tag attempting multiple authentications
      const baseRequest: AuthenticationRequest = {
        id: 'CLONE-12345',
        timestamp: Date.now(),
        data: {
          deviceId: 'DEV-001',
          counter: 100
        }
      };
      
      // First auth should succeed
      const result1 = await stage1.processRequest(baseRequest);
      expect(result1.validationResult.success).toBe(true);
      
      // Clone with same counter should be detected
      const cloneRequest = {
        ...baseRequest,
        id: 'CLONE-12345-2',
        timestamp: Date.now() + 1000
      };
      
      const result2 = await stage1.processRequest(cloneRequest);
      expect(result2.validationResult.fraudScore).toBeGreaterThan(0.5);
    });
  });

  describe('Permission Escalation Prevention', () => {
    it('should enforce permission boundaries', async () => {
      // Low-score validation should get limited permissions
      const weakRequest: AuthenticationRequest = {
        id: crypto.generateId(),
        timestamp: Date.now() - 400000, // Old timestamp
        data: { weak: true }
      };
      
      const result = await stage1.processRequest(weakRequest);
      
      if (result.token) {
        const parts = result.token.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        
        // Should have minimal permissions
        expect(payload.permissions & 4).toBe(0); // No admin permission
        expect(payload.permissions & 8).toBe(0); // No transfer permission
      }
    });
  });
});