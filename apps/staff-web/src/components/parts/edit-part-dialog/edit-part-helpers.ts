/**
 * Pure helpers for Edit Part Master flow.
 *
 * Spec reference: PLAN-PARTS-005 §5
 */

import type { Part } from '@dms/types';
import { parseFitsCsv } from '../new-part-dialog/new-part-helpers';
import type { EditPartFormValues } from './edit-part-schema';

/** Seed form values from an existing Part. */
export function mapPartToForm(part: Part): EditPartFormValues {
  return {
    name: part.name,
    brand: part.brand,
    category: part.category,
    criticality: part.criticality,
    uom: part.uom,
    hsnCode: part.hsnCode,
    mrp: part.mrp,
    avgCost: part.avgCost,
    lastPurchasePrice: part.lastPurchasePrice,
    stock: part.stock
      // Canonical 3 outlets only — any future stray outlet is preserved on
      // the underlying Part (diffPart guards qty) but not shown in Edit form.
      .filter(
        (s): s is typeof s & { outletId: 'BLR-01' | 'MUM-01' | 'CHE-01' } =>
          s.outletId === 'BLR-01' ||
          s.outletId === 'MUM-01' ||
          s.outletId === 'CHE-01',
      )
      .map((s) => ({
        outletId: s.outletId,
        qtyReadOnly: s.qty,
        reorderLevel: s.reorderLevel,
        location: s.location ?? '',
      })),
    supplierIds: part.supplierIds ?? [],
    fitsVehicles: (part.fitsVehicles ?? []).join(', '),
    warrantyPolicy: part.warrantyPolicy,
    supersededBy: part.supersededBy,
  };
}

/**
 * Build a minimal patch by diffing form values against the original Part.
 * Stock array is handled specially — we preserve each row's qty from the
 * original part (edit flow never touches qty — spec §5.2).
 */
export function diffPart(
  original: Part,
  values: EditPartFormValues,
): Partial<Part> {
  const patch: Partial<Part> = {};

  if (values.name.trim() !== original.name) patch.name = values.name.trim();
  if (values.brand.trim() !== original.brand) patch.brand = values.brand.trim();
  if (values.category !== original.category) patch.category = values.category;
  if (values.criticality !== original.criticality)
    patch.criticality = values.criticality;
  if (values.uom.trim() !== original.uom) patch.uom = values.uom.trim();
  if (values.hsnCode.trim() !== original.hsnCode)
    patch.hsnCode = values.hsnCode.trim();
  if (values.mrp !== original.mrp) patch.mrp = values.mrp;
  if (values.avgCost !== original.avgCost) patch.avgCost = values.avgCost;
  if (values.lastPurchasePrice !== original.lastPurchasePrice)
    patch.lastPurchasePrice = values.lastPurchasePrice;

  // Warranty / supersededBy — nullable
  const trimmedWarranty = values.warrantyPolicy?.trim();
  if ((trimmedWarranty || '') !== (original.warrantyPolicy ?? '')) {
    patch.warrantyPolicy = trimmedWarranty || undefined;
  }
  const trimmedSuper = values.supersededBy?.trim();
  if ((trimmedSuper || '') !== (original.supersededBy ?? '')) {
    patch.supersededBy = trimmedSuper || undefined;
  }

  // Supplier IDs — array equality
  const origSupIds = [...(original.supplierIds ?? [])].sort().join('|');
  const newSupIds = [...(values.supplierIds ?? [])].sort().join('|');
  if (origSupIds !== newSupIds) {
    patch.supplierIds = [...values.supplierIds];
  }

  // Fits vehicles — compare as ordered arrays
  const newFits = parseFitsCsv(values.fitsVehicles ?? '');
  const origFits = original.fitsVehicles ?? [];
  if (newFits.length !== origFits.length || newFits.some((f, i) => origFits[i] !== f)) {
    patch.fitsVehicles = newFits;
  }

  // Stock — rebuild the array if any row's reorderLevel OR location changed.
  // qty is preserved from the original row — never overwritten by the form.
  const stockChanged = values.stock.some((row, idx) => {
    const orig = original.stock[idx];
    if (!orig) return true;
    return (
      row.reorderLevel !== orig.reorderLevel ||
      (row.location ?? '').trim() !== (orig.location ?? '')
    );
  });
  if (stockChanged) {
    patch.stock = values.stock.map((row) => {
      const orig = original.stock.find((s) => s.outletId === row.outletId);
      return {
        outletId: row.outletId,
        qty: orig?.qty ?? 0, // preserve existing qty — invariant
        reorderLevel: row.reorderLevel,
        location: (row.location ?? '').trim(),
      };
    });
  }

  return patch;
}
