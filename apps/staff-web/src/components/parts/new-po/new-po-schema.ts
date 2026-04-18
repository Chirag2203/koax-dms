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

/**
 * A line in the PO form. In single mode, `qty` is used. In split mode,
 * `qtyByOutlet` is used. Both optional at the schema level — the mode-aware
 * refine at the form level enforces exactly one is set.
 *
 * Spec reference: PLAN-PARTS-005 §6.4
 */
export const NewPoLineSchema = z.object({
  partCode: z.string().min(1, 'Part required'),
  qty: z.number().int().min(0).optional(),
  qtyByOutlet: z
    .object({
      'BLR-01': z.number().int().min(0),
      'MUM-01': z.number().int().min(0),
      'CHE-01': z.number().int().min(0),
    })
    .optional(),
  unitPrice: z
    .number({ invalid_type_error: 'Unit price required' })
    .min(0, 'Unit price ≥ 0'),
});

export type NewPoLineValues = z.infer<typeof NewPoLineSchema>;

export const NewPoFormSchema = z
  .object({
    mode: z.enum(['single', 'split']).default('single'),
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
  })
  // Mode-aware line validation
  .refine(
    (v) => {
      if (v.mode === 'single') {
        return v.lines.every((l) => (l.qty ?? 0) >= 1);
      }
      // Split mode: every line has some outlet with qty > 0
      return v.lines.every(
        (l) =>
          l.qtyByOutlet != null &&
          (l.qtyByOutlet['BLR-01'] > 0 ||
            l.qtyByOutlet['MUM-01'] > 0 ||
            l.qtyByOutlet['CHE-01'] > 0),
      );
    },
    {
      message:
        'Each line needs at least one unit (any outlet in split mode)',
      path: ['lines'],
    },
  );

export type NewPoFormValues = z.infer<typeof NewPoFormSchema>;

// ─── Defaults factory ────────────────────────────────────────────────────────

export function defaultsForNewPo(): NewPoFormValues {
  return {
    mode: 'single',
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

/**
 * Empty line factory. Mode-aware — in split mode, seeds `qtyByOutlet`; in
 * single mode, seeds `qty`.
 */
export function emptyLine(mode: 'single' | 'split'): NewPoLineValues {
  if (mode === 'split') {
    return {
      partCode: '',
      qtyByOutlet: { 'BLR-01': 0, 'MUM-01': 0, 'CHE-01': 0 },
      unitPrice: 0,
    };
  }
  return { partCode: '', qty: 1, unitPrice: 0 };
}
