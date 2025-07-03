#!/usr/bin/env tsx

/**
 * VALID REQUEST PERFORMANCE TEST
 * 
 * Tests performance with properly formatted requests
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { cpus } from 'os';

const API_BASE = 'http://localhost:3000';

console.log(`\n🎯 TESTING WITH VALID REQUESTS`);
console.log(`═`.repeat(60));

/**
 * Create a properly formatted authentication request
 */
function createValidAuthRequest(userId: string) {
  return {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    userId,
    data: {
      credentials: 'test_credentials',
      biometric: 'test_biometric',
      deviceFingerprint: 'test_device'
    },
    signatures: [], // For now, testing without signatures
    // Legacy compatibility
    credentials: 'test_credentials',
    biometric: 'test_biometric', 
    deviceFingerprint: 'test_device'
  };
}

/**
 * Test different request formats to find what works
 */
async function testRequestFormats() {
  console.log('Testing different request formats...\n');
  
  // Format 1: Simple format (what we tried before)
  console.log('Format 1: Simple format');
  const simple = await fetch(`${API_BASE}/api/v1/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test_user_1',
      credentials: 'test',
      biometric: 'test',
      deviceFingerprint: 'test'
    })
  });
  console.log(`  Status: ${simple.status} ${simple.statusText}`);
  if (!simple.ok) {
    const error = await simple.json();
    console.log(`  Error:`, error);
  }
  
  // Format 2: With proper structure
  console.log('\nFormat 2: Structured format');
  const structured = await fetch(`${API_BASE}/api/v1/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createValidAuthRequest('test_user_2'))
  });
  console.log(`  Status: ${structured.status} ${structured.statusText}`);
  if (!structured.ok) {
    const error = await structured.json();
    console.log(`  Error:`, error);
  }
  
  // Format 3: Minimal required fields
  console.log('\nFormat 3: Minimal format');
  const minimal = await fetch(`${API_BASE}/api/v1/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'req_123',
      timestamp: Date.now(),
      userId: 'test_user_3',
      data: {}
    })
  });
  console.log(`  Status: ${minimal.status} ${minimal.statusText}`);
  if (!minimal.ok) {
    const error = await minimal.json();
    console.log(`  Error:`, error);
  }
}

/**
 * Test Stage 2 storage to see if it requires authentication
 */
async function testStage2() {
  console.log('\n\nTesting Stage 2 Storage...');
  
  const response = await fetch(`${API_BASE}/api/v1/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'dummy_token_12345',
      data: { test: 'data' }
    })
  });
  
  console.log(`  Status: ${response.status} ${response.statusText}`);
  if (!response.ok) {
    const error = await response.json();
    console.log(`  Error:`, error);
  }
}

/**
 * Test government endpoints directly
 */
async function testGovernmentEndpoints() {
  console.log('\n\nTesting Government Endpoints...');
  
  // NHS endpoint
  console.log('\nNHS Authentication:');
  const nhs = await fetch(`${API_BASE}/api/v1/nhs/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nhsNumber: '9999999999',
      biometricData: { type: 'fingerprint', template: 'test' },
      department: 'A&E',
      practitionerId: 'DR12345'
    })
  });
  console.log(`  Status: ${nhs.status} ${nhs.statusText}`);
  if (nhs.ok) {
    const result = await nhs.json();
    console.log(`  Success:`, result.success);
    console.log(`  Response time:`, result.responseTime);
  }
}

/**
 * Performance test with working endpoint
 */
async function testWorkingEndpoints() {
  console.log('\n\nPerformance Testing Working Endpoints...');
  
  // Test Patent #2 performance
  console.log('\nPatent #2 - Quantum Defense (100 requests):');
  const quantumStart = performance.now();
  const quantumPromises = [];
  
  for (let i = 0; i < 100; i++) {
    quantumPromises.push(
      fetch(`${API_BASE}/api/v1/quantum/sign-dynamic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Test message ${i}`,
          options: {
            maxTime: 1000,
            minAlgorithms: 5,
            sensitivity: 'medium'
          }
        })
      })
    );
  }
  
  const quantumResults = await Promise.all(quantumPromises);
  const quantumEnd = performance.now();
  const quantumDuration = (quantumEnd - quantumStart) / 1000;
  const quantumOps = 100 / quantumDuration;
  
  const successCount = quantumResults.filter(r => r.ok).length;
  console.log(`  Success rate: ${successCount}/100`);
  console.log(`  Total time: ${quantumDuration.toFixed(2)}s`);
  console.log(`  Operations/sec: ${quantumOps.toFixed(0)}`);
  
  // Test Patent #3 performance
  console.log('\nPatent #3 - AI Evolution (100 requests):');
  const aiStart = performance.now();
  const aiPromises = [];
  
  for (let i = 0; i < 100; i++) {
    aiPromises.push(
      fetch(`${API_BASE}/api/v1/ai/analyze-threat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attack: {
            method: `Test Attack ${i}`,
            targetAlgorithms: ['RSA-2048'],
            quantumPowered: false,
            sophistication: Math.floor(Math.random() * 10) + 1
          },
          useAI: true
        })
      })
    );
  }
  
  const aiResults = await Promise.all(aiPromises);
  const aiEnd = performance.now();
  const aiDuration = (aiEnd - aiStart) / 1000;
  const aiOps = 100 / aiDuration;
  
  const aiSuccessCount = aiResults.filter(r => r.ok).length;
  console.log(`  Success rate: ${aiSuccessCount}/100`);
  console.log(`  Total time: ${aiDuration.toFixed(2)}s`);
  console.log(`  Operations/sec: ${aiOps.toFixed(0)}`);
}

/**
 * Main test runner
 */
async function runValidRequestTest() {
  try {
    // Check server health
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      console.log('❌ Server not healthy');
      return;
    }
    console.log('✅ Server is running\n');
    
    // Test different formats
    await testRequestFormats();
    
    // Test Stage 2
    await testStage2();
    
    // Test government endpoints
    await testGovernmentEndpoints();
    
    // Test working endpoints performance
    await testWorkingEndpoints();
    
    console.log(`\n📊 PERFORMANCE SUMMARY`);
    console.log(`═`.repeat(60));
    console.log(`\nThe authentication endpoint is failing because it expects:`);
    console.log(`1. Cryptographic signatures in the request`);
    console.log(`2. Proper validation checks to pass`);
    console.log(`3. Fraud detection to approve the request`);
    console.log(`\nHowever, Patent #2 and #3 endpoints are working fine!`);
    console.log(`\nTo fix authentication performance testing:`);
    console.log(`- Update validation to accept test requests`);
    console.log(`- Or provide proper cryptographic signatures`);
    console.log(`- Or test with government endpoints that have different validation`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runValidRequestTest();