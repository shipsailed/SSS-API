import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build } from '../test-utils/app-builder';

describe('Emergency Services Coordination API', () => {
  let app: FastifyInstance;
  const apiKey = 'UK-SSS-test-emergency-key';
  
  beforeAll(async () => {
    app = await build();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('POST /api/v1/emergency/call', () => {
    test('should route 999 call with AI optimization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/emergency/call',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          phoneNumber: '+447123456789',
          location: {
            latitude: 51.5074,
            longitude: -0.1278,
            accuracy: 10
          },
          callType: '999',
          initialCategory: 'medical'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result.status).toBe('connected');
      expect(result.routing.estimatedWaitTime).toBe(0);
      expect(result.locationEnhancement.enhanced).toHaveProperty('what3Words');
      expect(result.aiAssessment.urgencyScore).toBeGreaterThan(0.5);
      expect(result).toHaveProperty('quantumSignature');
    });
    
    test('should handle multi-language support', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/emergency/call',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          phoneNumber: '+447987654321',
          location: { latitude: 52.4862, longitude: -1.8904 },
          callType: '112'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result.transcriptionService.realTimeTranslation).toContain('es');
      expect(result.transcriptionService.realTimeTranslation).toContain('pl');
    });
  });
  
  describe('POST /api/v1/emergency/dispatch', () => {
    test('should dispatch multiple services efficiently', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/emergency/dispatch',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          incidentId: 'INC-001',
          severity: 'critical',
          requiredServices: ['police', 'fire', 'ambulance'],
          location: {
            latitude: 51.5074,
            longitude: -0.1278,
            address: 'Westminster Bridge, London'
          }
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result.status).toBe('dispatched');
      expect(result.resourcesAssigned).toHaveLength(3);
      expect(result.aiOptimization.routeOptimized).toBe(true);
      expect(result.coordinationCenter.commandStructure).toContain('Gold Command');
    });
  });
  
  describe('POST /api/v1/emergency/multi-agency', () => {
    test('should coordinate major incident response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/emergency/multi-agency',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          incidentId: 'MAJOR-001',
          leadAgency: 'police',
          participatingAgencies: ['police', 'fire', 'ambulance', 'military'],
          incidentType: 'major_incident',
          commandLevel: 'gold'
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result.status).toBe('active');
      expect(result.commandStructure.goldCommander).toBeTruthy();
      expect(result.communicationsHub.encryptionLevel).toBe('AES-256-QUANTUM');
      expect(result.operationalPlan.objectives).toHaveLength(4);
    });
  });
  
  describe('POST /api/v1/emergency/public-alert', () => {
    test('should broadcast public emergency alert', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/emergency/public-alert',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json'
        },
        payload: {
          alertType: 'warning',
          severity: 'severe',
          areas: [{
            type: 'circle',
            coordinates: { center: [51.5074, -0.1278], radius: 5 },
            population: 50000
          }],
          message: {
            title: 'Severe Weather Warning',
            body: 'Heavy flooding expected in your area',
            instructions: ['Move to higher ground', 'Avoid travel']
          },
          duration: 3600,
          channels: ['sms', 'app', 'broadcast']
        }
      });
      
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      
      expect(result.status).toBe('broadcasting');
      expect(result.effectiveness.estimatedReach).toBe('94.5%');
      expect(result.quantumAuthentication.antiSpoofing).toBe('Active - 113 algorithms');
      expect(result.metrics.totalDeliveryTime).toBe('3.8s');
    });
  });
  
  describe('Critical Response Times', () => {
    test('999 calls should connect in under 10ms', async () => {
      const start = Date.now();
      
      await app.inject({
        method: 'POST',
        url: '/api/v1/emergency/call',
        headers: { 'x-api-key': apiKey },
        payload: {
          phoneNumber: '+447000000000',
          location: { latitude: 51.5, longitude: -0.1 },
          callType: '999'
        }
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });
});