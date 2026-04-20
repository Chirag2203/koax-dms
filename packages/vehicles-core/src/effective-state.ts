/**
 * Effective-state derivation — single canonical computation.
 *
 * Rule (D11): Raw `state` field on VehicleOwnership is NEVER read outside
 * this module. Every UI filter, badge, and selector must call `effectiveState`.
 *
 * The `GRACE` effective state is derived from REVOKED rows whose `graceUntilAt`
 * is still in the future (7-day window per D5).
 *
 * Spec reference: SPEC-VEHICLES-001 §2.5, D11
 */

import type { VehicleOwnership } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The full set of derived ownership states exposed to UI and selectors.
 * Maps raw OwnershipState → richer UI-facing states.
 *
 * - ACTIVE_JOINT: ACTIVE row where `isJoint: true` and at least one peer ACTIVE row exists
 * - GRACE: REVOKED row whose `graceUntilAt` is in the future
 */
export type EffectiveState =
  | 'PENDING_CLAIM'
  | 'ACTIVE'
  | 'ACTIVE_JOINT'
  | 'GRACE'
  | 'REVOKED'
  | 'TRANSFERRED'
  | 'REJECTED';

// ─── effectiveState ───────────────────────────────────────────────────────────

/**
 * Derives the UI-facing effective state from a raw ownership row.
 *
 * @param ownership  The raw VehicleOwnership row
 * @param now        ISO datetime string for grace window comparison
 * @param peerCount  Count of other ACTIVE rows for the same VIN (used to
 *                   detect joint ownership — both rows must have isJoint: true)
 */
export function effectiveState(
  ownership: VehicleOwnership,
  now: string,
  peerCount: number,
): EffectiveState {
  const nowMs = new Date(now).getTime();

  if (ownership.state === 'PENDING_CLAIM') return 'PENDING_CLAIM';
  if (ownership.state === 'REJECTED') return 'REJECTED';
  if (ownership.state === 'TRANSFERRED') return 'TRANSFERRED';

  if (ownership.state === 'ACTIVE') {
    // Joint: this row is joint AND at least one peer ACTIVE row exists
    return peerCount > 0 && ownership.isJoint ? 'ACTIVE_JOINT' : 'ACTIVE';
  }

  // state === 'REVOKED': check grace window
  if (
    ownership.graceUntilAt &&
    new Date(ownership.graceUntilAt).getTime() >= nowMs
  ) {
    return 'GRACE';
  }

  return 'REVOKED';
}

/**
 * Returns true if the ownership row is currently accessible to the customer
 * (ACTIVE, ACTIVE_JOINT, or in GRACE).
 */
export function isCustomerAccessible(
  ownership: VehicleOwnership,
  now: string,
  peerCount: number,
): boolean {
  const es = effectiveState(ownership, now, peerCount);
  return es === 'ACTIVE' || es === 'ACTIVE_JOINT' || es === 'GRACE';
}
