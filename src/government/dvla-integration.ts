import {
  DVLAVehicleAuth,
  AuthenticationRequest,
  PermanentRecord
} from '../shared/types/index.js';
import { Stage1ValidationService } from '../stage1/index.js';
import { Stage2StorageService } from '../stage2/index.js';

interface VehicleRecord {
  vrm: string; // Vehicle Registration Mark
  make: string;
  model: string;
  colour: string;
  engineSize: number;
  fuelType: string;
  registeredKeeper: {
    name: string;
    address: string;
    documentReference: string;
  };
  taxStatus: 'TAXED' | 'SORN' | 'UNTAXED';
  taxDueDate?: Date;
  motStatus: 'VALID' | 'EXPIRED' | 'NO_RESULTS';
  motExpiryDate?: Date;
  firstRegistration: Date;
  yearOfManufacture: number;
}

export class DVLAIntegration {
  constructor(
    private stage1: Stage1ValidationService,
    private stage2: Stage2StorageService
  ) {}

  /**
   * Authenticate vehicle ownership or tax status
   */
  async authenticateVehicle(
    auth: DVLAVehicleAuth
  ): Promise<{
    success: boolean;
    vehicleRecord?: VehicleRecord;
    permissions: string[];
    auditId?: string;
  }> {
    const request: AuthenticationRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        type: 'dvla_vehicle_auth',
        vrm: auth.vrm,
        v5cReference: auth.v5cReference,
        drivingLicenseNumber: auth.drivingLicenseNumber,
        purpose: auth.authPurpose
      },
      metadata: {
        origin: 'dvla.gov.uk',
        department: 'DVLA',
        purpose: `vehicle_${auth.authPurpose}`
      }
    };
    
    // Stage 1: Validate request
    const stage1Result = await this.stage1.processRequest(request, 'DVLA');
    
    if (!stage1Result.token) {
      return {
        success: false,
        permissions: []
      };
    }
    
    // Fetch vehicle record
    const vehicleRecord = await this.fetchVehicleRecord(auth.vrm);
    
    // Determine permissions based on purpose and validation
    const permissions = this.calculateVehiclePermissions(
      auth.authPurpose,
      stage1Result.validationResult,
      vehicleRecord
    );
    
    // Stage 2: Create audit record
    const stage2Result = await this.stage2.processRequest(
      stage1Result.token,
      {
        vrm: auth.vrm,
        purpose: auth.authPurpose,
        vehicleDetails: {
          make: vehicleRecord.make,
          model: vehicleRecord.model,
          taxStatus: vehicleRecord.taxStatus,
          motStatus: vehicleRecord.motStatus
        },
        accessTime: new Date().toISOString(),
        permissions
      }
    );
    
    return {
      success: true,
      vehicleRecord,
      permissions,
      auditId: stage2Result.record?.id
    };
  }

  /**
   * Process vehicle tax payment
   */
  async processTaxPayment(
    vrm: string,
    months: number,
    paymentReference: string
  ): Promise<{
    success: boolean;
    taxExpiryDate: Date;
    confirmationNumber: string;
  }> {
    const request: AuthenticationRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        type: 'vehicle_tax_payment',
        vrm,
        months,
        paymentReference,
        amount: this.calculateTaxAmount(vrm, months)
      },
      metadata: {
        origin: 'dvla.gov.uk',
        department: 'DVLA_TAX',
        purpose: 'tax_renewal'
      }
    };
    
    const stage1Result = await this.stage1.processRequest(request, 'DVLA');
    
    if (!stage1Result.token) {
      throw new Error('Tax payment validation failed');
    }
    
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);
    
    await this.stage2.processRequest(stage1Result.token, {
      taxPayment: {
        vrm,
        months,
        expiryDate: expiryDate.toISOString(),
        paymentReference
      }
    });
    
    return {
      success: true,
      taxExpiryDate: expiryDate,
      confirmationNumber: `TAX-${vrm}-${Date.now()}`
    };
  }

  /**
   * Vehicle ownership transfer
   */
  async transferOwnership(
    vrm: string,
    currentKeeperRef: string,
    newKeeperDetails: {
      name: string;
      address: string;
      drivingLicenseNumber: string;
    }
  ): Promise<{
    success: boolean;
    transferReference: string;
    auditTrail: string[];
  }> {
    // Validate current keeper
    const currentAuth = await this.authenticateVehicle({
      vrm,
      v5cReference: currentKeeperRef,
      authPurpose: 'transfer'
    });
    
    if (!currentAuth.success || !currentAuth.permissions.includes('transfer_ownership')) {
      throw new Error('Current keeper validation failed');
    }
    
    // Create transfer request
    const transferRequest: AuthenticationRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        type: 'ownership_transfer',
        vrm,
        currentKeeper: currentKeeperRef,
        newKeeper: newKeeperDetails,
        transferDate: new Date().toISOString()
      },
      metadata: {
        origin: 'dvla.gov.uk',
        department: 'DVLA_TRANSFER',
        purpose: 'ownership_transfer'
      }
    };
    
    const stage1Result = await this.stage1.processRequest(transferRequest, 'DVLA');
    
    if (!stage1Result.token) {
      throw new Error('Transfer validation failed');
    }
    
    const stage2Result = await this.stage2.processRequest(
      stage1Result.token,
      {
        transfer: {
          vrm,
          previousKeeper: currentKeeperRef,
          newKeeper: newKeeperDetails,
          timestamp: new Date().toISOString()
        }
      }
    );
    
    return {
      success: true,
      transferReference: `TRANS-${vrm}-${Date.now()}`,
      auditTrail: [
        currentAuth.auditId!,
        stage2Result.record!.id
      ]
    };
  }

  /**
   * Check MOT status
   */
  async checkMOTStatus(vrm: string): Promise<{
    status: 'VALID' | 'EXPIRED' | 'NO_RESULTS';
    expiryDate?: Date;
    advisories?: string[];
    testDate?: Date;
  }> {
    const request: AuthenticationRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        type: 'mot_check',
        vrm
      },
      metadata: {
        origin: 'dvla.gov.uk',
        department: 'DVLA_MOT',
        purpose: 'mot_status_check'
      }
    };
    
    const stage1Result = await this.stage1.processRequest(request, 'DVLA');
    
    if (!stage1Result.token) {
      return { status: 'NO_RESULTS' };
    }
    
    // Simulate MOT lookup
    const motData = await this.fetchMOTData(vrm);
    
    // Log the check
    await this.stage2.processRequest(stage1Result.token, {
      motCheck: {
        vrm,
        status: motData.status,
        checkTime: new Date().toISOString()
      }
    });
    
    return motData;
  }

  /**
   * Report vehicle as scrapped
   */
  async reportVehicleScrapped(
    vrm: string,
    v5cReference: string,
    scrapDate: Date,
    authorisedTreatmentFacility: string
  ): Promise<{
    success: boolean;
    certificateOfDestruction: string;
  }> {
    const request: AuthenticationRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      data: {
        type: 'vehicle_scrap',
        vrm,
        v5cReference,
        scrapDate: scrapDate.toISOString(),
        atf: authorisedTreatmentFacility
      },
      metadata: {
        origin: 'dvla.gov.uk',
        department: 'DVLA_SCRAP',
        purpose: 'end_of_life_vehicle'
      }
    };
    
    const stage1Result = await this.stage1.processRequest(request, 'DVLA');
    
    if (!stage1Result.token) {
      throw new Error('Scrap notification validation failed');
    }
    
    const stage2Result = await this.stage2.processRequest(
      stage1Result.token,
      {
        vehicleDestruction: {
          vrm,
          scrapDate: scrapDate.toISOString(),
          atf: authorisedTreatmentFacility,
          finalRecord: true
        }
      }
    );
    
    return {
      success: true,
      certificateOfDestruction: `COD-${vrm}-${stage2Result.record!.id}`
    };
  }

  private async fetchVehicleRecord(vrm: string): Promise<VehicleRecord> {
    // Simulate DVLA database lookup
    await new Promise(resolve => setTimeout(resolve, 25));
    
    return {
      vrm: vrm.toUpperCase(),
      make: 'FORD',
      model: 'FOCUS',
      colour: 'BLUE',
      engineSize: 1600,
      fuelType: 'PETROL',
      registeredKeeper: {
        name: 'MR JOHN SMITH',
        address: '123 HIGH STREET, LONDON, SW1A 1AA',
        documentReference: 'V5C123456789'
      },
      taxStatus: 'TAXED',
      taxDueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      motStatus: 'VALID',
      motExpiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      firstRegistration: new Date('2020-03-15'),
      yearOfManufacture: 2020
    };
  }

  private calculateVehiclePermissions(
    purpose: string,
    validation: any,
    vehicle: VehicleRecord
  ): string[] {
    const permissions: string[] = ['view_details'];
    
    if (validation.score > 0.9) {
      switch (purpose) {
        case 'ownership':
          permissions.push('view_keeper_details', 'request_v5c');
          break;
        case 'tax':
          permissions.push('renew_tax', 'declare_sorn');
          break;
        case 'transfer':
          permissions.push('transfer_ownership', 'notify_sale');
          break;
        case 'scrap':
          permissions.push('declare_scrapped', 'generate_cod');
          break;
      }
    }
    
    return permissions;
  }

  private calculateTaxAmount(vrm: string, months: number): number {
    // Simplified tax calculation
    const monthlyRate = 15; // £15 per month for standard vehicle
    return monthlyRate * months;
  }

  private async fetchMOTData(vrm: string): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 20));
    
    return {
      status: 'VALID',
      expiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
      testDate: new Date(Date.now() - 165 * 24 * 60 * 60 * 1000),
      advisories: [
        'Tyre worn close to legal limit',
        'Brake disc worn'
      ]
    };
  }

  getMetrics(): {
    averageResponseTime: number;
    dailyChecks: number;
    taxRenewals: number;
    ownershipTransfers: number;
  } {
    return {
      averageResponseTime: 298, // ms
      dailyChecks: 0,
      taxRenewals: 0,
      ownershipTransfers: 0
    };
  }
}