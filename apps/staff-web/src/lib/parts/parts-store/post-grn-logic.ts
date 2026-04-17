/**
 * Pure helpers for the `postGrn` flow.
 *
 * These functions have NO Zustand / immer imports — they take plain data in
 * and return plain data out. Unit tests can exercise them without booting
 * the store.
 *
 * Covers SPEC-PARTS-001 §5.2 posting steps:
 *   1. Build IN StockMovement per line
 *   2. Increment part.stock[outlet].qty per line
 *   3. Recompute part.avgCost via weighted-average (Doc 05 §6.3)
 *   4. Update part.lastPurchasePrice to latest line's unitPrice
 *   6. If GRN fills all PO lines → PO to RECEIVED else PARTIALLY_RECEIVED
 *
 * Step 5 (auto-reserve Service PartsLines) is wired in P6 — see grn-slice.ts.
 */

import type { Part, PurchaseOrder, Grn } from '@dms/types';

// ─── Weighted-average avgCost ────────────────────────────────────────────────

/**
 * Combined on-hand qty across all outlets for a part.
 */
export function totalOnHand(part: Part): number {
  return part.stock.reduce((acc, s) => acc + s.qty, 0);
}

/**
 * Weighted-average new avgCost after receiving `receivedQty` units at `unitPrice`.
 *
 * Formula (per Doc 05 §6.3):
 *   newAvg = (priorQty * priorAvg + receivedQty * unitPrice) / (priorQty + receivedQty)
 *
 * Edge case: priorQty + receivedQty === 0 → keep priorAvg (defensive; shouldn't
 * happen because we only call this for receivedQty > 0).
 */
export function recomputeAvgCost(
  priorQty: number,
  priorAvg: number,
  receivedQty: number,
  unitPrice: number,
): number {
  const denom = priorQty + receivedQty;
  if (denom === 0) return priorAvg;
  const numer = priorQty * priorAvg + receivedQty * unitPrice;
  return Math.round(numer / denom);
}

// ─── PO auto-transition ──────────────────────────────────────────────────────

/**
 * Returns true if every PO line is fully received when you sum received
 * quantities from all GRNs (POSTED or otherwise) that reference this PO.
 *
 * Only OK-condition GRN lines count — damaged/wrong stock never entered
 * inventory (spec §5.2 step 1 filters OK before creating movements, and
 * this function mirrors that filter so PO status never drifts from stock).
 *
 * Empty-lines guard: a PO with zero lines is NOT treated as received,
 * otherwise vacuous truth of `every` auto-flips garbage POs to RECEIVED.
 *
 * Used to decide PARTIALLY_RECEIVED vs RECEIVED after a post.
 */
export function allLinesFullyReceived(
  po: PurchaseOrder,
  allGrns: Grn[],
): boolean {
  if (po.lines.length === 0) return false;
  const linkedGrns = allGrns.filter((g) => g.poId === po.id);
  return po.lines.every((poLine) => {
    const totalReceived = linkedGrns.reduce((acc, g) => {
      const matchingLines = g.lines.filter(
        (l) => l.partCode === poLine.partCode && l.condition === 'OK',
      );
      return acc + matchingLines.reduce((a, l) => a + l.receivedQty, 0);
    }, 0);
    return totalReceived >= poLine.qty;
  });
}

/**
 * Returns true if the PO has at least one usable receipt.
 * Mirrors the OK-condition filter in allLinesFullyReceived so both
 * auto-transition branches agree on what "received" means.
 */
export function hasAnyReceipt(po: PurchaseOrder, allGrns: Grn[]): boolean {
  const linkedGrns = allGrns.filter((g) => g.poId === po.id);
  return linkedGrns.some((g) =>
    g.lines.some((l) => l.receivedQty > 0 && l.condition === 'OK'),
  );
}
