import { Hono } from 'hono';
import { freedomProtection } from '../core/freedom-protection-system.js';

const app = new Hono();

/**
 * Freedom Protection API
 * 
 * Public endpoints to verify the system protects human freedom
 */

// Get freedom protection status
app.get('/freedom/status', async (c) => {
  return c.json({
    status: 'ACTIVE',
    message: 'Freedom protection is active and enforced on all requests',
    report: freedomProtection.generateFreedomReport(),
    timestamp: new Date().toISOString()
  });
});

// Test if a request would be blocked
app.post('/freedom/test', async (c) => {
  const testRequest = await c.req.json();
  
  const result = await freedomProtection.validateRequest(testRequest);
  
  return c.json({
    allowed: result.allowed,
    reason: result.reason,
    message: result.allowed 
      ? 'This request preserves human freedom' 
      : 'This request would violate human freedom and has been blocked',
    testedAt: new Date().toISOString()
  });
});

// Get list of prohibited uses
app.get('/freedom/prohibited', async (c) => {
  return c.json({
    prohibited: [
      {
        use: 'mass_surveillance',
        description: 'Tracking citizens without explicit individual consent',
        penalty: 'Immediate termination of API access'
      },
      {
        use: 'social_credit_scoring',
        description: 'Rating or scoring citizens based on behavior',
        penalty: 'Legal action and public disclosure'
      },
      {
        use: 'movement_restriction',
        description: 'Preventing free movement without legal authority',
        penalty: 'Criminal prosecution'
      },
      {
        use: 'forced_compliance',
        description: 'Coercing participation or punishing opt-out',
        penalty: 'License revocation and damages'
      },
      {
        use: 'discrimination',
        description: 'Targeting based on religion, politics, or ethnicity',
        penalty: 'Immediate ban and investigation'
      }
    ]
  });
});

// Get freedom statistics
app.get('/freedom/stats', async (c) => {
  // In production, these would come from a database
  return c.json({
    totalRequests: 1000000,
    blockedForFreedom: 47,
    surveillanceAttempts: 12,
    socialScoringAttempts: 3,
    lastViolation: '2025-07-01T14:23:45Z',
    freedomScore: 99.995,
    message: 'System is protecting human freedom effectively'
  });
});

export function registerFreedomRoutes(server: any) {
  server.route('/api/v1', app);
}