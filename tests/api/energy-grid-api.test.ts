import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build } from '../test-utils/app-builder';

describe('Energy & Grid Management API', () => {
  let app: FastifyInstance;
  const apiKey = 'UK-SSS-test-energy-key';
  
  beforeAll(async () => {
    app = await build();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('POST /api/v1/energy/optimize-grid', () => {
    test('should optimize grid with AI recommendations', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/energy/optimize-grid',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          regionId: 'london-central',
          demandForecast: 1500,
          renewableCapacity: {
            solar: 300,
            wind: 500,
            hydro: 200,
            nuclear: 1000
          }
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result).toHaveProperty('optimizationId');
      expect(result).toHaveProperty('optimizedDistribution');
      expect(result).toHaveProperty('carbonReduction');
      expect(result.carbonReduction.reductionPercent).toBeGreaterThan(50);
      expect(result).toHaveProperty('quantumSignature');
      expect(result.gridStability.loadBalanceScore).toBeGreaterThan(0.9);
    });
    
    test('should handle peak demand scenarios', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/energy/optimize-grid',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          regionId: 'manchester',
          demandForecast: 3000, // High demand
          constraints: {
            maxCarbonEmissions: 100,
            minRenewablePercent: 60
          }
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.recommendations).toContain('Activate demand response program during 5-8 PM peak');
    });
  });
  
  describe('POST /api/v1/energy/trading', () => {
    test('should execute energy trade with market optimization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/energy/trading',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          type: 'sell',
          energyAmount: 100,
          pricePerMWh: 65,
          source: 'wind',
          deliveryTime: new Date(Date.now() + 3600000).toISOString(),
          traderId: 'TRADER-001'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result.status).toBe('executed');
      expect(result).toHaveProperty('tradeId');
      expect(result).toHaveProperty('executedPrice');
      expect(result).toHaveProperty('blockchainRecord');
      expect(result.settlementDetails.carbonOffset).toBeGreaterThan(0);
    });
  });
  
  describe('POST /api/v1/energy/consumption-monitoring', () => {
    test('should provide detailed consumption analytics', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/energy/consumption-monitoring',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          meterId: 'SMART-METER-001',
          granularity: 'hour'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result).toHaveProperty('summary');
      expect(result.summary.renewableUsage).toBeGreaterThan(0);
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('recommendations');
      expect(result.aiInsights.efficiencyScore).toBeGreaterThan(0);
    });
  });
  
  describe('Performance Requirements', () => {
    test('should meet latency SLA', async () => {
      const start = Date.now();
      
      await app.inject({
        method: 'POST',
        url: '/api/v1/energy/optimize-grid',
        headers: { 'x-api-key': apiKey },
        payload: { regionId: 'test', demandForecast: 1000 }
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Sub-100ms requirement
    });
  });
});