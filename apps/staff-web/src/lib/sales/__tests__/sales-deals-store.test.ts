/**
 * Sales-deals store unit tests — upsertDealFromTestDrive (Seam 44)
 *
 * Coverage:
 *  1.  upsertDealFromTestDrive — creates a new deal at 'test-drive' stage when none exists
 *  2.  upsertDealFromTestDrive — advances an existing 'new-lead' deal to 'test-drive'
 *  3.  upsertDealFromTestDrive — advances an existing 'contacted' deal to 'test-drive'
 *  4.  upsertDealFromTestDrive — leaves an existing 'test-drive' deal unchanged (returns same)
 *  5.  upsertDealFromTestDrive — leaves an existing 'reserved' deal unchanged
 *  6.  upsertDealFromTestDrive — ignores 'lost' deals and creates a new one
 *  7.  upsertDealFromTestDrive — ignores 'delivered' deals and creates a new one
 *  8.  upsertDealFromTestDrive — new deal has correct fields (vehicleName, source, priority, amount)
 *
 * Spec reference: SPEC-TEST-DRIVE-001 Seam 44 integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSalesDealsStore } from '../sales-deals-store';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-test-001',
    customerName: 'Ravi Sharma',
    customerPhone: '+919876543210',
    vehicleVin: 'WTEST12345VIN00001',
    vehicleName: '2021 BMW i8',
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

const BASE_INPUT = {
  customerId: 'CUST-001',
  customerName: 'Ravi Sharma',
  customerPhone: '+919876543210',
  vehicleVin: 'WTEST12345VIN00001',
  vehicleMake: 'BMW',
  vehicleModel: 'i8',
  vehicleYear: 2021,
  outletId: 'bangalore',
  city: 'bangalore',
} as const;

/** Reset store to empty state before each test */
function resetStore() {
  useSalesDealsStore.setState({ deals: {} });
}

// ─── upsertDealFromTestDrive ──────────────────────────────────────────────────

describe('upsertDealFromTestDrive', () => {
  beforeEach(resetStore);

  it('(1) creates a new deal at test-drive stage when none exists', () => {
    const deal = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(deal.stage).toBe('test-drive');
    expect(deal.customerName).toBe('Ravi Sharma');
    expect(deal.vehicleVin).toBe('WTEST12345VIN00001');
  });

  it('(2) advances an existing new-lead deal to test-drive', () => {
    const existing = makeDeal({ stage: 'new-lead' });
    useSalesDealsStore.setState({ deals: { [existing.id]: existing } });

    const result = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(result.id).toBe(existing.id);
    expect(result.stage).toBe('test-drive');
    expect(result.daysInStage).toBe(0);
  });

  it('(3) advances an existing contacted deal to test-drive', () => {
    const existing = makeDeal({ stage: 'contacted' });
    useSalesDealsStore.setState({ deals: { [existing.id]: existing } });

    const result = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(result.id).toBe(existing.id);
    expect(result.stage).toBe('test-drive');
  });

  it('(4) leaves an existing test-drive deal unchanged and returns it as-is', () => {
    const existing = makeDeal({ stage: 'test-drive' });
    useSalesDealsStore.setState({ deals: { [existing.id]: existing } });

    const result = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(result.id).toBe(existing.id);
    expect(result.stage).toBe('test-drive');
    // lastActivityAt should NOT be updated (returned as-is)
    expect(result.lastActivityAt).toBe(existing.lastActivityAt);
  });

  it('(5) leaves an existing reserved deal unchanged and returns it as-is', () => {
    const existing = makeDeal({ stage: 'reserved' });
    useSalesDealsStore.setState({ deals: { [existing.id]: existing } });

    const result = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(result.id).toBe(existing.id);
    expect(result.stage).toBe('reserved');
  });

  it('(6) ignores lost deals and creates a new test-drive deal', () => {
    const lostDeal = makeDeal({ id: 'deal-lost', stage: 'lost' });
    useSalesDealsStore.setState({ deals: { [lostDeal.id]: lostDeal } });

    const result = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(result.id).not.toBe(lostDeal.id);
    expect(result.stage).toBe('test-drive');
  });

  it('(7) ignores delivered deals and creates a new test-drive deal', () => {
    const deliveredDeal = makeDeal({ id: 'deal-delivered', stage: 'delivered' });
    useSalesDealsStore.setState({ deals: { [deliveredDeal.id]: deliveredDeal } });

    const result = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(result.id).not.toBe(deliveredDeal.id);
    expect(result.stage).toBe('test-drive');
  });

  it('(8) new deal has correct fields: vehicleName, source walk-in, priority medium, amount 0', () => {
    const deal = useSalesDealsStore.getState().upsertDealFromTestDrive(BASE_INPUT);

    expect(deal.vehicleName).toBe('2021 BMW i8');
    expect(deal.source).toBe('walk-in');
    expect(deal.priority).toBe('medium');
    expect(deal.amount).toBe(0);
    expect(deal.outlet).toBe('bangalore');
    expect(deal.city).toBe('bangalore');
  });
});
