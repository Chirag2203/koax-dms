/**
 * Pure helpers for New Part flow.
 *
 * Spec reference: PLAN-PARTS-005 §4
 */

import type { Part } from '@dms/types';
import type { NewPartFormValues } from './new-part-schema';

/** "BMW G20 320d, BMW G20 330i, BMW G28" → `['BMW G20 320d', 'BMW G20 330i', 'BMW G28']` */
export function parseFitsCsv(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Build the `Part` payload for `createPart(input, actor)`. Store fills nothing;
 * form supplies everything.
 */
export function mapFormToCreateInput(values: NewPartFormValues): Part {
  return {
    partCode: values.partCode.trim(),
    name: values.name.trim(),
    brand: values.brand.trim(),
    fitsVehicles: parseFitsCsv(values.fitsVehicles ?? ''),
    category: values.category,
    criticality: values.criticality,
    uom: values.uom.trim() || 'EA',
    hsnCode: values.hsnCode.trim(),
    mrp: values.mrp,
    avgCost: values.avgCost,
    lastPurchasePrice: values.lastPurchasePrice,
    warrantyPolicy: values.warrantyPolicy?.trim()
      ? values.warrantyPolicy.trim()
      : undefined,
    supersededBy: values.supersededBy?.trim()
      ? values.supersededBy.trim()
      : undefined,
    stock: values.stock.map((s) => ({
      outletId: s.outletId,
      qty: s.qty,
      reorderLevel: s.reorderLevel,
      location: (s.location ?? '').trim(),
    })),
    supplierIds: values.supplierIds,
  };
}

/** Short list of brand options for the <select>. Free-text bypass at submit. */
export const BRAND_OPTIONS = [
  'BMW',
  'Audi',
  'Mercedes-Benz',
  'Porsche',
  'Universal',
] as const;
