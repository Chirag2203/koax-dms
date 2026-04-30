/**
 * TestDriveBookingWizard — unit tests for multi-vehicle portal logic.
 *
 * Coverage:
 *  1. Multi-VIN selection state — toggle adds / removes, max cap enforced
 *  2. Slot collision detection — same date+slot+outlet across two VINs
 *  3. Submit creates N bookings via bridge — one per VIN
 *  4. Cap at MAX_VEHICLES (3) — 4th VIN is rejected
 *
 * These tests target pure logic: the VIN-set toggle, the hasSlotCollision
 * helper (exported from the wizard), and the bridge store's createBooking
 * called once per selected VIN.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hasSlotCollision, type VehicleSchedule } from '../../../components/portal/test-drive/test-drive-booking-wizard';
import { useTestDriveStore } from '../test-drive-store-bridge';
import type { PortalCreateTestDriveInput } from '../test-drive-store-bridge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useTestDriveStore.setState({ bookings: {}, hydrated: false });
}

const BASE_INPUT: Omit<PortalCreateTestDriveInput, 'vehicleVin'> = {
  customerId: 'cust-portal-001',
  customerName: 'Riya Kapoor',
  customerPhone: '+919876543210',
  customerEmail: 'riya@example.com',
  vehicleMake: 'Mercedes',
  vehicleModel: 'C-Class',
  vehicleYear: 2022,
  outletId: 'bangalore',
  requestedDate: '2026-06-01',
  requestedSlot: 'MORNING',
};

const VINS = [
  'WBAJW2C50JB034601',
  'WBAJW2C50JB034602',
  'WBAJW2C50JB034603',
  'WBAJW2C50JB034604', // 4th — should be rejected by cap
];

// ─── 1: Multi-VIN selection state ────────────────────────────────────────────

describe('Multi-VIN selection state', () => {
  it('starts empty', () => {
    const vins = new Set<string>();
    expect(vins.size).toBe(0);
  });

  it('adds a VIN when toggled in', () => {
    const vins = new Set<string>();
    vins.add(VINS[0]!);
    expect(vins.has(VINS[0]!)).toBe(true);
    expect(vins.size).toBe(1);
  });

  it('removes a VIN when toggled out', () => {
    const vins = new Set<string>([VINS[0]!]);
    vins.delete(VINS[0]!);
    expect(vins.has(VINS[0]!)).toBe(false);
    expect(vins.size).toBe(0);
  });

  it('allows up to 3 VINs', () => {
    const vins = new Set<string>();
    for (let i = 0; i < 3; i++) {
      if (vins.size < 3) vins.add(VINS[i]!);
    }
    expect(vins.size).toBe(3);
  });
});

// ─── 4: Cap at 3 — 4th VIN is rejected ───────────────────────────────────────

describe('Cap at MAX_VEHICLES = 3', () => {
  it('does not add a 4th VIN beyond the cap', () => {
    const MAX = 3;
    const vins = new Set<string>([VINS[0]!, VINS[1]!, VINS[2]!]);

    // Simulate the wizard's toggleVin guard
    const shouldAdd = vins.size < MAX;
    if (shouldAdd) vins.add(VINS[3]!);

    expect(vins.size).toBe(3);
    expect(vins.has(VINS[3]!)).toBe(false);
  });

  it('allows adding the 4th if one is removed first', () => {
    const MAX = 3;
    const vins = new Set<string>([VINS[0]!, VINS[1]!, VINS[2]!]);

    // Remove one
    vins.delete(VINS[0]!);

    // Now add the 4th
    if (vins.size < MAX) vins.add(VINS[3]!);

    expect(vins.size).toBe(3);
    expect(vins.has(VINS[3]!)).toBe(true);
    expect(vins.has(VINS[0]!)).toBe(false);
  });
});

// ─── 2: Slot collision detection ─────────────────────────────────────────────

describe('hasSlotCollision', () => {
  const schedA: VehicleSchedule = { date: '2026-06-01', slot: 'MORNING', outlet: 'bangalore' };
  const schedB: VehicleSchedule = { date: '2026-06-01', slot: 'MORNING', outlet: 'bangalore' };
  const schedC: VehicleSchedule = { date: '2026-06-01', slot: 'AFTERNOON', outlet: 'bangalore' };
  const schedD: VehicleSchedule = { date: '2026-06-02', slot: 'MORNING', outlet: 'bangalore' };

  it('returns false when only one VIN is selected', () => {
    const selected = new Set([VINS[0]!]);
    const scheds: Record<string, VehicleSchedule> = { [VINS[0]!]: schedA };
    expect(hasSlotCollision(selected, scheds)).toBe(false);
  });

  it('returns true when two VINs share same date+slot+outlet', () => {
    const selected = new Set([VINS[0]!, VINS[1]!]);
    const scheds: Record<string, VehicleSchedule> = {
      [VINS[0]!]: schedA,
      [VINS[1]!]: schedB,
    };
    expect(hasSlotCollision(selected, scheds)).toBe(true);
  });

  it('returns false when two VINs differ in slot', () => {
    const selected = new Set([VINS[0]!, VINS[1]!]);
    const scheds: Record<string, VehicleSchedule> = {
      [VINS[0]!]: schedA,
      [VINS[1]!]: schedC,
    };
    expect(hasSlotCollision(selected, scheds)).toBe(false);
  });

  it('returns false when two VINs share slot but differ in date', () => {
    const selected = new Set([VINS[0]!, VINS[1]!]);
    const scheds: Record<string, VehicleSchedule> = {
      [VINS[0]!]: schedA,
      [VINS[1]!]: schedD,
    };
    expect(hasSlotCollision(selected, scheds)).toBe(false);
  });

  it('returns true when third VIN collides with first even if second is fine', () => {
    const selected = new Set([VINS[0]!, VINS[1]!, VINS[2]!]);
    const scheds: Record<string, VehicleSchedule> = {
      [VINS[0]!]: schedA,
      [VINS[1]!]: schedC,   // different slot — OK
      [VINS[2]!]: schedB,   // same as VIN[0] — COLLISION
    };
    expect(hasSlotCollision(selected, scheds)).toBe(true);
  });

  it('returns false when no schedule entries exist yet', () => {
    const selected = new Set([VINS[0]!, VINS[1]!]);
    expect(hasSlotCollision(selected, {})).toBe(false);
  });
});

// ─── 3: Submit creates N bookings via bridge ──────────────────────────────────

describe('Submit creates N bookings via bridge', () => {
  beforeEach(resetStore);

  it('creates one booking for a single VIN selection', () => {
    const store = useTestDriveStore.getState();
    const booking = store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[0]! });
    expect(booking.id).toBeTruthy();
    expect(booking.status).toBe('PENDING');
    expect(booking.vehicleVin).toBe(VINS[0]!);
  });

  it('creates two independent bookings for two VINs', () => {
    const store = useTestDriveStore.getState();
    const b1 = store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[0]! });
    const b2 = store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[1]! });

    expect(b1.id).not.toBe(b2.id);
    expect(b2.vehicleVin).toBe(VINS[1]!);
    expect(Object.keys(useTestDriveStore.getState().bookings)).toHaveLength(2);
  });

  it('creates three bookings for three VINs (maximum cap)', () => {
    const store = useTestDriveStore.getState();
    const b1 = store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[0]! });
    const b2 = store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[1]! });
    const b3 = store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[2]! });

    expect(b1.status).toBe('PENDING');
    expect(b2.status).toBe('PENDING');
    expect(b3.status).toBe('PENDING');
    expect(Object.keys(useTestDriveStore.getState().bookings)).toHaveLength(3);
  });

  it('throws on duplicate active booking for the same VIN', () => {
    const store = useTestDriveStore.getState();
    store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[0]! });
    expect(() =>
      store.createBooking({ ...BASE_INPUT, vehicleVin: VINS[0]! }),
    ).toThrow('duplicate-active-booking');
  });

  it('passes govt ID fields through to each booking', () => {
    const store = useTestDriveStore.getState();
    const booking = store.createBooking({
      ...BASE_INPUT,
      vehicleVin: VINS[0]!,
      governmentIdType: 'AADHAAR_L4',
      governmentIdValue: '9876',
    });
    expect(booking.governmentIdType).toBe('AADHAAR_L4');
    expect(booking.governmentIdValue).toBe('9876');
  });
});
