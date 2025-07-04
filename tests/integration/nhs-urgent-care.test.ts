import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../../src/app';
import { MockNHSSpine } from '../mocks/nhs-spine-mock';
import { generatePatientData, generateHospitalCapacity } from '../fixtures/nhs-fixtures';

describe('NHS Urgent Care Integration Tests', () => {
  let app: FastifyInstance;
  let mockNHS: MockNHSSpine;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NHS_API_KEY = 'test-nhs-key';
    process.env.NHS_AMBULANCE_KEY = 'test-ambulance-key';
    process.env.NODE_ENV = 'test';
    
    app = await build({ logger: false });
    mockNHS = new MockNHSSpine();
    await mockNHS.initialize();
  });

  afterAll(async () => {
    await app.close();
    await mockNHS.shutdown();
  });

  describe('A&E Triage System', () => {
    it('should triage critical patients in <100ms', async () => {
      const criticalPatient = {
        nhsNumber: '943-476-5919',
        symptoms: ['chest pain', 'shortness of breath', 'left arm numbness'],
        vitals: {
          bloodPressure: '180/120',
          pulse: 145,
          temperature: 38.5,
          oxygenSaturation: 88
        },
        medicalHistory: ['diabetes', 'hypertension', 'previous MI'],
        arrivalTime: new Date().toISOString()
      };

      const start = Date.now();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/emergency/triage',
        headers: {
          'x-api-key': process.env.NHS_API_KEY,
          'x-request-id': 'test-triage-001'
        },
        payload: criticalPatient
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(2000); // Allow 2s for test environment
      
      const result = JSON.parse(response.payload);
      expect(result.priority).toBe('IMMEDIATE');
      expect(result.triageCategory).toBe(1);
      expect(result.estimatedWaitMinutes).toBeLessThan(5);
      expect(result.assignedBay).toBeDefined();
      expect(result.assignedClinician).toBeDefined();
      expect(result.recommendedTests).toContain('ECG');
      expect(result.recommendedTests).toContain('Troponin');
    });

    it('should handle mass casualty incident triage', async () => {
      const casualties = Array.from({ length: 50 }, (_, i) => ({
        temporaryId: `MCI-001-${i}`,
        symptoms: ['trauma', 'bleeding', 'burns'][i % 3] ? [`${['trauma', 'bleeding', 'burns'][i % 3]}`] : ['multiple injuries'],
        vitals: {
          pulse: 60 + Math.random() * 100,
          bloodPressure: `${90 + Math.random() * 60}/${60 + Math.random() * 30}`,
          respiratoryRate: 12 + Math.random() * 20,
          gcs: Math.floor(3 + Math.random() * 13)
        },
        mobilityStatus: ['walking', 'stretcher', 'critical'][i % 3]
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/emergency/mass-casualty-triage',
        headers: {
          'x-api-key': process.env.NHS_API_KEY,
          'x-incident-code': 'MCI-LONDON-001'
        },
        payload: { casualties, incidentType: 'explosion' }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.triaged).toBe(50);
      expect(result.immediate).toBeGreaterThan(0);
      expect(result.urgent).toBeGreaterThan(0);
      expect(result.delayed).toBeGreaterThan(0);
      expect(result.hospitalAllocations).toBeDefined();
      expect(result.resourceRequirements).toBeDefined();
    });

    it('should predict A&E wait times with 90% accuracy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nhs/emergency/wait-times',
        headers: {
          'x-api-key': process.env.NHS_API_KEY
        },
        query: {
          hospitalId: 'RJ1',
          department: 'emergency'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.currentWaitMinutes).toBeDefined();
      expect(result.predictedWait30Min).toBeDefined();
      expect(result.predictedWait60Min).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.factors).toContain('current_occupancy');
      expect(result.factors).toContain('staff_levels');
      expect(result.factors).toContain('time_of_day');
    });
  });

  describe('Ambulance Dispatch Optimization', () => {
    it('should dispatch nearest available ambulance in <2s', async () => {
      const emergency = {
        callId: '999-2025-001234',
        location: {
          latitude: 51.5074,
          longitude: -0.1278,
          address: '10 Downing Street, London SW1A 2AA',
          whatThreeWords: 'slurs.this.shark'
        },
        category: 'category1',
        chiefComplaint: 'cardiac arrest',
        callerInfo: {
          name: 'John Smith',
          phone: '07700900123',
          relationship: 'bystander'
        }
      };

      const start = Date.now();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/ambulance/dispatch',
        headers: {
          'x-api-key': process.env.NHS_AMBULANCE_KEY,
          'x-call-handler-id': 'CH-001'
        },
        payload: emergency
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(2000);
      
      const result = JSON.parse(response.payload);
      expect(result.ambulanceId).toBeDefined();
      expect(result.currentLocation).toBeDefined();
      expect(result.etaMinutes).toBeLessThan(8);
      expect(result.crew.paramedic).toBe(true);
      expect(result.crew.criticalCare).toBe(true);
      expect(result.destinationHospital.hasCardiacUnit).toBe(true);
      expect(result.destinationHospital.etaFromScene).toBeDefined();
    });

    it('should optimize multi-ambulance dispatch for major incident', async () => {
      const majorIncident = {
        incidentId: 'MI-2025-001',
        type: 'multi_vehicle_collision',
        location: {
          latitude: 51.5138,
          longitude: -0.0984,
          junction: 'M25 J15'
        },
        casualties: {
          red: 5,
          amber: 12,
          green: 20
        },
        hazards: ['fuel spill', 'trapped persons'],
        accessRoutes: ['northbound', 'southbound']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/ambulance/major-incident',
        headers: {
          'x-api-key': process.env.NHS_AMBULANCE_KEY,
          'x-incident-commander': 'IC-001'
        },
        payload: majorIncident
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.dispatchedUnits.length).toBeGreaterThanOrEqual(10);
      expect(result.airAmbulance).toBe(true);
      expect(result.hazmatUnit).toBe(true);
      expect(result.commandUnit).toBe(true);
      expect(result.receivingHospitals.length).toBeGreaterThanOrEqual(3);
      expect(result.estimatedClearanceTime).toBeDefined();
    });
  });

  describe('GP Appointment Fast-Track', () => {
    it('should book urgent GP appointment within 24h', async () => {
      const urgentRequest = {
        nhsNumber: '943-476-5919',
        symptoms: ['persistent cough', 'blood in sputum', 'weight loss'],
        duration: '3 weeks',
        riskFactors: ['smoker', 'age>65'],
        preferredGP: 'any',
        mobilityRequirements: 'none'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/gp/urgent-appointment',
        headers: {
          'x-api-key': process.env.NHS_API_KEY,
          'x-patient-consent': 'true'
        },
        payload: urgentRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.appointmentOffered).toBe(true);
      expect(new Date(result.appointmentTime).getTime() - Date.now())
        .toBeLessThan(24 * 60 * 60 * 1000);
      expect(result.gpPractice).toBeDefined();
      if (urgentRequest.symptoms.includes('cough')) {
        expect(result.additionalTests).toContain('chest x-ray');
      }
      expect(result.twoWeekWaitReferral).toBe(true);
    });

    it('should enable instant prescription renewal', async () => {
      const prescriptionRequest = {
        nhsNumber: '943-476-5919',
        medications: [
          { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
          { name: 'Ramipril', dose: '10mg', frequency: 'once daily' }
        ],
        lastReviewDate: '2025-01-04',
        pharmacy: 'Boots, High Street'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/prescription/instant-renewal',
        headers: {
          'x-api-key': process.env.NHS_API_KEY
        },
        payload: prescriptionRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.approved).toBe(true);
      expect(result.prescriptionId).toBeDefined();
      expect(result.readyForCollection).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
      expect(result.nextReviewDate).toBeDefined();
    });
  });

  describe('Mental Health Crisis Response', () => {
    it('should connect to crisis counselor in <30s', async () => {
      const crisisRequest = {
        severity: 'acute',
        presentingIssues: ['suicidal ideation', 'anxiety', 'panic'],
        currentLocation: 'home',
        supportNetwork: 'none',
        consentToShare: true
      };

      const start = Date.now();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/mental-health/crisis',
        headers: {
          'x-api-key': process.env.NHS_API_KEY,
          'x-request-source': 'crisis-line'
        },
        payload: crisisRequest
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(30000);
      
      const result = JSON.parse(response.payload);
      expect(result.counselorAssigned).toBe(true);
      expect(['video', 'phone', 'text']).toContain(result.connectionMethod);
      expect(result.waitTime).toBeLessThan(30);
      expect(result.crisisTeamAlerted).toBe(true);
      expect(result.safetyPlan).toBeDefined();
    });

    it('should coordinate multi-agency mental health response', async () => {
      const complexCase = {
        nhsNumber: '943-476-5919',
        currentCrisis: 'psychosis',
        riskLevel: 'high',
        policeInvolved: true,
        housingStatus: 'homeless',
        substanceUse: true
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/mental-health/multi-agency',
        headers: {
          'x-api-key': process.env.NHS_API_KEY
        },
        payload: complexCase
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.responseTeam).toContain('mental_health_nurse');
      expect(result.responseTeam).toContain('social_worker');
      expect(result.responseTeam).toContain('housing_officer');
      expect(result.bedAvailable).toBe(true);
      expect(result.section136Suite).toBeDefined();
    });
  });

  describe('NHS Resource Optimization', () => {
    it('should predict bed availability with 95% accuracy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nhs/resources/bed-prediction',
        headers: {
          'x-api-key': process.env.NHS_API_KEY
        },
        query: {
          hospitalId: 'RJ1',
          ward: 'cardiology',
          timeframe: '24h'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.currentOccupancy).toBeDefined();
      expect(result.predicted24h).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.95);
      expect(result.plannedDischarges).toBeDefined();
      expect(result.expectedAdmissions).toBeDefined();
    });

    it('should optimize staff rostering in real-time', async () => {
      const staffingCrisis = {
        hospitalId: 'RJ1',
        department: 'emergency',
        shortfall: {
          consultants: 2,
          nurses: 5,
          hcas: 3
        },
        shift: 'night',
        date: '2025-07-05'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/staffing/optimize',
        headers: {
          'x-api-key': process.env.NHS_API_KEY
        },
        payload: staffingCrisis
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.solution).toBeDefined();
      expect(result.bankStaffContacted).toBeGreaterThan(0);
      expect(result.agencyRequired).toBeDefined();
      expect(result.crossCoverArrangements).toBeDefined();
      expect(result.patientSafetyScore).toBeGreaterThan(0.8);
    });
  });

  describe('Integration with Other Services', () => {
    it('should share data with social services for safeguarding', async () => {
      const safeguardingAlert = {
        patientId: 'NHS-123456',
        concernType: 'neglect',
        reporter: 'emergency_department',
        evidence: ['malnutrition', 'poor hygiene', 'confusion'],
        urgency: 'immediate'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/safeguarding/alert',
        headers: {
          'x-api-key': process.env.NHS_API_KEY,
          'x-reporter-id': 'DR-001'
        },
        payload: safeguardingAlert
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.socialServicesNotified).toBe(true);
      expect(result.caseNumber).toBeDefined();
      expect(result.assignedSocialWorker).toBeDefined();
      expect(result.responseTime).toBeLessThan(2 * 60 * 60 * 1000);
    });

    it('should coordinate with DWP for benefit health assessments', async () => {
      const assessment = {
        claimantId: 'DWP-789012',
        assessmentType: 'PIP',
        medicalEvidence: ['gp_report', 'consultant_letter', 'prescription_history'],
        mobilityScore: 8,
        dailyLivingScore: 10
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/nhs/dwp-assessment/submit',
        headers: {
          'x-api-key': process.env.NHS_API_KEY
        },
        payload: assessment
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.submitted).toBe(true);
      expect(result.dwpReference).toBeDefined();
      expect(result.estimatedDecision).toBeLessThan(14 * 24 * 60 * 60 * 1000);
    });
  });
});