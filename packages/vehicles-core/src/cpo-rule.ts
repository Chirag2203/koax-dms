/**
 * CPO eligibility rule — pure function, zero side effects.
 *
 * CPO = Certified Pre-Owned. Three badge states:
 *   Eligible    — green  — all rules pass
 *   At Risk     — amber  — gap 12–18 months between consecutive JCs
 *   Not Eligible — no badge — fails hard rules
 *
 * Memoization key: `(vin, lastJcId)` — see `selectLastJcIdByVin` in
 * service-store. The hook `useCpoEligibility(vin)` caches at Map level.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.5
 */

import type { VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal JobCard shape required for CPO evaluation. */
interface CpoJobCard {
  id: string;
  vin: string;
  receivedAt: string; // ISO datetime
}

/** Minimal WarrantyClaim shape required for CPO evaluation. */
interface CpoWarrantyClaim {
  vin: string;
  status: string;
}

export type CpoBadge = 'ELIGIBLE' | 'AT_RISK' | 'NOT_ELIGIBLE';

export interface CpoReason {
  code: string;
  message: string;
}

export interface CpoResult {
  badge: CpoBadge;
  eligible: boolean;
  reasons: CpoReason[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CPO_RULE = {
  /** Minimum JC count in the 36-month window */
  MIN_JC_COUNT: 4,
  /** Rolling window in months */
  WINDOW_MONTHS: 36,
  /** Max allowed gap in months between consecutive JCs before ineligible */
  MAX_GAP_MONTHS: 18,
  /** Gap range (months) that triggers AT_RISK (amber) badge */
  AT_RISK_GAP_MIN_MONTHS: 12,
  /** km staleness threshold in days */
  KM_STALE_DAYS: 90,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthsBetween(a: Date, b: Date): number {
  const months =
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.abs(months);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

// ─── isCpoEligible ────────────────────────────────────────────────────────────

/**
 * Evaluates CPO eligibility for a given VIN.
 *
 * Rules (all must pass for ELIGIBLE):
 * 1. ≥ 4 JCs in the last 36 months
 * 2. No gap > 18 months between consecutive JCs in the window
 * 3. No open DISPUTED warranty claim
 * 4. vehicle.lastKnownKmAt within 90 days of `now`
 *
 * AT_RISK: passes all rules except gap is 12–18 months somewhere.
 */
export function isCpoEligible(
  vin: string,
  jobCards: CpoJobCard[],
  warrantyClaims: CpoWarrantyClaim[],
  vehicle: VehicleMaster,
  now: string,
): CpoResult {
  const reasons: CpoReason[] = [];
  const nowDate = new Date(now);

  // Filter JCs for this VIN in the 36-month window, sorted ascending
  const windowStart = new Date(nowDate);
  windowStart.setMonth(windowStart.getMonth() - CPO_RULE.WINDOW_MONTHS);

  const vinJcs = jobCards
    .filter((jc) => jc.vin === vin && new Date(jc.receivedAt) >= windowStart)
    .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

  // Rule 1: minimum JC count
  if (vinJcs.length < CPO_RULE.MIN_JC_COUNT) {
    reasons.push({
      code: 'INSUFFICIENT_JC_COUNT',
      message: `Only ${vinJcs.length} service visit(s) in the last 36 months (minimum ${CPO_RULE.MIN_JC_COUNT} required)`,
    });
  }

  // Rule 2: max gap between consecutive JCs
  let maxGapMonths = 0;
  for (let i = 1; i < vinJcs.length; i++) {
    const gap = monthsBetween(
      new Date(vinJcs[i - 1]!.receivedAt),
      new Date(vinJcs[i]!.receivedAt),
    );
    if (gap > maxGapMonths) maxGapMonths = gap;
  }

  if (maxGapMonths > CPO_RULE.MAX_GAP_MONTHS) {
    reasons.push({
      code: 'GAP_EXCEEDED',
      message: `Service gap of ${maxGapMonths} months exceeds the 18-month limit`,
    });
  }

  // Rule 3: no open DISPUTED warranty claim
  const hasDisputed = warrantyClaims.some(
    (wc) => wc.vin === vin && wc.status === 'DISPUTED',
  );
  if (hasDisputed) {
    reasons.push({
      code: 'DISPUTED_WARRANTY',
      message: 'There is an open disputed warranty claim on this vehicle',
    });
  }

  // Rule 4: km freshness
  const kmAgeDays = daysBetween(new Date(vehicle.lastKnownKmAt), nowDate);
  if (kmAgeDays > CPO_RULE.KM_STALE_DAYS) {
    reasons.push({
      code: 'KM_STALE',
      message: `Odometer reading is ${Math.round(kmAgeDays)} days old (maximum ${CPO_RULE.KM_STALE_DAYS} days)`,
    });
  }

  // Determine badge
  if (reasons.length === 0) {
    return { badge: 'ELIGIBLE', eligible: true, reasons: [] };
  }

  // AT_RISK: only reason is a gap in [12, 18] months range — no hard failures
  const isOnlyAtRiskGap =
    reasons.length === 1 &&
    reasons[0]!.code === 'GAP_EXCEEDED' &&
    maxGapMonths >= CPO_RULE.AT_RISK_GAP_MIN_MONTHS &&
    maxGapMonths <= CPO_RULE.MAX_GAP_MONTHS;

  // Also AT_RISK if count is 1 short (at risk) and gap is within range
  const isNearlyEligible =
    vinJcs.length === CPO_RULE.MIN_JC_COUNT - 1 && reasons.length === 1 &&
    reasons[0]!.code === 'INSUFFICIENT_JC_COUNT';

  if (isOnlyAtRiskGap || isNearlyEligible) {
    return { badge: 'AT_RISK', eligible: false, reasons };
  }

  return { badge: 'NOT_ELIGIBLE', eligible: false, reasons };
}
