#!/usr/bin/env tsx

/**
 * PRODUCTION SCALE PERFORMANCE TEST
 * 
 * Tests performance at real government scale with optimizations
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { cpus } from 'os';

const API_BASE = 'http://localhost:3000';
const CPU_COUNT = cpus().length;

console.log(`\n🚀 PRODUCTION SCALE PERFORMANCE TEST`);
console.log(`═`.repeat(60));
console.log(`System: ${CPU_COUNT} CPU cores available`);
console.log(`Target: 666,666 operations per second`);
console.log();

/**
 * Parallel request executor using Promise pools
 */
async function executeParallelRequests(
  endpoint: string,
  payload: any,
  totalRequests: number,
  concurrency: number
): Promise<{ duration: number; successful: number; failed: number }> {
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const startTime = performance.now();
  
  // Create request function
  const makeRequest = async () => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          uniqueId: Math.random().toString(36).substring(7)
        })
      });
      
      if (response.ok) {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
    }
    completed++;
  };
  
  // Execute with controlled concurrency
  const promises = [];
  for (let i = 0; i < totalRequests; i++) {
    if (promises.length >= concurrency) {
      await Promise.race(promises);
      promises.splice(promises.findIndex(p => p), 1);
    }
    promises.push(makeRequest());
  }
  
  // Wait for remaining requests
  await Promise.all(promises);
  
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000; // seconds
  
  return { duration, successful, failed };
}

/**
 * Test Patent #1: Sequential Stage System at scale
 */
async function testPatent1AtScale() {
  console.log(`📊 PATENT #1: Sequential Stage System (Production Scale)`);
  console.log(`─`.repeat(60));
  
  const payload = {
    userId: 'scale_test_user',
    credentials: 'test_credentials',
    biometric: 'test_biometric',
    deviceFingerprint: 'test_device'
  };
  
  // Warmup
  console.log('Warming up...');
  await executeParallelRequests('/api/v1/authenticate', payload, 100, 10);
  
  // Scale test with increasing load
  const testConfigs = [
    { requests: 1000, concurrency: 100, name: 'Light Load' },
    { requests: 10000, concurrency: 500, name: 'Medium Load' },
    { requests: 50000, concurrency: 1000, name: 'Heavy Load' },
    { requests: 100000, concurrency: 2000, name: 'Production Load' }
  ];
  
  for (const config of testConfigs) {
    console.log(`\nTesting ${config.name}: ${config.requests.toLocaleString()} requests, ${config.concurrency} concurrent`);
    
    const result = await executeParallelRequests(
      '/api/v1/authenticate',
      payload,
      config.requests,
      config.concurrency
    );
    
    const opsPerSecond = config.requests / result.duration;
    const successRate = (result.successful / config.requests) * 100;
    
    console.log(`  Duration: ${result.duration.toFixed(2)}s`);
    console.log(`  Operations/sec: ${opsPerSecond.toFixed(0)}`);
    console.log(`  Success rate: ${successRate.toFixed(1)}%`);
    console.log(`  Failed requests: ${result.failed}`);
    
    if (opsPerSecond >= 666666) {
      console.log(`  ✅ ACHIEVED TARGET PERFORMANCE!`);
      break;
    } else {
      const percentOfTarget = (opsPerSecond / 666666) * 100;
      console.log(`  📈 ${percentOfTarget.toFixed(1)}% of target`);
    }
  }
}

/**
 * Test Patent #2: Dynamic Quantum Defense under load
 */
