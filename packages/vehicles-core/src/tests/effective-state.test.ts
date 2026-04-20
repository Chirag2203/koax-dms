/**
 * Unit tests — effectiveState
 * Spec reference: SPEC-VEHICLES-001 §2.5
 */

import { describe, it, expect } from 'vitest';
import { effectiveState } from '../effective-state';
import type { VehicleOwnership } from '@dms/types';

const NOW = '2026-04-20T12:00:00.000Z';

function makeRow(overrides: Partial<VehicleOwnership>): VehicleOwnership {
  return {
    id: 'own-test',
    vin: 'WBA3A5C50DF123456',
    customerId: 'cust-test',
    source: 'BN_SALE',
    state: 'ACTIVE',
    isJoint: false,
    fromAt: '2023-01-01T00:00:00.000Z',
    kmAtOpen: 10000,
    kmStale: false,
    createdBy: 'staff-1',
    createdAt: '2023-01-01T00:00:00.000Z',
    schemaVersion: 'v1',
    ...overrides,
  };
}

describe('effectiveState', () => {
  it('returns PENDING_CLAIM for PENDING_CLAIM rows', () => {
    expect(effectiveState(makeRow({ state: 'PENDING_CLAIM' }), NOW, 0)).toBe('PENDING_CLAIM');
  });

  it('returns REJECTED for REJECTED rows', () => {
    expect(effectiveState(makeRow({ state: 'REJECTED' }), NOW, 0)).toBe('REJECTED');
  });

  it('returns TRANSFERRED for TRANSFERRED rows', () => {
    expect(effectiveState(makeRow({ state: 'TRANSFERRED' }), NOW, 0)).toBe('TRANSFERRED');
  });

  it('returns ACTIVE for ACTIVE rows with no peers', () => {
    expect(effectiveState(makeRow({ state: 'ACTIVE' }), NOW, 0)).toBe('ACTIVE');
  });

  it('returns ACTIVE_JOINT for ACTIVE joint row with 1 peer', () => {
    expect(
      effectiveState(makeRow({ state: 'ACTIVE', isJoint: true }), NOW, 1),
    ).toBe('ACTIVE_JOINT');
  });

  it('returns ACTIVE (not ACTIVE_JOINT) for ACTIVE joint row with 0 peers', () => {
    // Orphaned joint row (peer was closed) → falls back to plain ACTIVE
    expect(
      effectiveState(makeRow({ state: 'ACTIVE', isJoint: true }), NOW, 0),
    ).toBe('ACTIVE');
  });

  it('returns GRACE for REVOKED row whose graceUntilAt is in the future', () => {
    const row = makeRow({
      state: 'REVOKED',
      toAt: '2026-04-15T00:00:00.000Z',
      graceUntilAt: '2026-04-22T00:00:00.000Z', // 2026-04-22 > now(2026-04-20) → GRACE
    });
    expect(effectiveState(row, NOW, 0)).toBe('GRACE');
  });

  it('returns REVOKED for REVOKED row whose graceUntilAt has passed', () => {
    const row = makeRow({
      state: 'REVOKED',
      toAt: '2026-04-01T00:00:00.000Z',
      graceUntilAt: '2026-04-08T00:00:00.000Z', // past
    });
    expect(effectiveState(row, NOW, 0)).toBe('REVOKED');
  });

  it('returns REVOKED for REVOKED row with no graceUntilAt', () => {
    const row = makeRow({ state: 'REVOKED' });
    expect(effectiveState(row, NOW, 0)).toBe('REVOKED');
  });

  it('VIN-C scenario: Karan in grace (today 2026-04-20, grace until 2026-04-22)', () => {
    const karanRow = makeRow({
      state: 'REVOKED',
      toAt: '2026-04-15T00:00:00.000Z',
      graceUntilAt: '2026-04-22T00:00:00.000Z',
    });
    expect(effectiveState(karanRow, NOW, 0)).toBe('GRACE');
  });
});
