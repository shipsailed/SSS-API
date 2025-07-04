export function generatePatientData(count: number, options: any) {
  const patients = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
  
  for (let i = 0; i < count; i++) {
    const age = Math.floor(Math.random() * (options.ages[1] - options.ages[0])) + options.ages[0];
    const conditions = [];
    
    // Add random conditions based on age
    if (age > 60 && Math.random() > 0.5) conditions.push('diabetes');
    if (age > 50 && Math.random() > 0.6) conditions.push('hypertension');
    if (age > 70 && Math.random() > 0.7) conditions.push('heart disease');
    if (Math.random() > 0.8) conditions.push('mental health');
    
    patients.push({
      nhsNumber: generateNHSNumber(),
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      dateOfBirth: new Date(Date.now() - age * 365 * 24 * 60 * 60 * 1000).toISOString(),
      age,
      conditions,
      postcode: options.postcodes[Math.floor(Math.random() * options.postcodes.length)],
      gp: `Dr. ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      emergencyContact: {
        name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
        phone: generatePhoneNumber(),
        relationship: ['spouse', 'child', 'parent', 'sibling'][Math.floor(Math.random() * 4)]
      }
    });
  }
  
  return patients;
}

export function generateHospitalCapacity(hospitalCount: number) {
  const hospitals = [];
  const hospitalNames = [
    "St Thomas' Hospital",
    "Guy's Hospital",
    "King's College Hospital",
    "Royal London Hospital",
    "Manchester Royal Infirmary",
    "Birmingham City Hospital",
    "Edinburgh Royal Infirmary",
    "Glasgow Royal Infirmary"
  ];
  
  for (let i = 0; i < hospitalCount && i < hospitalNames.length; i++) {
    hospitals.push({
      id: `H${String(i + 1).padStart(3, '0')}`,
      name: hospitalNames[i],
      capacity: {
        emergency: {
          total: 50 + Math.floor(Math.random() * 100),
          occupied: Math.floor(Math.random() * 100),
          criticalCare: 10 + Math.floor(Math.random() * 20),
          criticalOccupied: Math.floor(Math.random() * 15)
        },
        general: {
          total: 200 + Math.floor(Math.random() * 300),
          occupied: Math.floor(Math.random() * 400)
        },
        icu: {
          total: 20 + Math.floor(Math.random() * 30),
          occupied: Math.floor(Math.random() * 30)
        }
      },
      currentWaitTime: Math.floor(Math.random() * 480), // 0-8 hours
      staffLevels: {
        consultants: 5 + Math.floor(Math.random() * 15),
        juniorDoctors: 10 + Math.floor(Math.random() * 30),
        nurses: 50 + Math.floor(Math.random() * 100),
        hcas: 20 + Math.floor(Math.random() * 40)
      },
      specialties: ['cardiology', 'neurology', 'oncology', 'trauma', 'pediatrics']
        .filter(() => Math.random() > 0.3)
    });
  }
  
  return hospitals;
}

export function generateAmbulances(count: number, regions: string[]) {
  const ambulances = [];
  
  for (let i = 0; i < count; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const baseLocation = getRegionCenter(region);
    
    ambulances.push({
      id: `AMB-${String(i + 1).padStart(4, '0')}`,
      region,
      currentLocation: {
        lat: baseLocation.lat + (Math.random() - 0.5) * 0.2,
        lng: baseLocation.lng + (Math.random() - 0.5) * 0.2
      },
      status: ['available', 'responding', 'at_scene', 'transporting', 'returning'][
        Math.floor(Math.random() * 5)
      ],
      type: i < count * 0.1 ? 'critical_care' : i < count * 0.3 ? 'advanced' : 'standard',
      crew: {
        paramedics: 2,
        emt: Math.random() > 0.5 ? 1 : 0,
        criticalCareParamedic: i < count * 0.1
      },
      lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString()
    });
  }
  
  return ambulances;
}

export function generateFluPatients(count: number) {
  const symptoms = [
    ['fever', 'cough', 'body aches'],
    ['high fever', 'difficulty breathing', 'chest pain'],
    ['fever', 'vomiting', 'dehydration'],
    ['cough', 'fatigue', 'headache']
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    temporaryId: `FLU-${Date.now()}-${i}`,
    arrivalTime: new Date(Date.now() - Math.random() * 7200000).toISOString(), // Last 2 hours
    symptoms: symptoms[Math.floor(Math.random() * symptoms.length)],
    vitals: {
      temperature: 37 + Math.random() * 3,
      pulse: 70 + Math.random() * 50,
      bloodPressure: `${110 + Math.random() * 40}/${70 + Math.random() * 20}`,
      respiratoryRate: 16 + Math.random() * 12,
      oxygenSaturation: 92 + Math.random() * 8
    },
    age: Math.floor(Math.random() * 80) + 5,
    riskFactors: generateRiskFactors()
  }));
}

function generateNHSNumber(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  return `${digits.slice(0, 3).join('')}-${digits.slice(3, 6).join('')}-${digits.slice(6).join('')}`;
}

function generatePhoneNumber(): string {
  return `07${Math.floor(Math.random() * 900000000) + 100000000}`;
}

function getRegionCenter(region: string): { lat: number; lng: number } {
  const centers: { [key: string]: { lat: number; lng: number } } = {
    'London': { lat: 51.5074, lng: -0.1278 },
    'Manchester': { lat: 53.4808, lng: -2.2426 },
    'Birmingham': { lat: 52.4862, lng: -1.8904 },
    'Edinburgh': { lat: 55.9533, lng: -3.1883 },
    'Cardiff': { lat: 51.4816, lng: -3.1791 },
    'Belfast': { lat: 54.5973, lng: -5.9301 }
  };
  
  return centers[region] || centers['London'];
}

function generateRiskFactors(): string[] {
  const factors = [];
  if (Math.random() > 0.7) factors.push('asthma');
  if (Math.random() > 0.8) factors.push('diabetes');
  if (Math.random() > 0.9) factors.push('immunocompromised');
  if (Math.random() > 0.85) factors.push('pregnancy');
  if (Math.random() > 0.6) factors.push('elderly');
  return factors;
}

export const UK_POSTCODES = [
  'SW1A 1AA', 'W1A 0AX', 'EC1A 1BB', 'M1 1AE', 'B1 1AA',
  'G1 1AA', 'L1 1AA', 'LS1 1AA', 'NE1 1AA', 'CF10 1AA'
];

export const UK_HOSPITALS = [
  { id: 'RJ1', name: "Guy's and St Thomas'", region: 'London' },
  { id: 'RJ2', name: 'King\'s College Hospital', region: 'London' },
  { id: 'RYJ', name: 'Imperial College Healthcare', region: 'London' },
  { id: 'RM1', name: 'Manchester University NHS', region: 'Manchester' },
  { id: 'RRK', name: 'University Hospitals Birmingham', region: 'Birmingham' },
  { id: 'RIE', name: 'NHS Lothian', region: 'Edinburgh' }
];

export const UK_REGIONS = ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Cardiff', 'Belfast'];