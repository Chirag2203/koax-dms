/**
 * computeGstBreakdown unit tests — 100% branch coverage.
 *
 * Branches tested:
 *   1. Empty-job guard (partsSubtotal + vendorLabour === 0) → zero outputs
 *   2. Normal case (partsSubtotal > 0, vendorLabour > 0, marginPct > 0)
 *   3. Parts-only (vendorLabour = 0, labourShare = 0, gstOnLabour = 0)
 *   4. Labour-only (partsSubtotal = 0, gstOnPartsMargin clamped to 0)
 *   5. Loss-sale clamp (marginPct = 0 → partsMarginShare = 0, gstOnPartsMargin = 0)
 *   6. Zero marginPct (explicit; legal per L7/L17 — no special treatment)
 *   7. Total computation correctness (all components sum correctly)
 *
 * Formula reference: SPEC-CUSTOM-BUILDS-001 §10, L6, L16
 */

import { describe, it, expect } from 'vitest';
import { computeGstBreakdown } from '../gst-breakdown';

describe('computeGstBreakdown', () => {
  // ── Branch 1: Empty-job guard ─────────────────────────────────────────────

  it('returns all-zero output (including gstOnLabour = 0) when job has no parts and no labour', () => {
    const result = computeGstBreakdown({
      partsSubtotal: 0,
      partsListPriceSum: 0,
      vendorLabour: 0,
      marginPct: 15,
    });

    expect(result.partsCostBN).toBe(0);
    expect(result.bnMargin).toBe(0);
    expect(result.vendorLabour).toBe(0);
    expect(result.labourShare).toBe(0);
    expect(result.gstOnLabour).toBe(0);
    expect(result.gstOnPartsMargin).toBe(0);
    expect(result.total).toBe(0);
  });

  it('preserves partsListPriceSum in output even when job is empty', () => {
    const result = computeGstBreakdown({
      partsSubtotal: 0,
      partsListPriceSum: 95000,
      vendorLabour: 0,
      marginPct: 15,
    });

    expect(result.partsListPriceSum).toBe(95000);
    expect(result.total).toBe(0);
  });

  // ── Branch 2: Normal case ─────────────────────────────────────────────────

  it('computes all components correctly for a typical build', () => {
    // partsSubtotal = 200_000, vendorLabour = 50_000, marginPct = 15
    const result = computeGstBreakdown({
      partsSubtotal: 200_000,
      partsListPriceSum: 260_000,
      vendorLabour: 50_000,
      marginPct: 15,
    });

    const base = 200_000 + 50_000; // 250_000
    const expectedBnMargin = base * 0.15; // 37_500
    const expectedLabourShare = 50_000 / 250_000; // 0.2
    const expectedLabourBase = 50_000 + expectedBnMargin * expectedLabourShare; // 57_500
    const expectedGstOnLabour = expectedLabourBase * 0.18; // 10_350
    const expectedPartsMarginShare = expectedBnMargin * (200_000 / 250_000); // 30_000
    const expectedGstOnPartsMargin = expectedPartsMarginShare * (18 / 118); // ≈ 4576.27
    const expectedTotal = 200_000 + 50_000 + expectedBnMargin + expectedGstOnLabour + expectedGstOnPartsMargin;

    expect(result.bnMargin).toBeCloseTo(expectedBnMargin, 2);
    expect(result.labourShare).toBeCloseTo(expectedLabourShare, 5);
    expect(result.gstOnLabour).toBeCloseTo(expectedGstOnLabour, 2);
    expect(result.gstOnPartsMargin).toBeCloseTo(expectedGstOnPartsMargin, 2);
    expect(result.total).toBeCloseTo(expectedTotal, 2);
    expect(result.partsListPriceSum).toBe(260_000);
  });

  // ── Branch 3: Parts-only (no vendor labour) ───────────────────────────────

  it('sets labourShare = 0 and gstOnLabour = 0 when vendorLabour is 0', () => {
    const result = computeGstBreakdown({
      partsSubtotal: 100_000,
      partsListPriceSum: 130_000,
      vendorLabour: 0,
      marginPct: 15,
    });

    expect(result.labourShare).toBe(0);
    expect(result.gstOnLabour).toBe(0);
    // All margin is on parts
    expect(result.gstOnPartsMargin).toBeGreaterThan(0);
  });

  // ── Branch 4: Labour-only (no parts) ─────────────────────────────────────

  it('clamps gstOnPartsMargin to 0 when partsSubtotal = 0 (labourShare = 1)', () => {
    // partsSubtotal = 0 means labourShare = 1, partsMarginShare = 0
    const result = computeGstBreakdown({
      partsSubtotal: 0,
      partsListPriceSum: 0,
      vendorLabour: 80_000,
      marginPct: 15,
    });

    expect(result.labourShare).toBe(1);
    expect(result.gstOnPartsMargin).toBe(0);
    // Labour GST = (vendorLabour + bnMargin * 1) * 0.18
    const bnMargin = 80_000 * 0.15; // 12_000
    const expectedGstOnLabour = (80_000 + bnMargin) * 0.18;
    expect(result.gstOnLabour).toBeCloseTo(expectedGstOnLabour, 2);
  });

  // ── Branch 5: Loss-sale clamp ─────────────────────────────────────────────

  it('clamps gstOnPartsMargin to 0 when partsMarginShare <= 0 (loss-sale)', () => {
    // With marginPct = 0, bnMargin = 0, partsMarginShare = 0 → clamped
    const result = computeGstBreakdown({
      partsSubtotal: 100_000,
      partsListPriceSum: 100_000,
      vendorLabour: 20_000,
      marginPct: 0,
    });

    expect(result.gstOnPartsMargin).toBe(0);
    expect(result.bnMargin).toBe(0);
    // Labour GST is still 18% on vendorLabour when bnMargin = 0
    // gstOnLabour = (vendorLabour + 0 * labourShare) * 0.18 = 20_000 * 0.18 = 3_600
    expect(result.gstOnLabour).toBeCloseTo(3_600, 2);
    // Total = partsSubtotal + vendorLabour + 0 + 3_600 + 0
    expect(result.total).toBeCloseTo(123_600, 2);
  });

  // ── Branch 6: Zero marginPct — explicit check ─────────────────────────────

  it('handles zero marginPct correctly (L7/L17 — legal explicit zero)', () => {
    const result = computeGstBreakdown({
      partsSubtotal: 50_000,
      partsListPriceSum: 65_000,
      vendorLabour: 10_000,
      marginPct: 0,
    });

    expect(result.bnMargin).toBe(0);
    expect(result.gstOnPartsMargin).toBe(0);
    // Labour GST still applies on vendorLabour: 10_000 * 0.18 = 1_800
    expect(result.gstOnLabour).toBeCloseTo(1_800, 2);
    // total = 50_000 + 10_000 + 0 + 1_800 + 0 = 61_800
    expect(result.total).toBeCloseTo(61_800, 2);
  });

  // ── Branch 7: Total computation correctness ───────────────────────────────

  it('total equals sum of all components', () => {
    const input = {
      partsSubtotal: 150_000,
      partsListPriceSum: 200_000,
      vendorLabour: 30_000,
      marginPct: 12,
    };
    const result = computeGstBreakdown(input);
    const expectedTotal =
      result.partsCostBN +
      result.vendorLabour +
      result.bnMargin +
      result.gstOnLabour +
      result.gstOnPartsMargin;

    expect(result.total).toBeCloseTo(expectedTotal, 8);
  });

  // ── Formula regression: L16 specific values ───────────────────────────────

  it('L16 formula: gstOnLabour = (vendorLabour + bnMargin × labourShare) × 0.18', () => {
    const partsSubtotal = 120_000;
    const vendorLabour = 40_000;
    const marginPct = 15;

    const result = computeGstBreakdown({
      partsSubtotal,
      partsListPriceSum: 150_000,
      vendorLabour,
      marginPct,
    });

    const base = partsSubtotal + vendorLabour; // 160_000
    const bnMargin = base * (marginPct / 100); // 24_000
    const labourShare = vendorLabour / base; // 0.25
    const labourBase = vendorLabour + bnMargin * labourShare; // 46_000
    const expectedGstOnLabour = labourBase * 0.18; // 8_280

    expect(result.gstOnLabour).toBeCloseTo(expectedGstOnLabour, 4);
  });
});
