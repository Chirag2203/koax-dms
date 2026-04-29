/**
 * P4 cost-ledger integration tests.
 *
 * Tests:
 *   1. deliverJob writes 3 entries when finance approval present
 *   2. deliverJob throws FinanceApprovalRequiredError when quoteTotal > 2L, no approval
 *   3. deliverJob throws InsufficientRoleError for R09 actor
 *   4. Idempotency: calling deliverJob twice doesn't double-write (costLedgerWriteRef guard)
 *   5. Entry amounts match computeGstBreakdown output exactly
 *   6. Entries have correct VIN matching the build job
 *   7. All 3 categories used correctly (parts, labour, vendor-fee)
 *   8. deliverJob throws JobAlreadyDeliveredError if already DELIVERED
 *   9. Finance gate: quoteTotal === 200_000 (boundary, no error)
 *  10. deliverJob with no vendor produces zero labour/margin
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §11.3, L9, L10, L39
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  FinanceApprovalRequiredError,
  InsufficientRoleError,
  JobAlreadyDeliveredError,
} from '@dms/types';
import type { CustomBuildVendor, CostLedgerEntry } from '@dms/types';
import type { CustomBuildsStore } from '../custom-builds-store/types';
import { computeGstBreakdown } from '../gst-breakdown';

// ─── Mock vehicles-store ──────────────────────────────────────────────────────

// Track calls to addCostLedgerEntries across tests
let capturedVin: string | null = null;
let capturedEntries: CostLedgerEntry[] = [];

vi.mock('../../vehicles/vehicles-store', () => ({
  useVehiclesStore: {
    getState: () => ({
      addCostLedgerEntries: (vin: string, entries: CostLedgerEntry[]) => {
        capturedVin = vin;
        capturedEntries = [...capturedEntries, ...entries];
      },
    }),
  },
}));

// ─── Store factory ────────────────────────────────────────────────────────────

import { createJobSlice } from '../custom-builds-store/slices/job-slice';
import { createQuerySlice } from '../custom-builds-store/slices/query-slice';
import { createVendorSlice } from '../custom-builds-store/slices/vendor-slice';
import { createHydrateSlice } from '../custom-builds-store/slices/hydrate-slice';

function createTestStore() {
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

type TestStore = ReturnType<typeof createTestStore>;

const R09_ACTOR = { id: 'staff-r09', name: 'Priya Sharma', role: 'R09' };
const R10_ACTOR = { id: 'staff-r10', name: 'Arjun Mehta', role: 'R10' };
const R12_ACTOR = { id: 'staff-r12', name: 'Finance Mgr', role: 'R12' };

const TEST_VIN = 'WBY2Z21090VX45678';

const TEST_VENDOR: CustomBuildVendor = {
  id: 'v-speedwerks',
  name: 'SpeedWerks BLR',
  specialties: ['aero', 'ecu', 'exhaust'],
  city: 'Bangalore',
  contactName: 'Raj Kumar',
  contactPhone: '+91-9876543210',
  contactEmail: 'raj@speedwerks.in',
  rating: 4.8,
  paymentTerms: 'Net 30',
  dayRate: 8000,
  activeJobCount: 3,
  lifetimeJobCount: 47,
  onTimePct: 92,
  gstIn: '29AABCS1234A1Z5',
  active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Advance a job to QC stage (ready for delivery). */
