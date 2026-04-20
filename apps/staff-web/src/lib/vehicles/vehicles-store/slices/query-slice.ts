/**
 * Query-slice — pure selectors. No mutations.
 *
 * Shape is `(state, ...args)`. Hook wrappers `useVehiclesStoreSelector`
 * provided by the store index live in index.ts.
 *
 * effectiveState is the ONLY place that maps raw state → UI state (D11).
 * No raw `state` field comparisons outside effective-state.ts.
 *
 * Perf budget: selectOwnershipTimeline ≤ 20ms for 100 events (S-V-15).
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (query-slice)
 */

import { effectiveState } from '@dms/vehicles-core';
import type { QueryActions, VehiclesSlice, VehiclesState } from '../types';
import type { VehicleOwnership, OwnershipClaim, OwnershipChangeEvent } from '@dms/types';

/** Count ACTIVE peers for a given VIN and ownership row — needed for ACTIVE_JOINT. */
function peerCount(state: VehiclesState, vin: string, ownershipId: string): number {
  const ids = state.ownershipIdByVin[vin] ?? [];
  return ids.filter((id) => id !== ownershipId && state.ownerships[id]?.state === 'ACTIVE').length;
}

export const createQuerySlice: VehiclesSlice<QueryActions> = () => ({
  selectCurrentOwnerships(state, vin) {
    const now = new Date().toISOString();
    const ids = state.ownershipIdByVin[vin] ?? [];
    return ids
      .map((id) => state.ownerships[id])
      .filter((r): r is VehicleOwnership => {
        if (!r) return false;
        const es = effectiveState(r, now, peerCount(state, vin, r.id));
        return es === 'ACTIVE' || es === 'ACTIVE_JOINT';
      });
  },

  selectCurrentOwnerIds(state, vin) {
    return this.selectCurrentOwnerships(state, vin).map((r) => r.customerId);
  },

  selectOwnershipTimeline(state, vin) {
    // O(n) filter + O(n log n) sort — perf budget ≤ 20ms for 100 events
    const rows = Object.values(state.ownerships).filter((r) => r.vin === vin);
    const events = state.events.filter((e) => e.vin === vin);
    const combined: Array<VehicleOwnership | OwnershipChangeEvent> = [
      ...rows,
      ...events,
    ];
    return combined.sort((a, b) => {
      const aAt = 'fromAt' in a ? a.fromAt : a.at;
      const bAt = 'fromAt' in b ? b.fromAt : b.at;
      return new Date(aAt).getTime() - new Date(bAt).getTime();
    });
  },

  selectVehiclesByCustomer(state, customerId, opts) {
    const now = opts.now;
    const ids = state.ownershipIdByCustomer[customerId] ?? [];
    return ids
      .map((id) => state.ownerships[id])
      .filter((r): r is VehicleOwnership => {
        if (!r) return false;
        const es = effectiveState(r, now, peerCount(state, r.vin, r.id));
        if (es === 'ACTIVE' || es === 'ACTIVE_JOINT') return true;
        if (opts.includeGrace && es === 'GRACE') return true;
        return false;
      });
  },

  selectClaimsByCustomer(state, customerId) {
    return Object.values(state.claims).filter(
      (c): c is OwnershipClaim => c.claimantCustomerId === customerId,
    );
  },

  selectPendingClaims(state, _opts) {
    // City-scoping (outletId) is applied at the UI layer — this selector
    // returns all PENDING/AUTO_APPROVED claims; the UI filters by outletId
    // after joining with the vehicles map. Kept pure per D9.
    return Object.values(state.claims).filter(
      (c): c is OwnershipClaim => c.state === 'PENDING',
    );
  },

  selectAnonymizationDue(state, now) {
    const nowMs = new Date(now).getTime();
    return Object.values(state.ownerships).filter(
      (r): r is VehicleOwnership =>
        r.piiRetentionUntil !== undefined &&
        new Date(r.piiRetentionUntil).getTime() <= nowMs &&
        !r.customerId.startsWith('anon-'),
    );
  },
});
