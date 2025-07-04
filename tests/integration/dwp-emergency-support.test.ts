import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { build } from '../../src/app';
import { MockDWPGateway } from '../mocks/dwp-gateway-mock';
import { generateClaimantData, generatePaymentHistory } from '../fixtures/dwp-fixtures';

describe('DWP Emergency Support Integration Tests', () => {
  let app: FastifyInstance;
  let mockDWP: MockDWPGateway;

  beforeAll(async () => {
    app = await build({ logger: false });
    mockDWP = new MockDWPGateway();
    await mockDWP.initialize();
  });

  afterAll(async () => {
    await app.close();
    await mockDWP.shutdown();
  });

  describe('Emergency Payment Processing', () => {
    it('should process emergency advance payment in <500ms', async () => {
      const emergencyRequest = {
        nationalInsuranceNumber: 'QQ123456C',
        claimType: 'universal_credit',
        reason: 'domestic_violence',
        amountRequested: 150,
        bankDetails: {
          sortCode: '12-34-56',
          accountNumber: '12345678',
          accountName: 'Jane Smith'
        },
        circumstances: {
          hasChildren: true,
          numberOfChildren: 2,
          fled_home: true,
          in_temporary_accommodation: true
        }
      };

      const start = Date.now();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/emergency/payment',
        headers: {
          'x-api-key': process.env.DWP_API_KEY,
          'x-case-worker-id': 'CW-001'
        },
        payload: emergencyRequest
      });
      const duration = Date.now() - start;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(500);
      
      const result = JSON.parse(response.payload);
      expect(result.approved).toBe(true);
      expect(result.amount).toBe(150);
      expect(result.paymentReference).toBeDefined();
      expect(result.availableInMinutes).toBeLessThan(30);
      expect(result.collectionOptions).toHaveLength(3);
      expect(result.supportServices).toContain('domestic_violence_helpline');
      expect(result.temporaryAccommodationVoucher).toBeDefined();
    });

    it('should fast-track benefit claims for homeless applicants', async () => {
      const homelessApplication = {
        nationalInsuranceNumber: 'QQ234567D',
        currentSituation: 'street_homeless',
        lastAddress: 'No fixed abode',
        healthConditions: ['mental_health', 'substance_dependency'],
        urgentNeeds: ['accommodation', 'food', 'medication'],
        localAuthority: 'Westminster',
        documents: {
          hasId: false,
          hasBankAccount: false,
          hasProofOfNI: true
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/homeless/fast-track',
        headers: {
          'x-api-key': process.env.DWP_API_KEY,
          'x-outreach-worker': 'OW-001'
        },
        payload: homelessApplication
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.claimCreated).toBe(true);
      expect(result.firstPaymentHours).toBeLessThan(24);
      expect(result.temporaryNino).toBeDefined();
      expect(result.accommodationVoucher).toBeDefined();
      expect(result.foodBankVoucher).toBeDefined();
      expect(result.appointmentBooked).toBe(true);
      expect(result.supportWorkerAssigned).toBe(true);
    });

    it('should provide immediate support for families in crisis', async () => {
      const familyCrisis = {
        leadClaimant: 'QQ345678E',
        householdSize: 5,
        children: [
          { age: 2, hasDisability: false },
          { age: 5, hasDisability: true, disabilityType: 'autism' },
          { age: 8, hasDisability: false }
        ],
        crisis: 'eviction_notice',
        evictionDate: '2025-07-10',
        currentBenefits: ['child_benefit', 'housing_benefit'],
        monthlyShortfall: 350,
        priorityDebts: ['rent', 'council_tax', 'utilities']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/family/crisis-intervention',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: familyCrisis
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.discretionaryHousingPayment).toBeGreaterThan(0);
      expect(result.emergencyLoan).toBeDefined();
      expect(result.debtAdviceAppointment).toBeDefined();
      expect(result.localWelfareAssistance).toBe(true);
      expect(result.schoolMealVouchers).toBe(true);
      expect(result.disabilityPremiumAdded).toBe(true);
      expect(result.socialServicesNotified).toBe(true);
    });
  });

  describe('Universal Credit Fast-Track', () => {
    it('should process UC claim in <24h for vulnerable groups', async () => {
      const vulnerableApplication = {
        nationalInsuranceNumber: 'QQ456789F',
        vulnerableCategory: 'care_leaver',
        age: 19,
        currentIncome: 0,
        savingsBelow6000: true,
        hasAccommodation: false,
        inEducation: false,
        documents: ['birth_certificate', 'care_leaver_certificate']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/uc/vulnerable-fast-track',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: vulnerableApplication
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.claimAccepted).toBe(true);
      expect(result.firstPaymentDate).toBeDefined();
      const paymentTime = new Date(result.firstPaymentDate).getTime() - Date.now();
      expect(paymentTime).toBeLessThan(24 * 60 * 60 * 1000);
      expect(result.advanceOffered).toBe(true);
      expect(result.housingElement).toBeGreaterThan(0);
      expect(result.careLeaverElement).toBe(true);
      expect(result.workCoachAppointment).toBeDefined();
    });

    it('should automatically migrate legacy benefits to UC', async () => {
      const legacyMigration = {
        nationalInsuranceNumber: 'QQ567890G',
        currentBenefits: [
          { type: 'ESA', amount: 360, frequency: 'fortnightly' },
          { type: 'housing_benefit', amount: 450, frequency: 'monthly' },
          { type: 'child_tax_credit', amount: 280, frequency: 'monthly' }
        ],
        migrationNoticeReceived: '2025-06-01',
        hasDisability: true,
        workCapability: 'limited'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/uc/migrate-legacy',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: legacyMigration
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.migrationComplete).toBe(true);
      expect(result.transitionalProtection).toBeGreaterThan(0);
      expect(result.totalUcAmount).toBeGreaterThanOrEqual(
        result.previousBenefitsTotal
      );
      expect(result.severeDisabilityPremium).toBe(true);
      expect(result.managedMigrationPayment).toBe(true);
      expect(result.noGapInPayments).toBe(true);
    });
  });

  describe('Pension and Retirement Support', () => {
    it('should instantly calculate state pension entitlement', async () => {
      const pensionQuery = {
        nationalInsuranceNumber: 'QQ678901H',
        dateOfBirth: '1960-07-04',
        retirementDate: '2027-07-04',
        niContributions: {
          fullYears: 35,
          partialYears: 3,
          gaps: ['2008-2009', '2015-2016']
        },
        additionalPensions: ['SERPS', 'workplace']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/pension/calculate',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: pensionQuery
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.weeklyAmount).toBeGreaterThan(185);
      expect(result.qualifyingYears).toBe(35);
      expect(result.forecastAmount).toBeDefined();
      expect(result.buyBackOptions).toHaveLength(2);
      expect(result.additionalPensionAmount).toBeGreaterThan(0);
      expect(result.taxImplications).toBeDefined();
    });

    it('should auto-enroll eligible pensioners for Pension Credit', async () => {
      const pensionerDetails = {
        nationalInsuranceNumber: 'QQ789012I',
        age: 68,
        weeklyIncome: 150,
        savings: 8000,
        housingCosts: 120,
        hasPartner: true,
        partnerAge: 65,
        partnerIncome: 50,
        disabilities: ['mobility', 'hearing']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/pension-credit/auto-check',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: pensionerDetails
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.eligible).toBe(true);
      expect(result.weeklyAmount).toBeGreaterThan(50);
      expect(result.backdateAvailable).toBe(true);
      expect(result.backdateAmount).toBeGreaterThan(0);
      expect(result.additionalSupport).toContain('cold_weather_payment');
      expect(result.additionalSupport).toContain('warm_home_discount');
      expect(result.autoEnrolled).toBe(true);
    });
  });

  describe('Disability Benefits Processing', () => {
    it('should fast-track PIP applications with medical evidence', async () => {
      const pipApplication = {
        nationalInsuranceNumber: 'QQ890123J',
        conditions: [
          {
            name: 'multiple_sclerosis',
            diagnosisDate: '2023-05-15',
            consultantName: 'Dr. Smith',
            hospitalNumber: 'RJ1-123456'
          },
          {
            name: 'chronic_fatigue',
            diagnosisDate: '2024-01-20'
          }
        ],
        dailyLivingDifficulties: [
          'preparing_food',
          'washing',
          'dressing',
          'communication'
        ],
        mobilityDifficulties: [
          'moving_around',
          'planning_journey'
        ],
        medicalEvidence: ['consultant_report', 'gp_summary', 'ot_assessment']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/pip/fast-track',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: pipApplication
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.fastTrackApproved).toBe(true);
      expect(result.assessmentBypassed).toBe(true);
      expect(result.dailyLivingPoints).toBeGreaterThanOrEqual(8);
      expect(result.mobilityPoints).toBeGreaterThanOrEqual(8);
      expect(['standard', 'enhanced']).toContain(result.awardLevel);
      expect(result.backpayCalculated).toBeGreaterThan(0);
      expect(result.firstPaymentDays).toBeLessThan(14);
    });

    it('should coordinate Access to Work support instantly', async () => {
      const atwRequest = {
        nationalInsuranceNumber: 'QQ901234K',
        employmentStatus: 'starting_new_job',
        startDate: '2025-07-15',
        employer: 'Tech Corp Ltd',
        disabilities: ['visual_impairment', 'dyslexia'],
        supportNeeded: [
          'screen_reader_software',
          'workplace_assessment',
          'travel_assistance',
          'support_worker'
        ],
        estimatedCosts: {
          equipment: 2000,
          travel: 150,
          support: 500
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/access-to-work/apply',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: atwRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.approved).toBe(true);
      expect(result.grantAmount).toBeGreaterThan(2500);
      expect(result.equipmentOrdered).toBe(true);
      expect(result.deliveryDate).toBeDefined();
      expect(result.workplaceAssessmentBooked).toBe(true);
      expect(result.travelPassIssued).toBe(true);
      expect(result.supportWorkerHours).toBe(20);
    });
  });

  describe('Fraud Prevention and Detection', () => {
    it('should detect and prevent benefit fraud in real-time', async () => {
      const suspiciousActivity = {
        claimantId: 'QQ012345L',
        activityType: 'multiple_claims',
        details: {
          claims: [
            { type: 'UC', address: '123 High St, London' },
            { type: 'UC', address: '456 Main Rd, Manchester' }
          ],
          ipAddresses: ['192.168.1.1', '10.0.0.1'],
          deviceFingerprints: ['device1', 'device2']
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/fraud/check',
        headers: {
          'x-api-key': process.env.DWP_FRAUD_KEY
        },
        payload: suspiciousActivity
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.fraudRiskScore).toBeGreaterThan(0.8);
      expect(result.flagged).toBe(true);
      expect(result.claimsSuspended).toBe(true);
      expect(result.investigationStarted).toBe(true);
      expect(result.evidenceCollected).toBeDefined();
      expect(result.nextSteps).toContain('interview_required');
    });

    it('should validate identity with biometric checks', async () => {
      const biometricCheck = {
        claimantId: 'QQ123456M',
        biometricData: {
          facialRecognition: 'base64_encoded_image',
          voicePrint: 'audio_sample',
          documentPhoto: 'passport_image'
        },
        claimedIdentity: {
          name: 'John Smith',
          dob: '1985-03-15',
          address: '10 Downing Street'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/identity/biometric-verify',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: biometricCheck
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.identityVerified).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(0.95);
      expect(result.livenessCheck).toBe(true);
      expect(result.documentAuthentic).toBe(true);
      expect(result.verificationTime).toBeLessThan(3000);
    });
  });

  describe('Crisis Coordination', () => {
    it('should coordinate multi-agency response for complex cases', async () => {
      const complexCase = {
        nationalInsuranceNumber: 'QQ234567N',
        issues: [
          'homelessness',
          'mental_health',
          'substance_abuse',
          'debt',
          'domestic_violence'
        ],
        currentLocation: 'temporary_shelter',
        agencies: ['dwp', 'nhs', 'police', 'local_authority'],
        urgency: 'critical',
        childrenAtRisk: true
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/crisis/multi-agency',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: complexCase
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.caseConferenceScheduled).toBe(true);
      expect(result.leadAgency).toBe('local_authority');
      expect(result.immediateActions).toContain('emergency_accommodation');
      expect(result.immediateActions).toContain('crisis_payment');
      expect(result.immediateActions).toContain('mental_health_assessment');
      expect(result.safeguardingAlert).toBe(true);
      expect(result.supportPlan).toBeDefined();
      expect(result.reviewDate).toBeDefined();
    });

    it('should provide winter crisis support automatically', async () => {
      const winterCrisis = {
        temperature: -5,
        region: 'North_East',
        vulnerableHouseholds: 15000,
        date: '2025-12-15'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/dwp/winter-crisis/activate',
        headers: {
          'x-api-key': process.env.DWP_API_KEY
        },
        payload: winterCrisis
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.coldWeatherPaymentsTriggered).toBe(true);
      expect(result.paymentsIssued).toBe(15000);
      expect(result.amountPerHousehold).toBe(25);
      expect(result.warmHomesDiscountApplied).toBe(true);
      expect(result.emergencySheltersOpened).toBeGreaterThan(0);
      expect(result.foodBankVouchersIssued).toBeGreaterThan(0);
    });
  });
});