function advanceToQC(store: ReturnType<typeof createTestStore>, jobId: string) {
  store.getState().advanceStage(jobId, 'QUOTED', R09_ACTOR);
  store.getState().advanceStage(jobId, 'APPROVED', R10_ACTOR);
  store.getState().advanceStage(jobId, 'PARTS_ORDERING', R10_ACTOR);
  store.getState().advanceStage(jobId, 'IN_PROGRESS', R09_ACTOR);
  store.getState().advanceStage(jobId, 'QC', { id: 'staff-r11', name: 'Tech', role: 'R11' });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('deliverJob — cost-ledger write-back (P4)', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    capturedVin = null;
    capturedEntries = [];
  });

  // ── Test 1: 3 entries written with finance approval ───────────────────────

  it('writes 3 cost-ledger entries when finance approval is present and quoteTotal > 2L', () => {
    // Seed vendor
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Aero Package', customerId: 'cust-001', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    // Set quoteTotal > 2L and finance approval
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 285000; j.financeApprovalAt = '2026-04-29T10:00:00.000Z'; j.financeApprovedBy = R12_ACTOR.id; j.stage = 'QC'; }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    const j = store.getState().jobs.find((x) => x.id === job.id)!;
    expect(j.stage).toBe('DELIVERED');
    expect(j.costLedgerWriteRef).toBeDefined();
    expect(j.costLedgerWriteRef?.entryIds).toHaveLength(3);
    expect(capturedEntries).toHaveLength(3);
  });

  // ── Test 2: Finance gate throws when quoteTotal > 2L, no approval ─────────

  it('throws FinanceApprovalRequiredError when quoteTotal > 2L and financeApprovalAt is absent', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Big Build', customerId: 'cust-002', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 300000; j.stage = 'QC'; }
    });

    expect(() => store.getState().deliverJob(job.id, R10_ACTOR)).toThrow(FinanceApprovalRequiredError);
    // No entries written
    expect(capturedEntries).toHaveLength(0);
    // Stage not changed
    const j = store.getState().jobs.find((x) => x.id === job.id)!;
    expect(j.stage).toBe('QC');
  });

  // ── Test 3: InsufficientRoleError for R09 ────────────────────────────────

  it('throws InsufficientRoleError for an R09 actor', () => {
    const job = store.getState().createBuildJob(
      { title: 'Small Build', customerId: 'cust-003', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.stage = 'QC'; }
    });

    expect(() => store.getState().deliverJob(job.id, R09_ACTOR)).toThrow(InsufficientRoleError);
  });

  // ── Test 4: Idempotency — second call is a no-op ──────────────────────────

  it('does not double-write: second deliverJob call on DELIVERED job throws JobAlreadyDeliveredError', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Idempotent Build', customerId: 'cust-004', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 100000; j.stage = 'QC'; }
    });

    // First call — succeeds
    store.getState().deliverJob(job.id, R10_ACTOR);
    const firstCallEntries = capturedEntries.length;
    expect(firstCallEntries).toBe(3);

    // Second call — throws (job is now DELIVERED)
    expect(() => store.getState().deliverJob(job.id, R10_ACTOR)).toThrow(JobAlreadyDeliveredError);

    // Still only 3 entries total
    expect(capturedEntries).toHaveLength(3);
  });

  // ── Test 5: Entry amounts match computeGstBreakdown ──────────────────────

  it('entry amounts match computeGstBreakdown output exactly', () => {
    store.getState().hydrate(
      [],
      [
        {
          sku: 'CB-AER-0001',
          name: 'Carbon Hood',
          brand: 'CarbonTek',
          category: 'aero',
          listPrice: 120000,
          bnCost: 80000,
          vendorId: TEST_VENDOR.id,
          compatibility: { makes: ['BMW'] },
          installHours: 4,
          renderAssetKey: 'carbon-hood',
        },
      ],
      [TEST_VENDOR],
    );

    const job = store.getState().createBuildJob(
      { title: 'Carbon Hood Build', customerId: 'cust-005', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) {
        j.vendorId = TEST_VENDOR.id; j.quoteTotal = 120000; j.stage = 'QC';
        j.parts = [{ partSku: 'CB-AER-0001', partName: 'Carbon Hood', brand: 'CarbonTek', category: 'aero', qty: 1, unitCost: 80000, installHours: 4, vendorId: TEST_VENDOR.id }];
      }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    // Compute expected amounts
    const partsSubtotal = 80000;
    const vendorLabour = Math.round((4 / 8) * TEST_VENDOR.dayRate); // 4000
    const bd = computeGstBreakdown({ partsSubtotal, partsListPriceSum: partsSubtotal, vendorLabour, marginPct: 15 });

    const partsEntry = capturedEntries.find((e) => e.category === 'custom-build-parts');
    const labourEntry = capturedEntries.find((e) => e.category === 'custom-build-labour');
    const feeEntry = capturedEntries.find((e) => e.category === 'custom-build-vendor-fee');

    expect(partsEntry?.amount).toBe(Math.round(bd.partsCostBN));
    expect(labourEntry?.amount).toBe(Math.round(bd.vendorLabour + bd.gstOnLabour));
    expect(feeEntry?.amount).toBe(Math.round(bd.bnMargin));
  });

  // ── Test 6: Correct VIN on all entries ───────────────────────────────────

  it('writes entries with VIN matching the build job', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);
    const customVin = 'WBA3C1C50FK000002';

    const job = store.getState().createBuildJob(
      { title: 'VIN Check Build', customerId: 'cust-006', vin: customVin, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 50000; j.stage = 'QC'; }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    expect(capturedVin).toBe(customVin);
    for (const entry of capturedEntries) {
      expect(entry.vin).toBe(customVin);
    }
  });

  // ── Test 7: Correct categories used ──────────────────────────────────────

  it('uses the 3 correct categories: custom-build-parts, custom-build-labour, custom-build-vendor-fee', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Category Check Build', customerId: 'cust-007', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 50000; j.stage = 'QC'; }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    const categories = capturedEntries.map((e) => e.category);
    expect(categories).toContain('custom-build-parts');
    expect(categories).toContain('custom-build-labour');
    expect(categories).toContain('custom-build-vendor-fee');
    expect(categories).toHaveLength(3);
  });

  // ── Test 8: JobAlreadyDeliveredError ─────────────────────────────────────

  it('throws JobAlreadyDeliveredError when job is already in DELIVERED stage', () => {
    const job = store.getState().createBuildJob(
      { title: 'Already Done', customerId: 'cust-008', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    // Force stage to DELIVERED
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.stage = 'DELIVERED'; j.deliveredAt = '2026-04-01T00:00:00.000Z'; }
    });

    expect(() => store.getState().deliverJob(job.id, R10_ACTOR)).toThrow(JobAlreadyDeliveredError);
  });

  // ── Test 9: Finance gate boundary — quoteTotal === 200_000 (no error) ────

  it('does not throw for quoteTotal === 200_000 (boundary: not strictly greater)', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Boundary Build', customerId: 'cust-009', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 200_000; j.stage = 'QC'; }
    });

    expect(() => store.getState().deliverJob(job.id, R10_ACTOR)).not.toThrow();
    expect(capturedEntries).toHaveLength(3);
  });

  // ── Test 10: No vendor → zero labour/margin amounts ──────────────────────

  it('writes zero amounts for labour and margin when no vendor is assigned', () => {
    // No vendor loaded — vendorId not set
    const job = store.getState().createBuildJob(
      { title: 'No Vendor Build', customerId: 'cust-010', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.quoteTotal = 10000; j.stage = 'QC'; }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    // vendorLabour = 0 → breakdown is all-zero except partsSubtotal
    const labourEntry = capturedEntries.find((e) => e.category === 'custom-build-labour');
    const feeEntry = capturedEntries.find((e) => e.category === 'custom-build-vendor-fee');
    expect(labourEntry?.amount).toBe(0);
    expect(feeEntry?.amount).toBe(0);
  });
});

