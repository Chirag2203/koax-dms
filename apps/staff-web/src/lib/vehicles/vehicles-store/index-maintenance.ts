/**
 * Index maintenance helpers for VehiclesState.
 *
 * Indices are derived in-memory caches that must be kept in sync with the
 * canonical entity maps. They are never persisted — rebuilt from entity maps
 * on hydration and updated on every mutation.
 *
 * Calling `rebuildIndices` on the full state is O(n) over all ownership rows
 * and is only used at hydration time. All mutation paths use the incremental
 * helpers below.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.2 (state shape — indices)
 */

import type { VehiclesState } from './types';

// ─── Incremental index helpers ────────────────────────────────────────────────

/** Add an ownershipId to the ownershipIdByVin index. */
export function indexOwnershipByVin(
  state: VehiclesState,
  vin: string,
  ownershipId: string,
): void {
  if (!state.ownershipIdByVin[vin]) {
    state.ownershipIdByVin[vin] = [];
  }
  if (!state.ownershipIdByVin[vin]!.includes(ownershipId)) {
    state.ownershipIdByVin[vin]!.push(ownershipId);
  }
}

/** Add an ownershipId to the ownershipIdByCustomer index. */
export function indexOwnershipByCustomer(
  state: VehiclesState,
  customerId: string,
  ownershipId: string,
): void {
  if (!state.ownershipIdByCustomer[customerId]) {
    state.ownershipIdByCustomer[customerId] = [];
  }
  if (!state.ownershipIdByCustomer[customerId]!.includes(ownershipId)) {
    state.ownershipIdByCustomer[customerId]!.push(ownershipId);
  }
}

/** Add a claimId to the claimIdByVin index. */
export function indexClaimByVin(
  state: VehiclesState,
  vin: string,
  claimId: string,
): void {
  if (!state.claimIdByVin[vin]) {
    state.claimIdByVin[vin] = [];
  }
  if (!state.claimIdByVin[vin]!.includes(claimId)) {
    state.claimIdByVin[vin]!.push(claimId);
  }
}

// ─── Full rebuild (hydration only) ───────────────────────────────────────────

/**
 * Rebuild all three indices from the canonical entity maps.
 * Called once during store hydration. O(n) over all ownership rows.
 */
export function rebuildIndices(state: VehiclesState): void {
  state.ownershipIdByVin = {};
  state.claimIdByVin = {};
  state.ownershipIdByCustomer = {};

  for (const [id, row] of Object.entries(state.ownerships)) {
    indexOwnershipByVin(state, row.vin, id);
    indexOwnershipByCustomer(state, row.customerId, id);
  }

  for (const [id, claim] of Object.entries(state.claims)) {
    indexClaimByVin(state, claim.vin, id);
  }
}
