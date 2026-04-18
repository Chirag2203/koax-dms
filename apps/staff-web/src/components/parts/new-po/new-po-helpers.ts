/**
 * Pure helpers for the New Purchase Order form.
 *
 * Form-specific logic: money computations, form→store mapping,
 * staff-outlet resolution, import-derivation.
 *
 * Spec reference: PLAN-PARTS-004 §8
 */

import type { Part, PurchaseOrder, Supplier } from '@dms/types';
import type { NewPoFormValues, NewPoLineValues } from './new-po-schema';

// ─── Money (matches P1 fixture builder `totals()` in purchase-orders.ts) ─────

const GST_RATE = 0.28; // HSN 8708 slab — v1 demo simplification (spec §8.2)

export function computeLineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

export function computePoTotals(
  lines: NewPoLineValues[],
): { subtotal: number; gst: number; total: number } {
  const subtotal = lines.reduce(
    (acc, l) => acc + computeLineTotal(l.qty || 0, l.unitPrice || 0),
    0,
  );
  const gst = Math.round(subtotal * GST_RATE);
  return { subtotal, gst, total: subtotal + gst };
}

// ─── Line ID generator — collision-safe under rapid submits ──────────────────

export function makeLineId(idx: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `line-${crypto.randomUUID().slice(0, 8)}-${idx}`;
  }
  const rand = Math.random().toString(36).slice(2, 7);
  return `line-${Date.now()}-${rand}-${idx}`;
}

// ─── Staff outlet mapping (spec §5, fix #01) ─────────────────────────────────
//
// Staff fixture stores outlet as lowercase city name; the parts domain uses
// `BLR-01` / `MUM-01` / `CHE-01` codes. Keep the conversion local so the rest
// of the form talks in domain codes.

const STAFF_OUTLET_TO_CODE: Record<string, 'BLR-01' | 'MUM-01' | 'CHE-01'> = {
  bangalore: 'BLR-01',
  mumbai: 'MUM-01',
  chennai: 'CHE-01',
};

export function staffOutletToOutletId(
  staffOutlet: string | undefined,
): 'BLR-01' | 'MUM-01' | 'CHE-01' {
  if (!staffOutlet) return 'BLR-01';
  return STAFF_OUTLET_TO_CODE[staffOutlet] ?? 'BLR-01';
}

// ─── Import derivation from supplier ─────────────────────────────────────────

export function deriveImportFromSupplier(
  supplier: Supplier | undefined,
): boolean {
  if (!supplier) return false;
  return supplier.currency !== 'INR';
}

// ─── Deep-link pre-fill resolution ────────────────────────────────────────────

export interface PrefillInputs {
  part?: Part;
  supplier?: Supplier;
  outletId?: 'BLR-01' | 'MUM-01' | 'CHE-01';
  linkedJobCardId?: string;
}

export function buildPrefillDefaults(
  base: NewPoFormValues,
  prefill: PrefillInputs,
): NewPoFormValues {
  const { part, supplier, outletId, linkedJobCardId } = prefill;
  const firstLine: NewPoLineValues = part
    ? {
        partCode: part.partCode,
        qty: 1,
        unitPrice: part.lastPurchasePrice,
      }
    : { partCode: '', qty: 1, unitPrice: 0 };

  return {
    ...base,
    supplierId: supplier?.id ?? base.supplierId,
    outletId: outletId ?? base.outletId,
    isImport: deriveImportFromSupplier(supplier),
    linkedJobCardId: linkedJobCardId ?? base.linkedJobCardId,
    lines: [firstLine],
  };
}

// ─── Form → store input mapping ──────────────────────────────────────────────
//
// `createPurchaseOrder` expects Omit<PurchaseOrder,'id'|'poNo'|'createdAt'|'status'>.
// Form values have user input only; this helper derives line IDs, line totals,
// subtotal/gst/total and plugs them into the store-shaped payload.

export function mapFormToCreateInput(
  values: NewPoFormValues,
  supplier: Supplier | undefined,
  createdByStaffId: string,
): Omit<PurchaseOrder, 'id' | 'poNo' | 'createdAt' | 'status'> {
  const totals = computePoTotals(values.lines);

  return {
    supplierId: values.supplierId,
    outletId: values.outletId,
    createdBy: createdByStaffId,
    lines: values.lines.map((l, idx) => ({
      id: makeLineId(idx),
      partCode: l.partCode,
      qty: l.qty,
      unitPrice: l.unitPrice,
      lineTotal: computeLineTotal(l.qty, l.unitPrice),
    })),
    subtotal: totals.subtotal,
    gst: totals.gst,
    total: totals.total,
    expectedDeliveryAt: values.expectedDeliveryAt,
    isImport: values.isImport,
    fxRate: values.isImport ? values.fxRate : undefined,
    notes: values.notes?.trim() ? values.notes.trim() : undefined,
    linkedJobCardId: values.linkedJobCardId,
  };
}

// ─── Duplicate-partCode detector (for soft warning chip) ─────────────────────

export function findFirstDuplicateIndex(
  lines: NewPoLineValues[],
  idx: number,
): number | null {
  const current = lines[idx]?.partCode;
  if (!current) return null;
  for (let i = 0; i < idx; i++) {
    if (lines[i]?.partCode === current) return i;
  }
  return null;
}
