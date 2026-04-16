import { z } from 'zod';

const CURRENT_YEAR = new Date().getFullYear();

// ─── Step 1 schema ────────────────────────────────────────────────────────────

export const step1Schema = z
  .object({
    acquisitionSource: z.enum(['TRADE_IN', 'AUCTION', 'DIRECT_PURCHASE', 'CONSIGNMENT'], {
      required_error: 'Acquisition source is required',
      invalid_type_error: 'Select a valid source',
    }),
    sourceReference: z.string().optional(),
    acquisitionDate: z
      .string()
      .min(1, 'Acquisition date is required')
      .refine(
        (d) => !d || new Date(d) <= new Date(),
        'Acquisition date cannot be in the future',
      ),
    acquisitionCost: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .gt(0, 'Acquisition cost must be greater than 0'),
    outlet: z.enum(['BLR', 'MUM', 'CHE'], {
      required_error: 'Outlet is required',
      invalid_type_error: 'Select a valid outlet',
    }),
  })
  .superRefine((data, ctx) => {
    const needsRef = data.acquisitionSource === 'TRADE_IN' || data.acquisitionSource === 'CONSIGNMENT';
    if (needsRef && (!data.sourceReference || data.sourceReference.trim() === '')) {
      ctx.addIssue({
        path: ['sourceReference'],
        code: z.ZodIssueCode.custom,
        message: 'Source reference is required for Trade-in and Consignment',
      });
    }
  });

// ─── Step 2 schema ────────────────────────────────────────────────────────────

export const step2Schema = z.object({
  vin: z
    .string()
    .min(17, 'VIN must be exactly 17 characters')
    .max(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN contains invalid characters'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().min(1, 'Variant is required'),
  year: z
    .number({ invalid_type_error: 'Enter a valid year' })
    .int()
    .min(1990, 'Year must be 1990 or later')
    .max(CURRENT_YEAR, `Year cannot exceed ${CURRENT_YEAR}`),
  color: z.string().min(1, 'Color is required'),
  fuel: z.enum(['Petrol', 'Diesel', 'Hybrid', 'EV'], {
    required_error: 'Fuel type is required',
    invalid_type_error: 'Select a valid fuel type',
  }),
  transmission: z.enum(['Manual', 'Automatic', 'CVT', 'DCT'], {
    required_error: 'Transmission is required',
    invalid_type_error: 'Select a valid transmission',
  }),
  odometer: z
    .number({ invalid_type_error: 'Enter a valid odometer reading' })
    .min(0, 'Odometer cannot be negative')
    .max(500000, 'Odometer cannot exceed 500,000 km'),
  registrationCity: z.string().min(1, 'Registration city is required'),
});

// ─── Step 3 schema ────────────────────────────────────────────────────────────

export const step3Schema = z.object({
  previousOwners: z.number().int().min(1).max(10).optional().or(z.nan().transform(() => undefined)),
  accidentHistory: z.enum(['None', 'Minor', 'Major']).optional(),
  serviceHistoryAvailable: z.boolean().optional(),
  conditionNotes: z.string().max(2000, 'Notes cannot exceed 2,000 characters').optional(),
});

// ─── Step 4 schema ────────────────────────────────────────────────────────────

export const step4Schema = z
  .object({
    acquisitionCost: z.number().gt(0).optional().default(0),
    targetPrice: z
      .number({ invalid_type_error: 'Enter a valid price' })
      .gt(0, 'Target price must be greater than 0'),
    minimumPrice: z
      .number({ invalid_type_error: 'Enter a valid price' })
      .gt(0, 'Minimum price must be greater than 0'),
    expectedRefurbBudget: z
      .number()
      .min(0, 'Budget cannot be negative')
      .optional()
      .or(z.nan().transform(() => undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.targetPrice > 0 && data.acquisitionCost && data.acquisitionCost > 0) {
      if (data.targetPrice <= data.acquisitionCost) {
        ctx.addIssue({
          path: ['targetPrice'],
          code: z.ZodIssueCode.custom,
          message: 'Target price must be greater than the acquisition cost',
        });
      }
    }
    if (data.minimumPrice > 0 && data.targetPrice > 0) {
      if (data.minimumPrice < data.targetPrice * 0.9) {
        ctx.addIssue({
          path: ['minimumPrice'],
          code: z.ZodIssueCode.custom,
          message: 'Minimum price must be at least 90% of the target price',
        });
      }
    }
  });

// ─── Field sets per step ──────────────────────────────────────────────────────

export type Step1Keys = 'acquisitionSource' | 'sourceReference' | 'acquisitionDate' | 'acquisitionCost' | 'outlet';
export type Step2Keys = 'vin' | 'make' | 'model' | 'variant' | 'year' | 'color' | 'fuel' | 'transmission' | 'odometer' | 'registrationCity';
export type Step3Keys = 'previousOwners' | 'accidentHistory' | 'serviceHistoryAvailable' | 'conditionNotes';
export type Step4Keys = 'targetPrice' | 'minimumPrice' | 'expectedRefurbBudget';

export const STEP_FIELDS: Record<number, string[]> = {
  0: ['acquisitionSource', 'sourceReference', 'acquisitionDate', 'acquisitionCost', 'outlet'],
  1: ['vin', 'make', 'model', 'variant', 'year', 'color', 'fuel', 'transmission', 'odometer', 'registrationCity'],
  2: ['previousOwners', 'accidentHistory', 'serviceHistoryAvailable', 'conditionNotes'],
  3: ['targetPrice', 'minimumPrice', 'expectedRefurbBudget'],
};
