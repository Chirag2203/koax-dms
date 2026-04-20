/**
 * Unit tests — computeGstMargin
 *
 * 10 cases per spec §8 P1 minimums.
 * Spec reference: PLAN-VEHICLES-003 §2.1, §8, S-V3-15, S-V3-22, S-V3-23
 */

import { describe, it, expect } from 'vitest';
import { computeGstMargin } from '../gst-margin';

describe('computeGstMargin — MARGIN_SCHEME', () => {
  it('MS profit: 12L sale / 10L acquisition → margin 2L, GST 30508', () => {
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 1_200_000,
      acquisitionCost: 1_000_000,
    });
    expect(result.margin).toBe(200_000);
    expect(result.gstAmount).toBe(30_508); // round(200000 × 18/118)
    expect(result.tcsApplicable).toBe(true);
    expect(result.tcsAmount).toBe(12_000); // TCS on gross, independent of margin (S-V3-15)
  });

  it('MS loss: 11L sale / 12L acquisition → margin 0, GST 0, TCS 11000 (on gross)', () => {
    // S-V3-15: TCS keys off salePrice (gross), not margin — loss sale still triggers TCS
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 1_100_000,
      acquisitionCost: 1_200_000,
    });
    expect(result.margin).toBe(0);       // clamped at 0
    expect(result.gstAmount).toBe(0);    // no GST on zero margin
    expect(result.tcsApplicable).toBe(true);
    expect(result.tcsAmount).toBe(11_000); // 11L × 1%
  });

  it('MS zero margin: 10L sale / 10L acquisition → margin 0, GST 0', () => {
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 1_000_000,
      acquisitionCost: 1_000_000,
    });
    expect(result.margin).toBe(0);
    expect(result.gstAmount).toBe(0);
  });

  it('MS negative margin (9L sale / 10L acq) → clamped margin 0, GST 0', () => {
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 900_000,
      acquisitionCost: 1_000_000,
    });
    expect(result.margin).toBe(0);
    expect(result.gstAmount).toBe(0);
    expect(result.tcsApplicable).toBe(false); // 9L ≤ 10L
  });
});

describe('computeGstMargin — CONSIGNMENT_COMMISSION', () => {
  it('COMM default pct: 15L, no pct → commissionEarned 225000, commissionGst 40500 (additive × 18/100)', () => {
    const result = computeGstMargin({
      flow: 'CONSIGNMENT_COMMISSION',
      salePrice: 1_500_000,
    });
    expect(result.commissionEarned).toBe(225_000); // 15L × 15/100
    expect(result.commissionGst).toBe(40_500);     // 225000 × 18/100 (additive, L25)
    expect(result.commissionPct).toBe(15);
  });

  it('COMM custom pct 20: 15L, pct 20 → 300000, 54000', () => {
    const result = computeGstMargin({
      flow: 'CONSIGNMENT_COMMISSION',
      salePrice: 1_500_000,
      commissionPct: 20,
    });
    expect(result.commissionEarned).toBe(300_000);
    expect(result.commissionGst).toBe(54_000);
  });

  it('COMM explicit zero (S-V3-22): commissionPct:0 → 0,0 (does not fall through to default)', () => {
    // L36 + S-V3-22: explicit 0 is a valid value and MUST NOT fall through to DEFAULT_COMMISSION_PCT
    const result = computeGstMargin({
      flow: 'CONSIGNMENT_COMMISSION',
      salePrice: 1_500_000,
      commissionPct: 0,
    });
    expect(result.commissionEarned).toBe(0);
    expect(result.commissionGst).toBe(0);
    expect(result.commissionPct).toBe(0); // explicitly 0, not 15
  });
});

describe('computeGstMargin — TCS boundary (L35, S-V3-23)', () => {
  it('TCS strict boundary: salePrice = 1_000_000 → tcsApplicable=false (strict >, L35)', () => {
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 1_000_000,
      acquisitionCost: 800_000,
    });
    expect(result.tcsApplicable).toBe(false);
    expect(result.tcsAmount).toBe(0);
  });

  it('TCS strict boundary: salePrice = 1_000_001 → tcsApplicable=true, tcsAmount=10000', () => {
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 1_000_001,
      acquisitionCost: 800_000,
    });
    expect(result.tcsApplicable).toBe(true);
    expect(result.tcsAmount).toBe(10_000); // round(1000001 × 0.01) = 10000
  });

  it('TCS waived (L18): salePrice 15L, tcsWaived=true → tcsApplicable=false, tcsAmount=0', () => {
    const result = computeGstMargin({
      flow: 'MARGIN_SCHEME',
      salePrice: 1_500_000,
      acquisitionCost: 1_000_000,
      tcsWaived: true,
    });
    expect(result.tcsApplicable).toBe(false);
    expect(result.tcsAmount).toBe(0);
    expect(result.tcsWaived).toBe(true);
  });
});
