/**
 * GST margin-scheme computation — SPEC-FINANCE-001 L1, L10
 *
 * L1: gstAmount = margin × 18/118 (tax-inclusive per CBIC Notification 8/2018-CT(R) Rule 32(5))
 * L10: All margin/GST computation MUST route through this module. Inline calculations in
 *      components are auto-rejected at review.
 *
 * Inherited from PLAN-VEHICLES-003 L4 + Doc 06 §GST.margin
 */

import { roundPaise } from './rounding';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tolerance for discrepancy detection per L20: > ₹1 = 100 paise. */
export const DISCREPANCY_TOLERANCE_PAISE = 100;

// ─── Margin computation ───────────────────────────────────────────────────────

export interface MarginInput {
  /** Sale price in paise (L11). */
  salePricePaise: number;
  /** Acquisition cost in paise (L11). */
  acquisitionCostPaise: number;
  /** Sum of allowable refurb cost-ledger entries in paise (L11). */
  allowableRefurbPaise: number;
}

/**
 * Compute pre-tax margin in paise.
 *
 * L1: margin = max(0, salePrice - acquisitionCost - allowableRefurb)
 * Loss-sales clamp margin to 0 — no negative GST liability.
 * Doc 06 §GST.margin; CBIC Notification 8/2018-CT(R) Rule 32(5); PLAN-VEHICLES-003 L4
 */
export function computeMarginPaise(input: MarginInput): number {
  const raw = input.salePricePaise - input.acquisitionCostPaise - input.allowableRefurbPaise;
  // L1: clamp to 0 on loss
  return Math.max(0, raw);
}

/**
 * Compute GST from margin using the margin-scheme formula.
 *
 * L1: gstAmount = roundPaise(margin × 18 / 118)
 * The 18/118 multiplier extracts GST from a tax-inclusive margin.
 * Per-line rounding per L11; result is paise integer.
 * Doc 06 §GST.margin; CBIC Notification 8/2018-CT(R) Rule 32(5); PLAN-VEHICLES-003 L4
 */
export function computeGstFromMarginPaise(marginPaise: number): number {
  if (marginPaise <= 0) return 0;
  // L1: PLAN-VEHICLES-003 L4 + Doc 06 §GST.margin
  return roundPaise((marginPaise * 18) / 118);
}

/**
 * Convenience: compute margin then GST in one call.
 * Returns both so callers don't need to call twice.
 *
 * L1: PLAN-VEHICLES-003 L4 + Doc 06 §GST.margin
 */
export function computeMarginAndGst(input: MarginInput): {
  marginPaise: number;
  gstPaise: number;
} {
  const marginPaise = computeMarginPaise(input);
  const gstPaise = computeGstFromMarginPaise(marginPaise);
  return { marginPaise, gstPaise };
}

/**
 * Detect discrepancy between stored and recomputed GST.
 * L20: discrepancy when |computed - stored| > DISCREPANCY_TOLERANCE_PAISE (₹1 = 100 paise).
 */
export function detectGstDiscrepancy(
  computedGstPaise: number,
  storedGstPaise: number | null,
): boolean {
  if (storedGstPaise === null) return false; // no stored value — no discrepancy to detect
  // L20: PLAN-VEHICLES-003 L4; Doc 06 §reconciliation
  return Math.abs(computedGstPaise - storedGstPaise) > DISCREPANCY_TOLERANCE_PAISE;
}
