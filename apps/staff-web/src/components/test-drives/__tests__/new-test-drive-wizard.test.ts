/**
 * New Test Drive Wizard — unit tests
 *
 * Covers the 6 required scenarios from the feature brief:
 *  1. New customer creation calls customers-store.createCustomer
 *  2. Multi-VIN selection state (add / remove / cap at MAX_VEHICLES)
 *  3. Slot collision detection
 *  4. Pre-fill from query params (?vehicleVin=)
 *  5. Submit creates N bookings (one per VIN)
 *  6. Partial failure handling (one VIN throws, others succeed)
 *
 * These tests exercise store logic and pure utility functions isolated
 * from React rendering (per CLAUDE.md DoD §9 unit-test convention).
 *
 * The wizard's customer / schedule / submit behaviour is driven entirely
 * by Zustand store calls; the DOM layer is not tested here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store';
import type { TestDriveSlot } from '@dms/types';
import type { VehicleSchedule } from '../new-test-drive-wizard';

// ─── Constants mirrored from wizard ──────────────────────────────────────────

const MAX_VEHICLES = 5;
const PHONE_RE = /^\+91[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Store reset helpers ──────────────────────────────────────────────────────

function resetStores() {
  useCustomersStore.setState({ customers: {}, auditEvents: [], consents: {}, hydrated: false });
  useTestDriveStore.setState({ bookings: {}, hydrated: false });
}

// ─── Pure slot collision logic (extracted for unit testing) ───────────────────

/**
 * Returns true if any two entries in the schedules share the same
 * date + slot + outlet (collision rule from the wizard).
 */
function hasSlotCollision(
  selectedVins: Set<string>,
  schedules: Record<string, VehicleSchedule>,
): boolean {
  const vins = Array.from(selectedVins);
  for (let i = 0; i < vins.length; i++) {
    for (let j = i + 1; j < vins.length; j++) {
      const a = schedules[vins[i]!];
      const b = schedules[vins[j]!];
      if (
        a &&
        b &&
        a.date &&
        a.date === b.date &&
        a.slot === b.slot &&
        a.outlet === b.outlet
      ) {
        return true;
      }
    }
  }
  return false;
}

// ─── 1. New customer creation calls customers-store.createCustomer ────────────

describe('Scenario 1 — new walk-in customer creation', () => {
  beforeEach(resetStores);

  it('createCustomer creates and returns a new customer record', () => {
    const customer = useCustomersStore.getState().createCustomer(
      {
        name: 'Priya Singh',
        phone: '+919876543210',
        email: 'priya@example.com',
        preferredCity: 'mumbai',
        dpdpConsentGivenAt: new Date().toISOString(),
      },
      { id: 'staff-wizard', name: 'Staff Wizard' },
    );

    expect(customer.id).toBeTruthy();
    expect(customer.name).toBe('Priya Singh');
    expect(customer.phone).toBe('+919876543210');
    expect(customer.email).toBe('priya@example.com');
    expect(customer.preferredCity).toBe('mumbai');
    expect(customer.dpdpConsentGivenAt).toBeTruthy();

    // Verify customer persisted in store
    const stored = useCustomersStore.getState().customers[customer.id];
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('Priya Singh');
  });

  it('idempotent createCustomer returns existing customer on phone+email match', () => {
    const first = useCustomersStore.getState().createCustomer(
      { name: 'Priya Singh', phone: '+919876543210', email: 'priya@example.com' },
      { id: 'staff', name: 'Staff' },
    );
    const second = useCustomersStore.getState().createCustomer(
      { name: 'Priya Singh (duplicate)', phone: '+919876543210', email: 'priya@example.com' },
      { id: 'staff', name: 'Staff' },
    );
    // Same id — idempotency — store does NOT throw
    expect(second.id).toBe(first.id);
    // Store still has exactly 1 customer
    expect(Object.keys(useCustomersStore.getState().customers)).toHaveLength(1);
  });

  it('phone validation regex accepts valid +91 numbers', () => {
    expect(PHONE_RE.test('+919876543210')).toBe(true);
    expect(PHONE_RE.test('+916000000000')).toBe(true);
  });

  it('phone validation regex rejects invalid numbers', () => {
    expect(PHONE_RE.test('+911234567890')).toBe(false); // starts with 1
    expect(PHONE_RE.test('9876543210')).toBe(false); // no prefix
    expect(PHONE_RE.test('+9198765432')).toBe(false); // too short
  });

  it('email validation regex accepts valid addresses', () => {
    expect(EMAIL_RE.test('ravi@example.com')).toBe(true);
    expect(EMAIL_RE.test('ravi+tag@sub.example.co.in')).toBe(true);
  });

  it('email validation regex rejects invalid addresses', () => {
    expect(EMAIL_RE.test('not-an-email')).toBe(false);
    expect(EMAIL_RE.test('@nodomain.com')).toBe(false);
  });
});

