/**
 * Service-to-Sale Upgrade Eligibility Helper
 *
 * Pure function — no store imports, no side effects.
 * Determines whether a vehicle in service is "upgrade-ready" per B4 criteria.
 *
 * L1:  UPGRADE_AGE_YEARS = 5, UPGRADE_KM_THRESHOLD = 70_000 — hardcoded in v1.
 *      Tunable via Settings module in v2 (DEF-SERVICE-SALE-3).
 * L2:  Recalls are a runtime fixture stub. Real recall integration is DEF-SERVICE-SALE-1.
 * L8:  All matched reasons are returned (not just the first).
 * L11: Age uses VehicleMaster.year (manufacture year integer). If vehicle is null,
 *      the age check is skipped — unknown vehicle does not trigger the age reason.
 *
 * Spec reference: SPEC-SERVICE-SALE-001 §5 + §6 + S-STS-1 through S-STS-6
 */

import type { JobCard } from '@dms/types';

// ─── VehicleRecall (stub type — v1 only, DEF-SERVICE-SALE-1) ─────────────────

export interface VehicleRecall {
  id:          string;
  vin:         string;
  title:       string;
  issuedAt:    string;   // ISO date e.g. '2025-11-20'
  status:      'OPEN' | 'CLOSED';
  description: string;
}

// ─── Result types ─────────────────────────────────────────────────────────────

/** L8: All matched reasons are returned in this union. */
export type UpgradeReason = 'age-over-5y' | 'km-over-70k' | 'open-recall';

export interface UpgradeReadinessResult {
  ready:   boolean;
  reasons: UpgradeReason[];
}

// ─── VehicleMaster subset (only fields we need) ───────────────────────────────

export interface UpgradeVehicleInfo {
  /** Manufacture year integer e.g. 2019. Used for age calculation. */
  year: number;
}

// ─── Tunable thresholds (L1) ─────────────────────────────────────────────────

/**
 * L1: Minimum age in years that triggers the 'age-over-5y' reason.
 * Hardcoded in v1. Will move to Settings store in v2 (DEF-SERVICE-SALE-3).
 */
export const UPGRADE_AGE_YEARS = 5;

/**
 * L1: Odometer threshold in km that triggers the 'km-over-70k' reason.
 * Hardcoded in v1. Will move to Settings store in v2 (DEF-SERVICE-SALE-3).
 */
export const UPGRADE_KM_THRESHOLD = 70_000;

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Determines whether a vehicle currently in service is "upgrade-ready."
 *
 * Any one of the three criteria independently triggers `ready: true`.
 * All triggered criteria are returned in `reasons`.
 *
 * @param vehicle  VehicleMaster data for the VIN (or null if not in store — age check skipped).
 *                 L11: age check skipped if vehicle is null to avoid false positives.
 * @param jobCard  The active Job Card (used for odometerIn and VIN).
 * @param recalls  Stub array of VehicleRecall entries. L2: stub in v1.
 *
 * Spec reference: SPEC-SERVICE-SALE-001 §5, L1, L2, L8, L11
 */
export function isUpgradeReady(
  vehicle: UpgradeVehicleInfo | null,
  jobCard: Pick<JobCard, 'vin' | 'odometerIn'>,
  recalls: VehicleRecall[],
): UpgradeReadinessResult {
  const reasons: UpgradeReason[] = [];

  // C1: Age ≥ UPGRADE_AGE_YEARS
  // L11: Skip if VehicleMaster not found (unknown vehicle)
  if (vehicle !== null) {
    const currentYear = new Date().getFullYear();
    if (currentYear - vehicle.year >= UPGRADE_AGE_YEARS) {
      reasons.push('age-over-5y');
    }
  }

  // C2: Odometer ≥ UPGRADE_KM_THRESHOLD
  if (jobCard.odometerIn >= UPGRADE_KM_THRESHOLD) {
    reasons.push('km-over-70k');
  }

  // C3: Open recall for this VIN
  // L2: stub recall list; real feed is DEF-SERVICE-SALE-1
  const hasOpenRecall = recalls.some(
    (r) => r.vin === jobCard.vin && r.status === 'OPEN',
  );
  if (hasOpenRecall) {
    reasons.push('open-recall');
  }

  return {
    ready:   reasons.length > 0,
    reasons,
  };
}
