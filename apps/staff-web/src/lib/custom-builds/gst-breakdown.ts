/**
 * computeGstBreakdown — pure GST estimator for Custom Builds.
 *
 * Implements SPEC-CUSTOM-BUILDS-001 §10 + §15 formula.
 *
 * L6:  Parts cost uses margin-scheme GST (partsMarginShare × 18/118).
 * L16: Labour GST is full-value additive: (vendorLabour + bnMargin × labourShare) × 0.18.
 * L16: Loss-sale clamp — partsMarginShare ≤ 0 → gstOnPartsMargin = 0.
 * L16: Empty-job guard — vendorLabour + partsSubtotal === 0 → all-zero outputs; no NaN/Infinity.
 * L7/L17: marginPct = 0 is a legal explicit zero (no special treatment beyond formula).
 */

export interface GstBreakdownInput {
  /** sum of (part.bnCost × qty) for all lines */
  partsSubtotal: number;
  /** sum of (part.listPrice × qty) for all lines */
  partsListPriceSum: number;
  /** vendorLabour = labourHours × vendor.dayRate / 8 */
  vendorLabour: number;
  /** BN's margin percentage on (partsSubtotal + vendorLabour) */
  marginPct: number;
}

export interface GstBreakdownOutput {
  partsCostBN: number;
  partsListPriceSum: number;
  bnMargin: number;
  vendorLabour: number;
  /** labourShare = vendorLabour / (vendorLabour + partsSubtotal) */
  labourShare: number;
  /** margin × 18/118 (margin scheme, tax-inclusive) — 0 if partsMarginShare ≤ 0 */
  gstOnPartsMargin: number;
  /** (vendorLabour + bnMargin × labourShare) × 0.18 — additive, tax-exclusive */
  gstOnLabour: number;
  total: number;
}

/** All-zero output — returned for empty jobs (no NaN/Infinity). */
const ZERO_OUTPUT: GstBreakdownOutput = {
  partsCostBN: 0,
  partsListPriceSum: 0,
  bnMargin: 0,
  vendorLabour: 0,
  labourShare: 0,
  gstOnPartsMargin: 0,
  gstOnLabour: 0,
  total: 0,
};

export function computeGstBreakdown(input: GstBreakdownInput): GstBreakdownOutput {
  const { partsSubtotal, partsListPriceSum, vendorLabour, marginPct } = input;

  // Empty-job guard (L16): avoids NaN/Infinity on division by zero
  if (partsSubtotal + vendorLabour === 0) {
    return { ...ZERO_OUTPUT, partsListPriceSum };
  }

  // BN margin on the full job
  const bnMargin = (partsSubtotal + vendorLabour) * (marginPct / 100);

  // Labour share of the total base (L16)
  const labourShare = vendorLabour / (vendorLabour + partsSubtotal);

  // Labour GST: full-value additive on (vendorLabour + bnMargin × labourShare)
  const labourBase = vendorLabour + bnMargin * labourShare;
  const gstOnLabour = labourBase * 0.18;

  // Parts margin share (complement of labour share)
  const partsMarginShare = bnMargin * (partsSubtotal / (partsSubtotal + vendorLabour));

  // Loss-sale clamp (L16): negative or zero partsMarginShare → 0
  const gstOnPartsMargin = partsMarginShare > 0 ? partsMarginShare * (18 / 118) : 0;

  const total = partsSubtotal + vendorLabour + bnMargin + gstOnLabour + gstOnPartsMargin;

  return {
    partsCostBN: partsSubtotal,
    partsListPriceSum,
    bnMargin,
    vendorLabour,
    labourShare,
    gstOnPartsMargin,
    gstOnLabour,
    total,
  };
}
