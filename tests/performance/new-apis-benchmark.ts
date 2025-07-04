import autocannon from 'autocannon';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  api: string;
  endpoint: string;
  rps: number;
  latency: {
    p50: number;
    p90: number;
    p99: number;
  };
  errors: number;
}

const API_KEY = 'UK-SSS-test-benchmark-key';
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const benchmarkConfigs = [
  // Energy Grid API
  {
    api: 'Energy Grid',
    endpoint: '/api/v1/energy/optimize-grid',
    method: 'POST',
    body: {
      regionId: 'london-central',
      demandForecast: 1500,
      renewableCapacity: {
        solar: 300,
        wind: 500,
        hydro: 200,
        nuclear: 1000
      }
    }
  },
  {
    api: 'Energy Grid',
    endpoint: '/api/v1/energy/consumption-monitoring',
    method: 'POST',
    body: {
      meterId: 'METER-001',
      granularity: 'hour'
    }
  },
  
  // Emergency Services API
  {
    api: 'Emergency Services',
    endpoint: '/api/v1/emergency/call',
    method: 'POST',
    body: {
      phoneNumber: '+447123456789',
      location: {
        latitude: 51.5074,
        longitude: -0.1278
      },
      callType: '999'
    }
  },
  {
    api: 'Emergency Services',
    endpoint: '/api/v1/emergency/resource-tracking',
    method: 'POST',
    body: {
      resourceType: 'vehicle',
      radius: 5,
      centerPoint: {
        latitude: 51.5074,
        longitude: -0.1278
      }
    }
  },
  
  // Agriculture API
  {
    api: 'Agriculture',
    endpoint: '/api/v1/agri/crop-monitoring',
    method: 'POST',
    body: {
      farmId: 'FARM-001',
      cropType: 'wheat',
      satelliteData: true
    }
  },
  {
    api: 'Agriculture',
    endpoint: '/api/v1/agri/weather-impact',
    method: 'POST',
    body: {
      location: {
        latitude: 52.2053,
        longitude: 0.1218
      },
      timeframe: 'week',
      cropTypes: ['wheat', 'barley']
    }
  }
];

async function runBenchmark(config: any): Promise<BenchmarkResult> {
  console.log(`\nBenchmarking ${config.api} - ${config.endpoint}...`);
  
  const start = performance.now();
  
  return new Promise((resolve) => {
    const instance = autocannon({
      url: BASE_URL + config.endpoint,
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(config.body),
      connections: 100,      // Concurrent connections
      pipelining: 10,       // Requests per connection
      duration: 30,         // 30 seconds
      workers: 4            // Worker threads
    }, (err, result) => {
      if (err) {
        console.error('Benchmark error:', err);
        return;
      }
      
      const duration = (performance.now() - start) / 1000;
      console.log(`Completed in ${duration.toFixed(2)}s`);
      
      resolve({
        api: config.api,
        endpoint: config.endpoint,
        rps: result.requests.average,
        latency: {
          p50: result.latency.p50,
          p90: result.latency.p90,
          p99: result.latency.p99
        },
        errors: result.errors
      });
    });
    
    // Show progress
    instance.on('tick', (counter: any) => {
      process.stdout.write(`\r  Requests: ${counter.counter} | Errors: ${counter.errors}`);
    });
  });
}

async function runAllBenchmarks() {
  console.log('SSS-API New APIs Performance Benchmark');
  console.log('=====================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration: 30s per endpoint`);
  console.log(`Connections: 100 concurrent`);
  console.log();
  
  const results: BenchmarkResult[] = [];
  
  // Warm up
  console.log('Warming up...');
  await fetch(`${BASE_URL}/health`);
  
  // Run benchmarks
  for (const config of benchmarkConfigs) {
    const result = await runBenchmark(config);
    results.push(result);
    
    // Cool down between tests
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Display summary
  console.log('\n\nPerformance Summary');
  console.log('==================');
  console.log();
  
  // Group by API
  const apis = [...new Set(results.map(r => r.api))];
  
  for (const api of apis) {
    console.log(`\n${api} API:`);
    console.log('-'.repeat(50));
    
    const apiResults = results.filter(r => r.api === api);
    
    for (const result of apiResults) {
      console.log(`
Endpoint: ${result.endpoint}
  Requests/sec: ${result.rps.toFixed(2)}
  Latency (ms):
    - p50: ${result.latency.p50}
    - p90: ${result.latency.p90}
    - p99: ${result.latency.p99}
  Errors: ${result.errors}
`);
    }
    
    // API average
    const avgRps = apiResults.reduce((sum, r) => sum + r.rps, 0) / apiResults.length;
    const avgP50 = apiResults.reduce((sum, r) => sum + r.latency.p50, 0) / apiResults.length;
    console.log(`API Average: ${avgRps.toFixed(2)} req/s, ${avgP50.toFixed(2)}ms p50 latency`);
  }
  
  // Overall summary
  console.log('\n\nOverall Performance:');
  console.log('===================');
  const totalRps = results.reduce((sum, r) => sum + r.rps, 0);
  const avgLatency = results.reduce((sum, r) => sum + r.latency.p50, 0) / results.length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  
  console.log(`Total throughput: ${totalRps.toFixed(2)} req/s`);
  console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Error rate: ${(totalErrors / (totalRps * 30) * 100).toFixed(3)}%`);
  
  // Check if meets SLA
  console.log('\nSLA Compliance:');
  console.log('===============');
  const slaPass = avgLatency < 100 && totalRps > 10000;
  console.log(`✓ Target latency < 100ms: ${avgLatency < 100 ? 'PASS' : 'FAIL'} (${avgLatency.toFixed(2)}ms)`);
  console.log(`✓ Target throughput > 10k req/s: ${totalRps > 10000 ? 'PASS' : 'FAIL'} (${totalRps.toFixed(2)} req/s)`);
  console.log(`\nOverall: ${slaPass ? '✅ PASS' : '❌ FAIL'}`);
}

// Run benchmarks
runAllBenchmarks().catch(console.error);