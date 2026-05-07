/**
 * assertShootComplete — Seam 40 LISTED guard
 *
 * v2.1 path (SPEC-SHOOTS-002 L_AI-6, L_AI-20):
 *   The sole LISTED guard. Every REQUIRED slot kind must have an approved asset.
 *   Throws ShootSlotIncompleteError with missingKinds enumerated.
 *   Guard skipped if no shoot exists for VIN.
 *
 * GRANDFATHER RULE (SC-20, L_AI-6):
 *   The 11-slot guard applies ONLY to LISTED transitions for vehicles that
 *   are currently NOT listed. Vehicles already in LISTED state (continuously so
 *   since before v2 deploy) skip the new guard — they retain their v1 eligibility.
 *
 * RE-LISTING (SC-26, L_AI-6):
 *   If a vehicle was LISTED under v1 but then UNLISTED (e.g., for price correction),
 *   re-listing post-v2 triggers the new 11-slot guard. `currentlyListed: false`
 *   signals this path.
 *
 * v1 count-fallback block DELETED in v2.1 per L_AI-20.
 * ShootIncompleteError retained as @deprecated export in @dms/types — no new throws.
 *
 * Spec reference: SPEC-SHOOTS-001 §10, L9 | SPEC-SHOOTS-002 L_AI-6, L_AI-20, SC-11, SC-12, SC-20, SC-25, SC-26
 */

import { ShootSlotIncompleteError } from '@dms/types';
import type { Shoot } from '@dms/types';
import { useShootsStore } from './shoots-store';
import { getRequiredSlots } from './asset-slot-definitions';

/**
 * Pure-function variant of the LISTED guard.
 * Takes the shoot object directly — NO dependency on useShootsStore.
 * This is the canonical implementation; the VIN-based variant below
 * is a thin wrapper for external callers (e.g., vehicle-listing seam).
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-6, SC-11, SC-12, SC-20, SC-25, SC-26
 */
export function assertShootCompleteForShoot(shoot: Shoot, currentlyListed = false): void {
  // GRANDFATHER RULE (SC-20): vehicle already LISTED → skip guard
  if (currentlyListed) return;

  // v2 11-slot guard: every REQUIRED kind must have an approved asset (L_AI-6)
  const requiredSlots = getRequiredSlots();
  const missingKinds = requiredSlots
    .map((slot) => slot.kind)
    .filter((kind) => {
      const hasApproved = shoot.assets.some(
        (a) => a.kind === kind && a.approved === true,
      );
      return !hasApproved;
    });

  if (missingKinds.length > 0) {
    throw new ShootSlotIncompleteError(shoot.vin, missingKinds);
  }
  // All required slots have an approved asset — guard passes.
}

/**
 * Asserts the shoot for a given VIN is complete before a LISTED transition.
 * Wrapper for external callers (e.g., vehicle-listing seam) that only have the VIN.
 *
 * @param vin - The VIN being listed.
 * @param currentlyListed - Whether the vehicle is already LISTED. When true,
 *   the grandfather rule applies and the guard is skipped (SC-20). When false,
 *   the v2 11-slot guard runs (SC-11, SC-12, SC-26).
 * @throws {ShootSlotIncompleteError} if guard fails — required kind missing an approved asset.
 *
 * L9: returns silently (no error) if no shoot exists for the VIN.
 * L_AI-20: v1 count-fallback block removed. v2 11-slot guard is the sole path.
 */
export function assertShootComplete(vin: string, currentlyListed = false): void {
  const shoot = useShootsStore.getState().getShootByVin(vin);

  // L9: No shoot → guard skipped (service-only walk-in vehicles)
  if (!shoot) return;

  assertShootCompleteForShoot(shoot, currentlyListed);
}