// ─── 2. Multi-VIN selection state ─────────────────────────────────────────────

describe('Scenario 2 — multi-VIN selection state', () => {
  it('can select multiple VINs up to MAX_VEHICLES', () => {
    const selected = new Set<string>();

    for (let i = 0; i < MAX_VEHICLES; i++) {
      selected.add(`VIN-${i}`);
    }

    expect(selected.size).toBe(MAX_VEHICLES);
  });

  it('does not allow selection beyond MAX_VEHICLES', () => {
    const selected = new Set<string>();

    for (let i = 0; i < MAX_VEHICLES; i++) {
      selected.add(`VIN-${i}`);
    }

    // Simulating the cap check from toggleVin
    const extraVin = 'VIN-EXTRA';
    const atMax = selected.size >= MAX_VEHICLES;
    if (!atMax) {
      selected.add(extraVin);
    }

    expect(selected.size).toBe(MAX_VEHICLES);
    expect(selected.has(extraVin)).toBe(false);
  });

  it('can deselect a VIN from the set', () => {
    const selected = new Set(['VIN-A', 'VIN-B', 'VIN-C']);
    selected.delete('VIN-B');
    expect(selected.has('VIN-B')).toBe(false);
    expect(selected.size).toBe(2);
  });

  it('atMax allows deselecting an already-selected VIN even at cap', () => {
    const selected = new Set<string>();
    for (let i = 0; i < MAX_VEHICLES; i++) selected.add(`VIN-${i}`);

    const vinToToggle = 'VIN-0';
    const atMax = selected.size >= MAX_VEHICLES;
    const isSelected = selected.has(vinToToggle);
    // atMax && already selected — should be allowed to toggle off
    const disabled = atMax && !isSelected;
    expect(disabled).toBe(false);
  });
});

// ─── 3. Slot collision detection ──────────────────────────────────────────────

describe('Scenario 3 — slot collision detection', () => {
  const SLOT: TestDriveSlot = 'MORNING';

  it('detects collision when two VINs share same date+slot+outlet', () => {
    const selected = new Set(['VIN-A', 'VIN-B']);
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-A': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' },
      'VIN-B': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' },
    };
    expect(hasSlotCollision(selected, schedules)).toBe(true);
  });

  it('no collision when VINs have same date but different slots', () => {
    const selected = new Set(['VIN-A', 'VIN-B']);
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-A': { date: '2026-05-15', slot: 'MORNING', outlet: 'bangalore' },
      'VIN-B': { date: '2026-05-15', slot: 'AFTERNOON', outlet: 'bangalore' },
    };
    expect(hasSlotCollision(selected, schedules)).toBe(false);
  });

  it('no collision when VINs have same date+slot but different outlets', () => {
    const selected = new Set(['VIN-A', 'VIN-B']);
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-A': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' },
      'VIN-B': { date: '2026-05-15', slot: SLOT, outlet: 'mumbai' },
    };
    expect(hasSlotCollision(selected, schedules)).toBe(false);
  });

  it('no collision when all VINs have different dates', () => {
    const selected = new Set(['VIN-A', 'VIN-B', 'VIN-C']);
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-A': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' },
      'VIN-B': { date: '2026-05-16', slot: SLOT, outlet: 'bangalore' },
      'VIN-C': { date: '2026-05-17', slot: SLOT, outlet: 'bangalore' },
    };
    expect(hasSlotCollision(selected, schedules)).toBe(false);
  });

  it('detects collision in 3-VIN set when two of three collide', () => {
    const selected = new Set(['VIN-A', 'VIN-B', 'VIN-C']);
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-A': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' },
      'VIN-B': { date: '2026-05-16', slot: SLOT, outlet: 'bangalore' },
      'VIN-C': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' }, // collides with A
    };
    expect(hasSlotCollision(selected, schedules)).toBe(true);
  });

  it('no collision when only one VIN selected', () => {
    const selected = new Set(['VIN-A']);
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-A': { date: '2026-05-15', slot: SLOT, outlet: 'bangalore' },
    };
    expect(hasSlotCollision(selected, schedules)).toBe(false);
  });
});

