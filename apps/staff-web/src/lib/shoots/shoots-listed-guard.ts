/**
 * assertShootComplete — Seam 40 LISTED guard (SPEC-SHOOTS-001 L2)
 *
 * Called by the vehicle Sales tab before emitting the LISTED SalesEvent.
 * Throws ShootIncompleteError if:
 *   - A shoot exists for the VIN AND
 *   - shoot.assetCount < 10 OR shoot.videoCount < 1
 *
 * L9: If no shoot exists for the VIN (service-only walk-in), the guard is
 * SKIPPED — shoots are only required for vehicles acquired via the
 * BN_CONSIGNMENT path (ACQUIRED SalesEvent).
 *
 * Architecture note: this helper lives in the shoots lib so the guard logic
 * can be tested in isolation. The vehicles-store slice stays pure — it does
 * NOT import this helper (cross-store imports from slices are forbidden per
 * ARCH-CROSS-MODULE-001 invariant #2). The UI layer calls this BEFORE calling
 * emitSalesEvent('LISTED').
 *
 * Spec reference: SPEC-SHOOTS-001 L2, L9, Seam 40
 */

import { ShootIncompleteError } from '@dms/types';
import { useShootsStore } from './shoots-store';
import { SHOOT_REQUIRED_PHOTOS, SHOOT_REQUIRED_VIDEOS } from './shoots-store';

/**
 * Asserts the shoot for a given VIN is complete (≥10 photos, ≥1 video).
 *
 * @param vin - The VIN being listed.
 * @throws {ShootIncompleteError} if a shoot exists but is incomplete.
 *
 * L9: returns silently (no error) if no shoot exists for the VIN.
 */
export function assertShootComplete(vin: string): void {
  const shoot = useShootsStore.getState().getShootByVin(vin);

  // L9: No shoot → guard skipped (service-only walk-in vehicles)
  if (!shoot) return;

  // L2: shoot must be completed AND have ≥10 photos + ≥1 video
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
