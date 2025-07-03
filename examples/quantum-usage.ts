#!/usr/bin/env tsx

import { QuantumIntegration } from '../src/core/quantum-integration.js';
import { ValidationService } from '../src/core/validation/ValidationService.js';

/**
 * Example: Using quantum-resistant cryptography in SSS-API
 * Shows how to maintain speed while adding quantum resistance
 */
async function demonstrateQuantumUsage() {
  console.log('SSS-API Quantum Resistance Example\n');
  
  const quantum = new QuantumIntegration({
    useQuantumForStage1: false,  // Keep Stage 1 fast
    useQuantumForStage2: true,   // Make Stage 2 quantum-secure
    cacheQuantumSignatures: true,
    parallelSigning: true
  });

  // Example 1: Stage 1 - High-speed validation (classical crypto)
  console.log('1. Stage 1 Request (Classical Ed25519 for speed):');
  console.log('================================================');
  
  const stage1Data = {
    requestId: 'req-12345',
    identifier: 'user@example.com',
    namespace: 'uk-gov-auth',
    timestamp: Date.now()
  };

  const stage1Start = Date.now();
  const stage1Sig = await quantum.sign(JSON.stringify(stage1Data), 'stage1');
  const stage1Time = Date.now() - stage1Start;

  console.log(`✓ Signed in ${stage1Time}ms`);
  console.log(`  Algorithm: ${stage1Sig.metadata.algorithm}`);
  console.log(`  Signature size: ${stage1Sig.signature.length} chars`);
  console.log(`  Quantum secure: No (but fast!)\n`);

  // Example 2: Stage 2 - Secure commitment (quantum-resistant)
  console.log('2. Stage 2 Commitment (Quantum ML-DSA-44):');
  console.log('==========================================');
  
  const stage2Data = {
    stage1Hash: 'abc123...',
    merkleRoot: 'def456...',
    validators: ['node1', 'node2', 'node3'],
    timestamp: Date.now()
  };

  const stage2Start = Date.now();
  const stage2Sig = await quantum.sign(JSON.stringify(stage2Data), 'stage2');
  const stage2Time = Date.now() - stage2Start;

  console.log(`✓ Signed in ${stage2Time}ms`);
  console.log(`  Algorithm: ${stage2Sig.metadata.algorithm}`);
  console.log(`  Signature size: ${stage2Sig.signature.length} chars`);
  console.log(`  Quantum secure: Yes!\n`);

  // Example 3: Critical operations (hybrid approach)
  console.log('3. Critical Operation (Hybrid Classical + Quantum):');
  console.log('==================================================');
  
  const criticalData = {
    action: 'REVOKE_ALL_KEYS',
    authorizer: 'admin@gov.uk',
    reason: 'Security incident',
    timestamp: Date.now()
  };

  const criticalStart = Date.now();
  const criticalSig = await quantum.sign(JSON.stringify(criticalData), 'critical');
  const criticalTime = Date.now() - criticalStart;

  console.log(`✓ Signed in ${criticalTime}ms`);
  console.log(`  Classical: ${criticalSig.metadata.classical.algorithm}`);
  console.log(`  Quantum: ${criticalSig.metadata.quantum.algorithm}`);
  console.log(`  Total size: ${criticalSig.signature.length} chars`);
  console.log(`  Maximum security: Yes!\n`);

  // Example 4: Batch operations with parallelization
  console.log('4. Batch Processing (Parallel for performance):');
  console.log('==============================================');
  
  const batchMessages = Array.from({ length: 10 }, (_, i) => ({
    message: `Message ${i}`,
    type: i < 7 ? 'stage1' as const : 'stage2' as const
  }));

  const batchStart = Date.now();
  const batchResults = await quantum.batchSign(batchMessages);
  const batchTime = Date.now() - batchStart;

  const stage1Count = batchResults.filter(r => r.type === 'classical').length;
  const stage2Count = batchResults.filter(r => r.type === 'quantum').length;

  console.log(`✓ Processed ${batchMessages.length} signatures in ${batchTime}ms`);
  console.log(`  Stage 1 (classical): ${stage1Count} signatures`);
  console.log(`  Stage 2 (quantum): ${stage2Count} signatures`);
  console.log(`  Average time per sig: ${(batchTime / batchMessages.length).toFixed(2)}ms\n`);

  // Example 5: Quantum-secure key exchange
  console.log('5. Secure Key Exchange (ML-KEM-768):');
  console.log('====================================');
  
  // Alice generates KEM keypair
  const alice = await quantum.setupSecureChannel();
  
  // Bob generates KEM keypair
  const bob = await quantum.setupSecureChannel();
  
  // Alice encapsulates secret for Bob
  const aliceKemStart = Date.now();
  const { cipherText, sharedSecret: aliceSecret } = await alice.encapsulate(bob.publicKey);
  const aliceKemTime = Date.now() - aliceKemStart;
  
  // Bob decapsulates to get same secret
  const bobKemStart = Date.now();
  const bobSecret = await bob.decapsulate(cipherText);
  const bobKemTime = Date.now() - bobKemStart;
  
  console.log(`✓ Key exchange completed`);
  console.log(`  Encapsulation: ${aliceKemTime}ms`);
  console.log(`  Decapsulation: ${bobKemTime}ms`);
  console.log(`  Shared secret match: ${aliceSecret === bobSecret}`);
  console.log(`  Quantum secure: Yes!\n`);

  // Performance summary
  console.log('Performance Summary:');
  console.log('===================');
  const metrics = await quantum.getPerformanceMetrics();
  
  console.log('\nClassical Ed25519:');
  console.log(`  - ${metrics.classical.opsPerSecond} ops/second`);
  console.log(`  - ${metrics.classical.avgLatency.toFixed(2)}ms average latency`);
  console.log(`  - Quantum vulnerable: ${metrics.classical.quantumVulnerable}`);
  
  console.log('\nQuantum ML-DSA-44:');
  console.log(`  - ${metrics.quantum.opsPerSecond} ops/second`);
  console.log(`  - ${metrics.quantum.avgLatency.toFixed(2)}ms average latency`);
  console.log(`  - Signature size: ${metrics.quantum.signatureSize} bytes`);
  console.log(`  - Quantum secure: ${metrics.quantum.quantumSecure}`);
  
  console.log('\nRecommendations:');
  console.log(`  - Stage 1: Use ${metrics.recommendations.stage1} (speed critical)`);
  console.log(`  - Stage 2: Use ${metrics.recommendations.stage2} (security critical)`);
  console.log(`  - Critical ops: Use ${metrics.recommendations.criticalOps}`);
  console.log(`  - Key exchange: Use ${metrics.recommendations.keyExchange}`);
}

// Run the example
demonstrateQuantumUsage().catch(console.error);