/**
 * PLAN-VEHICLES-003 Phase 2 — unit tests.
 *
 * Covers (spec §8 P2 minimums):
 * 1. emitSalesEvent creates entries in store for all 7 kinds
 * 2. SOLD with all sellerSignatures → succeeds
 * 3. SOLD with missing signature AND no override → throws SellerSignaturesIncomplete
 * 4. SOLD with R19 override + valid proofDocIds → succeeds
 * 5. Lazy expiry: markReservationExpired idempotency
 * 6. staleListingChip edge cases
 * 7. deriveSalesEvent mapping table
 * 8. deal.cancellationReason branch in deriveSalesEvent
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §12
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Stores ───────────────────────────────────────────────────────────────────

// Import the full vehicles store — no need for a partial test store.
// We use setState to inject test data per test case.
import { useVehiclesStore } from '../lib/vehicles/vehicles-store';
import { SellerSignaturesIncomplete } from '../lib/vehicles/vehicles-store/slices/sales-events-slice';
import { useSalesDealsStore } from '../lib/sales/sales-deals-store';
import { staleListingChip } from '@dms/vehicles-core';
import { deriveSalesEvent } from '../components/sales/derive-sales-event';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reset store slices to a clean state before each test */
function resetStores() {
  useVehiclesStore.setState({
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    salesEvents: {},
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  });
}

const ACTOR = { id: 'test-actor', name: 'Test Actor', role: 'R10' };
const VIN = 'WBA3A5C50DF123456';

// ─── Test: emitSalesEvent creates entries for all 7 SalesEventKinds ──────────

describe('emitSalesEvent', () => {
  beforeEach(() => resetStores());

  it('creates ACQUIRED event', () => {
    useVehiclesStore.getState().emitSalesEvent(VIN, 'ACQUIRED', {
      acquisitionCost: 3800000,
      kmAtAcquisition: 78000,
      source: 'BN_CONSIGNMENT',
    }, ACTOR);
    const events = useVehiclesStore.getState().salesEvents[VIN] ?? [];
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('ACQUIRED');
  });

  it('creates LISTED event and sets listedAt on vehicle', () => {
    // Add a vehicle master first
    useVehiclesStore.setState((s) => ({
      ...s,
      vehicles: {
        [VIN]: {
          vin: VIN, make: 'BMW', model: 'M340i', variant: '', year: 2018,
          color: 'Alpine White', rcNumber: 'KA01AB1234',
          firstTouchedAt: '2023-01-01T00:00:00.000Z',
          firstTouchSource: 'BN_CONSIGNMENT',
          firstTouchOutletId: 'BLR-01',
          lastKnownKm: 78000, lastKnownKmAt: '2023-01-01T00:00:00.000Z',
          schemaVersion: 'v1',
        },
      },
    }));
    useVehiclesStore.getState().emitSalesEvent(VIN, 'LISTED', { listPrice: 4200000, outletId: 'BLR-01' }, ACTOR);
    const events = useVehiclesStore.getState().salesEvents[VIN] ?? [];
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('LISTED');
    // L39: listedAt should be set
    expect(useVehiclesStore.getState().vehicles[VIN]!.listedAt).toBeDefined();
  });

  it('creates PRICE_CHANGED event', () => {
    useVehiclesStore.getState().emitSalesEvent(VIN, 'PRICE_CHANGED', { fromPrice: 4200000, toPrice: 3900000 }, ACTOR);
    expect(useVehiclesStore.getState().salesEvents[VIN]?.[0]?.kind).toBe('PRICE_CHANGED');
  });

  it('creates RESERVED event', () => {
    useVehiclesStore.getState().emitSalesEvent(VIN, 'RESERVED', {
      dealId: 'deal-001',
      depositAmount: 100000,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    }, ACTOR);
    expect(useVehiclesStore.getState().salesEvents[VIN]?.[0]?.kind).toBe('RESERVED');
  });

  it('creates RESERVATION_LOST event', () => {
    useVehiclesStore.getState().emitSalesEvent(VIN, 'RESERVATION_LOST', { dealId: 'deal-001', reason: 'EXPIRED' }, ACTOR);
    expect(useVehiclesStore.getState().salesEvents[VIN]?.[0]?.kind).toBe('RESERVATION_LOST');
  });

  it('creates RETURNED event', () => {
    useVehiclesStore.getState().emitSalesEvent(VIN, 'RETURNED', { salesOrderId: 'so-001', reason: 'MANUAL_CANCEL' }, ACTOR);
    expect(useVehiclesStore.getState().salesEvents[VIN]?.[0]?.kind).toBe('RETURNED');
  });
});

