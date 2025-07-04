import { performance } from 'perf_hooks';
import crypto from 'crypto';

console.log('🔥 SSS-API STRESS TEST');
console.log('======================\n');

// Test configuration
const TEST_DURATION = 30000; // 30 seconds
const CONCURRENT_USERS = [10, 100, 1000, 5000];

interface TestResult {
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  errors: string[];
}

// Simulate API request processing
async function simulateRequest(): Promise<{ success: boolean; time: number }> {
  const start = performance.now();
  
  try {
    // Stage 1: Parallel validation simulation
    const validationPromises = Array(4).fill(0).map(async () => {
      // Crypto validation
      await new Promise(resolve => setImmediate(resolve));
      crypto.createHash('sha256').update(crypto.randomUUID()).digest();
      
      // Fraud check simulation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      
      return Math.random() > 0.05; // 95% success rate
    });
    
    const validationResults = await Promise.all(validationPromises);
    const isValid = validationResults.every(r => r);
    
    if (!isValid) {
      throw new Error('Validation failed');
    }
    
    // Token generation
    const token = crypto.randomBytes(32).toString('hex');
    
    // Stage 2: Consensus simulation (simplified)
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 30));
    
    const time = performance.now() - start;
    return { success: true, time };
    
  } catch (error) {
    const time = performance.now() - start;
    return { success: false, time };
  }
}

// Run stress test for a specific concurrency level
async function runStressTest(concurrentUsers: number): Promise<TestResult> {
  console.log(`\n🧪 Testing with ${concurrentUsers} concurrent users...`);
  
  const results: Array<{ success: boolean; time: number }> = [];
  const errors: string[] = [];
  const testStart = Date.now();
  let activeRequests = 0;
  let completedRequests = 0;
  
  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - testStart) / 1000;
    const rps = completedRequests / elapsed;
    process.stdout.write(`\r  Progress: ${completedRequests} requests | ${rps.toFixed(0)} req/s | Active: ${activeRequests}`);
  }, 100);
  
  // Request generator
  const generateRequests = async () => {
    while (Date.now() - testStart < TEST_DURATION) {
      if (activeRequests < concurrentUsers) {
        activeRequests++;
        
        simulateRequest().then(result => {
          results.push(result);
          completedRequests++;
          activeRequests--;
          
          if (!result.success) {
            errors.push('Request failed');
          }
        }).catch(err => {
          errors.push(err.message);
          activeRequests--;
        });
      }
      
      // Small delay to prevent CPU overload
      await new Promise(resolve => setImmediate(resolve));
    }
  };
  
  // Start request generation
  await generateRequests();
  
  // Wait for remaining requests to complete
  while (activeRequests > 0) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  clearInterval(progressInterval);
  process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear progress line
  
  // Calculate statistics
  const successfulRequests = results.filter(r => r.success).length;
  const totalTime = Date.now() - testStart;
  const avgResponseTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
  
  return {
    concurrentUsers,
    totalRequests: results.length,
    successfulRequests,
    failedRequests: results.length - successfulRequests,
    avgResponseTime,
    requestsPerSecond: (results.length / totalTime) * 1000,
    errors: [...new Set(errors)] // Unique errors
  };
}

// Run all stress tests
async function runAllTests() {
  console.log(`Test Duration: ${TEST_DURATION / 1000} seconds per level`);
  console.log('Testing SSS authentication flow (Stage 1 + Stage 2 simulation)\n');
  
  const allResults: TestResult[] = [];
  
  for (const users of CONCURRENT_USERS) {
    const result = await runStressTest(users);
    allResults.push(result);
    
    // Display results
    console.log(`✅ Completed ${users} concurrent users:`);
    console.log(`   Total Requests: ${result.totalRequests.toLocaleString()}`);
    console.log(`   Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
    console.log(`   Avg Response Time: ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.requestsPerSecond.toFixed(0)} req/s`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  }
  
  // Summary
  console.log('\n📊 STRESS TEST SUMMARY');
  console.log('======================');
  
  console.log('\nThroughput by Concurrency:');
  allResults.forEach(r => {
    console.log(`  ${r.concurrentUsers.toString().padEnd(4)} users: ${r.requestsPerSecond.toFixed(0).padStart(7)} req/s`);
  });
  
  console.log('\nLatency by Concurrency:');
  allResults.forEach(r => {
    console.log(`  ${r.concurrentUsers.toString().padEnd(4)} users: ${r.avgResponseTime.toFixed(2).padStart(7)}ms avg`);
  });
  
  const maxThroughput = Math.max(...allResults.map(r => r.requestsPerSecond));
  const optimalUsers = allResults.find(r => r.requestsPerSecond === maxThroughput)?.concurrentUsers;
  
  console.log('\n🎯 KEY FINDINGS:');
  console.log(`  Max Throughput: ${maxThroughput.toFixed(0)} req/s`);
  console.log(`  Optimal Concurrency: ${optimalUsers} users`);
  console.log(`  Patent Claim: 666,666 req/s`);
  console.log(`  Achievement: ${((maxThroughput / 666666) * 100).toFixed(2)}%`);
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (maxThroughput < 10000) {
    console.log('  ⚠️  Performance is below production requirements');
    console.log('  - Add more CPU cores for parallel processing');
    console.log('  - Implement connection pooling');
    console.log('  - Use load balancing across multiple servers');
  } else if (maxThroughput < 100000) {
    console.log('  ✅ Good performance for single server');
    console.log('  - Scale horizontally for higher throughput');
    console.log('  - Consider caching frequently accessed data');
  } else {
    console.log('  🚀 Excellent performance!');
    console.log('  - System is ready for production load');
  }
  
  console.log('\n📝 NOTE: This is a simulation. Real performance depends on:');
  console.log('  - Actual database performance');
  console.log('  - Network latency');
  console.log('  - Consensus node distribution');
  console.log('  - Hardware specifications');
}

// Run the stress test
console.log('Starting stress test...\n');
runAllTests().catch(console.error);