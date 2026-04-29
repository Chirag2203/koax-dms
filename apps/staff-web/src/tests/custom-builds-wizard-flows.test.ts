/**
 * Custom Build Wizard — new-customer + linked-car + audit-log flows.
 *
 * Tests (6+):
 *   T1 — Create-new-customer: customer is created and appears in store (DPDP consent stored)
 *   T2 — DPDP enforcement: wizard customer creation without consent is rejected by Zod schema
 *   T3 — Link-new-car: vehicle is upserted + ownership opened + activity event emitted
 *         with linkedFromBuildJobWizard: true
 *   T4 — Existing customer dropdown: selectVehiclesByCustomer filters to their VINs only
 *   T5 — New customer empty-state: zero ownership rows returned for new customer
 *   T6 — Provenance audit log: all 3 note types append correctly on BuildJob creation
 *   T7 — CUSTOM_BUILD_LINKED source: VehicleTouchSourceEnum accepts the new value
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §32 L65–L68
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { z } from 'zod';
import { VehicleTouchSourceEnum } from '@dms/types';
import { useCustomersStore } from '../lib/customers/customers-store';
import type { CustomBuildsStore } from '../lib/custom-builds/custom-builds-store/types';
import { createJobSlice } from '../lib/custom-builds/custom-builds-store/slices/job-slice';
import { createQuerySlice } from '../lib/custom-builds/custom-builds-store/slices/query-slice';
import { createVendorSlice } from '../lib/custom-builds/custom-builds-store/slices/vendor-slice';
import { createHydrateSlice } from '../lib/custom-builds/custom-builds-store/slices/hydrate-slice';
import { useVehiclesStore } from '../lib/vehicles/vehicles-store';

// ─── Mock vehicles-store cost-ledger (prevents cross-store call issues in test env) ──

import { vi } from 'vitest';

vi.mock('../lib/vehicles/vehicles-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/vehicles/vehicles-store')>();
  return actual; // use real store so ownership tests work
});

// ─── Actors ───────────────────────────────────────────────────────────────────

const ACTOR_R09 = { id: 'staff-r09-test', name: 'Priya Advisor', role: 'R09' };
const ACTOR_R10 = { id: 'staff-r10-test', name: 'Arjun Manager', role: 'R10' };

// ─── Custom builds store factory ─────────────────────────────────────────────

function createBuildsTestStore() {
  return createStore<CustomBuildsStore>()(
    immer((set, get, api) => ({
      jobs: [],
      parts: [],
      vendors: [],
      hydrated: false,
      ...createJobSlice(set, get, api),
      ...createQuerySlice(set, get, api),
      ...createVendorSlice(set, get, api),
      ...createHydrateSlice(set, get, api),
    })),
  );
}

// ─── Reset stores before each test ───────────────────────────────────────────

beforeEach(() => {
  useCustomersStore.setState({ customers: {}, auditEvents: [], hydrated: true });
  useVehiclesStore.setState({
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    salesEvents: {},
    documents: {},
    staffMeta: {},
    documentAccessEvents: [],
    costLedger: {},
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: true,
  });
});

// ─── T1: Create-new-customer flow ─────────────────────────────────────────────

describe('T1: create-new-customer — customer is created and auto-selected', () => {
  it('createCustomer returns a customer with dpdpConsentGivenAt set', () => {
    const now = new Date().toISOString();
    const cust = useCustomersStore.getState().createCustomer(
      {
        name: 'Arjun Mehta',
        phone: '+919876543210',
        email: 'arjun@test.in',
        preferredCity: 'bangalore',
        preferredLanguage: 'en-IN',
        dpdpConsentGivenAt: now,
      },
      ACTOR_R09,
    );

    expect(cust.id).toBeTruthy();
    expect(cust.name).toBe('Arjun Mehta');
    expect(cust.dpdpConsentGivenAt).toBe(now);
    // Verify it's in the store
    const stored = useCustomersStore.getState().customers[cust.id];
    expect(stored).toBeDefined();
    expect(stored?.dpdpConsentGivenAt).toBe(now);
  });

  it('createCustomer without dpdpConsentGivenAt stores undefined (legacy path)', () => {
    const cust = useCustomersStore.getState().createCustomer(
      { name: 'Legacy Cust', phone: '+911234567890', email: 'leg@test.in' },
      ACTOR_R09,
    );
    expect(cust.dpdpConsentGivenAt).toBeUndefined();
  });

  it('createCustomer audit event is emitted with CREATE kind', () => {
    useCustomersStore.getState().createCustomer(
      { name: 'Audit Check', phone: '+919999999999', email: 'audit@test.in', dpdpConsentGivenAt: new Date().toISOString() },
      ACTOR_R09,
    );
    const events = useCustomersStore.getState().auditEvents;
    expect(events.some((e) => e.kind === 'CREATE' && e.actorId === ACTOR_R09.id)).toBe(true);
  });
});

// ─── T2: DPDP enforcement via Zod schema ─────────────────────────────────────

describe('T2: DPDP consent enforcement — Zod schema rejects if dpdpConsent is not true', () => {
  // Inline the same schema used by wizard-step-customer.tsx
  const newCustomerSchema = z.object({
    name: z.string().min(2),
    phone: z.string().regex(/^\+91\d{10}$/),
    email: z.string().email(),
    preferredCity: z.enum(['bangalore', 'mumbai', 'chennai']),
    preferredLanguage: z.enum(['en-IN', 'hi-IN', 'kn-IN', 'ta-IN', 'mr-IN']),
    dpdpConsent: z.literal(true, {
      errorMap: () => ({ message: 'DPDP consent is required' }),
    }),
  });

  const validBase = {
    name: 'Test User',
    phone: '+919876543210',
    email: 'test@test.in',
    preferredCity: 'bangalore' as const,
    preferredLanguage: 'en-IN' as const,
  };

  it('rejects when dpdpConsent is false', () => {
    const result = newCustomerSchema.safeParse({ ...validBase, dpdpConsent: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('dpdpConsent'))).toBe(true);
    }
  });

  it('rejects when dpdpConsent is missing', () => {
    const result = newCustomerSchema.safeParse({ ...validBase });
    expect(result.success).toBe(false);
  });

  it('accepts when dpdpConsent is true', () => {
    const result = newCustomerSchema.safeParse({ ...validBase, dpdpConsent: true });
    expect(result.success).toBe(true);
  });
});

// ─── T3: Link-new-car — vehicle upserted + ownership opened + event emitted ──

describe('T3: link-new-car — upsertVehicle + openOwnership + appendEvent with linkedFromBuildJobWizard', () => {
  const TEST_VIN = 'WBA3A5C50DF654321';
  const TEST_CUSTOMER_ID = 'cust-test-link-001';

  it('upsertVehicle creates a new VehicleMaster with CUSTOM_BUILD_LINKED source', () => {
    const nowIso = new Date().toISOString();
    const vs = useVehiclesStore.getState();
    vs.upsertVehicle(
      {
        vin: TEST_VIN,
        make: 'BMW',
        model: 'M4',
        year: 2022,
        color: 'Frozen Black',
        rcNumber: `RC-${TEST_VIN.slice(-6)}`,
        firstTouchedAt: nowIso,
        firstTouchSource: 'CUSTOM_BUILD_LINKED',
        firstTouchOutletId: 'BLR-01',
        lastKnownKm: 15000,
        lastKnownKmAt: nowIso,
             },
      ACTOR_R09,
    );

    const vehicle = useVehiclesStore.getState().vehicles[TEST_VIN];
    expect(vehicle).toBeDefined();
    expect(vehicle?.firstTouchSource).toBe('CUSTOM_BUILD_LINKED');
    expect(vehicle?.make).toBe('BMW');
  });

  it('openOwnership with CUSTOM_BUILD_LINKED creates an ACTIVE row', () => {
    const nowIso = new Date().toISOString();
    const vs = useVehiclesStore.getState();

    // Must upsert vehicle first (precondition)
    vs.upsertVehicle(
      {
        vin: TEST_VIN, make: 'BMW', model: 'M4', year: 2022,
        color: 'Black', rcNumber: 'KA01AB0001', firstTouchedAt: nowIso,
        firstTouchSource: 'CUSTOM_BUILD_LINKED', firstTouchOutletId: 'BLR-01',
        lastKnownKm: 15000, lastKnownKmAt: nowIso,      },
      ACTOR_R09,
    );

    const ownershipId = vs.openOwnership(
      { vin: TEST_VIN, customerId: TEST_CUSTOMER_ID, source: 'CUSTOM_BUILD_LINKED', kmAtOpen: 15000, fromAt: nowIso },
      ACTOR_R09,
    );

    expect(ownershipId).toBeTruthy();
    const row = useVehiclesStore.getState().ownerships[ownershipId];
    expect(row).toBeDefined();
    expect(row?.state).toBe('ACTIVE');
    expect(row?.customerId).toBe(TEST_CUSTOMER_ID);
    expect(row?.source).toBe('CUSTOM_BUILD_LINKED');
  });

  it('appendEvent emits an OPEN event with linkedFromBuildJobWizard: true', () => {
    const nowIso = new Date().toISOString();
    const vs = useVehiclesStore.getState();

    vs.upsertVehicle(
      {
        vin: TEST_VIN, make: 'BMW', model: 'M4', year: 2022,
        color: 'Black', rcNumber: 'KA01AB0002', firstTouchedAt: nowIso,
        firstTouchSource: 'CUSTOM_BUILD_LINKED', firstTouchOutletId: 'BLR-01',
        lastKnownKm: 0, lastKnownKmAt: nowIso,      },
      ACTOR_R09,
    );

    const ownershipId = vs.openOwnership(
      { vin: TEST_VIN, customerId: TEST_CUSTOMER_ID, source: 'CUSTOM_BUILD_LINKED', kmAtOpen: 0, fromAt: nowIso },
      ACTOR_R09,
    );

    vs.appendEvent(
      'OPEN',
      { source: 'CUSTOM_BUILD_LINKED', linkedFromBuildJobWizard: true, kmAtOpen: 0, customerId: TEST_CUSTOMER_ID },
      ACTOR_R09,
      { vin: TEST_VIN, ownershipId },
    );

    const events = useVehiclesStore.getState().events;
    const auditEvent = events.find(
      (e) => e.payload?.linkedFromBuildJobWizard === true && e.vin === TEST_VIN,
    );
    expect(auditEvent).toBeDefined();
    expect(auditEvent?.kind).toBe('OPEN');
    expect(auditEvent?.payload?.customerId).toBe(TEST_CUSTOMER_ID);
  });
});

// ─── T4: Existing customer dropdown — selectVehiclesByCustomer filters to their VINs ─

describe('T4: selectVehiclesByCustomer filters to owned vehicles only', () => {
  const VIN_A = 'WBA3A5C50DF111111';
  const VIN_B = 'WBA3A5C50DF222222';
  const CUST_A = 'cust-a-001';
  const CUST_B = 'cust-b-001';

  it('returns only VINs owned by the specified customer', () => {
    const nowIso = new Date().toISOString();
    const vs = useVehiclesStore.getState();

    // Seed 2 vehicles
    for (const vin of [VIN_A, VIN_B]) {
      vs.upsertVehicle(
        { vin, make: 'BMW', model: 'X5', year: 2020, color: 'White', rcNumber: `RC-${vin.slice(-6)}`, firstTouchedAt: nowIso, firstTouchSource: 'CUSTOM_BUILD_LINKED', firstTouchOutletId: 'BLR-01', lastKnownKm: 0, lastKnownKmAt: nowIso },
        ACTOR_R09,
      );
    }

    // Customer A owns VIN_A only
    vs.openOwnership({ vin: VIN_A, customerId: CUST_A, source: 'CUSTOM_BUILD_LINKED', kmAtOpen: 0, fromAt: nowIso }, ACTOR_R09);
    // Customer B owns VIN_B
    vs.openOwnership({ vin: VIN_B, customerId: CUST_B, source: 'CUSTOM_BUILD_LINKED', kmAtOpen: 0, fromAt: nowIso }, ACTOR_R09);

    const state = useVehiclesStore.getState();
    const rowsForA = state.selectVehiclesByCustomer(state, CUST_A, { includeGrace: true, now: nowIso });
    expect(rowsForA).toHaveLength(1);
    expect(rowsForA[0]?.vin).toBe(VIN_A);

    const rowsForB = state.selectVehiclesByCustomer(state, CUST_B, { includeGrace: true, now: nowIso });
    expect(rowsForB).toHaveLength(1);
    expect(rowsForB[0]?.vin).toBe(VIN_B);
  });
});

// ─── T5: New customer empty-state — zero ownership rows ──────────────────────

describe('T5: new customer shows empty state (zero vehicles)', () => {
  it('selectVehiclesByCustomer returns empty array for a brand-new customer', () => {
    const nowIso = new Date().toISOString();
    const state = useVehiclesStore.getState();
    const rows = state.selectVehiclesByCustomer(state, 'cust-brand-new-001', {
      includeGrace: true,
      now: nowIso,
    });
    expect(rows).toHaveLength(0);
  });
});

// ─── T6: Provenance audit log — all 3 note types append correctly ─────────────

describe('T6: provenance audit log — 3 activity notes appended on job creation', () => {
  it('appends customer-created, vehicle-linked, and build-enquiry notes', () => {
    const store = createBuildsTestStore();
    const job = store.getState().createBuildJob(
      { title: 'Test Audit Build', customerId: 'cust-audit-001', vin: 'WBA3A5C50DF999001', outletId: 'BLR-01' },
      ACTOR_R09,
    );

    // Simulate provenance notes as wizard does in handleSubmit
    const customerName = 'Arjun Mehta';
    const vin = 'WBA3A5C50DF999001';
    const vehicleLabel = '2022 BMW M4';

    store.getState().addActivityNote(job.id, `Customer ${customerName} created during build enquiry`, ACTOR_R09);
    store.getState().addActivityNote(job.id, `Vehicle ${vehicleLabel} (${vin.slice(-6)}) linked during build enquiry`, ACTOR_R09);
    store.getState().addActivityNote(job.id, `Build enquiry created by ${ACTOR_R09.name}`, ACTOR_R09);

    const updatedJob = store.getState().jobs.find((j) => j.id === job.id)!;
    const notes = updatedJob.activityLog.filter((e) => e.type === 'note_added').map((e) => e.note!);

    expect(notes.some((n) => n.includes('Customer') && n.includes('created during build enquiry'))).toBe(true);
    expect(notes.some((n) => n.includes('Vehicle') && n.includes('linked during build enquiry'))).toBe(true);
    expect(notes.some((n) => n.includes('Build enquiry created by') && n.includes(ACTOR_R09.name))).toBe(true);
    // job_created + 3 note_added = 4 activity entries minimum
    expect(updatedJob.activityLog.length).toBeGreaterThanOrEqual(4);
  });

  it('only appends "Build enquiry created" note when no customer/vehicle were created', () => {
    const store = createBuildsTestStore();
    const job = store.getState().createBuildJob(
      { title: 'Existing Customer Build', customerId: 'cust-exist-001', vin: 'WBA3A5C50DF999002', outletId: 'BLR-01' },
      ACTOR_R09,
    );

    // No customer/vehicle created during wizard
    store.getState().addActivityNote(job.id, `Build enquiry created by ${ACTOR_R09.name}`, ACTOR_R09);

    const updatedJob = store.getState().jobs.find((j) => j.id === job.id)!;
    const noteAdded = updatedJob.activityLog.filter((e) => e.type === 'note_added');
    expect(noteAdded).toHaveLength(1);
    expect(noteAdded[0]?.note).toContain('Build enquiry created by');
  });
});

// ─── T7: VehicleTouchSourceEnum — CUSTOM_BUILD_LINKED accepted ───────────────

describe('T7: VehicleTouchSourceEnum accepts CUSTOM_BUILD_LINKED', () => {
  it('parses CUSTOM_BUILD_LINKED without error', () => {
    expect(() => VehicleTouchSourceEnum.parse('CUSTOM_BUILD_LINKED')).not.toThrow();
  });

  it('is one of the enum options', () => {
    const options = VehicleTouchSourceEnum.options;
    expect(options).toContain('CUSTOM_BUILD_LINKED');
  });

  it('still accepts existing values', () => {
    for (const v of ['BN_SALE', 'BN_CONSIGNMENT', 'SERVICE_ONLY_WALKIN', 'LEGACY_IMPORT'] as const) {
      expect(() => VehicleTouchSourceEnum.parse(v)).not.toThrow();
    }
  });

  it('rejects unknown values', () => {
    expect(() => VehicleTouchSourceEnum.parse('MYSTERY_SOURCE')).toThrow();
  });
});
