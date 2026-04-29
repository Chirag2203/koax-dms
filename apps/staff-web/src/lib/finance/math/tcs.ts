/**
 * TCS computation — SPEC-FINANCE-001 L2, L3, L10, L21
 *
 * L2: TCS @ 1% on motor vehicle sales > ₹10,00,000 per PAN per FY.
 *     Per IT Act §206C(1F). Threshold is cumulative per PAN per FY.
 *     TCS is on invoiceValue (sale value incl. GST), NOT on margin.
 * L3: Waivers read from sales-events stream — Finance cannot create/revoke them.
 * L21: 4-state threshold progression per L21 constants below.
 * L10: All TCS computation routes through this module. Doc 06 §TCS.
 */

import { roundPaise } from './rounding';
import type { TcsThresholdState } from '@dms/types';

// ─── TCS constants ────────────────────────────────────────────────────────────

/** L2: TCS threshold in paise (₹10,00,000). */
export const TCS_THRESHOLD_PAISE = 1_00_00_000;

/** L21: "Approaching" lower bound in paise (₹6,00,000). */
export const TCS_APPROACHING_LOWER_PAISE = 60_00_000;

/** L21: "Near" lower bound in paise (₹8,00,000). */
export const TCS_NEAR_LOWER_PAISE = 80_00_000;

/** L2: TCS rate = 1%. */
export const TCS_RATE = 0.01;

// ─── Threshold state ──────────────────────────────────────────────────────────

/**
 * Determine threshold state from cumulative TCS-applicable purchase (excl. waivers).
 *
 * L21: safe < ₹6L, approaching ₹6L–₹8L, near ₹8L–₹10L, breached ≥ ₹10L
 * IT Act §206C(1F); Doc 06 §TCS
 */
export function computeTcsThresholdState(cumulativeApplicablePaise: number): TcsThresholdState {
  // L21: IT Act §206C(1F); Doc 06 §TCS
  if (cumulativeApplicablePaise >= TCS_THRESHOLD_PAISE) return 'breached';
  if (cumulativeApplicablePaise >= TCS_NEAR_LOWER_PAISE) return 'near';
  if (cumulativeApplicablePaise >= TCS_APPROACHING_LOWER_PAISE) return 'approaching';
  return 'safe';
}

// ─── TCS applied per sale event ───────────────────────────────────────────────

export interface TcsAppliedInput {
  /** Invoice value (sale value incl. GST) in paise — L2. */
  invoiceValuePaise: number;
  /** Running cumulative purchase before this sale (paise) — L2 per-PAN per-FY. */
  cumulativeBeforePaise: number;
  /** Whether TCS was waived on this sale — L3. */
  tcsWaived: boolean;
}

/**
 * Compute TCS applied on a single sale event.
 *
 * L2: TCS = 1% of invoiceValue only when cumulative (before this sale) + invoiceValue > threshold AND !waived
 *     Per Doc 06 §TCS: TCS applies only on the sale that BREACHES the threshold and all subsequent sales.
 *     The sub-threshold sale immediately before the breaching sale has no TCS.
 *
 * Implementation: if cumulative AFTER this sale > threshold AND this sale itself pushed cumulative over, apply TCS.
 * If cumulative was already over before this sale, apply TCS.
 *
 * Per S-F-4: prior sale at ₹9.8L (sub-threshold) → no TCS; next sale ₹3L → cumulative ₹12.8L → TCS on ₹3L.
 *
 * IT Act §206C(1F); Doc 06 §TCS; PLAN-VEHICLES-003 L5
 */
export function computeTcsApplied(input: TcsAppliedInput): number {
  if (input.tcsWaived) return 0; // L3: waiver exempts from TCS; L3 PLAN-VEHICLES-003 L18

  const cumulativeAfter = input.cumulativeBeforePaise + input.invoiceValuePaise;

  // L2: threshold is strictly > ₹10L (not >=). TCS applies when cumulative > threshold.
  if (cumulativeAfter <= TCS_THRESHOLD_PAISE) return 0;

  // L2: TCS applies on the full invoiceValue of the breaching (and subsequent) sale(s).
  // IT Act §206C(1F); Doc 06 §TCS; PLAN-VEHICLES-003 L5
  return roundPaise(input.invoiceValuePaise * TCS_RATE);
}

/**
 * Build cumulative running totals for a list of sale events for one PAN.
 * Returns each event enriched with the cumulative before + TCS applied.
 *
 * Events MUST be sorted by timestamp ascending before calling.
 * L2: cumulative is per-PAN per-FY. Doc 06 §TCS.
 */
export function computeCumulativeTcs(
  events: Array<{
    eventId: string;
    vin: string;
    saleDate: string;
    invoiceValuePaise: number;
    tcsWaived: boolean;
    tcsWaivedReason?: string;
    tcsWaivedBy?: string;
  }>,
): Array<{
  eventId: string;
  vin: string;
  saleDate: string;
  invoiceValuePaise: number;
  cumulativeBeforePaise: number;
  cumulativeAfterPaise: number;
  tcsAppliedPaise: number;
  tcsWaived: boolean;
  tcsWaivedReason?: string;
  tcsWaivedBy?: string;
}> {
  let cumulative = 0;
  return events.map((e) => {
    const cumulativeBeforePaise = cumulative;
    const tcsAppliedPaise = computeTcsApplied({
      invoiceValuePaise: e.invoiceValuePaise,
      cumulativeBeforePaise,
      tcsWaived: e.tcsWaived,
    });
    cumulative += e.invoiceValuePaise;
    return {
      ...e,
      cumulativeBeforePaise,
      cumulativeAfterPaise: cumulative,
      tcsAppliedPaise,
    };
  });
}
