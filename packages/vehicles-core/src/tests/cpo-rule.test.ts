/**
 * Unit tests — isCpoEligible
 * Spec reference: SPEC-VEHICLES-001 §3.5
 */

import { describe, it, expect } from 'vitest';
import { isCpoEligible } from '../cpo-rule';
import type { VehicleMaster } from '@dms/types';

const NOW = '2026-04-20T12:00:00.000Z';
const VIN = 'WBA3A5C50DF123456';

const baseVehicle: VehicleMaster = {
  vin: VIN,
  make: 'BMW',
  model: 'M340i',
  year: 2018,
  color: 'Alpine White',
  rcNumber: 'KA01AB1234',
  firstTouchedAt: '2019-03-15T00:00:00.000Z',
  firstTouchSource: 'BN_SALE',
  firstTouchOutletId: 'BLR-01',
  lastKnownKm: 93000,
  lastKnownKmAt: '2026-04-01T00:00:00.000Z', // 19 days ago — fresh
  schemaVersion: 'v1',
};

function makeJC(receivedAt: string) {
  return { id: `jc-${receivedAt}`, vin: VIN, receivedAt };
}

describe('isCpoEligible', () => {
  it('returns ELIGIBLE for 4 JCs with small gaps and fresh km', () => {
    const jcs = [
      makeJC('2024-01-01T00:00:00.000Z'),
      makeJC('2024-07-01T00:00:00.000Z'),
      makeJC('2025-01-01T00:00:00.000Z'),
      makeJC('2025-07-01T00:00:00.000Z'),
    ];
    const result = isCpoEligible(VIN, jcs, [], baseVehicle, NOW);
    expect(result.badge).toBe('ELIGIBLE');
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('returns NOT_ELIGIBLE for fewer than 4 JCs (insufficiency)', () => {
    const jcs = [
      makeJC('2025-01-01T00:00:00.000Z'),
      makeJC('2025-07-01T00:00:00.000Z'),
    ];
    const result = isCpoEligible(VIN, jcs, [], baseVehicle, NOW);
    expect(result.badge).toBe('NOT_ELIGIBLE');
    expect(result.eligible).toBe(false);
  });

  it('returns AT_RISK for exactly 3 JCs (one short)', () => {
    const jcs = [
      makeJC('2024-01-01T00:00:00.000Z'),
      makeJC('2024-07-01T00:00:00.000Z'),
      makeJC('2025-01-01T00:00:00.000Z'),
    ];
    const result = isCpoEligible(VIN, jcs, [], baseVehicle, NOW);
    expect(result.badge).toBe('AT_RISK');
  });

  it('returns NOT_ELIGIBLE when km is stale (> 90 days)', () => {
    const staleVehicle = { ...baseVehicle, lastKnownKmAt: '2025-01-01T00:00:00.000Z' };
    const jcs = [
      makeJC('2024-01-01T00:00:00.000Z'),
      makeJC('2024-07-01T00:00:00.000Z'),
      makeJC('2025-01-01T00:00:00.000Z'),
      makeJC('2025-07-01T00:00:00.000Z'),
    ];
    const result = isCpoEligible(VIN, jcs, [], staleVehicle, NOW);
    expect(result.badge).toBe('NOT_ELIGIBLE');
    expect(result.reasons.some((r) => r.code === 'KM_STALE')).toBe(true);
  });

  it('returns NOT_ELIGIBLE when there is a DISPUTED warranty claim', () => {
    const jcs = [
      makeJC('2024-01-01T00:00:00.000Z'),
      makeJC('2024-07-01T00:00:00.000Z'),
      makeJC('2025-01-01T00:00:00.000Z'),
      makeJC('2025-07-01T00:00:00.000Z'),
    ];
    const warrantyClaims = [{ vin: VIN, status: 'DISPUTED' }];
    const result = isCpoEligible(VIN, jcs, warrantyClaims, baseVehicle, NOW);
    expect(result.badge).toBe('NOT_ELIGIBLE');
    expect(result.reasons.some((r) => r.code === 'DISPUTED_WARRANTY')).toBe(true);
  });

  it('VIN-B scenario: 1 JC in 12 months is NOT_ELIGIBLE (only AT_RISK when exactly 3 JCs)', () => {
    // 1 JC: count=1, far below threshold of 4. Only AT_RISK when count=3 (one short).
    // VIN-B's CPO-at-risk status in the spec refers to the UI badge shown because
    // 1 JC < 4 required — this is NOT_ELIGIBLE (no badge shown). The UI layer
    // shows an amber "at risk" indicator but the pure function returns NOT_ELIGIBLE.
    const jcs = [makeJC('2026-01-01T00:00:00.000Z')];
    const result = isCpoEligible(VIN, jcs, [], baseVehicle, NOW);
    expect(result.badge).toBe('NOT_ELIGIBLE');
    expect(result.reasons.some((r) => r.code === 'INSUFFICIENT_JC_COUNT')).toBe(true);
  });

  it('excludes JCs older than 36 months from the window', () => {
    // 3 old JCs + 1 recent = only 1 in window → NOT_ELIGIBLE (count=1, below 4)
    const jcs = [
      makeJC('2020-01-01T00:00:00.000Z'), // outside 36mo window
      makeJC('2020-07-01T00:00:00.000Z'), // outside
      makeJC('2021-01-01T00:00:00.000Z'), // outside
      makeJC('2026-01-01T00:00:00.000Z'), // inside
    ];
    const result = isCpoEligible(VIN, jcs, [], baseVehicle, NOW);
    expect(result.badge).toBe('NOT_ELIGIBLE');
    expect(result.reasons.some((r) => r.code === 'INSUFFICIENT_JC_COUNT')).toBe(true);
  });
});