// ─── Test: SOLD validations ───────────────────────────────────────────────────

describe('emitSalesEvent SOLD', () => {
  beforeEach(() => resetStores());

  const basePayload = {
    salesOrderId: 'so-001',
    finalPrice: 4000000,
    flow: 'MARGIN_SCHEME' as const,
    tcsCollected: 40000,
    sellerSignatures: [
      { customerId: 'cust-001', signedAt: new Date().toISOString(), actorId: ACTOR.id },
    ],
    buyerCustomerId: 'cust-buyer',
  };

  it('SOLD with all sellerSignatures succeeds (no joint owners)', () => {
    // No ownerships in state → no joint owners required → empty signatures OK
    const payloadNoSig = { ...basePayload, sellerSignatures: [] };
    expect(() =>
      useVehiclesStore.getState().emitSalesEvent(VIN, 'SOLD', payloadNoSig, ACTOR),
    ).not.toThrow();
  });

  it('SOLD with all sellerSignatures succeeds (1 joint owner, 1 sig)', () => {
    // Add 1 joint active ownership row
    useVehiclesStore.setState((s) => ({
      ...s,
      ownerships: {
        'own-001': {
          id: 'own-001', vin: VIN, customerId: 'cust-001',
          source: 'BN_SALE' as const, state: 'ACTIVE' as const, isJoint: true,
          fromAt: '2023-01-01T00:00:00.000Z', kmAtOpen: 0,
          kmStale: false, createdBy: ACTOR.id,
          createdAt: '2023-01-01T00:00:00.000Z', schemaVersion: 'v1' as const,
        },
      },
    }));
    expect(() =>
      useVehiclesStore.getState().emitSalesEvent(VIN, 'SOLD', basePayload, ACTOR),
    ).not.toThrow();
    expect(useVehiclesStore.getState().salesEvents[VIN]?.[0]?.kind).toBe('SOLD');
  });

  it('SOLD with missing signature AND no override → throws SellerSignaturesIncomplete', () => {
    // Add 2 joint active ownership rows — only 1 sig in payload
    useVehiclesStore.setState((s) => ({
      ...s,
      ownerships: {
        'own-001': {
          id: 'own-001', vin: VIN, customerId: 'cust-001',
          source: 'BN_SALE' as const, state: 'ACTIVE' as const, isJoint: true,
          fromAt: '2023-01-01T00:00:00.000Z', kmAtOpen: 0,
          kmStale: false, createdBy: ACTOR.id,
          createdAt: '2023-01-01T00:00:00.000Z', schemaVersion: 'v1' as const,
        },
        'own-002': {
          id: 'own-002', vin: VIN, customerId: 'cust-002',
          source: 'BN_SALE' as const, state: 'ACTIVE' as const, isJoint: true,
          fromAt: '2023-01-01T00:00:00.000Z', kmAtOpen: 0,
          kmStale: false, createdBy: ACTOR.id,
          createdAt: '2023-01-01T00:00:00.000Z', schemaVersion: 'v1' as const,
        },
      },
    }));
    expect(() =>
      useVehiclesStore.getState().emitSalesEvent(VIN, 'SOLD', basePayload, ACTOR),
    ).toThrow(SellerSignaturesIncomplete);
  });

  it('SOLD with R19 override + valid proofDocIds → succeeds', () => {
    // 2 joint owners, only 1 sig — but with override
    useVehiclesStore.setState((s) => ({
      ...s,
      ownerships: {
        'own-001': {
          id: 'own-001', vin: VIN, customerId: 'cust-001',
          source: 'BN_SALE' as const, state: 'ACTIVE' as const, isJoint: true,
          fromAt: '2023-01-01T00:00:00.000Z', kmAtOpen: 0,
          kmStale: false, createdBy: ACTOR.id,
          createdAt: '2023-01-01T00:00:00.000Z', schemaVersion: 'v1' as const,
        },
        'own-002': {
          id: 'own-002', vin: VIN, customerId: 'cust-002',
          source: 'BN_SALE' as const, state: 'ACTIVE' as const, isJoint: true,
          fromAt: '2023-01-01T00:00:00.000Z', kmAtOpen: 0,
          kmStale: false, createdBy: ACTOR.id,
          createdAt: '2023-01-01T00:00:00.000Z', schemaVersion: 'v1' as const,
        },
      },
    }));
    const payloadWithOverride = {
      ...basePayload,
      override: {
        by: 'staff-r19-001',
        reason: 'Seller unreachable — POA attached',
        proofDocIds: ['doc-001'],
      },
    };
    expect(() =>
      useVehiclesStore.getState().emitSalesEvent(VIN, 'SOLD', payloadWithOverride, ACTOR),
    ).not.toThrow();
    expect(useVehiclesStore.getState().salesEvents[VIN]?.[0]?.kind).toBe('SOLD');
  });
});

