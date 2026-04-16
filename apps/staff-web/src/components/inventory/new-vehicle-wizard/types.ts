// ─── Wizard form value types ──────────────────────────────────────────────────

export type AcquisitionSource = 'TRADE_IN' | 'AUCTION' | 'DIRECT_PURCHASE' | 'CONSIGNMENT';
export type OutletCode = 'BLR' | 'MUM' | 'CHE';
export type FuelType = 'Petrol' | 'Diesel' | 'Hybrid' | 'EV';
export type TransmissionType = 'Manual' | 'Automatic' | 'CVT' | 'DCT';
export type AccidentHistory = 'None' | 'Minor' | 'Major';

export interface WizardFormValues {
  // Step 1 — Acquisition
  acquisitionSource: AcquisitionSource | '';
  sourceReference: string;
  acquisitionDate: string;
  acquisitionCost: number;
  outlet: OutletCode | '';

  // Step 2 — Vehicle specs
  vin: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  color: string;
  fuel: FuelType | '';
  transmission: TransmissionType | '';
  odometer: number;
  registrationCity: string;

  // Step 3 — Condition & history (all optional)
  previousOwners?: number;
  accidentHistory?: AccidentHistory;
  serviceHistoryAvailable?: boolean;
  conditionNotes?: string;

  // Step 4 — Pricing
  targetPrice: number;
  minimumPrice: number;
  expectedRefurbBudget?: number;
}

export const WIZARD_DEFAULTS: WizardFormValues = {
  acquisitionSource: '',
  sourceReference: '',
  acquisitionDate: '',
  acquisitionCost: 0,
  outlet: '',
  vin: '',
  make: '',
  model: '',
  variant: '',
  year: 0,
  color: '',
  fuel: '',
  transmission: '',
  odometer: 0,
  registrationCity: '',
  previousOwners: undefined,
  accidentHistory: undefined,
  serviceHistoryAvailable: false,
  conditionNotes: '',
  targetPrice: 0,
  minimumPrice: 0,
  expectedRefurbBudget: undefined,
};

export const DRAFT_STORAGE_KEY = 'bn-staff-inventory-new-draft';
