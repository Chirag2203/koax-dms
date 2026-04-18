/**
 * Purchase Order slice — create / update / state transitions.
 *
 * All transitions run through `canTransitionPo` from state-machine.ts.
 * Approval threshold gating (`canApprove`) is the caller's responsibility —
 * this slice enforces the state machine, not RBAC.
 *
 * Spec reference: SPEC-PARTS-001 §5.1, §6
 */

import type { PurchaseOrder } from '@dms/types';
import type { PartsSlice, PoActions } from '../types';
import { makeId, nextPoNo, now } from '../id-helpers';
import { canTransitionPo } from '../../state-machine';

export const createPoSlice: PartsSlice<PoActions> = (set) => ({
  createPurchaseOrder(input, _actor) {
    let created!: PurchaseOrder;
    set((state) => {
      const po: PurchaseOrder = {
        ...input,
        id: makeId('po'),
        poNo: nextPoNo(state.purchaseOrders),
        status: 'DRAFT',
        createdAt: now(),
      };
      state.purchaseOrders.push(po);
      created = po;
    });
    return created;
  },

  updatePurchaseOrder(id, patch, _actor) {
    set((state) => {
      const po = state.purchaseOrders.find((p) => p.id === id);
      if (!po) return;
      // Preserve identity + number; status transitions go through transitionPurchaseOrder.
      const {
        id: _ignoredId,
        poNo: _ignoredNo,
        status: _ignoredStatus,
        ...safe
      } = patch;
      Object.assign(po, safe);
    });
  },

  transitionPurchaseOrder(id, next, opts) {
    // Quick existence check (pre-set) for the boolean return value.
    // The real guard runs inside set() so concurrent calls can't race
    // past the canTransition check on stale state. Issue #11 from review.
    let applied = false;
    set((state) => {
      const target = state.purchaseOrders.find((p) => p.id === id);
      if (!target) return;
      if (!canTransitionPo(target.status, next)) return;

      const nowIso = now();
      target.status = next;

      // Side-effect field stamps per §5.1
      if (next === 'PENDING_APPROVAL') {
        target.submittedAt = nowIso;
      }
      if (next === 'APPROVED') {
        target.approverId = opts.actor.id;
        target.approvedAt = nowIso;
      }
      if (next === 'REJECTED') {
        target.rejectedReason = opts.reason ?? '';
        // Stamp approver identity on rejection too — the same approver field
        // captures "who took the terminal decision". P5 timeline relies on this
        // to show actor + timestamp on the Rejected node.
        target.approverId = opts.actor.id;
        target.approvedAt = nowIso;
      }
      if (next === 'CANCELLED') {
        // Reuse rejectedReason to store cancel reason — schema has no
        // dedicated cancelReason/cancelledAt fields in v1. Timeline + sidebar
        // surface this under a "Cancelled" label (not "Rejected").
        target.rejectedReason = opts.reason ?? '';
      }
      if (next === 'DISPATCHED') {
        target.dispatchedAt = nowIso;
      }
      applied = true;
    });

    return applied;
  },
});
