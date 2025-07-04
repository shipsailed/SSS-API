import Fastify from 'fastify';
import { EthicalLicensingFramework } from '../../src/core/ethical-licensing-framework';

// Mock ethical framework for testing
const mockEthicalFramework = {
  validateRequest: async () => ({
    isValid: true,
    reason: 'Test mode',
    action: 'allow' as const,
    ethicalScore: 1.0
  }),
  registerLicensee: async (params: any) => ({
    licenseId: 'TEST-LICENSE-001',
    apiKey: 'UK-SSS-test-key',
    restrictions: [],
    quotas: { hourly: 10000, daily: 100000 },
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    ethicalGuidelines: [],
    monitoringNotice: 'Test mode',
    quantumSignature: 'test-signature'
  }),
  monitorCompliance: async () => ({
    licenseId: 'TEST-LICENSE-001',
    organizationName: 'Test Org',
    complianceScore: 1.0,
    status: 'active',
    recentViolations: 0,
    violationDetails: [],
    usagePatterns: {},
    recommendations: [],
    nextAuditDate: new Date(),
    quantumVerification: true
  })
};

export async function build() {
  const app = Fastify({
    logger: false // Disable logging in tests
  });
  
  // Set test environment
  process.env.SKIP_ETHICAL_CHECK = 'true';
  
  // Register mock ethical framework middleware
  app.decorateRequest('ethicalScore', null);
  app.addHook('onRequest', async (request, reply) => {
    request.ethicalScore = 1.0;
  });
  
  // Import and register all routes
  const { default: energyApi } = await import('../../src/api/energy-grid-api');
  const { default: emergencyApi } = await import('../../src/api/emergency-services-api');
  const { default: agricultureApi } = await import('../../src/api/agriculture-food-security-api');
  
  await app.register(energyApi, { prefix: '/api/v1/energy' });
  await app.register(emergencyApi, { prefix: '/api/v1/emergency' });
  await app.register(agricultureApi, { prefix: '/api/v1/agri' });
  
  // Add health check
  app.get('/health', async () => ({
    status: 'healthy',
    mode: 'test'
  }));
  
  await app.ready();
  return app;
}