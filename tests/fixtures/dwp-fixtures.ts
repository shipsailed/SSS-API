export function generateClaimantData(count: number, options: any) {
  const claimants = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
  
  for (let i = 0; i < count; i++) {
    const hasPartner = Math.random() > 0.6;
    const hasChildren = Math.random() > 0.5;
    const numberOfChildren = hasChildren ? Math.floor(Math.random() * 4) + 1 : 0;
    
    claimants.push({
      nino: generateNINO(),
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      dateOfBirth: generateDOB(),
      benefits: generateBenefits(options.benefits),
      circumstances: {
        employmentStatus: options.circumstances[Math.floor(Math.random() * options.circumstances.length)],
        hasPartner,
        hasChildren,
        numberOfChildren,
        housingStatus: generateHousingStatus(),
        disabilities: generateDisabilities(),
        carers: Math.random() > 0.9
      },
      income: {
        employment: Math.random() > 0.7 ? Math.floor(Math.random() * 2000) : 0,
        other: Math.random() > 0.8 ? Math.floor(Math.random() * 500) : 0
      },
      savings: Math.floor(Math.random() * 10000),
      address: generateAddress()
    });
  }
  
  return claimants;
}

export function generatePaymentHistory(claimantCount: number, months: number) {
  const history: { [key: string]: any[] } = {};
  const paymentTypes = ['UC', 'PIP', 'ESA', 'JSA', 'Pension Credit', 'Housing Benefit'];
  
  for (let i = 0; i < claimantCount; i++) {
    const nino = generateNINO();
    history[nino] = [];
    
    for (let month = 0; month < months; month++) {
      const date = new Date();
      date.setMonth(date.getMonth() - month);
      
      history[nino].push({
        date: date.toISOString(),
        type: paymentTypes[Math.floor(Math.random() * paymentTypes.length)],
        amount: 300 + Math.floor(Math.random() * 1200),
        status: Math.random() > 0.95 ? 'failed' : 'paid',
        reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    }
  }
  
  return history;
}

export function generateSanctions(count: number) {
  const sanctions = [];
  const reasons = [
    'missed appointment',
    'failed to attend work programme',
    'left job voluntarily',
    'failed to apply for jobs',
    'failed to provide information'
  ];
  
  for (let i = 0; i < count; i++) {
    sanctions.push({
      claimantId: generateNINO(),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      duration: [4, 13, 26, 52][Math.floor(Math.random() * 4)], // weeks
      amount: 50 + Math.floor(Math.random() * 200),
      status: ['active', 'completed', 'appealed', 'overturned'][Math.floor(Math.random() * 4)]
    });
  }
  
  return sanctions;
}

export function generateEmergencyRequests(count: number) {
  const requests = [];
  const reasons = [
    'domestic_violence',
    'homelessness',
    'destitution',
    'benefit_delay',
    'unexpected_expense',
    'funeral_costs'
  ];
  
  for (let i = 0; i < count; i++) {
    requests.push({
      requestId: `ER-${Date.now()}-${i}`,
      nino: generateNINO(),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      amountRequested: 50 + Math.floor(Math.random() * 450),
      urgency: ['immediate', 'within_24h', 'within_3_days'][Math.floor(Math.random() * 3)],
      supportingEvidence: generateSupportingEvidence(),
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return requests;
}

function generateNINO(): string {
  const letters = 'ABCEGHJKLMNPRSTWXYZ';
  const prefix = letters[Math.floor(Math.random() * letters.length)] +
                letters[Math.floor(Math.random() * letters.length)];
  const numbers = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const suffix = 'ABCD'[Math.floor(Math.random() * 4)];
  return `${prefix}${numbers}${suffix}`;
}

function generateDOB(): string {
  const age = 18 + Math.floor(Math.random() * 65); // 18-82 years old
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date.toISOString().split('T')[0];
}

function generateBenefits(availableBenefits: string[]): string[] {
  const benefits = [];
  availableBenefits.forEach(benefit => {
    if (Math.random() > 0.7) {
      benefits.push(benefit);
    }
  });
  return benefits;
}

function generateHousingStatus(): string {
  const statuses = [
    'private_rental',
    'social_housing',
    'owner_occupier',
    'temporary_accommodation',
    'homeless',
    'sofa_surfing'
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateDisabilities(): string[] {
  const disabilities = [];
  const conditions = [
    'mobility',
    'mental_health',
    'learning_disability',
    'visual_impairment',
    'hearing_impairment',
    'chronic_illness'
  ];
  
  conditions.forEach(condition => {
    if (Math.random() > 0.85) {
      disabilities.push(condition);
    }
  });
  
  return disabilities;
}

function generateAddress(): any {
  const streets = ['High Street', 'Main Road', 'Park Lane', 'Church Street', 'Victoria Road'];
  const cities = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool'];
  
  return {
    line1: `${Math.floor(Math.random() * 999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    postcode: generatePostcode()
  };
}

function generatePostcode(): string {
  const areas = ['SW', 'NW', 'E', 'W', 'N', 'S', 'M', 'L', 'B', 'G'];
  const area = areas[Math.floor(Math.random() * areas.length)];
  const district = Math.floor(Math.random() * 20) + 1;
  const sector = Math.floor(Math.random() * 9) + 1;
  const unit = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
               String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${area}${district} ${sector}${unit}`;
}

function generateSupportingEvidence(): string[] {
  const evidence = [];
  const types = [
    'police_report',
    'medical_certificate',
    'eviction_notice',
    'bank_statement',
    'utility_bill',
    'landlord_letter'
  ];
  
  types.forEach(type => {
    if (Math.random() > 0.6) {
      evidence.push(type);
    }
  });
  
  return evidence;
}