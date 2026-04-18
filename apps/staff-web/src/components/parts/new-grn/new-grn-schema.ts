/**
 * Zod form schema for the New GRN form.
 *
 * Spec reference: PLAN-PARTS-004 §4.2
 */

import { z } from 'zod';

export const NewGrnLineSchema = z.object({
  partCode: z.string(),
  orderedQty: z.number().int().min(0),
  receivedQty: z
    .number({ invalid_type_error: 'Received qty required' })
    .int()
    .min(0, 'Received qty ≥ 0'),
  unitPrice: z
    .number({ invalid_type_error: 'Unit price required' })
    .min(0, 'Unit price ≥ 0'),
  condition: z.enum(['OK', 'DAMAGED', 'WRONG']),
  batchNo: z.string().optional(),
  serialNos: z.array(z.string()).optional(),
  /**
   * Form-only convenience field (NOT in spec §4.2 / domain schema). Users
   * type serials as free-text "a, b, c"; `parseSerialNos` in
   * `new-grn-helpers.ts` splits/trims/filters into `serialNos: string[]`
   * at submit time. This field never reaches the store payload.
   */
  serialNosRaw: z.string().optional(),
});

export type NewGrnLineValues = z.infer<typeof NewGrnLineSchema>;

export const NewGrnFormSchema = z
  .object({
    poId: z.string().min(1),
    receivedAt: z.string().min(1),
    notes: z.string().optional(),
    lines: z.array(NewGrnLineSchema).min(1),
  })
  .refine((v) => v.lines.some((l) => l.receivedQty > 0), {
    message: 'Receive at least one unit',
    path: ['lines'],
  });

export type NewGrnFormValues = z.infer<typeof NewGrnFormSchema>;