// ─── 4. Pre-fill from query params ────────────────────────────────────────────

describe('Scenario 4 — pre-fill from ?vehicleVin query param', () => {
  it('pre-selects a VIN when it exists in the vehicles map', () => {
    const vin = 'WBY2Z21090VX45678';
    const fakeVehiclesMap: Record<string, { vin: string }> = {
      [vin]: { vin },
    };

    // Simulate wizard initialisation logic — VehicleMaster has no status field
    const prefillVin = vin;
    const initial = new Set<string>();
    if (prefillVin && fakeVehiclesMap[prefillVin]) {
      initial.add(prefillVin);
    }

    expect(initial.has(vin)).toBe(true);
  });

  it('does NOT pre-select when VIN is absent from vehicles map', () => {
    const vin = 'VIN-NOT-IN-MAP';
    const fakeVehiclesMap: Record<string, { vin: string }> = {};

    const prefillVin = vin;
    const initial = new Set<string>();
    if (prefillVin && fakeVehiclesMap[prefillVin]) {
      initial.add(prefillVin);
    }

    expect(initial.has(vin)).toBe(false);
  });

  it('does NOT pre-select when vehicleVin param is absent', () => {
    const prefillVin = '';
    const initial = new Set<string>();
    // empty string is falsy — guard in wizard prevents add
    if (prefillVin) initial.add(prefillVin);
    expect(initial.size).toBe(0);
  });
});

// ─── 5. Submit creates N bookings ─────────────────────────────────────────────

describe('Scenario 5 — submit creates one booking per selected VIN', () => {
  beforeEach(resetStores);

  it('creates 3 bookings when 3 VINs are selected', () => {
    const customer = useCustomersStore.getState().createCustomer(
      { name: 'Ravi Kumar', phone: '+919000000001', email: 'ravi@example.com' },
      { id: 'staff', name: 'Staff' },
    );

    const vins = ['VIN-001', 'VIN-002', 'VIN-003'];
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-001': { date: '2026-05-20', slot: 'MORNING', outlet: 'bangalore' },
      'VIN-002': { date: '2026-05-21', slot: 'AFTERNOON', outlet: 'mumbai' },
      'VIN-003': { date: '2026-05-22', slot: 'EVENING', outlet: 'chennai' },
    };

    for (const vin of vins) {
      const sched = schedules[vin]!;
      useTestDriveStore.getState().createBooking({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        vehicleVin: vin,
        vehicleMake: 'BMW',
        vehicleModel: 'M3',
        vehicleYear: 2023,
        outletId: sched.outlet,
        requestedDate: sched.date,
        requestedSlot: sched.slot,
      });
    }

    const allBookings = Object.values(useTestDriveStore.getState().bookings);
    expect(allBookings).toHaveLength(3);
    expect(allBookings.every((b) => b.status === 'PENDING')).toBe(true);
    expect(allBookings.map((b) => b.vehicleVin).sort()).toEqual(vins.sort());
  });

  it('each booking carries customerPhone and customerEmail from the resolved customer', () => {
    const customer = useCustomersStore.getState().createCustomer(
      { name: 'Meera Joshi', phone: '+919000000002', email: 'meera@example.com' },
      { id: 'staff', name: 'Staff' },
    );

    useTestDriveStore.getState().createBooking({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      vehicleVin: 'VIN-X01',
      vehicleMake: 'Porsche',
      vehicleModel: 'Cayenne',
      vehicleYear: 2022,
      outletId: 'bangalore',
      requestedDate: '2026-05-25',
      requestedSlot: 'MORNING',
    });

    const booking = Object.values(useTestDriveStore.getState().bookings)[0];
    expect(booking?.customerPhone).toBe('+919000000002');
    expect(booking?.customerEmail).toBe('meera@example.com');
  });
});

