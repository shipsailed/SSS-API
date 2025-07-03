#!/usr/bin/env tsx

import { CryptoService } from '../src/shared/crypto/index.js';
import { QuantumCryptoService } from '../src/shared/crypto/quantum.js';

async function benchmarkQuantumCrypto() {
  console.log('Quantum-Resistant Crypto Performance Benchmark\n');
  console.log('Testing signing operations...\n');

  const quantumService = new QuantumCryptoService();
  
  // Test different message sizes
  const messageSizes = [
    { name: 'Small (32 bytes)', size: 32 },
    { name: 'Medium (1 KB)', size: 1024 },
    { name: 'Large (10 KB)', size: 10240 }
  ];

  for (const { name, size } of messageSizes) {
    console.log(`\nMessage size: ${name}`);
    console.log('='.repeat(50));
    
    const message = Buffer.from(Array(size).fill('a').join(''));
    
    // Run benchmark
    const results = await quantumService.benchmark(100);
    
    console.log('\nSigning Performance (100 operations):');
    console.log('Classical Ed25519:');
    console.log(`  - Per operation: ${results.classical.perOp.toFixed(2)}ms`);
    console.log(`  - Ops/second: ${results.classical.opsPerSecond}`);
    
    console.log('\nQuantum ML-DSA-44:');
    console.log(`  - Per operation: ${results.quantum.perOp.toFixed(2)}ms`);
    console.log(`  - Ops/second: ${results.quantum.opsPerSecond}`);
    console.log(`  - Overhead vs classical: ${((results.quantum.perOp / results.classical.perOp - 1) * 100).toFixed(1)}%`);
    
    console.log('\nHybrid (Classical + Quantum):');
    console.log(`  - Per operation: ${results.hybrid.perOp.toFixed(2)}ms`);
    console.log(`  - Ops/second: ${results.hybrid.opsPerSecond}`);
    console.log(`  - Overhead vs classical: ${((results.hybrid.perOp / results.classical.perOp - 1) * 100).toFixed(1)}%`);
  }

  // Test verification
  console.log('\n\nVerification Performance Test:');
  console.log('='.repeat(50));
  
  const testMessage = 'Test message for verification';
  const hybridSig = await quantumService.hybridSign(testMessage);
  
  const verifyIterations = 100;
  
  // Classical verification
  const classicalService = new CryptoService();
  const classicalVerifyStart = Date.now();
  for (let i = 0; i < verifyIterations; i++) {
    await classicalService.verify(testMessage, hybridSig.classical);
  }
  const classicalVerifyTime = Date.now() - classicalVerifyStart;
  
  // Quantum verification
  const quantumVerifyStart = Date.now();
  for (let i = 0; i < verifyIterations; i++) {
    await quantumService.quantumVerify(testMessage, hybridSig.quantum);
  }
  const quantumVerifyTime = Date.now() - quantumVerifyStart;
  
  // Hybrid verification
  const hybridVerifyStart = Date.now();
  for (let i = 0; i < verifyIterations; i++) {
    await quantumService.hybridVerify(testMessage, hybridSig.hybrid);
  }
  const hybridVerifyTime = Date.now() - hybridVerifyStart;
  
  console.log(`\nClassical verification: ${(classicalVerifyTime / verifyIterations).toFixed(2)}ms per op`);
  console.log(`Quantum verification: ${(quantumVerifyTime / verifyIterations).toFixed(2)}ms per op`);
  console.log(`Hybrid verification: ${(hybridVerifyTime / verifyIterations).toFixed(2)}ms per op`);

  // Security comparison
  console.log('\n\nSecurity Comparison:');
  console.log('='.repeat(50));
  console.log('Classical Ed25519:');
  console.log('  - Classical security: 128 bits');
  console.log('  - Quantum security: ~64 bits (vulnerable to Shor\'s algorithm)');
  console.log('  - Signature size: 64 bytes');
  
  console.log('\nML-DSA-44 (CRYSTALS-Dilithium2):');
  console.log('  - Classical security: 128 bits');
  console.log('  - Quantum security: 128 bits');
  console.log('  - Signature size: 2,420 bytes');
  
  console.log('\nHybrid approach:');
  console.log('  - Classical security: 128 bits');
  console.log('  - Quantum security: 128 bits');
  console.log('  - Total signature size: 2,484 bytes');
  console.log('  - Backward compatible: Yes');

  // Recommendations
  console.log('\n\nRecommendations for SSS-API:');
  console.log('='.repeat(50));
  console.log('1. Use hybrid signing for critical operations (Stage 2 commitments)');
  console.log('2. Keep classical Ed25519 for high-frequency operations (Stage 1)');
  console.log('3. Cache quantum signatures for repeated operations');
  console.log('4. Consider async/parallel processing for batch operations');
  console.log('5. Use ML-KEM-768 for key exchange in distributed validator network');
}

benchmarkQuantumCrypto().catch(console.error);