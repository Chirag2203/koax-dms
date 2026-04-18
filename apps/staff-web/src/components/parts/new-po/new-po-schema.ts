/**
 * Zod form schema for the New Purchase Order form.
 *
 * Covers user-input fields only. The store (createPurchaseOrder) fills
 * id / poNo / createdAt / status / per-line id / subtotal / gst / total at
 * submit time via the helpers in `new-po-helpers.ts`.
 *
 * Spec reference: PLAN-PARTS-004 §4.1
 */

import { z } from 'zod';

export const NewPoLineSchema = z.object({
  partCode: z.string().min(1, 'Part required'),
  qty: z.number({ invalid_type_error: 'Qty required' }).int().min(1, 'Qty ≥ 1'),
  unitPrice: z
    .number({ invalid_type_error: 'Unit price required' })
    .min(0, 'Unit price ≥ 0'),
});

export type NewPoLineValues = z.infer<typeof NewPoLineSchema>;

export const NewPoFormSchema = z
  .object({
    supplierId: z.string().min(1, 'Supplier required'),
    outletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
    expectedDeliveryAt: z.string().min(1, 'Expected delivery required'),
    isImport: z.boolean(),
    fxRate: z
      .number({ invalid_type_error: 'FX rate must be a number' })
      .positive()
      .optional(),
    notes: z.string().optional(),
    linkedJobCardId: z.string().optional(),
    lines: z.array(NewPoLineSchema).min(1, 'At least one line required'),
  })
  .refine((v) => !v.isImport || (v.fxRate != null && v.fxRate > 0), {
    message: 'FX rate required for imports',
    path: ['fxRate'],
  });

export type NewPoFormValues = z.infer<typeof NewPoFormSchema>;

// ─── Defaults factory ────────────────────────────────────────────────────────

export function defaultsForNewPo(): NewPoFormValues {
  return {
    supplierId: '',
    outletId: 'BLR-01',
    expectedDeliveryAt: '',
    isImport: false,
    fxRate: undefined,
    notes: '',
    linkedJobCardId: undefined,
    lines: [{ partCode: '', qty: 1, unitPrice: 0 }],
  };
}