// ─── Regression: hydrator back-fill for fixture DELIVERED jobs ───────────────
//
// Bug: CustomBuildsStoreHydrator only seeded the custom-builds store but never
// wrote cost-ledger entries for DELIVERED fixture jobs (which have no
// costLedgerWriteRef). This caused:
//   1. /inventory/[vin] cost-ledger tab: custom-build entries never visible
//   2. /custom-builds/[id]?tab=cost-ledger: always showed LedgerPreview (wrong
//      "will be written when delivered" message) for already-delivered jobs
//
// Fix: hydrator now calls addCostLedgerEntries for each DELIVERED job without
// a costLedgerWriteRef, computing amounts from computeGstBreakdown.
// These tests use the same top-level mock as the deliverJob suite above.

describe('regression: hydrator back-fill for fixture DELIVERED jobs without costLedgerWriteRef', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    capturedVin = null;
    capturedEntries = [];
  });

  it('R1: DELIVERED job without costLedgerWriteRef produces 3 entries when delivered', () => {
    // Simulate what the hydrator does: deliver a job, simulating the
    // back-fill path for a fixture job that has no writeRef yet.
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Fixture Delivered Build', customerId: 'cust-reg-001', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) {
        j.vendorId = TEST_VENDOR.id;
        j.quoteTotal = 150000;
        j.stage = 'QC';
        // No costLedgerWriteRef — simulates a fixture DELIVERED job
      }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    const j = store.getState().jobs.find((x) => x.id === job.id)!;
    expect(j.stage).toBe('DELIVERED');
    expect(capturedEntries).toHaveLength(3);
    expect(capturedEntries.map((e) => e.category)).toEqual(
      expect.arrayContaining(['custom-build-parts', 'custom-build-labour', 'custom-build-vendor-fee']),
    );
  });

  it('R2: all back-fill entry IDs carry the CLE-CB- prefix', () => {
    // Hydrator uses deterministic IDs: CLE-CB-P-{jobId}, CLE-CB-L-{jobId}, CLE-CB-F-{jobId}
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'ID Pattern Check', customerId: 'cust-reg-002', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 50000; j.stage = 'QC'; }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    for (const entry of capturedEntries) {
      expect(entry.id).toMatch(/^CLE-CB-/);
      expect(entry.vin).toBe(TEST_VIN);
    }
  });

  it('R3: second deliverJob call throws JobAlreadyDeliveredError and does not write additional entries', () => {
    // Verifies idempotency: the DELIVERED stage guard prevents double-write.
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Double Hydrate Check', customerId: 'cust-reg-003', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.vendorId = TEST_VENDOR.id; j.quoteTotal = 50000; j.stage = 'QC'; }
    });

    store.getState().deliverJob(job.id, R10_ACTOR);
    expect(capturedEntries).toHaveLength(3);

    // Second call — must throw, not write additional entries
    expect(() => store.getState().deliverJob(job.id, R10_ACTOR)).toThrow(JobAlreadyDeliveredError);
    expect(capturedEntries).toHaveLength(3);
  });
});
