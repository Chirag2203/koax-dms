/**
 * W3.1 — Concurrent reservation guard tests.
 *
 * Coverage:
 *  1.  Two deals on same VIN; second reservation rejected with VIN_ALREADY_RESERVED
 *  2.  Excluding self by excludeDealId — moving the SAME deal back to reserved is allowed
 *  3.  Expired reservation does NOT block a new reservation
 *  4.  forceReserveOverride releases prior + reserves new + emits audit event with role + reason
 *  5.  R09 calling forceReserveOverride → UNAUTHORIZED
 *  6.  R19 calling forceReserveOverride → ok
 *
 * Spec: SPEC-SALES-001 §12 / L_S-RES-1 / W3.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSalesDealsStore, isReservationConflictError } from '../sales-deals-store';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-res-001',
    customerName: 'Arjun Mehta',
    customerPhone: '+919876543210',
    vehicleVin: 'VIN-RES-TEST-001',
    vehicleName: '2022 BMW 5 Series',
    amount: 5000000,
    stage: 'test-drive',
    source: 'walk-in',
    priority: 'high',
    city: 'bangalore',
    outlet: 'bangalore',
    createdAt: '2026-05-01T10:00:00.000Z',
    lastActivityAt: '2026-05-01T10:00:00.000Z',
    daysInStage: 2,
    ...overrides,
  };
}

const FUTURE_EXPIRY = new Date(Date.now() + 86400_000).toISOString(); // +1 day
const PAST_EXPIRY = new Date(Date.now() - 3600_000).toISOString(); // -1 hour

const SA_ACTOR = { id: 'emp-sa-001', name: 'Ravi SA', role: 'R09' };
const GM_ACTOR = { id: 'emp-gm-001', name: 'Suresh GM', role: 'R19' };

function resetStore() {
  useSalesDealsStore.setState({ deals: {}, auditEvents: [] });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('W3.1 — hasActiveReservationForVin', () => {
  beforeEach(resetStore);

  it('returns false when no deals exist for VIN', () => {
    expect(
      useSalesDealsStore.getState().hasActiveReservationForVin('VIN-RES-TEST-001'),
    ).toBe(false);
  });

  it('returns true when a reserved deal with future expiry exists', () => {
    const deal = makeDeal({ stage: 'reserved', reservationExpiresAt: FUTURE_EXPIRY });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    expect(
      useSalesDealsStore.getState().hasActiveReservationForVin('VIN-RES-TEST-001'),
    ).toBe(true);
  });

  it('returns false when only expired reservation exists', () => {
    const deal = makeDeal({ stage: 'reserved', reservationExpiresAt: PAST_EXPIRY });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    expect(
      useSalesDealsStore.getState().hasActiveReservationForVin('VIN-RES-TEST-001'),
    ).toBe(false);
  });

  it('returns true for open-ended reservation (no expiry set)', () => {
    const deal = makeDeal({ stage: 'reserved' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    expect(
      useSalesDealsStore.getState().hasActiveReservationForVin('VIN-RES-TEST-001'),
    ).toBe(true);
  });

  it('excludes the specified deal from the check (self-transition)', () => {
    const deal = makeDeal({ stage: 'reserved' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    // Excluding own deal ID → no OTHER reservation → returns false
    expect(
      useSalesDealsStore.getState().hasActiveReservationForVin(
        'VIN-RES-TEST-001',
        deal.id,
      ),
    ).toBe(false);
  });
});

describe('W3.1 — advanceStage reservation guard', () => {
  beforeEach(resetStore);

  it('(1) second reservation on same VIN throws VIN_ALREADY_RESERVED', () => {
    const deal1 = makeDeal({ id: 'deal-res-001', stage: 'test-drive' });
    const deal2 = makeDeal({
      id: 'deal-res-002',
      customerName: 'Priya Kumar',
      stage: 'test-drive',
    });
    useSalesDealsStore.setState({ deals: { [deal1.id]: deal1, [deal2.id]: deal2 } });

    // First reservation succeeds
    useSalesDealsStore.getState().advanceStage('deal-res-001', 'reserved');

    // Second reservation on same VIN should throw a typed conflict error
    let thrown: unknown;
    try {
      useSalesDealsStore.getState().advanceStage('deal-res-002', 'reserved');
    } catch (e) {
      thrown = e;
    }

    expect(isReservationConflictError(thrown)).toBe(true);
    if (isReservationConflictError(thrown)) {
      expect(thrown.error).toBe('VIN_ALREADY_RESERVED');
      expect(thrown.conflictingDealId).toBe('deal-res-001');
      expect(thrown.conflictingCustomerName).toBe('Arjun Mehta');
    }
  });

  it('(2) re-reserving the SAME deal (after a rollback) is allowed via excludeDealId', () => {
    const deal = makeDeal({ stage: 'reserved' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    // Verifies selector correctly excludes self
    expect(
      useSalesDealsStore.getState().hasActiveReservationForVin(deal.vehicleVin!, deal.id),
    ).toBe(false);

    // advanceStage on same deal → skipReservationGuard false but self-excluded correctly
    // by the store's own exclusion logic (deal.id === excludeDealId)
    const result = useSalesDealsStore.getState().advanceStage(deal.id, 'reserved', {
      skipReservationGuard: false,
    });
    expect(result.stage).toBe('reserved');
  });

  it('(3) expired reservation does NOT block a new reservation', () => {
    const expiredDeal = makeDeal({
      id: 'deal-expired',
      stage: 'reserved',
      reservationExpiresAt: PAST_EXPIRY,
    });
    const newDeal = makeDeal({
      id: 'deal-new',
      customerName: 'Nikhil Sharma',
      stage: 'test-drive',
    });
    useSalesDealsStore.setState({
      deals: { [expiredDeal.id]: expiredDeal, [newDeal.id]: newDeal },
    });

    // Should NOT throw
    const result = useSalesDealsStore.getState().advanceStage('deal-new', 'reserved');
    expect(result.stage).toBe('reserved');
  });
});

describe('W3.1 — forceReserveOverride', () => {
  beforeEach(resetStore);

  it('(4) R19 can override: releases prior reservation + reserves new + emits audit', () => {
    const priorDeal = makeDeal({
      id: 'deal-prior',
      stage: 'reserved',
      customerName: 'Old Customer',
    });
    const targetDeal = makeDeal({
      id: 'deal-target',
      stage: 'test-drive',
      customerName: 'New Customer',
    });
    useSalesDealsStore.setState({
      deals: { [priorDeal.id]: priorDeal, [targetDeal.id]: targetDeal },
      auditEvents: [],
    });

    const result = useSalesDealsStore.getState().forceReserveOverride('deal-target', {
      reason: 'Customer emergency — CEO approval',
      actor: GM_ACTOR,
    });

    const state = useSalesDealsStore.getState();

    // Prior deal released
    expect(state.deals['deal-prior']?.stage).toBe('lost');
    expect(state.deals['deal-prior']?.cancellationReason).toBe('MANUAL_CANCEL');

    // Target deal reserved
    expect(result.stage).toBe('reserved');
    expect(state.deals['deal-target']?.stage).toBe('reserved');

    // Audit event emitted
    expect(state.auditEvents).toHaveLength(1);
    const auditEvent = state.auditEvents[0]!;
    expect(auditEvent.kind).toBe('RESERVATION_FORCE_OVERRIDE');
    expect(auditEvent.actorRole).toBe('R19');
    expect(auditEvent.payload.releasedDealIds).toContain('deal-prior');
    expect(auditEvent.payload.reason).toBe('Customer emergency — CEO approval');
  });

  it('(5) R09 calling forceReserveOverride → throws UNAUTHORIZED', () => {
    const deal = makeDeal({ id: 'deal-target', stage: 'test-drive' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    expect(() =>
      useSalesDealsStore.getState().forceReserveOverride('deal-target', {
        reason: 'Trying to override',
        actor: SA_ACTOR,
      }),
    ).toThrow('UNAUTHORIZED');
  });

  it('(6) R19 calling forceReserveOverride → succeeds', () => {
    const deal = makeDeal({ id: 'deal-target', stage: 'test-drive' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal }, auditEvents: [] });

    const result = useSalesDealsStore.getState().forceReserveOverride('deal-target', {
      reason: 'GM priority override',
      actor: GM_ACTOR,
    });

    expect(result.stage).toBe('reserved');
    expect(useSalesDealsStore.getState().auditEvents).toHaveLength(1);
  });
});
