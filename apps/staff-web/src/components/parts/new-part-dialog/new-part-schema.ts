/**
 * Zod form schema for the New Part SlideInPanel.
 *
 * Spec reference: PLAN-PARTS-005 §4
 */

import { z } from 'zod';

const PART_CODE_RE = /^[A-Z0-9-]+$/;
const HSN_RE = /^\d{4,8}$/;

export const NewPartStockRowSchema = z.object({
  outletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
  qty: z.number({ invalid_type_error: 'Qty required' }).int().min(0),
  reorderLevel: z
    .number({ invalid_type_error: 'Reorder level required' })
    .int()
    .min(0),
  location: z.string().optional().default(''),
});

export const NewPartFormSchema = z.object({
  // Identity
  partCode: z
    .string()
    .min(3, 'Part code required')
    .regex(PART_CODE_RE, 'Uppercase letters, digits, and dashes only'),
  name: z.string().min(2, 'Name required'),
  brand: z.string().min(2, 'Brand required'),
  category: z.enum(['MECHANICAL', 'ELECTRICAL', 'TRIM', 'CONSUMABLE']),
  criticality: z.enum(['ROUTINE', 'COMMON', 'CRITICAL', 'SAFETY']),

  // Commercial
  uom: z.string().min(1, 'UoM required').default('EA'),
  hsnCode: z.string().regex(HSN_RE, 'HSN must be 4–8 digits'),
  mrp: z.number({ invalid_type_error: 'MRP required' }).min(0),
  avgCost: z.number({ invalid_type_error: 'Avg Cost required' }).min(0),
  lastPurchasePrice: z
    .number({ invalid_type_error: 'Last price required' })
    .min(0),

  // Stock (exactly 3 rows in fixed order; the form seeds them)
  stock: z.array(NewPartStockRowSchema).length(3),

  // Supply & misc
  supplierIds: z.array(z.string()).default([]),
  fitsVehicles: z
    .string()
    .optional()
    .default(''), // comma-separated free text — parsed to string[] at submit
  warrantyPolicy: z.string().optional(),
  supersededBy: z.string().optional(),
});

export type NewPartFormValues = z.infer<typeof NewPartFormSchema>;

export function defaultsForNewPart(): NewPartFormValues {
  return {
    partCode: '',
    name: '',
    brand: '',
    category: 'MECHANICAL',
    criticality: 'ROUTINE',
    uom: 'EA',
    hsnCode: '8708',
    mrp: 0,
    avgCost: 0,
    lastPurchasePrice: 0,
    stock: [
      { outletId: 'BLR-01', qty: 0, reorderLevel: 0, location: '' },
      { outletId: 'MUM-01', qty: 0, reorderLevel: 0, location: '' },
      { outletId: 'CHE-01', qty: 0, reorderLevel: 0, location: '' },
    ],
    supplierIds: [],
    fitsVehicles: '',
    warrantyPolicy: undefined,
    supersededBy: undefined,
  };
}
