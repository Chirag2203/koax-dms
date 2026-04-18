/**
 * Pure helpers for New Supplier flow.
 *
 * Spec reference: PLAN-PARTS-005 §3.2
 */

import type { Supplier } from '@dms/types';
import type { NewSupplierFormValues } from './new-supplier-schema';

export function deriveImportFromCurrency(
  currency: NewSupplierFormValues['currency'],
): boolean {
  return currency !== 'INR';
}

/**
 * Map form values to `createSupplier` input shape.
 * `createSupplier` expects `Omit<Supplier, 'id'>` — the store assigns the id.
 */
export function mapFormToCreateInput(
  values: NewSupplierFormValues,
): Omit<Supplier, 'id'> {
  return {
    name: values.name.trim(),
    gstin: values.gstin?.trim() ? values.gstin.trim() : undefined,
    address: values.address.trim(),
    contact: values.contact.trim(),
    paymentTerms: values.paymentTerms,
    currency: values.currency,
    active: values.active,
    isImport: deriveImportFromCurrency(values.currency),
  };
}
