/**
 * GRN slice — create / update / state transitions / postGrn side-effect chain.
 *
 * `postGrn` is the heaviest single action in the module. It:
 *   1. Validates the transition to POSTED via canTransitionGrn.
 *   2. Writes an IN StockMovement per OK-condition line with receivedQty > 0.
 *   3. Increments part.stock[outlet].qty per line.
 *   4. Recomputes part.avgCost via weighted-average across all outlets.
 *   5. Sets part.lastPurchasePrice to the latest GRN line's unitPrice.
 *   6. Sets grn.postedAt + grn.status = POSTED.
 *   7. Auto-transitions linked PO: PARTIALLY_RECEIVED or RECEIVED.
 *
 * Step (5 in spec §5.2) — auto-reserve Service PartsLines on POST — is
 * deferred to P6 per spec §9 rollout. A TODO hook marks the integration seam.
 *
 * Spec reference: SPEC-PARTS-001 §5.2, §11.2
 */

import type { Grn } from '@dms/types';
import type { PartsSlice, GrnActions } from '../types';
import { makeId, nextGrnNo, now } from '../id-helpers';
import { canTransitionGrn } from '../../state-machine';
import {
  recomputeAvgCost,
  totalOnHand,
  allLinesFullyReceived,
  hasAnyReceipt,
} from '../post-grn-logic';

export const createGrnSlice: PartsSlice<GrnActions> = (set) => ({
  createGrn(input, _actor) {
    let created!: Grn;
    set((state) => {
      const grn: Grn = {
        ...input,
        id: makeId('grn'),
        grnNo: nextGrnNo(state.grns),
        status: 'DRAFT',
        receivedAt: now(),
      };
      state.grns.push(grn);
      created = grn;
    });
    return created;
  },

  updateGrn(id, patch, _actor) {
    set((state) => {
      const grn = state.grns.find((g) => g.id === id);
      if (!grn) return;
      const {
        id: _ignoredId,
        grnNo: _ignoredNo,
        status: _ignoredStatus,
        ...safe
      } = patch;
      Object.assign(grn, safe);
    });
  },

  transitionGrn(id, next, opts) {
    // Guard lives inside set() so concurrent calls re-read fresh state.
    // Issue #11 from review.
    let applied = false;
    set((state) => {
      const target = state.grns.find((g) => g.id === id);
      if (!target) return;
      if (!canTransitionGrn(target.status, next)) return;

      const nowIso = now();
      target.status = next;

      if (next === 'MATCHED') {
        target.qcBy = opts.actor.id;
        target.qcAt = nowIso;
        target.threeWayMatchStatus = 'MATCHED';
      }
      if (next === 'REJECTED') {
        target.rejectedReason = opts.reason ?? '';
      }
      applied = true;
    });

    return applied;
  },

  postGrn(grnId, actor) {
    let applied = false;
    set((state) => {
      const target = state.grns.find((g) => g.id === grnId);
      if (!target) return;
      if (!canTransitionGrn(target.status, 'POSTED')) return;
      const nowIso = now();

      // Step (0) Pre-aggregate postable quantity per partCode. A single GRN can
      // legally carry multiple lines for the same part (split batches /
      // serials). Accumulating up-front avoids a weighted-average-on-mutated-
      // avgCost bug when iterating line-by-line. Issue #01 from P1 review.
      interface Agg {
        qty: number;
        amount: number; // qty * unitPrice accumulator
        lastUnitPrice: number; // last OK line's unitPrice — for lastPurchasePrice
      }
      const aggByPart = new Map<string, Agg>();
      for (const line of target.lines) {
        if (line.condition !== 'OK') continue;
        if (line.receivedQty <= 0) continue;
        const prev = aggByPart.get(line.partCode);
        if (prev) {
          prev.qty += line.receivedQty;
          prev.amount += line.receivedQty * line.unitPrice;
          prev.lastUnitPrice = line.unitPrice;
        } else {
          aggByPart.set(line.partCode, {
            qty: line.receivedQty,
            amount: line.receivedQty * line.unitPrice,
            lastUnitPrice: line.unitPrice,
          });
        }
      }

      // Step (1)–(4) Apply per-part aggregates: stock increment, weighted-avg
      // cost recompute, lastPurchasePrice update.
      for (const [partCode, agg] of aggByPart) {
        const part = state.parts.find((p) => p.partCode === partCode);
        if (!part) continue;

        // Stock increment at the GRN outlet (create row if missing)
        const stockRow = part.stock.find((s) => s.outletId === target.outletId);
        if (stockRow) {
          stockRow.qty += agg.qty;
        } else {
          part.stock.push({
            outletId: target.outletId,
            qty: agg.qty,
            reorderLevel: 0,
            location: 'UNALLOCATED',
          });
        }

        // Weighted-average avgCost: prior state is pre-increment total across
        // all outlets. effectiveUnitPrice = agg.amount / agg.qty (blended
        // across this GRN's lines for that part).
        const postIncrementTotal = totalOnHand(part);
        const priorTotal = postIncrementTotal - agg.qty;
        const effectiveUnitPrice = agg.amount / agg.qty;
        part.avgCost = recomputeAvgCost(
          priorTotal,
          part.avgCost,
          agg.qty,
          effectiveUnitPrice,
        );

        // lastPurchasePrice tracks the last OK line seen (line-order semantics)
        part.lastPurchasePrice = agg.lastUnitPrice;
      }

      // Step (5) Append one IN StockMovement per OK GRN line (preserves the
      // per-line audit trail required by the movement history view).
      for (const line of target.lines) {
        if (line.condition !== 'OK') continue;
        if (line.receivedQty <= 0) continue;
        state.stockMovements.push({
          id: makeId('mov'),
          partCode: line.partCode,
          outletId: target.outletId,
          type: 'IN',
          qty: line.receivedQty,
          refType: 'GRN',
          refId: target.id,
          at: nowIso,
          actorId: actor.id,
        });
      }

      // Step (6) Stamp GRN posted. threeWayMatchStatus is NOT defaulted here
      // — it must have been set during the QC step (transitionGrn → MATCHED).
      // Silent defaulting would mask DISCREPANCY states. Issue #05 from review.
      target.status = 'POSTED';
      target.postedAt = nowIso;

      // (7) Auto-transition the linked PO if the GRN references one.
      if (target.poId) {
        const po = state.purchaseOrders.find((p) => p.id === target.poId);
        if (po && (po.status === 'DISPATCHED' || po.status === 'PARTIALLY_RECEIVED')) {
          if (allLinesFullyReceived(po, state.grns)) {
            po.status = 'RECEIVED';
          } else if (hasAnyReceipt(po, state.grns)) {
            po.status = 'PARTIALLY_RECEIVED';
          }
        }
      }

      // TODO [P6]: If po.linkedJobCardId is set, auto-reserve matching
      // Service PartsLines (status REQUESTED → RESERVED) per spec §11.2.
      // Cross-store call deferred to avoid a P1 dependency on the service store.

      applied = true;
    });

    return applied;
  },
});
