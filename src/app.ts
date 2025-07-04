import Fastify from 'fastify';
import { Stage1ValidationService } from './stage1/index.js';
import { Stage2StorageService } from './stage2/index.js';
import { NHSIntegration } from './government/nhs-integration.js';
import { HMRCIntegration } from './government/hmrc-integration.js';
import { DVLAIntegration } from './government/dvla-integration.js';
import { BorderForceIntegration } from './government/border-force-integration.js';
import { 
  Stage1Config, 
  Stage2Config,
  AuthenticationRequest,
  NHSPatientAuth,
  HMRCTaxAuth,
  DVLAVehicleAuth
} from './shared/types/index.js';
import { initializeInfrastructure, shutdownInfrastructure } from './infrastructure/index.js';
import { registerQuantumDefenseRoutes } from './api/quantum-defense-api.js';
import { registerAIEvolutionRoutes } from './api/ai-evolution-api.js';
import { registerCarbonCreditRoutes } from './api/carbon-credit-api.js';
import { registerSmartCityRoutes } from './api/smart-city-api.js';
import { registerVotingRoutes } from './api/voting-api.js';
import { registerUniversalIdentityRoutes } from './api/universal-identity-api.js';
import { registerCBDCRoutes } from './api/cbdc-api.js';
import { EthicalLicensingFramework } from './core/ethical-licensing-framework.js';
import { freedomProtection, enforceFreedom } from './core/freedom-protection-system.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export async function build(opts: any = {}) {
  // Default configurations
  const defaultStage1Config: Stage1Config = {
    minValidators: 10,
    maxValidators: 100,
    scaleThresholdCpu: 70,
    timeoutMs: 100,
    parallelChecks: 4,
    fraudThreshold: 0.95,
    tokenValiditySeconds: 300,
    regions: ['uk-london', 'uk-manchester', 'uk-edinburgh']
  };

  const defaultStage2Config: Stage2Config = {
    byzantineFaultTolerance: 6,
    shardCount: 4,
    replicationFactor: 3,
    consensusTimeoutMs: 400,
    merkleTreeDepth: 20
  };

  // Initialize services
  const stage1 = new Stage1ValidationService(defaultStage1Config);

  const consensusNodes = Array.from({ length: 21 }, (_, i) => ({
    id: `uk-node-${i + 1}`,
    publicKey: `pk${i + 1}`,
    endpoint: `https://consensus-${i + 1}.sss.gov.uk`,
    isActive: true
  }));

  const stage2 = new Stage2StorageService(
    process.env.NODE_ID || 'uk-node-1',
    consensusNodes,
    defaultStage2Config
  );

  // Initialize government integrations
  const nhsIntegration = new NHSIntegration(stage1, stage2);
  const hmrcIntegration = new HMRCIntegration(stage1, stage2);
  const dvlaIntegration = new DVLAIntegration(stage1, stage2);
  const borderForceIntegration = new BorderForceIntegration(stage1, stage2);

  // Initialize ethical licensing framework
  const ethicalFramework = new EthicalLicensingFramework();

  // Create Fastify server
  const fastify = Fastify({
    logger: opts.logger !== undefined ? opts.logger : {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true
        }
      }
    }
  });

  // Ethical licensing middleware
  if (process.env.NODE_ENV !== 'test') {
    fastify.addHook('onRequest', async (request, reply) => {
      // Skip ethical checks for health checks and license registration
      if (request.url === '/health' || request.url === '/api/v1/license/register') {
        return;
      }
      
      // Extract API key from headers
      const apiKey = request.headers['x-api-key'] as string;
      
      if (!apiKey) {
        reply.code(401).send({ error: 'API key required' });
        return;
      }
      
      // Check ethical compliance
      const compliance = await ethicalFramework.checkCompliance(apiKey);
      
      if (!compliance.allowed) {
        reply.code(403).send({ 
          error: 'Access denied',
          reason: compliance.reason,
          violations: compliance.violations
        });
        return;
      }
      
      // Check freedom protection
      const freedomCheck = await freedomProtection(request);
      if (!freedomCheck.allowed) {
        reply.code(451).send({ 
          error: 'Request violates freedom principles',
          reason: freedomCheck.reason,
          manifest: 'https://sss-api.gov.uk/freedom-manifest'
        });
        return;
      }
    });
  }

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register all API routes
  await registerQuantumDefenseRoutes(fastify);
  await registerAIEvolutionRoutes(fastify);
  await registerCarbonCreditRoutes(fastify);
  await registerSmartCityRoutes(fastify);
  await registerVotingRoutes(fastify);
  await registerUniversalIdentityRoutes(fastify);
  await registerCBDCRoutes(fastify);

  // Register government integration routes
  await nhsIntegration.registerRoutes(fastify);
  await hmrcIntegration.registerRoutes(fastify);
  await dvlaIntegration.registerRoutes(fastify);
  await borderForceIntegration.registerRoutes(fastify);

  // Initialize infrastructure (skip for tests)
  if (process.env.NODE_ENV !== 'test') {
    await initializeInfrastructure();
  }

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await shutdownInfrastructure();
  });

  return fastify;
}