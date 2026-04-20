/**
 * GST margin-scheme + consignment-commission computation.
 *
 * Two sale flows (PLAN-VEHICLES-003 §2.1, addendum §1.5):
 *   MARGIN_SCHEME         — BN buys and resells; GST on margin only (tax-inclusive).
 *   CONSIGNMENT_COMMISSION — BN sells on behalf of owner; GST on commission (additive).
 *
 * Policy basis:
 *   Margin-scheme: CBIC Notification 8/2018 — Rule 32(5) of CGST Rules 2017.
 *   "No ITC on refurb inputs" is BN accounting policy, not settled law (addendum §1.3).
 *   TCS u/s 206C(1F) Income Tax Act — BN collects @ 1% on gross > ₹10L; issues Form 27D.
 *
 * Worked example — MARGIN_SCHEME:
 *   Input:  salePrice ₹12,00,000 (tax-inclusive sticker)
 *           acquisitionCost ₹10,00,000 (tax-inclusive purchase)
 *   Output: margin = 12,00,000 − 10,00,000 = ₹2,00,000 (tax-inclusive per Rule 32(5))
 *           gstAmount = round(2,00,000 × 18 / 118) = ₹30,508
 *           BN net revenue (pre-TCS) = ₹1,69,492
 *           TCS collected from buyer = round(12,00,000 × 1%) = ₹12,000
 *           (TCS NOT subtracted from margin — it is buyer tax, remitted to CBDT)
 *
 * Worked example — CONSIGNMENT_COMMISSION (commissionPct 15%):
 *   Input:  salePrice ₹15,00,000, commissionPct 15
 *   Output: commissionEarned = round(15,00,000 × 15 / 100) = ₹2,25,000
 *           commissionGst = round(2,25,000 × 18 / 100) = ₹40,500  (additive, L25)
 *           BN invoices consignor: ₹2,25,000 + ₹40,500 = ₹2,65,500
 *           Consignor TDS u/s 194H @ 5% = ₹11,250 (display-only v2)
 *           TCS on sale to buyer = round(15,00,000 × 1%) = ₹15,000
 *
 * LoC budget: ≤200
 * Spec reference: PLAN-VEHICLES-003 §2.1, L4, L5, L17, L25, L35, L36
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_COMMISSION_PCT = 15;
export const TCS_THRESHOLD_INR = 1_000_000; // ₹10,00,000
export const TCS_RATE = 0.01;               // 1%
export const GST_RATE = 18;                  // percent
export const GST_DIVISOR = 118;              // tax-inclusive divisor for margin scheme

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GstMarginInput {
  flow: 'MARGIN_SCHEME' | 'CONSIGNMENT_COMMISSION';
  salePrice: number;
  /** MARGIN_SCHEME only: tax-inclusive acquisition cost */
  acquisitionCost?: number;
  /** MARGIN_SCHEME only: refurb cost (informational — not deducted from margin per BN policy) */
  refurbCost?: number;
  /** CONSIGNMENT_COMMISSION only: overrides DEFAULT_COMMISSION_PCT. Explicit 0 is valid (L36). */
  commissionPct?: number;
  /** L18: staff can waive TCS with mandatory reason. tcsWaived:true → no TCS collected. */
  tcsWaived?: boolean;
}

export interface ComputedGstMargin {
  flow: 'MARGIN_SCHEME' | 'CONSIGNMENT_COMMISSION';
  salePrice: number;

  // MARGIN_SCHEME fields
  margin?: number;
  gstTaxable?: number;
  gstAmount?: number;
  policyNotes?: string[];

  // CONSIGNMENT_COMMISSION fields
  commissionPct?: number;
  commissionEarned?: number;
  commissionGst?: number;

  // TCS (both flows) — L5: independent of margin sign, keyed off gross salePrice
  tcsApplicable: boolean;
  tcsAmount: number;
  tcsWaived: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round to nearest integer (banker-safe for INR: always round half-up via Math.round). */
function roundINR(value: number): number {
  return Math.round(value);
}

// ─── computeGstMargin ─────────────────────────────────────────────────────────

/**
 * Computes GST margin and TCS for a vehicle sale.
 *
 * MARGIN_SCHEME:
 *   margin = max(0, salePrice − acquisitionCost)  [clamped to 0 on loss]
 *   gstAmount = round(margin × 18 / 118)            [tax-inclusive per CBIC Notif 8/2018]
 *
 * CONSIGNMENT_COMMISSION:
 *   pct = commissionPct ?? DEFAULT_COMMISSION_PCT   [explicit 0 is valid — L36]
 *   commissionEarned = round(salePrice × pct / 100)
 *   commissionGst = round(commissionEarned × 18 / 100) [additive / tax-exclusive — L25]
 *
 * TCS (both flows, L5 + L35):
 *   tcsApplicable = salePrice > TCS_THRESHOLD_INR && !tcsWaived
 *   tcsAmount = tcsApplicable ? round(salePrice × 0.01) : 0
 */
export function computeGstMargin(input: GstMarginInput): ComputedGstMargin {
  const { flow, salePrice, tcsWaived = false } = input;

  // TCS — strict '>' per L35 (exactly ₹10L triggers NO TCS)
  const tcsApplicable = salePrice > TCS_THRESHOLD_INR && !tcsWaived;
  const tcsAmount = tcsApplicable ? roundINR(salePrice * TCS_RATE) : 0;

  if (flow === 'MARGIN_SCHEME') {
    const acquisitionCost = input.acquisitionCost ?? 0;
    const rawMargin = salePrice - acquisitionCost;
    const margin = Math.max(0, rawMargin); // clamp negative margin to 0 (loss sale)
    const gstTaxable = margin;
    // Tax-inclusive formula: margin already includes GST component (CBIC Notif 8/2018 Rule 32(5))
    const gstAmount = roundINR(gstTaxable * GST_RATE / GST_DIVISOR);

    return {
      flow,
      salePrice,
      margin,
      gstTaxable,
      gstAmount,
      policyNotes: [
        'Margin scheme per CBIC Notification 8/2018 — Rule 32(5) of CGST Rules 2017',
        'BN policy: no ITC claimed on refurb inputs under margin scheme (accounting policy, not settled law)',
      ],
      tcsApplicable,
      tcsAmount,
      tcsWaived,
    };
  }

  // CONSIGNMENT_COMMISSION
  // Explicit nullish check — 0 is a valid explicit value and must NOT fall through to default (L36)
  const pct = input.commissionPct ?? DEFAULT_COMMISSION_PCT;
  const commissionEarned = roundINR(salePrice * pct / 100);
  // Additive (tax-exclusive) GST on commission — service fee per Doc 06 (L25)
  const commissionGst = roundINR(commissionEarned * GST_RATE / 100);

  return {
    flow,
    salePrice,
    commissionPct: pct,
    commissionEarned,
    commissionGst,
    tcsApplicable,
    tcsAmount,
    tcsWaived,
  };
}
