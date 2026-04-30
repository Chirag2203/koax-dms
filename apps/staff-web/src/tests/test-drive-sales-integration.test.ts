/**
 * Test-drive → Sales-deals integration test (Seam 44)
 *
 * Coverage:
 *  1.  createBooking sets linkedDealId on the booking after successful upsert
 *  2.  createBooking creates the linked deal at 'test-drive' stage
 *  3.  createBooking advances an existing new-lead deal to test-drive
 *
 * Spec reference: SPEC-TEST-DRIVE-001 Seam 44; cross-module-wiring.md §44
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCreateInput() {
  return {
    customerId: 'CUST-SEAM44',
    customerName: 'Seam44 Customer',
    vehicleVin: 'WSEAM44TEST00001',
    vehicleMake: 'BMW',
    vehicleModel: 'X5',
    vehicleYear: 2022,
    outletId: 'bangalore',
    requestedDate: '2026-05-20',
    requestedSlot: 'MORNING' as const,
  };
}

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-seam44-existing',
    customerName: 'Seam44 Customer',
    customerPhone: '',
    vehicleVin: 'WSEAM44TEST00001',
    vehicleName: '2022 BMW X5',
    amount: 0,
    stage: 'new-lead',
    source: 'walk-in',
    priority: 'medium',
    city: 'bangalore',
    outlet: 'bangalore',
    createdAt: '2026-04-01T10:00:00.000Z',
    lastActivityAt: '2026-04-01T10:00:00.000Z',
    daysInStage: 0,
    ...overrides,
  };
}

function resetStores() {
  useTestDriveStore.setState({ bookings: {}, hydrated: false });
  useSalesDealsStore.setState({ deals: {} });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Seam 44 — createBooking → upsertDealFromTestDrive', () => {
  beforeEach(resetStores);

  it('(1) createBooking sets linkedDealId on the booking after successful deal upsert', () => {
    const input = makeCreateInput();
    const booking = useTestDriveStore.getState().createBooking(input);

    // linkedDealId must be set
    expect(booking.linkedDealId).toBeTruthy();

    // Back-reference should also be set in store
    const stored = useTestDriveStore.getState().bookings[booking.id];
    expect(stored?.linkedDealId).toBeTruthy();
  });

  it('(2) createBooking creates a linked deal at test-drive stage when none exists', () => {
    const input = makeCreateInput();
    const booking = useTestDriveStore.getState().createBooking(input);

    const dealId = booking.linkedDealId;
    expect(dealId).toBeDefined();

    const deal = useSalesDealsStore.getState().deals[dealId!];
    expect(deal).toBeDefined();
    expect(deal?.stage).toBe('test-drive');
    expect(deal?.customerName).toBe('Seam44 Customer');
    expect(deal?.vehicleVin).toBe('WSEAM44TEST00001');
  });

  it('(3) createBooking advances an existing new-lead deal to test-drive and sets linkedDealId', () => {
    const existing = makeDeal({ stage: 'new-lead' });
    useSalesDealsStore.setState({ deals: { [existing.id]: existing } });

    const input = makeCreateInput();
    const booking = useTestDriveStore.getState().createBooking(input);

    // Should reference the existing deal (advanced, not a new one)
    expect(booking.linkedDealId).toBe(existing.id);

    const deal = useSalesDealsStore.getState().deals[existing.id];
    expect(deal?.stage).toBe('test-drive');
  });
});
