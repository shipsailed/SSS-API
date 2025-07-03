/**
 * Cloudflare Workers Performance Test
 * Tests 1M+ ops/sec capability
 */

import { unstable_dev } from 'wrangler';

async function runPerformanceTest() {
  console.log('🚀 Cloudflare Workers Performance Test');
  console.log('=====================================\n');

  // Start local worker
  const worker = await unstable_dev('worker.js', {
    experimental: { disableExperimentalWarning: true }
  });

  try {
    // Test configuration
    const testDuration = 60; // seconds
    const targetOpsPerSec = 1000000;
    const concurrency = 1000;
    const batchSize = 1000;

    console.log(`Target: ${targetOpsPerSec.toLocaleString()} ops/sec`);
    console.log(`Duration: ${testDuration} seconds`);
    console.log(`Concurrency: ${concurrency} parallel requests\n`);

    // Warmup
    console.log('Warming up...');
    await warmup(worker);

    // Run test
    console.log('Starting performance test...\n');
    const results = await runTest(worker, testDuration, concurrency, batchSize);

    // Print results
    printResults(results);

  } finally {
    await worker.stop();
  }
}

async function warmup(worker) {
  const warmupRequests = 1000;
  const promises = [];

  for (let i = 0; i < warmupRequests; i++) {
    promises.push(
      worker.fetch('/api/v1/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `warmup_${i}`,
          credentials: 'test',
          biometric: 'test',
          deviceFingerprint: 'test_device'
        })
      })
    );
  }

  await Promise.all(promises);
  console.log(`✅ Warmup complete (${warmupRequests} requests)\n`);
}

async function runTest(worker, duration, concurrency, batchSize) {
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  
  let totalRequests = 0;
  let successfulRequests = 0;
  let cachedRequests = 0;
  let totalLatency = 0;
  const latencies = [];
  const errors = [];

  // Create worker pool
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      runWorker(
        worker,
        i,
        endTime,
        batchSize,
        (stats) => {
          totalRequests += stats.requests;
          successfulRequests += stats.successful;
          cachedRequests += stats.cached;
          totalLatency += stats.totalLatency;
          latencies.push(...stats.latencies);
          if (stats.error) errors.push(stats.error);
        }
      )
    );
  }

  // Wait for all workers
  await Promise.all(workers);

  const actualDuration = (Date.now() - startTime) / 1000;

  return {
    duration: actualDuration,
    totalRequests,
    successfulRequests,
    cachedRequests,
    averageLatency: totalLatency / totalRequests,
    latencies: latencies.sort((a, b) => a - b),
    errors
  };
}

async function runWorker(worker, workerId, endTime, batchSize, onStats) {
  const stats = {
    requests: 0,
    successful: 0,
    cached: 0,
    totalLatency: 0,
    latencies: []
  };

  while (Date.now() < endTime) {
    try {
      const batch = [];
      
      // Create batch of requests
      for (let i = 0; i < batchSize; i++) {
        const start = Date.now();
        
        batch.push(
          worker.fetch('/api/v1/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: `user_${workerId}_${stats.requests + i}`,
              credentials: 'test',
              biometric: 'test',
              deviceFingerprint: 'test_device'
            })
          }).then(async (response) => {
            const latency = Date.now() - start;
            stats.latencies.push(latency);
            
            if (response.ok) {
              stats.successful++;
              const cacheHeader = response.headers.get('X-Cache');
              if (cacheHeader === 'HIT') {
                stats.cached++;
              }
            }
            
            return { latency, ok: response.ok };
          }).catch(error => {
            stats.error = error.message;
            return { latency: Date.now() - start, ok: false };
          })
        );
      }

      // Wait for batch to complete
      const results = await Promise.all(batch);
      
      stats.requests += results.length;
      stats.totalLatency += results.reduce((sum, r) => sum + r.latency, 0);
      
      // Report progress every 10k requests
      if (stats.requests % 10000 === 0) {
        onStats({ ...stats });
        stats.latencies = []; // Clear to save memory
      }
      
    } catch (error) {
      console.error(`Worker ${workerId} error:`, error);
      break;
    }
  }

  onStats(stats);
}

function printResults(results) {
  const opsPerSec = results.totalRequests / results.duration;
  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  const cacheHitRate = (results.cachedRequests / results.successfulRequests) * 100;
  
  // Calculate percentiles
  const p50 = results.latencies[Math.floor(results.latencies.length * 0.50)];
  const p95 = results.latencies[Math.floor(results.latencies.length * 0.95)];
  const p99 = results.latencies[Math.floor(results.latencies.length * 0.99)];
  const p999 = results.latencies[Math.floor(results.latencies.length * 0.999)];

  console.log('\n📊 PERFORMANCE RESULTS');
  console.log('======================');
  console.log(`Total Requests: ${results.totalRequests.toLocaleString()}`);
  console.log(`Duration: ${results.duration.toFixed(2)}s`);
  console.log(`Operations/sec: ${opsPerSec.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  console.log(`Cache Hit Rate: ${cacheHitRate.toFixed(2)}%`);
  
  console.log('\n⏱️  LATENCY PERCENTILES');
  console.log('======================');
  console.log(`p50 (median): ${p50}ms`);
  console.log(`p95: ${p95}ms`);
  console.log(`p99: ${p99}ms`);
  console.log(`p99.9: ${p999}ms`);
  console.log(`Average: ${results.averageLatency.toFixed(2)}ms`);
  
  console.log('\n🎯 TARGET COMPARISON');
  console.log('===================');
  const targetOps = 1000000;
  const achievement = (opsPerSec / targetOps) * 100;
  console.log(`Target: ${targetOps.toLocaleString()} ops/sec`);
  console.log(`Achieved: ${achievement.toFixed(2)}% of target`);
  
  if (opsPerSec >= targetOps) {
    console.log('\n✅ SUCCESS! Achieved 1M+ ops/sec!');
  } else {
    const scaleFactor = targetOps / opsPerSec;
    console.log(`\n⚠️  Need ${scaleFactor.toFixed(1)}x more capacity`);
    console.log(`   - Add more Cloudflare Workers`);
    console.log(`   - Increase KV namespace limits`);
    console.log(`   - Use Durable Objects for state`);
  }

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS');
    console.log('=========');
    results.errors.slice(0, 5).forEach(error => {
      console.log(`- ${error}`);
    });
  }
}

// Latency distribution visualization
function printLatencyDistribution(latencies) {
  const buckets = {
    '0-10ms': 0,
    '10-50ms': 0,
    '50-100ms': 0,
    '100-500ms': 0,
    '500ms+': 0
  };

  latencies.forEach(latency => {
    if (latency < 10) buckets['0-10ms']++;
    else if (latency < 50) buckets['10-50ms']++;
    else if (latency < 100) buckets['50-100ms']++;
    else if (latency < 500) buckets['100-500ms']++;
    else buckets['500ms+']++;
  });

  console.log('\n📊 LATENCY DISTRIBUTION');
  console.log('======================');
  Object.entries(buckets).forEach(([range, count]) => {
    const percentage = (count / latencies.length) * 100;
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`${range.padEnd(12)} ${bar} ${percentage.toFixed(2)}%`);
  });
}

// Run the test
runPerformanceTest().catch(console.error);