// ─── Test: lazy expiry idempotency ────────────────────────────────────────────

describe('markReservationExpired', () => {
  beforeEach(() => {
    // Reset the store to fixture state — note: this replaces the full deal map
    // We inject a synthetic reserved deal
    useSalesDealsStore.setState({
      deals: {
        'deal-test-001': {
          id: 'deal-test-001',
          customerName: 'Test Customer',
          customerPhone: '+91 99999 00000',
          vehicleVin: VIN,
          amount: 4000000,
          stage: 'reserved',
          source: 'web',
          priority: 'medium',
          city: 'bangalore',
          outlet: 'BLR-01',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastActivityAt: '2026-01-01T00:00:00.000Z',
          daysInStage: 3,
          reservationExpiresAt: '2026-01-04T00:00:00.000Z', // past
        },
      },
    });
  });

  it('sets stage=lost + cancellationReason=EXPIRED', () => {
    const updated = useSalesDealsStore.getState().markReservationExpired('deal-test-001');
    expect(updated.stage).toBe('lost');
    expect(updated.cancellationReason).toBe('EXPIRED');
  });

  it('is idempotent — second call returns same deal without mutation', () => {
    useSalesDealsStore.getState().markReservationExpired('deal-test-001');
    const updatedAgain = useSalesDealsStore.getState().markReservationExpired('deal-test-001');
    expect(updatedAgain.stage).toBe('lost');
    expect(updatedAgain.cancellationReason).toBe('EXPIRED');
  });
});

// ─── Test: staleListingChip ───────────────────────────────────────────────────

describe('staleListingChip', () => {
  const DAYS_MS = 24 * 60 * 60 * 1000;

  function daysAgo(n: number): string {
    return new Date(Date.now() - n * DAYS_MS).toISOString();
  }

  it('returns very-stale-180d when listed > 180 days ago', () => {
    expect(staleListingChip(daysAgo(181), new Date().toISOString())).toBe('very-stale-180d');
  });

  it('returns stale-90d when listed > 90 days ago (< 180)', () => {
    expect(staleListingChip(daysAgo(120), new Date().toISOString())).toBe('stale-90d');
  });

  it('returns null when listed < 90 days ago', () => {
    expect(staleListingChip(daysAgo(45), new Date().toISOString())).toBeNull();
  });

  it('returns null when dealStage is reserved (L23)', () => {
    expect(staleListingChip(daysAgo(200), new Date().toISOString(), 'reserved')).toBeNull();
  });
});

// ─── Test: deriveSalesEvent mapping ──────────────────────────────────────────

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-001',
    customerName: 'Test Customer',
    customerPhone: '+91 99999 00000',
    vehicleVin: VIN,
    amount: 4000000,
    stage: 'new-lead',
    source: 'web',
    priority: 'medium',
    city: 'bangalore',
    outlet: 'BLR-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActivityAt: '2026-01-01T00:00:00.000Z',
    daysInStage: 1,
    ...overrides,
  };
}

