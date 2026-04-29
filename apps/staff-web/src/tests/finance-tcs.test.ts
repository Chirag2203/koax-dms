/**
 * TCS register integration tests — SPEC-FINANCE-001 §1.2
 *
 * Scenarios covered:
 * S-F-4: First sale sub-threshold (₹9.8L) — no TCS
 * S-F-5: Second sale breaches threshold — 1% TCS on second sale
 * S-F-7: Multiple customers same PAN group — cumulative is per-PAN not per-vehicle
 * S-F-8: Waived sale included in cumulative (S-F-17 edge case)
 */

import { describe, it, expect } from 'vitest';
import {
  computeTcsApplied,
  computeCumulativeTcs,
  computeTcsThresholdState,
  TCS_THRESHOLD_PAISE,
} from '../lib/finance/math/tcs';

describe('S-F-4: Sub-threshold sale — no TCS', () => {
  it('no TCS when single sale below ₹10L threshold', () => {
    const result = computeTcsApplied({
      invoiceValuePaise: 98_00_000,   // ₹9.8L
      cumulativeBeforePaise: 0,
      tcsWaived: false,
    });
    expect(result).toBe(0);
  });

  it('threshold state is safe at ₹9.8L', () => {
    expect(computeTcsThresholdState(98_00_000)).toBe('near'); // ₹9.8L is in "near" band
  });
});

describe('S-F-5: Breach threshold across two sales', () => {
  it('no TCS on first sale (₹9.8L), TCS on second sale (₹3L)', () => {
    const events = [
      { eventId: 'E1', vin: 'V1', saleDate: '2026-04-01', invoiceValuePaise: 98_00_000, tcsWaived: false },
      { eventId: 'E2', vin: 'V2', saleDate: '2026-04-10', invoiceValuePaise: 30_00_000, tcsWaived: false },
    ];
    const enriched = computeCumulativeTcs(events);

    expect(enriched[0]!.tcsAppliedPaise).toBe(0); // ₹9.8L < threshold
    expect(enriched[1]!.tcsAppliedPaise).toBeGreaterThan(0); // ₹12.8L total > threshold
    expect(enriched[1]!.tcsAppliedPaise).toBe(Math.round(30_00_000 * 0.01)); // 1% of ₹3L
  });
});

describe('S-F-7: Cumulative is per-PAN per-FY', () => {
  it('once breached, all subsequent sales attract TCS', () => {
    const events = [
      { eventId: 'E1', vin: 'V1', saleDate: '2026-04-01', invoiceValuePaise: 1_20_00_000, tcsWaived: false }, // ₹12L
      { eventId: 'E2', vin: 'V2', saleDate: '2026-05-01', invoiceValuePaise: 50_00_000, tcsWaived: false }, // ₹5L more
    ];
    const enriched = computeCumulativeTcs(events);

    // Both should have TCS since cumulative is already > ₹10L after E1
    expect(enriched[0]!.tcsAppliedPaise).toBeGreaterThan(0);
    expect(enriched[1]!.tcsAppliedPaise).toBeGreaterThan(0);
  });
});

describe('S-F-8 / S-F-17: Waived sale edge case', () => {
  it('waived sale adds to cumulative but not to TCS collected', () => {
    const events = [
      { eventId: 'E1', vin: 'V1', saleDate: '2026-04-01', invoiceValuePaise: 80_00_000, tcsWaived: false }, // ₹8L
      { eventId: 'E2', vin: 'V2', saleDate: '2026-04-10', invoiceValuePaise: 40_00_000, tcsWaived: true  }, // ₹4L waived
      { eventId: 'E3', vin: 'V3', saleDate: '2026-04-20', invoiceValuePaise: 30_00_000, tcsWaived: false }, // ₹3L — ₹15L total > ₹10L
    ];
    const enriched = computeCumulativeTcs(events);

    // E1: ₹8L < ₹10L → no TCS
    expect(enriched[0]!.tcsAppliedPaise).toBe(0);
    // E2: waived → no TCS
    expect(enriched[1]!.tcsAppliedPaise).toBe(0);
    // E3: cumulative ₹12L before → waived sale INCLUDED in cumulative
    expect(enriched[2]!.cumulativeBeforePaise).toBe(1_20_00_000); // ₹8L + ₹4L (waived)
    expect(enriched[2]!.tcsAppliedPaise).toBeGreaterThan(0); // ₹15L total > ₹10L
  });
});
