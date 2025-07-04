import { EventEmitter } from 'events';

export class MockDWPGateway extends EventEmitter {
  private claimants: Map<string, any> = new Map();
  private payments: Map<string, any[]> = new Map();
  private claims: Map<string, any> = new Map();
  
  async initialize() {
    this.loadMockClaimants();
    this.loadMockPayments();
    this.startPaymentProcessing();
  }
  
  async shutdown() {
    this.removeAllListeners();
  }
  
  private loadMockClaimants() {
    const mockClaimants = [
      {
        nino: 'QQ123456C',
        name: 'Jane Smith',
        dateOfBirth: '1985-03-15',
        benefits: ['universal_credit'],
        circumstances: {
          hasChildren: true,
          numberOfChildren: 2,
          housingStatus: 'temporary_accommodation',
          employmentStatus: 'unemployed'
        },
        bankDetails: {
          sortCode: '12-34-56',
          accountNumber: '12345678',
          accountName: 'Jane Smith'
        }
      },
      {
        nino: 'QQ234567D',
        name: 'John Doe',
        dateOfBirth: '1990-07-22',
        benefits: [],
        circumstances: {
          hasChildren: false,
          housingStatus: 'street_homeless',
          employmentStatus: 'unemployed',
          vulnerabilities: ['mental_health', 'substance_dependency']
        }
      }
    ];
    
    mockClaimants.forEach(c => this.claimants.set(c.nino, c));
  }
  
  private loadMockPayments() {
    // Mock payment history
    this.payments.set('QQ123456C', [
      {
        date: '2025-06-01',
        amount: 850,
        type: 'universal_credit',
        status: 'paid'
      }
    ]);
  }
  
  private startPaymentProcessing() {
    // Simulate payment processing
    setInterval(() => {
      this.emit('payment', {
        timestamp: new Date(),
        processed: Math.floor(Math.random() * 100),
        type: 'emergency_payment'
      });
    }, 10000);
  }
  
  // API Methods
  async getClaimant(nino: string) {
    return this.claimants.get(nino);
  }
  
  async processEmergencyPayment(request: any) {
    const claimant = this.claimants.get(request.nationalInsuranceNumber);
    if (!claimant) return { approved: false, reason: 'claimant_not_found' };
    
    // Validate emergency criteria
    if (request.reason === 'domestic_violence' || 
        request.reason === 'homelessness' ||
        request.reason === 'destitution') {
      
      const paymentRef = `EP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        approved: true,
        amount: request.amountRequested,
        paymentReference: paymentRef,
        availableInMinutes: 30,
        collectionOptions: [
          { type: 'bank_transfer', eta: 30 },
          { type: 'paypoint', locations: 3, nearest: '0.5 miles' },
          { type: 'post_office', locations: 2, nearest: '0.8 miles' }
        ],
        supportServices: this.getSupportServices(request.reason),
        temporaryAccommodationVoucher: request.reason === 'domestic_violence' ? 'TAV-' + Date.now() : null
      };
    }
    
    return { approved: false, reason: 'criteria_not_met' };
  }
  
  async fastTrackClaim(application: any) {
    if (application.currentSituation === 'street_homeless') {
      const claimId = `UC-FT-${Date.now()}`;
      
      return {
        claimCreated: true,
        claimId,
        firstPaymentHours: 24,
        temporaryNino: `TN${Date.now()}`,
        accommodationVoucher: `ACC-${Date.now()}`,
        foodBankVoucher: `FB-${Date.now()}`,
        appointmentBooked: true,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        supportWorkerAssigned: true,
        supportWorkerId: 'SW-001'
      };
    }
    
    return { claimCreated: false, reason: 'standard_process_required' };
  }
  
  async calculatePension(query: any) {
    const fullPension = 203.85; // Current full state pension per week
    const qualifyingYears = query.niContributions.fullYears;
    
    const weeklyAmount = (qualifyingYears / 35) * fullPension;
    
    return {
      weeklyAmount: Math.min(weeklyAmount, fullPension),
      qualifyingYears,
      forecastAmount: weeklyAmount * 1.025, // 2.5% increase forecast
      buyBackOptions: query.niContributions.gaps.map(gap => ({
        year: gap,
        cost: 824.20,
        additionalWeekly: 5.82
      })),
      additionalPensionAmount: 45.50, // Mock SERPS/S2P amount
      taxImplications: {
        taxFreeAmount: weeklyAmount * 0.25,
        taxableAmount: weeklyAmount * 0.75,
        estimatedTax: weeklyAmount * 0.75 * 0.2
      }
    };
  }
  
  async checkPensionCredit(details: any) {
    const threshold = 201.05; // Pension Credit threshold
    const totalIncome = details.weeklyIncome + (details.partnerIncome || 0);
    
    if (totalIncome < threshold) {
      const weeklyAmount = threshold - totalIncome;
      const backdateWeeks = 13; // 3 months backdating
      
      return {
        eligible: true,
        weeklyAmount,
        backdateAvailable: true,
        backdateAmount: weeklyAmount * backdateWeeks,
        additionalSupport: [
          'cold_weather_payment',
          'warm_home_discount',
          'free_tv_license',
          'council_tax_reduction'
        ],
        autoEnrolled: true,
        firstPaymentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
    
    return { eligible: false, reason: 'income_too_high' };
  }
  
  private getSupportServices(reason: string): string[] {
    const services: { [key: string]: string[] } = {
      domestic_violence: [
        'domestic_violence_helpline',
        'refuge_accommodation',
        'legal_aid',
        'counselling_services'
      ],
      homelessness: [
        'shelter_helpline',
        'housing_first',
        'day_centres',
        'outreach_services'
      ],
      destitution: [
        'food_banks',
        'clothing_banks',
        'crisis_support',
        'debt_advice'
      ]
    };
    
    return services[reason] || ['general_support'];
  }
}

export const mockDWPResponses = {
  emergencyPayment: (request: any) => ({
    approved: true,
    amount: request.amountRequested,
    paymentReference: `EP-${Date.now()}`,
    availableInMinutes: 30,
    collectionOptions: [
      { type: 'bank_transfer', eta: 30 },
      { type: 'paypoint', locations: 3 },
      { type: 'post_office', locations: 2 }
    ]
  }),
  
  pipApplication: (application: any) => ({
    fastTrackApproved: true,
    assessmentBypassed: true,
    dailyLivingPoints: 12,
    mobilityPoints: 10,
    awardLevel: 'enhanced',
    backpayCalculated: 2500,
    firstPaymentDays: 7
  }),
  
  fraudCheck: (activity: any) => ({
    fraudRiskScore: 0.85,
    flagged: true,
    claimsSuspended: true,
    investigationStarted: true,
    evidenceCollected: {
      ipMismatch: true,
      addressConflict: true,
      deviceFingerprints: 2
    },
    nextSteps: ['interview_required', 'documentation_review']
  })
};