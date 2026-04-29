/**
 * Hydrator backfill unit tests — PLAN-VEHICLES-002 §B.5
 *
 * Tests:
 *   1. inferVehicleFromJC — maps JobCard fields to VehicleMaster correctly
 *   2. Idempotency — running applyBackfillToState twice on the same state
 *      does NOT increase vehicle or ownership counts
 *   3. Inventory backfill — VehicleMaster created with BN_CONSIGNMENT source
 *   4. Walk-in backfill — VehicleMaster created with SERVICE_ONLY_WALKIN +
 *      metadataIncomplete: true
 *   5. L10 skip — JC for existing VIN with conflicting owner is skipped
 */

import { describe, it, expect } from 'vitest';
import type { JobCard, Vehicle } from '@dms/types';
import type { VehiclesState } from '../vehicles-store/types';
import { inferVehicleFromJC, applyBackfillToState } from '../vehicles-store-hydrator';

/** Mirrors the safeVin helper in vehicles-store-hydrator — trim + uppercase only. */
function safeVin(raw: string): string {
  return raw.trim().toUpperCase();
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SAMPLE_JC: JobCard = {
  id: 'jc-test-001',
  jobNo: 'JC-2026-00001',
  vin: 'WBA3A5C50DF999001',
  customerId: 'customer-test-01',
  outletId: 'BLR-01',
  advisorId: 'staff-r09-001',
  technicianIds: ['tech-r11-001'],
  status: 'DELIVERED',
  priority: 'NORMAL',
  promisedAt: '2026-04-15T17:00:00.000Z',
  receivedAt: '2026-04-14T09:00:00.000Z',
  customerComplaint: 'Annual service.',
  odometerIn: 42000,
  estimatedTotal: 28000,
  labourLines: [],
  partsLines: [],
  attachments: [],
};

const SAMPLE_JC_2: JobCard = {
  ...SAMPLE_JC,
  id: 'jc-test-002',
  jobNo: 'JC-2026-00002',
  vin: 'WBA3A5C50DF999002',
  customerId: 'customer-test-02',
  outletId: 'MUM-01',
  odometerIn: 55000,
};

const SAMPLE_JC_EXISTING_VIN_DIFFERENT_CUSTOMER: JobCard = {
  ...SAMPLE_JC,
  id: 'jc-test-003',
  jobNo: 'JC-2026-00003',
  vin: 'WBA3A5C50DF999001', // same VIN as SAMPLE_JC
  customerId: 'customer-test-different', // different customer — L10 skip
  odometerIn: 50000,
};

const SAMPLE_INV_VEHICLE: Vehicle = {
  vin: 'WP0AB2A91PS100001',
  make: 'Porsche',
  model: 'Macan',
  variant: 'S',
  year: 2022,
  km: 18000,
  fuel: 'petrol',
  transmission: 'automatic',
  bodyType: 'suv',
  color: 'Crayon',
  interiorColor: 'Black leather',
  city: 'bangalore',
  price: 8500000,
  pricing: {
    exShowroom: 7500000,
    dealerMargin: 500000,
    gstOnMargin: 90000,
    tcs: 80900,
    rtoRegistration: 150000,
    roadTax: 100000,
    insurance: 80000,
    dealerWarranty: 50000,
    onRoadPrice: 8550900,
  },
  images: [],
  isCertified: true,
  certificationPoints: 210,
  previousOwners: 1,
  accidentHistory: 'No reported accidents',
  serviceHistorySummary: '2 services at authorised Porsche Centre',
  editorialCopy: 'Porsche Macan S in Crayon.',
  slug: 'porsche-macan-2022-bangalore-100001',
  listedAt: '2026-03-01T08:00:00.000Z',
  status: 'published',
  engine: '2.9L V6 Twin-Turbo',
  power: '380 PS',
  torque: '520 Nm',
  topSpeed: '272 km/h',
  acceleration: '0-100 in 4.3s',
  driveType: 'AWD',
  registrationState: 'KA',
  registrationExpiry: '2030-01-15',
  insuranceExpiry: '2027-02-28',
  warrantyExpiry: '2026-12-31',
  keyCount: 2,
  tyreCondition: '90% Tread',
};

// ─── Empty state factory ──────────────────────────────────────────────────────

function makeEmptyState(): VehiclesState {
  return {
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    salesEvents: {},
    // P3 docs state (PLAN-VEHICLES-003)
    documents: {},
    staffMeta: {},
    documentAccessEvents: [],
    // P4 cost-ledger runtime entries (SPEC-CUSTOM-BUILDS-001 L39)
    costLedger: {},
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  };
}

// ─── Tests: inferVehicleFromJC ────────────────────────────────────────────────

describe('inferVehicleFromJC', () => {
  it('maps VIN, receivedAt, and odometerIn correctly', () => {
    const vm = inferVehicleFromJC(SAMPLE_JC);
    expect(vm.vin).toBe(safeVin(SAMPLE_JC.vin));
    expect(vm.firstTouchedAt).toBe(SAMPLE_JC.receivedAt);
    expect(vm.lastKnownKm).toBe(SAMPLE_JC.odometerIn);
    expect(vm.lastKnownKmAt).toBe(SAMPLE_JC.receivedAt);
  });

  it('sets firstTouchSource to SERVICE_ONLY_WALKIN', () => {
    const vm = inferVehicleFromJC(SAMPLE_JC);
    expect(vm.firstTouchSource).toBe('SERVICE_ONLY_WALKIN');
  });

  it('sets metadataIncomplete: true', () => {
    const vm = inferVehicleFromJC(SAMPLE_JC);
    expect(vm.metadataIncomplete).toBe(true);
  });

  it('sets make and model to Unknown (JC has no vehicle metadata)', () => {
    const vm = inferVehicleFromJC(SAMPLE_JC);
    expect(vm.make).toBe('Unknown');
    expect(vm.model).toBe('Unknown');
  });

  it('maps outletId from JC directly', () => {
    const vm = inferVehicleFromJC(SAMPLE_JC);
    expect(vm.firstTouchOutletId).toBe('BLR-01');
    const vm2 = inferVehicleFromJC(SAMPLE_JC_2);
    expect(vm2.firstTouchOutletId).toBe('MUM-01');
  });

  it('sets schemaVersion to v1', () => {
    const vm = inferVehicleFromJC(SAMPLE_JC);
    expect(vm.schemaVersion).toBe('v1');
  });
});

// ─── Tests: applyBackfillToState ─────────────────────────────────────────────

describe('applyBackfillToState — service walk-in', () => {
  it('creates a VehicleMaster for a new walk-in JC VIN', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [], [SAMPLE_JC], []);
    const vin = safeVin(SAMPLE_JC.vin);
    expect(state.vehicles[vin]).toBeDefined();
    expect(state.vehicles[vin]?.metadataIncomplete).toBe(true);
    expect(state.vehicles[vin]?.firstTouchSource).toBe('SERVICE_ONLY_WALKIN');
  });

  it('creates one ownership row with SERVICE_ONLY_WALKIN source', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [], [SAMPLE_JC], []);
    const vin = safeVin(SAMPLE_JC.vin);
    const ownershipIds = state.ownershipIdByVin[vin] ?? [];
    expect(ownershipIds.length).toBe(1);
    const ownership = state.ownerships[ownershipIds[0]!];
    expect(ownership?.source).toBe('SERVICE_ONLY_WALKIN');
    expect(ownership?.customerId).toBe(SAMPLE_JC.customerId);
    expect(ownership?.state).toBe('ACTIVE');
    expect(ownership?.linkedJobCardId).toBe(SAMPLE_JC.id);
  });

  it('emits an OPEN event with a clean payload (no synthetic meta)', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [], [SAMPLE_JC], []);
    const vin = safeVin(SAMPLE_JC.vin);
    const events = state.events.filter((e) => e.vin === vin && e.kind === 'OPEN');
    expect(events.length).toBe(1);
    const payload = events[0]?.payload as Record<string, unknown>;
    expect(payload.source).toBe('SERVICE_ONLY_WALKIN');
    expect(payload.linkedJobCardId).toBe(SAMPLE_JC.id);
    // No synthetic backfill markers surface in UI payload per user requirement
    expect(payload.meta).toBeUndefined();
  });
});