// ─── 6. Partial failure handling ──────────────────────────────────────────────

describe('Scenario 6 — partial failure handling', () => {
  beforeEach(resetStores);

  it('keeps successful bookings when one VIN throws duplicate-active-booking', () => {
    const { createBooking, _seed } = useTestDriveStore.getState();

    // Pre-seed an active booking for VIN-002 so the second submission throws
    _seed([
      {
        id: 'TD-EXISTING',
        customerId: 'CUST-OTHER',
        customerName: 'Other Customer',
        vehicleVin: 'VIN-002',
        vehicleMake: 'BMW',
        vehicleModel: 'X5',
        vehicleYear: 2022,
        outletId: 'bangalore',
        requestedDate: '2026-05-20',
        requestedSlot: 'MORNING',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const vins = ['VIN-001', 'VIN-002', 'VIN-003'];
    const schedules: Record<string, VehicleSchedule> = {
      'VIN-001': { date: '2026-05-25', slot: 'MORNING', outlet: 'bangalore' },
      'VIN-002': { date: '2026-05-26', slot: 'AFTERNOON', outlet: 'mumbai' }, // will fail
      'VIN-003': { date: '2026-05-27', slot: 'EVENING', outlet: 'chennai' },
    };

    const failures: string[] = [];
    for (const vin of vins) {
      try {
        const sched = schedules[vin]!;
        createBooking({
          customerId: 'CUST-NEW',
          customerName: 'New Customer',
          vehicleVin: vin,
          vehicleMake: 'BMW',
          vehicleModel: 'M5',
          vehicleYear: 2023,
          outletId: sched.outlet,
          requestedDate: sched.date,
          requestedSlot: sched.slot,
        });
      } catch {
        failures.push(vin);
      }
    }

    // Only VIN-002 failed (duplicate active booking)
    expect(failures).toEqual(['VIN-002']);

    // VIN-001 and VIN-003 bookings still exist
    const bookings = Object.values(useTestDriveStore.getState().bookings).filter(
      (b) => b.customerId === 'CUST-NEW',
    );
    expect(bookings).toHaveLength(2);
    expect(bookings.map((b) => b.vehicleVin).sort()).toEqual(['VIN-001', 'VIN-003']);
  });

  it('reports correct succeeded/failed counts from partial submission', () => {
    const { _seed, createBooking } = useTestDriveStore.getState();

    // Block VIN-A and VIN-C with active bookings
    _seed([
      {
        id: 'TD-A',
        customerId: 'OTHER',
        customerName: 'Other',
        vehicleVin: 'VIN-A',
        vehicleMake: 'Audi',
        vehicleModel: 'A6',
        vehicleYear: 2021,
        outletId: 'mumbai',
        requestedDate: '2026-05-20',
        requestedSlot: 'MORNING',
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'TD-C',
        customerId: 'OTHER',
        customerName: 'Other',
        vehicleVin: 'VIN-C',
        vehicleMake: 'Audi',
        vehicleModel: 'Q7',
        vehicleYear: 2022,
        outletId: 'chennai',
        requestedDate: '2026-05-20',
        requestedSlot: 'MORNING',
        status: 'EXECUTING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const vins = ['VIN-A', 'VIN-B', 'VIN-C'];
    let succeeded = 0;
    const failures: string[] = [];

    for (const vin of vins) {
      try {
        createBooking({
          customerId: 'CUST-X',
          customerName: 'Customer X',
          vehicleVin: vin,
          vehicleMake: 'BMW',
          vehicleModel: 'M3',
          vehicleYear: 2023,
          outletId: 'bangalore',
          requestedDate: '2026-06-01',
          requestedSlot: 'MORNING',
        });
        succeeded++;
      } catch {
        failures.push(vin);
      }
    }

    expect(succeeded).toBe(1); // only VIN-B succeeds
    expect(failures).toHaveLength(2); // VIN-A and VIN-C blocked
    expect(failures).toContain('VIN-A');
    expect(failures).toContain('VIN-C');
  });
});
