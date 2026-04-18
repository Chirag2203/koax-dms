/**
 * Zod form schema for Edit Part Master.
 *
 * Omits partCode (immutable) and per-stock-row qty (movement-bound only —
 * spec §5.2). Stock rows retain outletId + reorderLevel + location (editable).
 *
 * Spec reference: PLAN-PARTS-005 §5
 */

import { z } from 'zod';

const HSN_RE = /^\d{4,8}$/;

export const EditPartStockRowSchema = z.object({
  // outletId is read-only from the original part — tight enum surfaces any
  // fixture-drift bugs early (rather than z.string() which would silently
  // accept typos).
  outletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
  qtyReadOnly: z.number().int(),  // read-only display only; ignored at submit
  reorderLevel: z
    .number({ invalid_type_error: 'Reorder level required' })
    .int()
    .min(0),
  location: z.string().optional().default(''),
});

export const EditPartFormSchema = z.object({
  // Identity (partCode is shown as read-only chip; not a field)
  name: z.string().min(2, 'Name required'),
  brand: z.string().min(2, 'Brand required'),
  category: z.enum(['MECHANICAL', 'ELECTRICAL', 'TRIM', 'CONSUMABLE']),
  criticality: z.enum(['ROUTINE', 'COMMON', 'CRITICAL', 'SAFETY']),

  // Commercial
  uom: z.string().min(1, 'UoM required'),
  hsnCode: z.string().regex(HSN_RE, 'HSN must be 4–8 digits'),
  mrp: z.number({ invalid_type_error: 'MRP required' }).min(0),
  avgCost: z.number({ invalid_type_error: 'Avg Cost required' }).min(0),
  lastPurchasePrice: z
    .number({ invalid_type_error: 'Last price required' })
    .min(0),

  // Stock — same shape as new-part but qty excluded from edit semantics
  stock: z.array(EditPartStockRowSchema),

  // Supply & misc
  supplierIds: z.array(z.string()).default([]),
  fitsVehicles: z.string().optional().default(''),
  warrantyPolicy: z.string().optional(),
  supersededBy: z.string().optional(),
});

export type EditPartFormValues = z.infer<typeof EditPartFormSchema>;