describe('applyBackfillToState — inventory', () => {
  it('creates a VehicleMaster with BN_CONSIGNMENT source for inventory vehicle', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [SAMPLE_INV_VEHICLE], [], []);
    const vin = safeVin(SAMPLE_INV_VEHICLE.vin);
    expect(state.vehicles[vin]).toBeDefined();
    expect(state.vehicles[vin]?.firstTouchSource).toBe('BN_CONSIGNMENT');
    expect(state.vehicles[vin]?.make).toBe(SAMPLE_INV_VEHICLE.make);
    expect(state.vehicles[vin]?.metadataIncomplete).toBeUndefined();
  });

  it('creates one ACTIVE ownership row against cust-bn-dealer', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [SAMPLE_INV_VEHICLE], [], []);
    const vin = safeVin(SAMPLE_INV_VEHICLE.vin);
    const ownershipIds = state.ownershipIdByVin[vin] ?? [];
    expect(ownershipIds.length).toBe(1);
    const ownership = state.ownerships[ownershipIds[0]!];
    expect(ownership?.customerId).toBe('cust-bn-dealer');
    expect(ownership?.source).toBe('BN_CONSIGNMENT');
    expect(ownership?.state).toBe('ACTIVE');
  });
});

describe('applyBackfillToState — idempotency (S-V2-12)', () => {
  it('running backfill twice does NOT increase vehicle count', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [SAMPLE_INV_VEHICLE], [SAMPLE_JC], []);
    const countAfterFirst = Object.keys(state.vehicles).length;

    // Second run — same fixtures, same state
    applyBackfillToState(state, [SAMPLE_INV_VEHICLE], [SAMPLE_JC], []);
    const countAfterSecond = Object.keys(state.vehicles).length;

    expect(countAfterSecond).toBe(countAfterFirst);
  });

  it('running backfill twice does NOT increase ownership count', () => {
    const state = makeEmptyState();
    applyBackfillToState(state, [SAMPLE_INV_VEHICLE], [SAMPLE_JC], []);
    const countAfterFirst = Object.keys(state.ownerships).length;

    applyBackfillToState(state, [SAMPLE_INV_VEHICLE], [SAMPLE_JC], []);
    const countAfterSecond = Object.keys(state.ownerships).length;

    expect(countAfterSecond).toBe(countAfterFirst);
  });
});

