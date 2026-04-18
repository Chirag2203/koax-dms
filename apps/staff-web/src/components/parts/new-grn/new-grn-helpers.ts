/**
 * Pure helpers for the New GRN form.
 *
 * Spec reference: PLAN-PARTS-004 §8.4, §8.5
 */

import type { Grn, PurchaseOrder } from '@dms/types';
import type { NewGrnFormValues, NewGrnLineValues } from './new-grn-schema';

// ─── Line ID generator (same strategy as PO form) ────────────────────────────

export function makeGrnLineId(idx: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `gline-${crypto.randomUUID().slice(0, 8)}-${idx}`;
  }
  const rand = Math.random().toString(36).slice(2, 7);
  return `gline-${Date.now()}-${rand}-${idx}`;
}

// ─── Seed form from PO ──────────────────────────────────────────────────────

export function seedLinesFromPo(po: PurchaseOrder): NewGrnLineValues[] {
  return po.lines.map((l) => ({
    partCode: l.partCode,
    orderedQty: l.qty,
    receivedQty: l.qty, // assume full receipt; user edits down for shortfalls
    unitPrice: l.unitPrice,
    condition: 'OK' as const,
    batchNo: undefined,
    serialNos: undefined,
    serialNosRaw: '',
  }));
}

export function defaultsForNewGrn(po: PurchaseOrder): NewGrnFormValues {
  return {
    poId: po.id,
    receivedAt: new Date().toISOString().slice(0, 16),
    notes: '',
    lines: seedLinesFromPo(po),
  };
}

// ─── PO eligibility for GRN (soft warning) ──────────────────────────────────

export function validateGrnEligibility(
  po: PurchaseOrder,
): { ok: boolean; warning?: string } {
  if (po.status === 'DISPATCHED' || po.status === 'PARTIALLY_RECEIVED') {
    return { ok: true };
  }
  return {
    ok: false,
    warning:
      'This PO is not yet dispatched — proceed only if stock has physically arrived.',
  };
}

// ─── Form → store input mapping ─────────────────────────────────────────────
//
// createGrn expects Omit<Grn,'id'|'grnNo'|'receivedAt'|'status'>.
// The store also overwrites receivedAt with now() — so for the form's chosen
// timestamp to stick, we patch afterwards via updateGrn (spec §17 decision 5).

export function mapFormToCreateInput(
  values: NewGrnFormValues,
  po: PurchaseOrder,
  receivedByStaffId: string,
): Omit<Grn, 'id' | 'grnNo' | 'receivedAt' | 'status'> {
  return {
    poId: values.poId,
    supplierId: po.supplierId,
    outletId: po.outletId,
    receivedBy: receivedByStaffId,
    lines: values.lines.map((l, idx) => ({
      id: makeGrnLineId(idx),
      partCode: l.partCode,
      orderedQty: l.orderedQty,
      receivedQty: l.receivedQty,
      unitPrice: l.unitPrice,
      condition: l.condition,
      batchNo: l.batchNo?.trim() ? l.batchNo.trim() : undefined,
      serialNos: parseSerialNos(l.serialNosRaw),
    })),
  };
}

// ─── Serial-nos parsing ─────────────────────────────────────────────────────

export function parseSerialNos(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const arr = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return arr.length > 0 ? arr : undefined;
}

// ─── Summary aggregates ─────────────────────────────────────────────────────

export function computeGrnSummary(lines: NewGrnLineValues[]): {
  lineCount: number;
  orderedTotal: number;
  receivedTotal: number;
  receiptsCount: number;
  overReceiptsCount: number;
} {
  const lineCount = lines.length;
  let orderedTotal = 0;
  let receivedTotal = 0;
  let receiptsCount = 0;
  let overReceiptsCount = 0;
  for (const l of lines) {
    orderedTotal += l.orderedQty;
    receivedTotal += l.receivedQty;
    if (l.receivedQty > 0) receiptsCount += 1;
    if (l.receivedQty > l.orderedQty) overReceiptsCount += 1;
  }
  return {
    lineCount,
    orderedTotal,
    receivedTotal,
    receiptsCount,
    overReceiptsCount,
  };
}