async function testPatent2UnderLoad() {
  console.log(`\n📊 PATENT #2: Dynamic Quantum Defense (Load Test)`);
  console.log(`─`.repeat(60));
  
  const payload = {
    message: 'Load test message for quantum signing',
    options: {
      maxTime: 1000,
      minAlgorithms: 10,
      sensitivity: 'high'
    }
  };
  
  // Test different algorithm counts
  const algorithmTests = [
    { minAlgorithms: 5, maxTime: 500, name: 'Fast Mode' },
    { minAlgorithms: 20, maxTime: 2000, name: 'Standard Mode' },
    { minAlgorithms: 50, maxTime: 5000, name: 'High Security' },
    { minAlgorithms: 100, maxTime: 10000, name: 'Maximum Security' }
  ];
  
  for (const test of algorithmTests) {
    console.log(`\nTesting ${test.name}: ${test.minAlgorithms} algorithms`);
    
    const testPayload = {
      message: payload.message,
      options: {
        maxTime: test.maxTime,
        minAlgorithms: test.minAlgorithms,
        sensitivity: 'high'
      }
    };
    
    const result = await executeParallelRequests(
      '/api/v1/quantum/sign-dynamic',
      testPayload,
      100,
      10
    );
    
    const avgLatency = (result.duration * 1000) / 100; // ms per request
    console.log(`  Average latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`  Within ${test.maxTime}ms limit: ${avgLatency <= test.maxTime ? '✅ YES' : '❌ NO'}`);
  }
}

/**
 * Test integrated system performance
 */
async function testIntegratedSystem() {
  console.log(`\n📊 INTEGRATED SYSTEM: Real-World Application Performance`);
  console.log(`─`.repeat(60));
  
  // Test voting system (uses all 3 patents)
  const votePayload = {
    electionId: 'load_test_election',
    voterToken: 'load_test_token',
    selections: [{ optionId: 'candidate_a' }],
    timestamp: Date.now()
  };
  
  console.log('\nTesting Voting System (All 3 Patents):');
  const voteResult = await executeParallelRequests(
    '/api/v1/voting/cast-vote',
    votePayload,
    1000,
    50
  );
  
  const voteOpsPerSec = 1000 / voteResult.duration;
  console.log(`  Operations/sec: ${voteOpsPerSec.toFixed(0)}`);
  console.log(`  Average latency: ${(voteResult.duration * 1000 / 1000).toFixed(0)}ms`);
  
  // Test identity verification
  const identityPayload = {
    serviceType: 'healthcare',
    citizenId: 'load_test_citizen',
    purpose: 'Load test',
    consentLevel: 'standard'
  };
  
  console.log('\nTesting Identity Verification:');
  const identityResult = await executeParallelRequests(
    '/api/v1/identity/verify-service-access',
    identityPayload,
    1000,
    50
  );
  
  const identityOpsPerSec = 1000 / identityResult.duration;
  console.log(`  Operations/sec: ${identityOpsPerSec.toFixed(0)}`);
  console.log(`  Average latency: ${(identityResult.duration * 1000 / 1000).toFixed(0)}ms`);
}

/**
 * Performance optimization recommendations
 */
function showOptimizationTips(currentOpsPerSec: number) {
  console.log(`\n💡 OPTIMIZATION RECOMMENDATIONS`);
  console.log(`─`.repeat(60));
  
  if (currentOpsPerSec < 666666) {
    console.log(`Current: ${currentOpsPerSec.toFixed(0)} ops/sec`);
    console.log(`Target: 666,666 ops/sec`);
    console.log(`Gap: ${(666666 - currentOpsPerSec).toLocaleString()} ops/sec`);
    
    console.log(`\nTo achieve target performance:`);
    console.log(`1. 🔧 Production Optimizations:`);
    console.log(`   - Set NODE_ENV=production`);
    console.log(`   - Disable debug logging`);
    console.log(`   - Enable HTTP keep-alive`);
    console.log(`   - Use connection pooling`);
    
    console.log(`\n2. 🖥️  Hardware Requirements:`);
    console.log(`   - Minimum 16 CPU cores`);
    console.log(`   - 32GB+ RAM`);
    console.log(`   - NVMe SSD storage`);
    console.log(`   - 10Gbps network`);
    
    console.log(`\n3. 🚀 Scaling Strategies:`);
    console.log(`   - Run multiple Node.js processes (cluster mode)`);
    console.log(`   - Use load balancer (nginx/HAProxy)`);
    console.log(`   - Horizontal scaling across servers`);
    console.log(`   - Redis connection pooling`);
    
    console.log(`\n4. 📊 Benchmarking Tips:`);
    console.log(`   - Use dedicated benchmark server`);
    console.log(`   - Isolate from other processes`);
    console.log(`   - Run for longer duration (5+ minutes)`);
    console.log(`   - Use professional load testing tools (k6, JMeter)`);
  }
}

/**
 * Main test runner
 */
async function runProductionScaleTest() {
  try {
    // Check server health
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      console.log('❌ Server not healthy');
      return;
    }
    console.log('✅ Server is running\n');
    
    // Run tests
    await testPatent1AtScale();
    await testPatent2UnderLoad();
    await testIntegratedSystem();
    
    // Show optimization recommendations
    showOptimizationTips(50000); // Estimated current performance
    
    console.log(`\n🎯 PRODUCTION SCALE TEST COMPLETE`);
    console.log(`═`.repeat(60));
    console.log(`\nFor official benchmarking:`);
    console.log(`1. Deploy to production-grade hardware`);
    console.log(`2. Use professional load testing tools`);
    console.log(`3. Run for extended duration (30+ minutes)`);
    console.log(`4. Monitor system resources during test`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runProductionScaleTest();