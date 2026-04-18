/**
 * Zod form schema for the New Supplier dialog.
 *
 * Covers user-input only. `isImport` is derived from `currency !== 'INR'` at
 * submit time in helpers — not a form field.
 *
 * Spec reference: PLAN-PARTS-005 §3.2
 */

import { z } from 'zod';

// Standard Indian GSTIN format: state code (2 digits) + PAN (10) + entity (1)
// + Z + check digit (1). Pattern per CBIC.
export const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const NewSupplierFormSchema = z.object({
  name: z.string().min(2, 'Name required (min 2 chars)'),
  gstin: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === '' || GSTIN_RE.test(v.trim()),
      { message: 'Invalid GSTIN format' },
    ),
  address: z.string().min(4, 'Address required'),
  contact: z.string().min(4, 'Phone or email required'),
  paymentTerms: z.enum(['NET_30', 'NET_45', 'ADVANCE']),
  currency: z.enum(['INR', 'EUR', 'USD', 'GBP']),
  active: z.boolean(),
});

export type NewSupplierFormValues = z.infer<typeof NewSupplierFormSchema>;

export function defaultsForNewSupplier(): NewSupplierFormValues {
  return {
    name: '',
    gstin: '',
    address: '',
    contact: '',
    paymentTerms: 'NET_30',
    currency: 'INR',
    active: true,
  };
}
