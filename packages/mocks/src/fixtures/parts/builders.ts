/**
 * Parts fixture builders — pure helpers.
 *
 * Deterministic ID + sequence generators used by the sibling fixture files.
 * No side effects, no randomness — every call with the same input returns
 * the same output so fixtures stay stable across reloads.
 *
 * Spec reference: SPEC-PARTS-001 §8 (fixture seed plan)
 */

import type {
  PartStock,
  PurchaseOrderLine,
  GrnLine,
} from '@dms/types';

// ─── Sequence formatters ──────────────────────────────────────────────────────

/** `1` → `'PO-2026-00001'` */
export function poNoFor(seq: number): string {
  return `PO-2026-${String(seq).padStart(5, '0')}`;
}

/** `1` → `'GRN-2026-00001'` */
export function grnNoFor(seq: number): string {
  return `GRN-2026-${String(seq).padStart(5, '0')}`;
}

/** `1` → `'mov-00001'` */
export function movIdFor(seq: number): string {
  return `mov-${String(seq).padStart(5, '0')}`;
}

/** `1` → `'sup-001'` */
export function supplierIdFor(seq: number): string {
  return `sup-${String(seq).padStart(3, '0')}`;
}

/** `1` → `'po-001'` */
export function poIdFor(seq: number): string {
  return `po-${String(seq).padStart(3, '0')}`;
}

/** `1` → `'grn-001'` */
export function grnIdFor(seq: number): string {
  return `grn-${String(seq).padStart(3, '0')}`;
}

// ─── Stock row builder ────────────────────────────────────────────────────────

/**
 * Build one per-outlet stock row. Defaults chosen for realistic workshop
 * inventory — reorder level typically 20–30% of usual holding qty.
 */
export function makePartStock(
  outletId: string,
  qty: number,
  reorderLevel: number,
  location: string,
): PartStock {
  return { outletId, qty, reorderLevel, location };
}

// ─── PO / GRN line builders ───────────────────────────────────────────────────

/**
 * Build a single PO line with derived lineTotal.
 * Line numbering is scoped to its parent PO (e.g. `po-001-L1`).
 */
export function buildPoLine(
  poId: string,
  lineNo: number,
  partCode: string,
  qty: number,
  unitPrice: number,
): PurchaseOrderLine {
  return {
    id: `${poId}-L${lineNo}`,
    partCode,
    qty,
    unitPrice,
    lineTotal: qty * unitPrice,
  };
}

/**
 * Build a single GRN line. `receivedQty` defaults to `orderedQty` unless
 * a short-receive / damage scenario is being seeded.
 */
export function buildGrnLine(
  grnId: string,
  lineNo: number,
  partCode: string,
  orderedQty: number,
  receivedQty: number,
  unitPrice: number,
  condition: GrnLine['condition'] = 'OK',
): GrnLine {
  return {
    id: `${grnId}-L${lineNo}`,
    partCode,
    orderedQty,
    receivedQty,
    unitPrice,
    condition,
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Today, as of the demo clock (2026-04-17T10:00:00+05:30).
 * Keeping the demo clock fixed avoids drifting fixture dates on every build.
 */
export const DEMO_NOW = '2026-04-17T10:00:00.000Z';

/** Subtract `days` from the demo clock; return ISO string. */
export function daysAgo(days: number): string {
  const d = new Date(DEMO_NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** Add `days` to the demo clock; return ISO string. */
export function daysFromNow(days: number): string {
  const d = new Date(DEMO_NOW);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// ─── Outlet IDs (aligned with service fixture convention) ────────────────────

export const OUTLET_BLR = 'BLR-01';
export const OUTLET_MUM = 'MUM-01';
export const OUTLET_CHE = 'CHE-01';

// ─── Staff IDs referenced across fixtures ────────────────────────────────────
//
// All six IDs resolve to records in packages/mocks/src/fixtures/staff.ts
// (R13 Harish Naidu and R03 Neha Kapoor were added alongside this module).

export const STAFF_R13_COUNTER = 'staff-r13-001';     // Harish Naidu — Parts Counter
export const STAFF_R12_PARTS = 'staff-r12-001';       // Vikram Singh — Parts Manager
export const STAFF_R03_OUTLET = 'staff-r03-001';      // Neha Kapoor — Outlet Manager
export const STAFF_R19_GM = 'staff-r19-001';          // General Manager
export const STAFF_R24_CEO = 'staff-r24-001';         // Meera Iyer — CEO
export const STAFF_R09_ADVISOR_BLR = 'staff-r09-001'; // Priya Sharma
