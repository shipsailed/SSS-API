#!/usr/bin/env tsx

/**
 * Performance test for SSS-API in test mode
 * This script sends requests without signatures to test raw processing performance
 * WARNING: Only use with TEST_MODE=true and TEST_MODE_BYPASS_SIGNATURES=true
 */

import axios, { AxiosInstance } from 'axios';
import { performance } from 'perf_hooks';

interface TestConfig {
  baseUrl: string;
  concurrentRequests: number;
  totalRequests: number;
  progressInterval: number;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageLatency: number;
  requestsPerSecond: number;
  errors: Map<string, number>;
}

class TestModeBenchmark {
  private client: AxiosInstance;
  private config: TestConfig;
  private results: TestResult;
  
  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      concurrentRequests: config.concurrentRequests || 100,
      totalRequests: config.totalRequests || 10000,
      progressInterval: config.progressInterval || 1000
    };
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalDuration: 0,
      averageLatency: 0,
      requestsPerSecond: 0,
      errors: new Map()
    };
  }
  
  /**
   * Generate a test authentication request without signatures
   */
  private generateTestRequest() {
    return {
      id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      data: {
        type: 'performance-test',
        source: 'test-mode-benchmark',
        testData: {
          randomValue: Math.random(),
          testString: 'performance-test-data',
          nested: {
            level: 1,
            value: 'test'
          }
        }
      },
      // No signatures - will be bypassed in test mode
      signatures: []
    };
  }
  
  /**
   * Send a single authentication request
   */
  private async sendRequest(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      const response = await this.client.post('/api/v1/authenticate', this.generateTestRequest());
      const latency = performance.now() - startTime;
      
      return {
        success: response.data.success === true,
        latency
      };
    } catch (error: any) {
      const latency = performance.now() - startTime;
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      return {
        success: false,
        latency,
        error: errorMessage
      };
    }
  }
  
  /**
   * Run the benchmark test
   */
  async run(): Promise<TestResult> {
    console.log('Starting Test Mode Benchmark...');
    console.log(`Configuration:`);
    console.log(`- Base URL: ${this.config.baseUrl}`);
    console.log(`- Total Requests: ${this.config.totalRequests}`);
    console.log(`- Concurrent Requests: ${this.config.concurrentRequests}`);
    console.log('');
    
    // Check if server is running in test mode
    try {
      const health = await this.client.get('/health');
      console.log('Server is healthy:', health.data.status);
    } catch (error) {
      console.error('Server health check failed. Is the server running in test mode?');
      console.error('Start with: ./scripts/start-test-mode.sh');
      process.exit(1);
    }
    
    const startTime = performance.now();
    let completedRequests = 0;
    let successfulRequests = 0;
    let totalLatency = 0;
    
    // Progress tracking
    const progressTimer = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const rps = completedRequests / elapsed;
      console.log(`Progress: ${completedRequests}/${this.config.totalRequests} requests (${rps.toFixed(2)} req/s)`);
    }, this.config.progressInterval);
    
    // Create batches
    const batches: Promise<any>[] = [];
    
    for (let i = 0; i < this.config.totalRequests; i += this.config.concurrentRequests) {
      const batchSize = Math.min(this.config.concurrentRequests, this.config.totalRequests - i);
      const batch = Array(batchSize).fill(null).map(async () => {
        const result = await this.sendRequest();
        
        completedRequests++;
        totalLatency += result.latency;
        
        if (result.success) {
          successfulRequests++;
        } else if (result.error) {
          const count = this.results.errors.get(result.error) || 0;
          this.results.errors.set(result.error, count + 1);
        }
        
        return result;
      });
      
      batches.push(Promise.all(batch));
    }
    
    // Wait for all requests to complete
    await Promise.all(batches);
    
    clearInterval(progressTimer);
    
    // Calculate final results
    const totalDuration = performance.now() - startTime;
    
    this.results = {
      totalRequests: this.config.totalRequests,
      successfulRequests,
      failedRequests: this.config.totalRequests - successfulRequests,
      totalDuration,
      averageLatency: totalLatency / this.config.totalRequests,
      requestsPerSecond: (this.config.totalRequests / totalDuration) * 1000,
      errors: this.results.errors
    };
    
    return this.results;
  }
  
  /**
   * Print results in a formatted way
   */
  printResults() {
    console.log('\n========================================');
    console.log('         BENCHMARK RESULTS');
    console.log('========================================');
    console.log(`Total Requests:     ${this.results.totalRequests}`);
    console.log(`Successful:         ${this.results.successfulRequests} (${(this.results.successfulRequests / this.results.totalRequests * 100).toFixed(2)}%)`);
    console.log(`Failed:             ${this.results.failedRequests}`);
    console.log(`Duration:           ${(this.results.totalDuration / 1000).toFixed(2)}s`);
    console.log(`Avg Latency:        ${this.results.averageLatency.toFixed(2)}ms`);
    console.log(`Requests/Second:    ${this.results.requestsPerSecond.toFixed(2)}`);
    
    if (this.results.errors.size > 0) {
      console.log('\nError Summary:');
      this.results.errors.forEach((count, error) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
    }
    
    console.log('\n========================================');
    
    // Performance analysis
    if (this.results.requestsPerSecond > 666666) {
      console.log('✅ EXCELLENT: Exceeds patent target of 666,666 req/s!');
    } else if (this.results.requestsPerSecond > 500000) {
      console.log('✅ GOOD: High performance achieved');
    } else if (this.results.requestsPerSecond > 100000) {
      console.log('⚠️  MODERATE: Performance is acceptable but could be improved');
    } else {
      console.log('❌ POOR: Performance needs significant improvement');
    }
  }
}

// Run the benchmark
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--url':
        config.baseUrl = value;
        break;
      case '--concurrent':
        config.concurrentRequests = parseInt(value);
        break;
      case '--total':
        config.totalRequests = parseInt(value);
        break;
    }
  }
  
  const benchmark = new TestModeBenchmark(config);
  
  try {
    await benchmark.run();
    benchmark.printResults();
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { TestModeBenchmark };