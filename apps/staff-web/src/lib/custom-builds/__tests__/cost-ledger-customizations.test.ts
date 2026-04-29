/**
 * Cost-ledger customization entry tests — SPEC-CUSTOM-BUILDS-001 §38, L95
 *
 * Tests:
 *   1. CostLedgerCategoryEnum parses 'custom-build-customizations' without error
 *   2. deliverJob with visualizer customizations writes 4 entries
 *   3. 4th entry category is 'custom-build-customizations'
 *   4. 4th entry amount matches computeCustomizationCost total
 *   5. deliverJob without visualizer customizations writes only 3 entries
 *   6. deliverJob with customizations but zero total writes 3 entries (no ₹0 4th entry)
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L95
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CostLedgerCategoryEnum, type CostLedgerEntry } from '@dms/types';
import type { CustomBuildVendor } from '@dms/types';
import type { CustomBuildsStore } from '../custom-builds-store/types';
import { computeCustomizationCost } from '../customization-catalog';
import { PAINT_BY_KEY } from '../paint-palette';

// ─── Mock vehicles-store ──────────────────────────────────────────────────────

let capturedEntries: CostLedgerEntry[] = [];

vi.mock('../../vehicles/vehicles-store', () => ({
  useVehiclesStore: {
    getState: () => ({
      addCostLedgerEntries: (_vin: string, entries: CostLedgerEntry[]) => {
        capturedEntries = [...capturedEntries, ...entries];
      },
    }),
  },
}));

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

const R10_ACTOR = { id: 'staff-r10', name: 'Arjun Mehta', role: 'R10' };
const R09_ACTOR = { id: 'staff-r09', name: 'Priya Sharma', role: 'R09' };
const TEST_VIN = 'WBY2Z21090VX45678';

const TEST_VENDOR: CustomBuildVendor = {
  id: 'v-test',
  name: 'Test Vendor',
  specialties: ['exhaust'],
  city: 'Bangalore',
  contactName: 'Test',
  contactPhone: '+91-0000000000',
  contactEmail: 'test@test.in',
  rating: 4.0,
  paymentTerms: 'Net 30',
  dayRate: 0, // zero rate so 3-entry amounts are predictable
  activeJobCount: 0,
  lifetimeJobCount: 0,
  onTimePct: 100,
  active: true,
};

describe('CostLedgerCategoryEnum extension (L95)', () => {
  // ── Test 1: Enum parses new category ─────────────────────────────────────────
  it('parses custom-build-customizations without Zod error', () => {
    const result = CostLedgerCategoryEnum.safeParse('custom-build-customizations');
    expect(result.success).toBe(true);
  });
});

describe('deliverJob customization ledger entry (L95)', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    capturedEntries = [];
  });

  // ── Test 2: Writes 4 entries when customizations present ─────────────────────
  it('writes 4 cost-ledger entries when visualizer customizations are set', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Customized Build', customerId: 'cust-001', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (!j) return;
      j.vendorId = TEST_VENDOR.id;
      j.quoteTotal = 50000;
      j.stage = 'QC';
      j.visualizerState = {
        modelSlug: 'ferrari',
        layers: [],
        savedAt: new Date().toISOString(),
        savedBy: 'staff-001',
        customizations: {
          wheelOptionId: 'wheel-bronze', // ₹2,45,000
          tintOptionId: 'tint-stock',    // ₹0
          decals: [],
        },
      };
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    expect(capturedEntries).toHaveLength(4);
  });

  // ── Test 3: 4th entry has correct category ────────────────────────────────────
  it('4th entry category is custom-build-customizations', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Category Check', customerId: 'cust-002', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (!j) return;
      j.vendorId = TEST_VENDOR.id;
      j.quoteTotal = 50000;
      j.stage = 'QC';
      j.visualizerState = {
        modelSlug: 'ferrari',
        layers: [],
        savedAt: new Date().toISOString(),
        savedBy: 'staff-001',
        customizations: {
          wheelOptionId: 'wheel-vossen-21', // ₹2,85,000
          decals: [],
        },
      };
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    const custEntry = capturedEntries.find(
      (e) => e.category === 'custom-build-customizations',
    );
    expect(custEntry).toBeDefined();
  });

  // ── Test 4: 4th entry amount matches computeCustomizationCost ────────────────
  it('4th entry amount matches computeCustomizationCost total for wheel + paint', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Amount Check', customerId: 'cust-003', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const wheelOptionId = 'wheel-bronze'; // ₹2,45,000
    const paintColorId = 'guards-red'; // ₹48,000
    const paintPrice = PAINT_BY_KEY[paintColorId]?.listPrice ?? 0;

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (!j) return;
      j.vendorId = TEST_VENDOR.id;
      j.quoteTotal = 50000;
      j.stage = 'QC';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (j as any).visualizerState = {
        modelSlug: 'ferrari',
        layers: [],
        savedAt: new Date().toISOString(),
        savedBy: 'staff-001',
        // paintKey stored as open field (L93)
        paintKey: paintColorId,
        customizations: {
          wheelOptionId,
          decals: [],
        },
      };
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    const expectedTotal = computeCustomizationCost({ paintPrice, wheelOptionId }).total;
    const custEntry = capturedEntries.find(
      (e) => e.category === 'custom-build-customizations',
    );
    expect(custEntry?.amount).toBe(expectedTotal);
  });

  // ── Test 5: No customizations → 3 entries only ───────────────────────────────
  it('writes only 3 entries when no visualizerState is set', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'No Viz Build', customerId: 'cust-004', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (!j) return;
      j.vendorId = TEST_VENDOR.id;
      j.quoteTotal = 50000;
      j.stage = 'QC';
      // No visualizerState
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    expect(capturedEntries).toHaveLength(3);
    expect(capturedEntries.every((e) => e.category !== 'custom-build-customizations')).toBe(true);
  });

  // ── Test 6: All-stock customizations → no 4th entry ─────────────────────────
  it('writes 3 entries when all customizations are stock (zero total)', () => {
    store.getState().hydrate([], [], [TEST_VENDOR]);

    const job = store.getState().createBuildJob(
      { title: 'Stock Config', customerId: 'cust-005', vin: TEST_VIN, outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (!j) return;
      j.vendorId = TEST_VENDOR.id;
      j.quoteTotal = 50000;
      j.stage = 'QC';
      j.visualizerState = {
        modelSlug: 'ferrari',
        layers: [],
        savedAt: new Date().toISOString(),
        savedBy: 'staff-001',
        customizations: {
          wheelOptionId: 'wheel-stock',       // ₹0
          tintOptionId: 'tint-stock',          // ₹0
          exhaustOptionId: 'exh-stock',        // ₹0
          suspensionOptionId: 'susp-stock',    // ₹0
          hoodOptionId: 'hood-stock',          // ₹0
          wingOptionId: 'wing-stock',          // ₹0
          decals: [],
        },
      };
    });

    store.getState().deliverJob(job.id, R10_ACTOR);

    // computeCustomizationCost with all stock = total 0 → no 4th entry
    expect(capturedEntries.some((e) => e.category === 'custom-build-customizations')).toBe(false);
    expect(capturedEntries).toHaveLength(3);
  });
});