describe('applyBackfillToState — L10 conflict skip', () => {
  it('does NOT open a second ownership for an existing VIN with a different ACTIVE owner', () => {
    const state = makeEmptyState();
    // First: backfill JC with customer-test-01 for vin WBA3A5C50DF999001
    applyBackfillToState(state, [], [SAMPLE_JC], []);
    const vin = safeVin(SAMPLE_JC.vin);
    const ownershipsBefore = (state.ownershipIdByVin[vin] ?? []).length;

    // Second: try to backfill another JC for same VIN but different customer
    applyBackfillToState(state, [], [SAMPLE_JC_EXISTING_VIN_DIFFERENT_CUSTOMER], []);
    const ownershipsAfter = (state.ownershipIdByVin[vin] ?? []).length;

    expect(ownershipsAfter).toBe(ownershipsBefore);
  });
});

describe('applyBackfillToState — existing VIN already in canonical fixtures', () => {
  it('does NOT create a duplicate VehicleMaster if VIN already exists', () => {
    const state = makeEmptyState();
    const vin = safeVin(SAMPLE_JC.vin);

    // Pre-seed state with a canonical VehicleMaster at this VIN
    state.vehicles[vin] = inferVehicleFromJC(SAMPLE_JC);
    state.vehicles[vin]!.metadataIncomplete = false; // mark as enriched

    applyBackfillToState(state, [], [SAMPLE_JC], []);

    // Should NOT have overwritten metadataIncomplete — VIN was already tracked
    expect(state.vehicles[vin]?.metadataIncomplete).toBe(false);
  });
});
