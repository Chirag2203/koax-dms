/**
 * assertShootComplete — Seam 40 LISTED guard
 *
 * v1 path (SPEC-SHOOTS-001 L2):
 *   Throws ShootIncompleteError if shoot exists AND assetCount < 10 or videoCount < 1.
 *   Guard skipped if no shoot exists for VIN.
 *
 * v2 upgrade (SPEC-SHOOTS-002 L_AI-6):
 *   When the vehicle has NOT yet been LISTED (i.e. a NEW listing transition),
 *   the upgraded predicate is used: every REQUIRED slot kind must have an
 *   approved asset. Throws ShootSlotIncompleteError with missingKinds enumerated.
 *
 * GRANDFATHER RULE (SC-20, L_AI-6):
 *   The new 11-slot guard applies ONLY to LISTED transitions for vehicles that
 *   are currently NOT listed. Vehicles already in LISTED state (continuously so
 *   since before v2 deploy) skip the new guard — they retain their v1 eligibility.
 *
 * RE-LISTING (SC-26, L_AI-6):
 *   If a vehicle was LISTED under v1 but then UNLISTED (e.g., for price correction),
 *   re-listing post-v2 triggers the new 11-slot guard. `currentlyListed: false`
 *   signals this path.
 *
 * Spec reference: SPEC-SHOOTS-001 L2, L9 | SPEC-SHOOTS-002 L_AI-6, SC-11, SC-12, SC-20, SC-25, SC-26
 */

import { ShootIncompleteError, ShootSlotIncompleteError } from '@dms/types';
import { useShootsStore } from './shoots-store';
import { SHOOT_REQUIRED_PHOTOS, SHOOT_REQUIRED_VIDEOS } from './shoots-store';
import { getRequiredSlots } from './asset-slot-definitions';

/**
 * Asserts the shoot for a given VIN is complete before a LISTED transition.
 *
 * @param vin - The VIN being listed.
 * @param currentlyListed - Whether the vehicle is already LISTED. When true,
 *   the grandfather rule applies and the guard is skipped (SC-20). When false,
 *   the v2 11-slot guard runs (SC-11, SC-12, SC-26).
 * @throws {ShootSlotIncompleteError} if v2 guard fails — required kind missing an approved asset.
 * @throws {ShootIncompleteError} if v1 fallback guard fails (no assets[], count-only).
 *
 * L9: returns silently (no error) if no shoot exists for the VIN.
 */
export function assertShootComplete(vin: string, currentlyListed = false): void {
  const shoot = useShootsStore.getState().getShootByVin(vin);

  // L9: No shoot → guard skipped (service-only walk-in vehicles)
  if (!shoot) return;

  // GRANDFATHER RULE (SC-20): vehicle already LISTED → skip new guard
  if (currentlyListed) return;

  // v2 path: slot-based check using assets[]
  if (shoot.assets.length > 0) {
    const requiredSlots = getRequiredSlots();
    const missingKinds = requiredSlots
      .map((slot) => slot.kind)
      .filter((kind) => {
        // A slot is "filled" if it has at least one approved asset for this kind
        const hasApproved = shoot.assets.some(
          (a) => a.kind === kind && a.approved === true,
        );
        return !hasApproved;
      });

    if (missingKinds.length > 0) {
      throw new ShootSlotIncompleteError(vin, missingKinds);
    }

    return; // All required slots have an approved asset
  }

  // v1 fallback: count-only guard (for shoots that haven't migrated to v2 assets[])
  if (
    shoot.assetCount < SHOOT_REQUIRED_PHOTOS ||
    shoot.videoCount < SHOOT_REQUIRED_VIDEOS
  ) {
    throw new ShootIncompleteError(
      vin,
      shoot.assetCount,
      shoot.videoCount,
      SHOOT_REQUIRED_PHOTOS,
      SHOOT_REQUIRED_VIDEOS,
    );
  }
}