describe('deriveSalesEvent mapping table', () => {
  it('new-lead → reserved emits RESERVED', () => {
    const deal = makeDeal({ stage: 'reserved', reservationExpiresAt: '2026-04-24T00:00:00.000Z' });
    const result = deriveSalesEvent('new-lead', 'reserved', deal);
    expect(result?.kind).toBe('RESERVED');
    expect((result?.payload as Record<string, unknown>)?.dealId).toBe('deal-001');
    expect((result?.payload as Record<string, unknown>)?.expiresAt).toBe('2026-04-24T00:00:00.000Z');
  });

  it('contacted → reserved emits RESERVED with default 72h expiry when no reservationExpiresAt', () => {
    const deal = makeDeal({ stage: 'reserved' });
    const before = Date.now();
    const result = deriveSalesEvent('contacted', 'reserved', deal);
    const after = Date.now();
    expect(result?.kind).toBe('RESERVED');
    const expiresAt = new Date((result?.payload as Record<string, unknown>)?.expiresAt as string).getTime();
    const expectedMin = before + 72 * 3600 * 1000;
    const expectedMax = after + 72 * 3600 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(expectedMin - 1000);
    expect(expiresAt).toBeLessThanOrEqual(expectedMax + 1000);
  });

  it('reserved → lost (EXPIRED) emits RESERVATION_LOST(EXPIRED)', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'EXPIRED' });
    const result = deriveSalesEvent('reserved', 'lost', deal);
    expect(result?.kind).toBe('RESERVATION_LOST');
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('EXPIRED');
  });

  it('reserved → lost (BUYER_WITHDREW) emits RESERVATION_LOST(CANCELLED)', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'BUYER_WITHDREW' });
    const result = deriveSalesEvent('reserved', 'lost', deal);
    expect(result?.kind).toBe('RESERVATION_LOST');
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('CANCELLED');
  });

  it('sales-order → delivered returns null (SOLD via SoCompleteDialog only)', () => {
    const deal = makeDeal({ stage: 'delivered' });
    const result = deriveSalesEvent('sales-order', 'delivered', deal);
    expect(result).toBeNull();
  });

  it('delivered → lost emits RETURNED', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'MANUAL_CANCEL' });
    const result = deriveSalesEvent('delivered', 'lost', deal);
    expect(result?.kind).toBe('RETURNED');
    expect((result?.payload as Record<string, unknown>)?.salesOrderId).toBe('deal-001');
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('MANUAL_CANCEL');
  });

  it('contacted → test-drive returns null (no event needed)', () => {
    const deal = makeDeal({ stage: 'test-drive' });
    const result = deriveSalesEvent('contacted', 'test-drive', deal);
    expect(result).toBeNull();
  });
});

// ─── Test: cancellationReason branch ─────────────────────────────────────────

describe('deriveSalesEvent cancellationReason branch (L26)', () => {
  it('EXPIRED reason → RESERVATION_LOST with reason EXPIRED', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'EXPIRED' });
    const result = deriveSalesEvent('reserved', 'lost', deal);
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('EXPIRED');
  });

  it('BUYER_WITHDREW reason → RESERVATION_LOST with reason CANCELLED', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'BUYER_WITHDREW' });
    const result = deriveSalesEvent('reserved', 'lost', deal);
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('CANCELLED');
  });

  it('INVENTORY_SOLD reason → RESERVATION_LOST with reason CANCELLED', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'INVENTORY_SOLD' });
    const result = deriveSalesEvent('reserved', 'lost', deal);
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('CANCELLED');
  });

  it('MANUAL_CANCEL reason → RESERVATION_LOST with reason CANCELLED', () => {
    const deal = makeDeal({ stage: 'lost', cancellationReason: 'MANUAL_CANCEL' });
    const result = deriveSalesEvent('reserved', 'lost', deal);
    expect((result?.payload as Record<string, unknown>)?.reason).toBe('CANCELLED');
  });
});
