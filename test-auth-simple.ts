#!/usr/bin/env tsx

import fetch from 'node-fetch';

async function testAuth() {
  console.log('Testing authentication with test device fingerprint...\n');
  
  const response = await fetch('http://localhost:3000/api/v1/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'test_user_simple',
      credentials: 'test_credentials',
      biometric: 'test_biometric',
      deviceFingerprint: 'test_device'
    })
  });
  
  console.log(`Status: ${response.status} ${response.statusText}`);
  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
}

// Start server first
console.log('Starting server...');
const { spawn } = await import('child_process');
const server = spawn('npm', ['run', 'dev'], {
  cwd: '/Volumes/My Passport/SSS-API',
  stdio: 'pipe'
});

// Wait for server to start
await new Promise(resolve => setTimeout(resolve, 5000));

// Run test
await testAuth();

// Clean up
server.kill();
process.exit(0);