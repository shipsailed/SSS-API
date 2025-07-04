import { EventEmitter } from 'events';

export class MockNHSSpine extends EventEmitter {
  private patients: Map<string, any> = new Map();
  private hospitals: Map<string, any> = new Map();
  private ambulances: Map<string, any> = new Map();
  
  async initialize() {
    // Load mock patient data
    this.loadMockPatients();
    this.loadMockHospitals();
    this.loadMockAmbulances();
    
    // Start mock real-time updates
    this.startRealtimeSimulation();
  }
  
  async shutdown() {
    this.removeAllListeners();
  }
  
  private loadMockPatients() {
    // Sample NHS numbers and patient data
    const mockPatients = [
      {
        nhsNumber: '943-476-5919',
        name: 'John Smith',
        dateOfBirth: '1960-03-15',
        conditions: ['diabetes', 'hypertension', 'previous MI'],
        gp: 'Dr. Brown',
        medications: [
          { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
          { name: 'Ramipril', dose: '10mg', frequency: 'once daily' }
        ]
      }
    ];
    
    mockPatients.forEach(p => this.patients.set(p.nhsNumber, p));
  }
  
  private loadMockHospitals() {
    const mockHospitals = [
      {
        id: 'RJ1',
        name: 'Guy\'s and St Thomas\' NHS Foundation Trust',
        location: { lat: 51.4986, lng: -0.1187 },
        departments: {
          emergency: {
            capacity: 100,
            currentOccupancy: 85,
            waitTime: 180,
            staff: { consultants: 8, nurses: 24, hcas: 12 }
          },
          cardiology: {
            beds: 40,
            currentOccupancy: 35,
            hasCardiacUnit: true,
            hasCathLab: true
          }
        },
        ambulanceBays: 6,
        traumaUnit: true,
        helicopterPad: true
      }
    ];
    
    mockHospitals.forEach(h => this.hospitals.set(h.id, h));
  }
  
  private loadMockAmbulances() {
    const mockAmbulances = Array.from({ length: 50 }, (_, i) => ({
      id: `AMB-${String(i + 1).padStart(3, '0')}`,
      currentLocation: {
        lat: 51.5074 + (Math.random() - 0.5) * 0.1,
        lng: -0.1278 + (Math.random() - 0.5) * 0.1
      },
      status: ['available', 'responding', 'at_scene', 'transporting'][Math.floor(Math.random() * 4)],
      crew: {
        paramedic: true,
        criticalCare: i < 10 // First 10 are critical care units
      },
      equipment: ['defibrillator', 'medication', 'oxygen', 'stretcher']
    }));
    
    mockAmbulances.forEach(a => this.ambulances.set(a.id, a));
  }
  
  private startRealtimeSimulation() {
    // Simulate patient arrivals
    setInterval(() => {
      this.emit('admission', {
        timestamp: new Date(),
        department: 'emergency',
        priority: Math.floor(Math.random() * 5) + 1
      });
    }, 5000);
    
    // Simulate ambulance status updates
    setInterval(() => {
      const ambulance = Array.from(this.ambulances.values())[
        Math.floor(Math.random() * this.ambulances.size)
      ];
      
      ambulance.status = ['available', 'responding', 'at_scene', 'transporting'][
        Math.floor(Math.random() * 4)
      ];
      
      this.emit('ambulanceUpdate', ambulance);
    }, 3000);
  }
  
  // API Methods
  async getPatient(nhsNumber: string) {
    return this.patients.get(nhsNumber);
  }
  
  async getHospital(hospitalId: string) {
    return this.hospitals.get(hospitalId);
  }
  
  async getNearestAmbulance(location: { lat: number; lng: number }) {
    let nearest = null;
    let minDistance = Infinity;
    
    this.ambulances.forEach(ambulance => {
      if (ambulance.status === 'available') {
        const distance = this.calculateDistance(location, ambulance.currentLocation);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = ambulance;
        }
      }
    });
    
    return nearest;
  }
  
  async dispatchAmbulance(ambulanceId: string, destination: any) {
    const ambulance = this.ambulances.get(ambulanceId);
    if (ambulance) {
      ambulance.status = 'responding';
      ambulance.destination = destination;
      return true;
    }
    return false;
  }
  
  private calculateDistance(loc1: any, loc2: any): number {
    // Simplified distance calculation
    const dx = loc1.lat - loc2.lat;
    const dy = loc1.lng - loc2.lng;
    return Math.sqrt(dx * dx + dy * dy) * 111; // Convert to km
  }
}

export const mockNHSResponses = {
  triageResponse: (patient: any) => ({
    priority: patient.symptoms.includes('chest pain') ? 'IMMEDIATE' : 'URGENT',
    triageCategory: patient.symptoms.includes('chest pain') ? 1 : 2,
    estimatedWaitMinutes: patient.symptoms.includes('chest pain') ? 0 : 30,
    assignedBay: `Bay ${Math.floor(Math.random() * 10) + 1}`,
    assignedClinician: `Dr. ${['Smith', 'Jones', 'Brown'][Math.floor(Math.random() * 3)]}`,
    recommendedTests: patient.symptoms.includes('chest pain') 
      ? ['ECG', 'Troponin', 'Chest X-ray'] 
      : ['Blood tests', 'Observations']
  }),
  
  ambulanceDispatch: (emergency: any) => ({
    ambulanceId: 'AMB-001',
    currentLocation: { lat: 51.5074, lng: -0.1278 },
    etaMinutes: emergency.category === 'category1' ? 7 : 15,
    crew: {
      paramedic: true,
      criticalCare: emergency.chiefComplaint.includes('cardiac')
    },
    destinationHospital: {
      id: 'RJ1',
      name: 'Guy\'s Hospital',
      hasCardiacUnit: true,
      etaFromScene: 12
    }
  }),
  
  waitTimesPrediction: (hospitalId: string) => ({
    currentWaitMinutes: 180,
    predictedWait30Min: 165,
    predictedWait60Min: 150,
    confidence: 0.92,
    factors: ['current_occupancy', 'staff_levels', 'time_of_day', 'day_of_week']
  })
};