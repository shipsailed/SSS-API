#!/usr/bin/env tsx

/**
 * QUICK PERFORMANCE VALIDATION TEST
 * 
 * Simplified test to validate core performance claims without worker threads
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

async function runQuickPerformanceTests() {
  console.log('\n🚀 QUICK PATENT PERFORMANCE VALIDATION');
  console.log('═'.repeat(50));
  
  // Check server health first
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      console.log('❌ Server not healthy');
      return;
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server not running. Start with: npm run dev');
    return;
  }

  // Test 1: Patent #1 - Authentication Performance
  console.log('\n📊 PATENT #1: Sequential Stage System');
  console.log('─'.repeat(40));
  
  const authPayload = {
    userId: 'perf_test_user',
    credentials: 'test_credentials',
    biometric: 'test_biometric',
    deviceFingerprint: 'test_device'
  };
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    await fetch(`${API_BASE}/api/v1/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    });
  }
  
  // Measure 1000 operations
  const operations = 1000;
  const authStart = performance.now();
  
  const authPromises = [];
  for (let i = 0; i < operations; i++) {
    authPromises.push(
      fetch(`${API_BASE}/api/v1/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authPayload, userId: `user_${i}` })
      })
    );
  }
  
  await Promise.all(authPromises);
  const authEnd = performance.now();
  const authDuration = (authEnd - authStart) / 1000; // seconds
  const authOpsPerSecond = operations / authDuration;
  
  console.log(`Operations: ${operations}`);
  console.log(`Duration: ${authDuration.toFixed(2)}s`);
  console.log(`Performance: ${authOpsPerSecond.toFixed(0)} ops/sec`);
  console.log(`Target: 666,666 ops/sec`);
  console.log(authOpsPerSecond >= 666666 ? '✅ PASSED' : '⚠️  Below target (may need more load)');
  
  // Test 2: Patent #2 - Quantum Defense Performance
  console.log('\n📊 PATENT #2: Dynamic Quantum Defense');
  console.log('─'.repeat(40));
  
  const quantumPayload = {
    message: 'Performance test message',
    options: {
      maxTime: 1000,
      minAlgorithms: 10,
      sensitivity: 'high'
    }
  };
  
  // Test quantum signing
  const quantumStart = performance.now();
  const quantumResponse = await fetch(`${API_BASE}/api/v1/quantum/sign-dynamic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quantumPayload)
  });
  const quantumEnd = performance.now();
  const quantumLatency = quantumEnd - quantumStart;
  
  console.log(`Quantum signing latency: ${quantumLatency.toFixed(0)}ms`);
  console.log(`Target: <1000ms`);
  console.log(quantumLatency < 1000 ? '✅ PASSED' : '❌ FAILED');
  
  if (quantumResponse.ok) {
    const quantumResult = await quantumResponse.json();
    console.log(`Algorithms used: ${quantumResult.result?.metrics?.algorithmsUsed || 'Unknown'}`);
  }
  
  // Test 3: Patent #3 - AI Evolution Performance
  console.log('\n📊 PATENT #3: AI Evolution System');
  console.log('─'.repeat(40));
  
  const aiPayload = {
    attack: {
      method: 'Performance Test Attack',
      targetAlgorithms: ['RSA-2048'],
      quantumPowered: true,
      sophistication: 8
    },
    useAI: true
  };
  
  // Test AI threat analysis
  const aiStart = performance.now();
  const aiResponse = await fetch(`${API_BASE}/api/v1/ai/analyze-threat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aiPayload)
  });
  const aiEnd = performance.now();
  const aiLatency = aiEnd - aiStart;
  
  console.log(`AI analysis latency: ${aiLatency.toFixed(0)}ms`);
  console.log(`Target: <3000ms`);
  console.log(aiLatency < 3000 ? '✅ PASSED' : '❌ FAILED');
  
  if (aiResponse.ok) {
    const aiResult = await aiResponse.json();
    console.log(`Threat level: ${aiResult.analysis?.threatLevel || 'Unknown'}`);
  }
  
  // Test 4: Integrated System - Voting
  console.log('\n📊 INTEGRATED SYSTEM: Voting API');
  console.log('─'.repeat(40));
  
  const votePayload = {
    electionId: 'test_election',
    voterToken: 'test_token_12345',
    selections: [{ optionId: 'candidate_a' }],
    timestamp: Date.now()
  };
  
  // Test voting (uses all 3 patents)
  const voteStart = performance.now();
  const voteResponse = await fetch(`${API_BASE}/api/v1/voting/cast-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(votePayload)
  });
  const voteEnd = performance.now();
  const voteLatency = voteEnd - voteStart;
  
  console.log(`Vote casting latency: ${voteLatency.toFixed(0)}ms`);
  console.log(`Uses: Patent #1 (auth) + #2 (quantum) + #3 (AI fraud detection)`);
  console.log(voteLatency < 1000 ? '✅ Fast' : '⚠️  Could be optimized');
  
  // Summary
  console.log('\n🎯 PERFORMANCE SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Patent #1 (SSS): ${authOpsPerSecond.toFixed(0)} ops/sec`);
  console.log(`Patent #2 (Quantum): ${quantumLatency.toFixed(0)}ms latency`);
  console.log(`Patent #3 (AI): ${aiLatency.toFixed(0)}ms latency`);
  console.log(`Integrated System: ${voteLatency.toFixed(0)}ms latency`);
  
  console.log('\n💡 NOTE: For full 666,666 ops/sec validation:');
  console.log('   - Run the full benchmark suite: npm run benchmark');
  console.log('   - Use multiple concurrent processes');
  console.log('   - Ensure production-grade hardware');
  console.log('   - Disable debug logging');
}

// Run the tests
console.log('Starting quick performance validation...');
runQuickPerformanceTests().catch(console.error);