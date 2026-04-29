/**
 * TCS computation tests — SPEC-FINANCE-001 L2, L3, L21
 *
 * L2: 1% TCS on sale value when cumulative exceeds ₹10L per PAN per FY.
 * L3: Waived events excluded from TCS applied but included in cumulative purchase total.
 * L21: 4-state threshold: safe < ₹6L, approaching ₹6L–₹8L, near ₹8L–₹10L, breached ≥ ₹10L.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTcsThresholdState,
  computeTcsApplied,
  computeCumulativeTcs,
  TCS_THRESHOLD_PAISE,
  TCS_APPROACHING_LOWER_PAISE,
  TCS_NEAR_LOWER_PAISE,
} from '../tcs';

describe('TCS constants — L21', () => {
  it('threshold is ₹10L (1_00_00_000 paise)', () => {
    expect(TCS_THRESHOLD_PAISE).toBe(1_00_00_000);
  });
  it('approaching lower is ₹6L', () => {
    expect(TCS_APPROACHING_LOWER_PAISE).toBe(60_00_000);
  });
  it('near lower is ₹8L', () => {
    expect(TCS_NEAR_LOWER_PAISE).toBe(80_00_000);
  });
});

describe('computeTcsThresholdState — L21', () => {
  it('safe below ₹6L', () => {
    expect(computeTcsThresholdState(59_99_999)).toBe('safe');
    expect(computeTcsThresholdState(0)).toBe('safe');
  });

  it('approaching at exactly ₹6L', () => {
    expect(computeTcsThresholdState(60_00_000)).toBe('approaching');
  });

  it('approaching between ₹6L–₹8L', () => {
    expect(computeTcsThresholdState(70_00_000)).toBe('approaching');
    expect(computeTcsThresholdState(79_99_999)).toBe('approaching');
  });

  it('near at exactly ₹8L', () => {
    expect(computeTcsThresholdState(80_00_000)).toBe('near');
  });

  it('near between ₹8L–₹10L', () => {
    expect(computeTcsThresholdState(90_00_000)).toBe('near');
    expect(computeTcsThresholdState(99_99_999)).toBe('near');
  });

  it('breached at exactly ₹10L', () => {
    expect(computeTcsThresholdState(1_00_00_000)).toBe('breached');
  });

  it('breached above ₹10L', () => {
    expect(computeTcsThresholdState(1_50_00_000)).toBe('breached');
  });
});

describe('computeTcsApplied — L2, L3', () => {
  // Note: TCS_THRESHOLD_PAISE = 1_00_00_000 (₹10,00,000 = ₹10L)
  // ₹10L in paise = 1_00_00_000. ₹4L = 40_00_000. ₹9L = 90_00_000. ₹11L = 1_10_00_000.
  it('applies 0 TCS when cumulative after is below threshold', () => {
    const result = computeTcsApplied({
      invoiceValuePaise: 40_00_000,       // ₹4L
      cumulativeBeforePaise: 50_00_000,   // ₹5L before → ₹9L after (below ₹10L)
      tcsWaived: false,
    });
    expect(result).toBe(0);
  });

  it('applies 1% TCS on full invoice value when threshold is breached', () => {
    // ₹8L before + ₹5L sale = ₹13L total > ₹10L threshold
    const invoiceValuePaise = 5_00_00_000; // ₹5L (₹50,00,000 paise)
    const result = computeTcsApplied({
      invoiceValuePaise,
      cumulativeBeforePaise: 8_00_00_000, // ₹8L before
      tcsWaived: false,
    });
    // Once above ₹10L, 1% on the full invoice per L2
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(Math.round(invoiceValuePaise * 0.01));
  });

  it('applies 0 TCS when waived — L3', () => {
    const result = computeTcsApplied({
      invoiceValuePaise: 50_00_00_000,  // huge sale well above threshold
      cumulativeBeforePaise: 2_00_00_000,
      tcsWaived: true,                  // L3: waived
    });
    expect(result).toBe(0);
  });

  it('applies full 1% TCS when cumulative already breached', () => {
    const invoiceValuePaise = 20_00_00_000; // ₹20L
    const result = computeTcsApplied({
      invoiceValuePaise,
      cumulativeBeforePaise: 2_00_00_000_00, // already above ₹10L
      tcsWaived: false,
    });
    expect(result).toBe(Math.round(invoiceValuePaise * 0.01));
  });
});

describe('computeCumulativeTcs — S-F-17: waiver edge case (L3)', () => {
  it('waived events increment cumulative but produce zero TCS', () => {
    // ₹5L = 5_00_00_000 paise, ₹3L = 3_00_00_000 paise, etc.
    // TCS_THRESHOLD_PAISE = 1_00_00_000 (₹10L)
    // We need values that sum above ₹10L = 1_00_00_000 paise
    // ₹5L = 50_00_000, ₹3L = 30_00_000, ₹4L = 40_00_000 → total ₹12L = 1_20_00_000 > threshold ✓
    const events = [
      {
        eventId: 'E1',
        vin: 'VIN1',
        saleDate: '2026-04-10',
        invoiceValuePaise: 50_00_000, // ₹5L
        tcsWaived: false,
      },
      {
        eventId: 'E2',
        vin: 'VIN2',
        saleDate: '2026-04-15',
        invoiceValuePaise: 30_00_000, // ₹3L — waived
        tcsWaived: true,
      },
      {
        eventId: 'E3',
        vin: 'VIN3',
        saleDate: '2026-04-20',
        invoiceValuePaise: 40_00_000, // ₹4L — cumulative ₹12L, TCS applies
        tcsWaived: false,
      },
    ];

    const enriched = computeCumulativeTcs(events);

    // E2 (waived) should have 0 TCS but increment cumulative
    expect(enriched[1]!.tcsAppliedPaise).toBe(0);

    // E3: cumulative ₹5L+₹3L=₹8L before E3, E3 brings to ₹12L > ₹10L threshold
    expect(enriched[2]!.cumulativeAfterPaise).toBe(1_20_00_000);
    expect(enriched[2]!.tcsAppliedPaise).toBeGreaterThan(0);
  });
});
