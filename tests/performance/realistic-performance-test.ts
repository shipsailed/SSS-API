#!/usr/bin/env tsx

/**
 * REALISTIC PERFORMANCE TEST
 * 
 * Tests performance with gradual load increase to find actual limits
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { cpus } from 'os';

const API_BASE = 'http://localhost:3000';
const CPU_COUNT = cpus().length;

console.log(`\n🎯 REALISTIC PERFORMANCE MEASUREMENT`);
console.log(`═`.repeat(60));
console.log(`System: ${CPU_COUNT} CPU cores`);
console.log(`Testing realistic performance with gradual load increase\n`);

/**
 * Make a single authenticated request
 */
async function makeAuthRequest(userId: string): Promise<{ success: boolean; latency: number }> {
  const start = performance.now();
  try {
    const response = await fetch(`${API_BASE}/api/v1/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        credentials: 'test_credentials',
        biometric: 'test_biometric',
        deviceFingerprint: 'test_device'
      })
    });
    
    const latency = performance.now() - start;
    return { success: response.ok, latency };
  } catch (error) {
    const latency = performance.now() - start;
    return { success: false, latency };
  }
}

/**
 * Test with controlled concurrency
 */
async function testWithConcurrency(concurrency: number, duration: number): Promise<{
  totalRequests: number;
  successfulRequests: number;
  averageLatency: number;
  opsPerSecond: number;
}> {
  const results: Array<{ success: boolean; latency: number }> = [];
  const startTime = performance.now();
  const endTime = startTime + (duration * 1000);
  
  let activeRequests = 0;
  let requestId = 0;
  
  // Function to maintain concurrency
  const makeRequests = async () => {
    while (performance.now() < endTime) {
      if (activeRequests < concurrency) {
        activeRequests++;
        const id = `user_${requestId++}_${Date.now()}`;
        
        makeAuthRequest(id).then(result => {
          results.push(result);
          activeRequests--;
        });
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 1));
      } else {
        // Wait a bit if at max concurrency
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  };
  
  // Start concurrent request makers
  const workers = Array(Math.min(concurrency, 10)).fill(0).map(() => makeRequests());
  await Promise.all(workers);
  
  // Wait for remaining requests to complete
  while (activeRequests > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate metrics
  const totalRequests = results.length;
  const successfulRequests = results.filter(r => r.success).length;
  const totalLatency = results.reduce((sum, r) => sum + r.latency, 0);
  const averageLatency = totalLatency / totalRequests;
  const actualDuration = (performance.now() - startTime) / 1000;
  const opsPerSecond = totalRequests / actualDuration;
  
  return {
    totalRequests,
    successfulRequests,
    averageLatency,
    opsPerSecond
  };
}

/**
 * Find optimal concurrency level
 */
async function findOptimalConcurrency() {
  console.log(`📊 FINDING OPTIMAL CONCURRENCY LEVEL`);
  console.log(`─`.repeat(60));
  
  const concurrencyLevels = [1, 5, 10, 20, 50, 100, 200, 500];
  let bestOpsPerSecond = 0;
  let optimalConcurrency = 1;
  
  for (const concurrency of concurrencyLevels) {
    console.log(`\nTesting concurrency: ${concurrency}`);
    
    const result = await testWithConcurrency(concurrency, 5); // 5 second test
    const successRate = (result.successfulRequests / result.totalRequests) * 100;
    
    console.log(`  Total requests: ${result.totalRequests}`);
    console.log(`  Success rate: ${successRate.toFixed(1)}%`);
    console.log(`  Avg latency: ${result.averageLatency.toFixed(0)}ms`);
    console.log(`  Ops/second: ${result.opsPerSecond.toFixed(0)}`);
    
    if (successRate > 95 && result.opsPerSecond > bestOpsPerSecond) {
      bestOpsPerSecond = result.opsPerSecond;
      optimalConcurrency = concurrency;
    }
    
    // Stop if success rate drops too low
    if (successRate < 50) {
      console.log(`  ⚠️  Success rate too low, stopping concurrency tests`);
      break;
    }
  }
  
  console.log(`\n✅ Optimal concurrency: ${optimalConcurrency} (${bestOpsPerSecond.toFixed(0)} ops/sec)`);
  return { optimalConcurrency, bestOpsPerSecond };
}

/**
 * Test other endpoints
 */
async function testOtherEndpoints() {
  console.log(`\n📊 TESTING OTHER PATENT ENDPOINTS`);
  console.log(`─`.repeat(60));
  
  // Test Patent #2: Quantum Defense
  console.log(`\nPatent #2: Dynamic Quantum Defense`);
  const quantumStart = performance.now();
  const quantumResponse = await fetch(`${API_BASE}/api/v1/quantum/sign-dynamic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Performance test',
      options: {
        maxTime: 1000,
        minAlgorithms: 10,
        sensitivity: 'high'
      }
    })
  });
  const quantumLatency = performance.now() - quantumStart;
  
  if (quantumResponse.ok) {
    const result = await quantumResponse.json();
    console.log(`  Status: ✅ Working`);
    console.log(`  Latency: ${quantumLatency.toFixed(0)}ms`);
    console.log(`  Algorithms: ${result.result?.metrics?.algorithmsUsed || 'Unknown'}`);
  } else {
    console.log(`  Status: ❌ Failed (${quantumResponse.status})`);
  }
  
  // Test Patent #3: AI Evolution
  console.log(`\nPatent #3: AI Evolution System`);
  const aiStart = performance.now();
  const aiResponse = await fetch(`${API_BASE}/api/v1/ai/analyze-threat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attack: {
        method: 'Test Attack',
        targetAlgorithms: ['RSA-2048'],
        quantumPowered: true,
        sophistication: 7
      },
      useAI: true
    })
  });
  const aiLatency = performance.now() - aiStart;
  
  if (aiResponse.ok) {
    console.log(`  Status: ✅ Working`);
    console.log(`  Latency: ${aiLatency.toFixed(0)}ms`);
  } else {
    console.log(`  Status: ❌ Failed (${aiResponse.status})`);
  }
}

/**
 * Show performance analysis
 */
function analyzePerformance(optimalOps: number) {
  console.log(`\n📈 PERFORMANCE ANALYSIS`);
  console.log(`═`.repeat(60));
  
  const targetOps = 666666;
  const percentOfTarget = (optimalOps / targetOps) * 100;
  const scaleFactor = targetOps / optimalOps;
  
  console.log(`Current Performance: ${optimalOps.toFixed(0)} ops/sec`);
  console.log(`Target Performance: ${targetOps.toLocaleString()} ops/sec`);
  console.log(`Achievement: ${percentOfTarget.toFixed(2)}%`);
  console.log(`Scale Factor Needed: ${scaleFactor.toFixed(0)}x`);
  
  console.log(`\n🔧 TO ACHIEVE TARGET PERFORMANCE:`);
  
  if (scaleFactor > 100) {
    console.log(`\n1. IMMEDIATE OPTIMIZATIONS (10-50x improvement):`);
    console.log(`   • Set NODE_ENV=production (disable logging)`);
    console.log(`   • Use Node.js cluster mode (${CPU_COUNT} workers)`);
    console.log(`   • Enable HTTP keep-alive connections`);
    console.log(`   • Implement connection pooling`);
    
    console.log(`\n2. ARCHITECTURE SCALING (50-200x improvement):`);
    console.log(`   • Deploy multiple server instances`);
    console.log(`   • Use hardware load balancer`);
    console.log(`   • Implement Redis clustering`);
    console.log(`   • Add read replica databases`);
    
    console.log(`\n3. HARDWARE REQUIREMENTS:`);
    console.log(`   • Minimum ${Math.ceil(scaleFactor / 10)} servers`);
    console.log(`   • Each with 16+ CPU cores`);
    console.log(`   • 32GB+ RAM per server`);
    console.log(`   • 10Gbps network interfaces`);
  } else {
    console.log(`\n✅ Performance is within achievable range!`);
    console.log(`   • Need ${Math.ceil(scaleFactor)}x current capacity`);
    console.log(`   • Achievable with horizontal scaling`);
    console.log(`   • Use cluster mode + load balancing`);
  }
  
  console.log(`\n📊 REALISTIC DEPLOYMENT ARCHITECTURE:`);
  console.log(`   • Load Balancer (HAProxy/NGINX)`);
  console.log(`   • ${Math.ceil(scaleFactor / 10)} API Servers (16 cores each)`);
  console.log(`   • Redis Cluster (6 nodes)`);
  console.log(`   • PostgreSQL with Read Replicas`);
  console.log(`   • Total Cost: ~£${Math.ceil(scaleFactor / 10) * 500}/month on cloud`);
}

/**
 * Main test runner
 */
async function runRealisticTest() {
  try {
    // Check server health
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      console.log('❌ Server not healthy');
      return;
    }
    console.log('✅ Server is running\n');
    
    // Find optimal concurrency
    const { optimalConcurrency, bestOpsPerSecond } = await findOptimalConcurrency();
    
    // Test other endpoints
    await testOtherEndpoints();
    
    // Analyze performance
    analyzePerformance(bestOpsPerSecond);
    
    console.log(`\n✅ REALISTIC PERFORMANCE TEST COMPLETE`);
    console.log(`═`.repeat(60));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runRealisticTest();