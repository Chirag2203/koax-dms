/**
 * Custom Builds state machine unit tests.
 *
 * Tests:
 *   1. All 9 valid stage transitions advance correctly
 *   2. QC_FAILED → IN_PROGRESS rework path
 *   3. R10+ guard on advanceStage (invalid role throws InsufficientRoleError)
 *   4. R12+ guard on vendor management
 *   5. Finance gate: APPROVED → PARTS_ORDERING with quoteTotal > ₹2L
 *   6. Invalid transition throws InvalidStageTransitionError
 *   7. Terminal state DELIVERED rejects further mutations
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §4, §12, L10, L15
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FinanceApprovalRequiredError,
  InvalidStageTransitionError,
  InsufficientRoleError,
  JobDeliveredImmutableError,
} from '@dms/types';
import type { BuildJob, CustomBuildVendor } from '@dms/types';

// Import the store for integration-level state machine tests
// We operate on a fresh store instance per test using the slice logic directly.
import { hasRank, canTransitionBuildJob, canActorTransition } from '../state-machine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<BuildJob> = {}): BuildJob {
  return {
    id: 'test-job-001',
    title: 'Test Build',
    stage: 'ENQUIRY',
    customerId: 'cust-test-001',
    vin: 'WBY2Z21090VX45678',
    outletId: 'BLR-01',
    parts: [],
    marginPct: 15,
    activityLog: [],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── hasRank tests ────────────────────────────────────────────────────────────

describe('hasRank', () => {
  it('returns true when actor meets minimum role', () => {
    expect(hasRank('R10', 'R09')).toBe(true);
    expect(hasRank('R10', 'R10')).toBe(true);
    expect(hasRank('R12', 'R10')).toBe(true);
    expect(hasRank('R19', 'R12')).toBe(true);
  });

  it('returns false when actor is below minimum role', () => {
    expect(hasRank('R09', 'R10')).toBe(false);
    expect(hasRank('R05', 'R09')).toBe(false);
    expect(hasRank('R10', 'R12')).toBe(false);
    expect(hasRank('R10', 'R19')).toBe(false);
  });

  it('returns false for unknown role', () => {
    expect(hasRank('UNKNOWN', 'R09')).toBe(false);
  });
});

// ─── canTransitionBuildJob tests ──────────────────────────────────────────────

describe('canTransitionBuildJob', () => {
  it('allows all valid forward transitions', () => {
    expect(canTransitionBuildJob('ENQUIRY', 'QUOTED')).toBe(true);
    expect(canTransitionBuildJob('QUOTED', 'APPROVED')).toBe(true);
    expect(canTransitionBuildJob('APPROVED', 'PARTS_ORDERING')).toBe(true);
    expect(canTransitionBuildJob('PARTS_ORDERING', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionBuildJob('IN_PROGRESS', 'QC')).toBe(true);
    expect(canTransitionBuildJob('QC', 'DELIVERED')).toBe(true);
    expect(canTransitionBuildJob('QC', 'QC_FAILED')).toBe(true);
  });

  it('allows QC_FAILED → IN_PROGRESS rework path', () => {
    expect(canTransitionBuildJob('QC_FAILED', 'IN_PROGRESS')).toBe(true);
  });

  it('allows cancellation from non-terminal stages', () => {
    expect(canTransitionBuildJob('ENQUIRY', 'CANCELLED')).toBe(true);
    expect(canTransitionBuildJob('QUOTED', 'CANCELLED')).toBe(true);
    expect(canTransitionBuildJob('IN_PROGRESS', 'CANCELLED')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionBuildJob('ENQUIRY', 'DELIVERED')).toBe(false);
    expect(canTransitionBuildJob('DELIVERED', 'ENQUIRY')).toBe(false);
    expect(canTransitionBuildJob('DELIVERED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionBuildJob('CANCELLED', 'ENQUIRY')).toBe(false);
    expect(canTransitionBuildJob('QC_FAILED', 'QC')).toBe(false);
  });
});

// ─── canActorTransition tests ─────────────────────────────────────────────────

describe('canActorTransition', () => {
  it('allows R09 to advance ENQUIRY → QUOTED', () => {
    expect(canActorTransition('R09', 'ENQUIRY', 'QUOTED')).toBe(true);
  });

  it('requires R10 to advance QUOTED → APPROVED', () => {
    expect(canActorTransition('R09', 'QUOTED', 'APPROVED')).toBe(false);
    expect(canActorTransition('R10', 'QUOTED', 'APPROVED')).toBe(true);
  });

  it('requires R11 to advance IN_PROGRESS → QC', () => {
    expect(canActorTransition('R10', 'IN_PROGRESS', 'QC')).toBe(false);
    expect(canActorTransition('R11', 'IN_PROGRESS', 'QC')).toBe(true);
  });

  it('requires R10 for QC → DELIVERED', () => {
    expect(canActorTransition('R09', 'QC', 'DELIVERED')).toBe(false);
    expect(canActorTransition('R10', 'QC', 'DELIVERED')).toBe(true);
  });

  it('requires R10 for QC_FAILED → IN_PROGRESS rework', () => {
    expect(canActorTransition('R09', 'QC_FAILED', 'IN_PROGRESS')).toBe(false);
    expect(canActorTransition('R10', 'QC_FAILED', 'IN_PROGRESS')).toBe(true);
  });

  it('requires R19 to cancel', () => {
    expect(canActorTransition('R10', 'ENQUIRY', 'CANCELLED')).toBe(false);
    expect(canActorTransition('R19', 'ENQUIRY', 'CANCELLED')).toBe(true);
  });
});

// ─── Store-level state machine tests ─────────────────────────────────────────

// We test the pure action logic using a simulated immer-like approach,
// directly testing the business rules exposed by the slice functions.

import { createStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CustomBuildsStore, CustomBuildsState } from '../custom-builds-store/types';
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

const R09_ACTOR = { id: 'staff-r09-001', name: 'Priya Sharma', role: 'R09' };
const R10_ACTOR = { id: 'staff-r10-001', name: 'Arjun Mehta', role: 'R10' };
const R11_ACTOR = { id: 'staff-r11-001', name: 'Workshop Tech', role: 'R11' };
const R12_ACTOR = { id: 'staff-r12-001', name: 'Finance', role: 'R12' };
const R19_ACTOR = { id: 'staff-r19-001', name: 'GM', role: 'R19' };

describe('custom-builds-store state machine', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  // ── Full 9-stage happy path ───────────────────────────────────────────────

  it('transitions through all 9 stages in order', () => {
    const job = store.getState().createBuildJob(
      { title: 'Test', customerId: 'cust-001', vin: 'VIN001', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // ENQUIRY → QUOTED (R09)
    store.getState().advanceStage(job.id, 'QUOTED', R09_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('QUOTED');

    // QUOTED → APPROVED (R10)
    store.getState().advanceStage(job.id, 'APPROVED', R10_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('APPROVED');

    // APPROVED → PARTS_ORDERING (R10) — quoteTotal is 0 so no finance gate
    store.getState().advanceStage(job.id, 'PARTS_ORDERING', R10_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('PARTS_ORDERING');

    // PARTS_ORDERING → IN_PROGRESS (R09)
    store.getState().advanceStage(job.id, 'IN_PROGRESS', R09_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('IN_PROGRESS');

    // IN_PROGRESS → QC (R11)
    store.getState().advanceStage(job.id, 'QC', R11_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('QC');

    // QC → DELIVERED (R10)
    store.getState().advanceStage(job.id, 'DELIVERED', R10_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('DELIVERED');
  });

  // ── QC_FAILED → IN_PROGRESS rework path ─────────────────────────────────

  it('handles QC_FAILED rework path', () => {
    const job = store.getState().createBuildJob(
      { title: 'QC Fail Test', customerId: 'cust-001', vin: 'VIN002', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // Advance to QC
    store.getState().advanceStage(job.id, 'QUOTED', R09_ACTOR);
    store.getState().advanceStage(job.id, 'APPROVED', R10_ACTOR);
    store.getState().advanceStage(job.id, 'PARTS_ORDERING', R10_ACTOR);
    store.getState().advanceStage(job.id, 'IN_PROGRESS', R09_ACTOR);
    store.getState().advanceStage(job.id, 'QC', R11_ACTOR);

    // QC → QC_FAILED
    store.getState().advanceStage(job.id, 'QC_FAILED', R10_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('QC_FAILED');

    // QC_FAILED → IN_PROGRESS (rework, R10+)
    store.getState().advanceStage(job.id, 'IN_PROGRESS', R10_ACTOR);
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('IN_PROGRESS');

    // Verify qc_failed activity event was emitted
    const activities = store.getState().jobs.find((j) => j.id === job.id)?.activityLog ?? [];
    expect(activities.some((a) => a.type === 'qc_failed')).toBe(true);
  });

  // ── R10+ guard on advanceStage ───────────────────────────────────────────

  it('throws InsufficientRoleError when R09 tries to approve QUOTED → APPROVED', () => {
    const job = store.getState().createBuildJob(
      { title: 'Guard Test', customerId: 'cust-001', vin: 'VIN003', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().advanceStage(job.id, 'QUOTED', R09_ACTOR);

    expect(() =>
      store.getState().advanceStage(job.id, 'APPROVED', R09_ACTOR),
    ).toThrow(InsufficientRoleError);
  });

  it('throws InsufficientRoleError when R09 tries QC_FAILED → IN_PROGRESS rework', () => {
    const job = store.getState().createBuildJob(
      { title: 'Rework Guard Test', customerId: 'cust-001', vin: 'VIN004', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // Fast-forward to QC_FAILED
    store.getState().advanceStage(job.id, 'QUOTED', R09_ACTOR);
    store.getState().advanceStage(job.id, 'APPROVED', R10_ACTOR);
    store.getState().advanceStage(job.id, 'PARTS_ORDERING', R10_ACTOR);
    store.getState().advanceStage(job.id, 'IN_PROGRESS', R09_ACTOR);
    store.getState().advanceStage(job.id, 'QC', R11_ACTOR);
    store.getState().advanceStage(job.id, 'QC_FAILED', R10_ACTOR);

    expect(() =>
      store.getState().advanceStage(job.id, 'IN_PROGRESS', R09_ACTOR),
    ).toThrow(InsufficientRoleError);
  });

  // ── Finance gate (L10) ────────────────────────────────────────────────────

  it('throws FinanceApprovalRequiredError for quoteTotal > 2L without approval', () => {
    const job = store.getState().createBuildJob(
      { title: 'Finance Gate Test', customerId: 'cust-001', vin: 'VIN005', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // Set quoteTotal manually via hydrate
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.quoteTotal = 250000; j.stage = 'APPROVED'; }
    });

    expect(() =>
      store.getState().advanceStage(job.id, 'PARTS_ORDERING', R10_ACTOR),
    ).toThrow(FinanceApprovalRequiredError);
  });

  it('allows APPROVED → PARTS_ORDERING after finance approval', () => {
    const job = store.getState().createBuildJob(
      { title: 'Finance Gate Pass', customerId: 'cust-001', vin: 'VIN006', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) { j.quoteTotal = 250000; j.stage = 'APPROVED'; }
    });

    store.getState().approveFinance(job.id, R12_ACTOR);

    expect(() =>
      store.getState().advanceStage(job.id, 'PARTS_ORDERING', R10_ACTOR),
    ).not.toThrow();
  });

  // ── Invalid transition ────────────────────────────────────────────────────

  it('throws InvalidStageTransitionError for DELIVERED → IN_PROGRESS', () => {
    const job = store.getState().createBuildJob(
      { title: 'Invalid Test', customerId: 'cust-001', vin: 'VIN007', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) j.stage = 'DELIVERED';
    });

    expect(() =>
      store.getState().advanceStage(job.id, 'IN_PROGRESS', R10_ACTOR),
    ).toThrow(InvalidStageTransitionError);
  });

  // ── R12+ vendor management guard ─────────────────────────────────────────

  it('throws InsufficientRoleError when R10 tries to create a vendor', () => {
    expect(() =>
      store.getState().createVendor(
        {
          name: 'Test Vendor',
          specialties: ['aero'],
          city: 'Bangalore',
          contactName: 'Test',
          contactPhone: '+91999',
          contactEmail: 'test@test.com',
          rating: 4.0,
          paymentTerms: 'Net 30',
          dayRate: 8000,
          activeJobCount: 0,
          lifetimeJobCount: 0,
          onTimePct: 90,
          active: true,
        },
        R10_ACTOR,
      ),
    ).toThrow(InsufficientRoleError);
  });

  it('allows R12+ to create a vendor', () => {
    const vendor = store.getState().createVendor(
      {
        name: 'Test Vendor',
        specialties: ['aero'],
        city: 'Bangalore',
        contactName: 'Test',
        contactPhone: '+91999',
        contactEmail: 'test@test.com',
        rating: 4.0,
        paymentTerms: 'Net 30',
        dayRate: 8000,
        activeJobCount: 0,
        lifetimeJobCount: 0,
        onTimePct: 90,
        active: true,
      },
      R12_ACTOR,
    );
    expect(vendor.name).toBe('Test Vendor');
    expect(store.getState().vendors).toHaveLength(1);
  });

  // ── Selectors ─────────────────────────────────────────────────────────────

  it('selectByCustomer returns jobs for customer', () => {
    store.getState().createBuildJob(
      { title: 'Job A', customerId: 'cust-abc', vin: 'VIN008', outletId: 'BLR-01' },
      R09_ACTOR,
    );
    store.getState().createBuildJob(
      { title: 'Job B', customerId: 'cust-xyz', vin: 'VIN009', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const result = store.getState().selectByCustomer('cust-abc');
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Job A');
  });

  it('selectByVin returns jobs for VIN', () => {
    store.getState().createBuildJob(
      { title: 'Job VIN', customerId: 'cust-001', vin: 'TESTVIN001', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const result = store.getState().selectByVin('TESTVIN001');
    expect(result).toHaveLength(1);
  });

  // ── addPart / removePart / updatePartLine ────────────────────────────────

  it('addPart adds a part line (R09+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Parts Test', customerId: 'cust-001', vin: 'VIN_PART01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const line = {
      partSku: 'CB-AER-0001',
      partName: 'Carbon Hood',
      brand: 'AeroForge',
      category: 'aero' as const,
      qty: 1,
      unitCost: 85000,
      installHours: 4,
      vendorId: 'vendor-001',
    };

    store.getState().addPart(job.id, line, R09_ACTOR);
    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.parts).toHaveLength(1);
    expect(j?.parts[0]?.partSku).toBe('CB-AER-0001');
  });

  it('removePart removes a part line (R09+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Remove Test', customerId: 'cust-001', vin: 'VIN_PART02', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const line = {
      partSku: 'CB-WHE-0001',
      partName: 'Forged Alloy 20in',
      brand: 'WheelHaus',
      category: 'wheels' as const,
      qty: 4,
      unitCost: 45000,
      installHours: 2,
      vendorId: 'vendor-002',
    };

    store.getState().addPart(job.id, line, R09_ACTOR);
    store.getState().removePart(job.id, 'CB-WHE-0001', R09_ACTOR);
    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.parts).toHaveLength(0);
  });

  it('addPart is locked after APPROVED stage', () => {
    const job = store.getState().createBuildJob(
      { title: 'Locked Parts', customerId: 'cust-001', vin: 'VIN_PART03', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) j.stage = 'APPROVED';
    });

    const line = {
      partSku: 'CB-EXH-0001',
      partName: 'Cat-back Exhaust',
      brand: 'ExhaustKings',
      category: 'exhaust' as const,
      qty: 1,
      unitCost: 35000,
      installHours: 3,
      vendorId: 'vendor-003',
    };

    expect(() => store.getState().addPart(job.id, line, R09_ACTOR)).toThrow();
  });

  it('updatePartLine updates qty on a part line (R09+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Update Qty', customerId: 'cust-001', vin: 'VIN_PART04', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const line = {
      partSku: 'CB-AER-0002',
      partName: 'Carbon Splitter',
      brand: 'AeroForge',
      category: 'aero' as const,
      qty: 1,
      unitCost: 25000,
      installHours: 2,
      vendorId: 'vendor-001',
    };

    store.getState().addPart(job.id, line, R09_ACTOR);
    store.getState().updatePartLine(job.id, 'CB-AER-0002', { qty: 3 }, R09_ACTOR);
    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.parts[0]?.qty).toBe(3);
  });

  it('updatePartLine is locked after APPROVED stage', () => {
    const job = store.getState().createBuildJob(
      { title: 'Update Lock', customerId: 'cust-001', vin: 'VIN_PART05', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    const line = {
      partSku: 'CB-INT-0001',
      partName: 'Alcantara Headliner',
      brand: 'LuxInteriors',
      category: 'interior' as const,
      qty: 1,
      unitCost: 65000,
      installHours: 8,
      vendorId: 'vendor-005',
    };

    store.getState().addPart(job.id, line, R09_ACTOR);
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) j.stage = 'APPROVED';
    });

    expect(() =>
      store.getState().updatePartLine(job.id, 'CB-INT-0001', { qty: 2 }, R09_ACTOR),
    ).toThrow();
  });

  // ── updateSchedule ────────────────────────────────────────────────────────

  it('updateSchedule updates schedule fields (R09+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Schedule Test', customerId: 'cust-001', vin: 'VIN_SCHED01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().updateSchedule(
      job.id,
      { estimatedStartDate: '2026-05-01', estimatedCompletionDate: '2026-06-01', vendorConfirmationStatus: 'confirmed' },
      R09_ACTOR,
    );

    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.estimatedStartDate).toBe('2026-05-01');
    expect(j?.estimatedCompletionDate).toBe('2026-06-01');
    expect(j?.vendorConfirmationStatus).toBe('confirmed');
  });

  // ── updateJobDetails ──────────────────────────────────────────────────────

  it('updateJobDetails updates title + notes (R10+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Old Title', customerId: 'cust-001', vin: 'VIN_DET01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().updateJobDetails(
      job.id,
      { title: 'New Title', enquiryNotes: 'Updated notes' },
      R10_ACTOR,
    );

    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.title).toBe('New Title');
    expect(j?.enquiryNotes).toBe('Updated notes');
  });

  it('updateJobDetails throws InsufficientRoleError for R09', () => {
    const job = store.getState().createBuildJob(
      { title: 'Details Guard', customerId: 'cust-001', vin: 'VIN_DET02', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    expect(() =>
      store.getState().updateJobDetails(job.id, { title: 'Hacked' }, R09_ACTOR),
    ).toThrow(InsufficientRoleError);
  });

  // ── addActivityNote ───────────────────────────────────────────────────────

  it('addActivityNote appends a note event (R09+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Activity Test', customerId: 'cust-001', vin: 'VIN_ACT01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().addActivityNote(job.id, 'Customer called to confirm specs', R09_ACTOR);
    const j = store.getState().jobs.find((x) => x.id === job.id);
    const notes = j?.activityLog.filter((e) => e.type === 'note_added') ?? [];
    expect(notes).toHaveLength(1);
    expect(notes[0]?.note).toBe('Customer called to confirm specs');
  });

  // ── createBuildJob full flow ──────────────────────────────────────────────

  it('createBuildJob returns job at ENQUIRY stage with activity event', () => {
    const job = store.getState().createBuildJob(
      {
        title: 'Wizard Flow Test',
        customerId: 'cust-wizard-001',
        vin: 'VINWIZ001',
        outletId: 'BLR-01',
        enquiryNotes: 'Stage 2 tune + aero package',
      },
      R09_ACTOR,
    );

    expect(job.stage).toBe('ENQUIRY');
    expect(job.parts).toHaveLength(0);
    expect(job.marginPct).toBe(15);
    expect(job.enquiryNotes).toBe('Stage 2 tune + aero package');

    const created = store.getState().jobs.find((j) => j.id === job.id);
    expect(created).toBeDefined();

    const activity = created?.activityLog.find((e) => e.type === 'job_created');
    expect(activity).toBeDefined();
    expect(activity?.actorId).toBe(R09_ACTOR.id);
  });

  it('createBuildJob throws InsufficientRoleError for R05', () => {
    const R05_ACTOR = { id: 'staff-r05-001', name: 'Sales Assoc', role: 'R05' };
    expect(() =>
      store.getState().createBuildJob(
        { title: 'Guard Test', customerId: 'cust-001', vin: 'VIN_GUARD', outletId: 'BLR-01' },
        R05_ACTOR,
      ),
    ).toThrow(InsufficientRoleError);
  });

  // ── cancelJob ─────────────────────────────────────────────────────────────

  it('cancelJob transitions to CANCELLED and records reason (R19+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Cancel Test', customerId: 'cust-001', vin: 'VIN_CANCEL01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().cancelJob(job.id, 'Customer withdrew order', R19_ACTOR);
    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.stage).toBe('CANCELLED');
    expect(j?.cancelReason).toBe('Customer withdrew order');
  });

  it('cancelJob throws InsufficientRoleError for R10', () => {
    const job = store.getState().createBuildJob(
      { title: 'Cancel Guard', customerId: 'cust-001', vin: 'VIN_CANCEL02', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    expect(() =>
      store.getState().cancelJob(job.id, 'Reason', R10_ACTOR),
    ).toThrow(InsufficientRoleError);
  });

  // ── assignVendor ──────────────────────────────────────────────────────────

  it('assignVendor sets vendorId (R10+)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Vendor Assign', customerId: 'cust-001', vin: 'VIN_VEN01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().assignVendor(job.id, 'vendor-speedwerks-blr', R10_ACTOR);
    const j = store.getState().jobs.find((x) => x.id === job.id);
    expect(j?.vendorId).toBe('vendor-speedwerks-blr');
  });

  it('assignVendor throws InsufficientRoleError for R09', () => {
    const job = store.getState().createBuildJob(
      { title: 'Vendor Guard', customerId: 'cust-001', vin: 'VIN_VEN02', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    expect(() =>
      store.getState().assignVendor(job.id, 'vendor-001', R09_ACTOR),
    ).toThrow(InsufficientRoleError);
  });

  // ── saveQuote (P2) ────────────────────────────────────────────────────────

  it('saveQuote persists quoteToken + quoteTotal + quoteExpiresAt (R09+)', () => {
    // Add a vendor first so vendorLabour is non-zero
    const vendor = store.getState().createVendor(
      {
        name: 'Test Vendor',
        specialties: ['aero'],
        city: 'Bangalore',
        contactName: 'Test',
        contactPhone: '+91999',
        contactEmail: 'test@test.com',
        rating: 4.0,
        paymentTerms: 'Net 30',
        dayRate: 8000,
        activeJobCount: 0,
        lifetimeJobCount: 0,
        onTimePct: 90,
        active: true,
      },
      R12_ACTOR,
    );

    const job = store.getState().createBuildJob(
      { title: 'Quote Test', customerId: 'cust-001', vin: 'VIN_QUOTE01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // Add a part manually
    store.setState((state) => {
      const j = state.jobs.find((x) => x.id === job.id);
      if (j) {
        j.vendorId = vendor.id;
        j.parts = [{
          partSku: 'CB-AER-0001', partName: 'Carbon Hood', brand: 'Seibon',
          category: 'aero', qty: 1, unitCost: 72_000, installHours: 3, vendorId: vendor.id,
        }];
      }
    });

    const result = store.getState().saveQuote(job.id, 15, R09_ACTOR);

    expect(result.token).toBeTruthy();
    expect(result.total).toBeGreaterThan(0);
    expect(result.shareUrl).toContain('/custom-builds/preview/');

    const saved = store.getState().jobs.find((j) => j.id === job.id);
    expect(saved?.quoteToken).toBe(result.token);
    expect(saved?.quoteTotal).toBe(result.total);
    expect(saved?.quoteExpiresAt).toBeTruthy();

    // Verify expiry is ~14 days from now
    const expiresAt = new Date(saved!.quoteExpiresAt!);
    const diffDays = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(13.9);
    expect(diffDays).toBeLessThan(14.1);
  });

  it('saveQuote throws InsufficientRoleError for R05', () => {
    const R05_ACTOR = { id: 'staff-r05-001', name: 'Sales Assoc', role: 'R05' };
    const job = store.getState().createBuildJob(
      { title: 'Quote Guard', customerId: 'cust-001', vin: 'VIN_QUOTE02', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    expect(() =>
      store.getState().saveQuote(job.id, 15, R05_ACTOR),
    ).toThrow(InsufficientRoleError);
  });
});

// ─── DnD store behavior tests ─────────────────────────────────────────────────

describe('DnD advanceStage behavior (board drag & drop)', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it('valid drop (ENQUIRY → QUOTED by R09) advances stage correctly', () => {
    const job = store.getState().createBuildJob(
      { title: 'DnD Test', customerId: 'cust-001', vin: 'VIN_DND01', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // Simulate the DnD drop handler calling advanceStage
    expect(() =>
      store.getState().advanceStage(job.id, 'QUOTED', R09_ACTOR),
    ).not.toThrow();

    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('QUOTED');
  });

  it('invalid drop (ENQUIRY → DELIVERED) throws InvalidStageTransitionError — board should show toast', () => {
    const job = store.getState().createBuildJob(
      { title: 'Invalid Drop', customerId: 'cust-001', vin: 'VIN_DND02', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    expect(() =>
      store.getState().advanceStage(job.id, 'DELIVERED', R09_ACTOR),
    ).toThrow(InvalidStageTransitionError);

    // Stage must NOT have changed (store rejects the mutation before writing)
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('ENQUIRY');
  });

  it('role-gated drop (QUOTED → APPROVED by R09) throws InsufficientRoleError — board shows toast', () => {
    const job = store.getState().createBuildJob(
      { title: 'Role Gate Drop', customerId: 'cust-001', vin: 'VIN_DND03', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    store.getState().advanceStage(job.id, 'QUOTED', R09_ACTOR);

    expect(() =>
      store.getState().advanceStage(job.id, 'APPROVED', R09_ACTOR),
    ).toThrow(InsufficientRoleError);

    // Stage must remain QUOTED (no partial mutation)
    expect(store.getState().jobs.find((j) => j.id === job.id)?.stage).toBe('QUOTED');
  });

  it('drop from source column to same column has no effect (filtered by board — no store call needed)', () => {
    const job = store.getState().createBuildJob(
      { title: 'Same Column Drop', customerId: 'cust-001', vin: 'VIN_DND04', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    // Board guards against same-column drops by checking isDragSource flag
    // If store.advanceStage is called with the current stage it throws InvalidStageTransitionError
    // (ENQUIRY → ENQUIRY is not a valid transition)
    expect(() =>
      store.getState().advanceStage(job.id, 'ENQUIRY', R09_ACTOR),
    ).toThrow(InvalidStageTransitionError);
  });

  it('ENQUIRY → PARTS_ORDERING (skip stages) throws InvalidStageTransitionError', () => {
    const job = store.getState().createBuildJob(
      { title: 'Skip Stages', customerId: 'cust-001', vin: 'VIN_DND05', outletId: 'BLR-01' },
      R09_ACTOR,
    );

    expect(() =>
      store.getState().advanceStage(job.id, 'PARTS_ORDERING', R09_ACTOR),
    ).toThrow(InvalidStageTransitionError);
  });
});

// ─── Fixture integrity tests (CBJ-010 to CBJ-012) ────────────────────────────

import { buildJobs, buildVendors } from '@dms/mocks/fixtures';

describe('P3 fixture integrity (CBJ-010, CBJ-011, CBJ-012)', () => {
  it('CBJ-010 exists with QC stage and correct customer/VIN', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-010');
    expect(job).toBeDefined();
    expect(job?.stage).toBe('QC');
    expect(job?.customerId).toBe('cust-rahul-kumar');
    expect(job?.vin).toBe('WP1ZZZ9YZPS034789'); // Porsche Cayenne Coupe
  });

  it('CBJ-011 exists with APPROVED stage and correct customer/VIN', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-011');
    expect(job).toBeDefined();
    expect(job?.stage).toBe('APPROVED');
    expect(job?.customerId).toBe('cust-pooja-desai');
    expect(job?.vin).toBe('WBSKG0C08MCK90123'); // BMW Z4 M40i
  });

  it('CBJ-012 exists with ENQUIRY stage and correct customer/VIN', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-012');
    expect(job).toBeDefined();
    expect(job?.stage).toBe('ENQUIRY');
    expect(job?.customerId).toBe('cust-neha-kapoor');
    expect(job?.vin).toBe('WP0AAA1X8PSA12345'); // Porsche Taycan 4S
  });

  it('CBJ-010 has at least 3 part lines with valid SKUs', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-010');
    expect(job?.parts.length).toBeGreaterThanOrEqual(3);
    for (const part of job!.parts) {
      expect(part.partSku).toBeTruthy();
      expect(part.unitCost).toBeGreaterThan(0);
    }
  });

  it('CBJ-010 activity log has correct IDs (CBA-010-XXX format)', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-010');
    for (const entry of job!.activityLog) {
      expect(entry.id).toMatch(/^CBA-010-/);
    }
  });

  it('CBJ-011 activity log has correct IDs (CBA-011-XXX format)', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-011');
    for (const entry of job!.activityLog) {
      expect(entry.id).toMatch(/^CBA-011-/);
    }
  });

  it('CBJ-012 activity log has correct IDs (CBA-012-XXX format)', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-012');
    for (const entry of job!.activityLog) {
      expect(entry.id).toMatch(/^CBA-012-/);
    }
  });

  it('total fixtures count is 13 (CBJ-013 Ferrari demo added in P3.3 scope reduction)', () => {
    // CBJ-013: Ferrari 488 GTB IN_PROGRESS — 3D visualizer demo (L57)
    expect(buildJobs.length).toBe(13);
  });

  it('all 3 new fixtures have stages different from each other', () => {
    const cbj010 = buildJobs.find((j) => j.id === 'CBJ-010');
    const cbj011 = buildJobs.find((j) => j.id === 'CBJ-011');
    const cbj012 = buildJobs.find((j) => j.id === 'CBJ-012');

    expect(cbj010?.stage).not.toBe(cbj011?.stage);
    expect(cbj011?.stage).not.toBe(cbj012?.stage);
    expect(cbj010?.stage).not.toBe(cbj012?.stage);
  });

  it('CBJ-010 VIN is not used in CBJ-001..CBJ-009 (no duplicate VINs)', () => {
    const priorJobs = buildJobs.filter((j) => ['CBJ-001','CBJ-002','CBJ-003','CBJ-004','CBJ-005','CBJ-006','CBJ-007','CBJ-008','CBJ-009'].includes(j.id));
    const priorVins = new Set(priorJobs.map((j) => j.vin));
    expect(priorVins.has('WP1ZZZ9YZPS034789')).toBe(false);
    expect(priorVins.has('WBSKG0C08MCK90123')).toBe(false);
    expect(priorVins.has('WP0AAA1X8PSA12345')).toBe(false);
  });

  it('CBJ-010 has finance approval (quoteTotal > 2L needs it for PARTS_ORDERING)', () => {
    const job = buildJobs.find((j) => j.id === 'CBJ-010');
    // CBJ-010 is past APPROVED, so it must have financeApprovalAt for high-value build
    expect(job?.financeApprovalAt).toBeTruthy();
  });

  it('all 13 build jobs have unique IDs', () => {
    const ids = buildJobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(13);
  });
});
