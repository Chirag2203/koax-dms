/**
 * GST margin computation tests — SPEC-FINANCE-001 L1, L10, L20
 *
 * L1: gstAmount = max(0, salePrice - acquisitionCost - allowableRefurb) × 18/118
 * L20: discrepancy > 100 paise (₹1) triggers flag
 */

import { describe, it, expect } from 'vitest';
import {
  computeMarginPaise,
  computeGstFromMarginPaise,
  computeMarginAndGst,
  detectGstDiscrepancy,
  DISCREPANCY_TOLERANCE_PAISE,
} from '../gst-margin';

describe('computeMarginPaise', () => {
  it('computes positive margin correctly', () => {
    // sale ₹70L, acq ₹50L, refurb ₹2L → margin ₹18L
    expect(computeMarginPaise({
      salePricePaise: 70_00_00_000,
      acquisitionCostPaise: 50_00_00_000,
      allowableRefurbPaise: 2_00_00_000,
    })).toBe(18_00_00_000);
  });

  it('clamps margin to zero when acquisition cost exceeds sale price', () => {
    expect(computeMarginPaise({
      salePricePaise: 40_00_00_000,
      acquisitionCostPaise: 45_00_00_000,
      allowableRefurbPaise: 0,
    })).toBe(0);
  });

  it('clamps margin to zero when refurb cost makes it negative', () => {
    expect(computeMarginPaise({
      salePricePaise: 50_00_00_000,
      acquisitionCostPaise: 48_00_00_000,
      allowableRefurbPaise: 5_00_00_000, // refurb pushes below zero
    })).toBe(0);
  });

  it('handles exact break-even (margin = 0)', () => {
    expect(computeMarginPaise({
      salePricePaise: 50_00_00_000,
      acquisitionCostPaise: 45_00_00_000,
      allowableRefurbPaise: 5_00_00_000,
    })).toBe(0);
  });
});

describe('computeGstFromMarginPaise — L1: 18/118 formula', () => {
  it('computes GST using 18/118 formula with banker\'s rounding', () => {
    // margin 18_00_00_000 paise = ₹1.8cr (180L)
    // GST = 18_00_00_000 × 18 / 118 = 324_00_00_000 / 118 ≈ 27457627.11...
    const gst = computeGstFromMarginPaise(18_00_00_000);
    expect(gst).toBe(27457627); // rounded up (0.11...)
  });

  it('returns 0 for zero margin', () => {
    expect(computeGstFromMarginPaise(0)).toBe(0);
  });

  it('applies banker\'s rounding (half-to-even) — L11', () => {
    // 300 × 18 / 118 = 5400 / 118 = 45.7627... → rounds to 46
    const gst = computeGstFromMarginPaise(300);
    expect(gst).toBe(46);
  });
});

describe('computeMarginAndGst — combined', () => {
  it('returns both margin and GST', () => {
    const result = computeMarginAndGst({
      salePricePaise: 70_00_00_000,
      acquisitionCostPaise: 50_00_00_000,
      allowableRefurbPaise: 2_00_00_000,
    });
    expect(result.marginPaise).toBe(18_00_00_000);
    expect(result.gstPaise).toBe(computeGstFromMarginPaise(18_00_00_000));
  });
});

describe('detectGstDiscrepancy — L20', () => {
  it('does NOT flag when stored == computed', () => {
    expect(detectGstDiscrepancy(1000000, 1000000)).toBe(false);
  });

  it('does NOT flag when difference is ≤ 100 paise (₹1)', () => {
    expect(detectGstDiscrepancy(1000000, 1000100)).toBe(false);
    expect(detectGstDiscrepancy(1000000, 999900)).toBe(false);
  });

  it('flags when difference is > 100 paise (₹1)', () => {
    expect(detectGstDiscrepancy(1000000, 1000101)).toBe(true);
    expect(detectGstDiscrepancy(1000000, 999899)).toBe(true);
  });

  it('DISCREPANCY_TOLERANCE_PAISE is 100', () => {
    expect(DISCREPANCY_TOLERANCE_PAISE).toBe(100);
  });
});
