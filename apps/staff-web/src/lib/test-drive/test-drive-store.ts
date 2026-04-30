'use client';

/**
 * Test-drive booking store — SPEC-TEST-DRIVE-001 §4
 *
 * Zustand + immer. Seeded from @dms/mocks fixtures.
 *
 * State machine:
 *   PENDING → SCHEDULED | CANCELLED
 *   SCHEDULED → EXECUTING | CANCELLED | SCHEDULED (reslot)
 *   EXECUTING → COMPLETED | NO_SHOW
 *   COMPLETED, NO_SHOW, CANCELLED → terminal (L9)
 *
 * L3: Only R20 can create; only R03/R09/R19/R22/R24 can confirm/execute/complete.
 * L6: B1 leads-store stub — swallowed if absent.
 * L8: Duplicate active booking prevention per VIN.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TestDriveBooking,
  TestDriveStatus,
  TestDriveSlot,
  TestDriveExecution,
  TestDriveFeedback,
} from '@dms/types';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';

// ─── Constants ────────────────────────────────────────────────────────────────

/** L8: statuses that block a second booking for the same VIN */
const ACTIVE_STATUSES: ReadonlySet<TestDriveStatus> = new Set([
  'PENDING',
  'SCHEDULED',
  'EXECUTING',
]);

/** L9: terminal statuses */
const TERMINAL_STATUSES: ReadonlySet<TestDriveStatus> = new Set([
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
]);

// ─── Transition table (L1) ────────────────────────────────────────────────────

const TRANSITIONS: Record<TestDriveStatus, TestDriveStatus[]> = {
  PENDING: ['SCHEDULED', 'CANCELLED'],
  // No-show fires from SCHEDULED (customer never arrived) OR EXECUTING
  // (customer abandoned mid-drive without completing).
  SCHEDULED: ['EXECUTING', 'NO_SHOW', 'CANCELLED'],
  EXECUTING: ['COMPLETED', 'NO_SHOW'],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

export function canTransitionTestDrive(from: TestDriveStatus, to: TestDriveStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// ─── Create booking input ─────────────────────────────────────────────────────

export interface CreateTestDriveInput {
  customerId: string;
  customerName: string;
  vehicleVin: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  outletId: string;
  requestedDate: string;
  requestedSlot: TestDriveSlot;
  notes?: string;
  leadId?: string;
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface TestDriveState {
  bookings: Record<string, TestDriveBooking>;
  hydrated: boolean;
}

interface TestDriveActions {
  /** Seed from fixtures — idempotent via `hydrated` guard */
  _seed(bookings: TestDriveBooking[]): void;

  /** R20: Create a new test-drive booking in PENDING (L3) */
  createBooking(input: CreateTestDriveInput): TestDriveBooking;

  /** R03/R09/R19/R22/R24: Confirm + assign advisor */
  confirmBooking(
    id: string,
    advisorId: string,
    advisorName: string,
    confirmedDate: string,
    confirmedSlot: TestDriveSlot,
  ): void;

  /** R03/R09/R19/R22/R24: Reschedule a SCHEDULED booking */
  reslotBooking(id: string, confirmedDate: string, confirmedSlot: TestDriveSlot): void;

  /** R03/R09/R19/R22/R24: Begin on-day execution checklist (L12) */
  startChecklist(id: string, execution: TestDriveExecution): void;

  /** R03/R09/R19/R22/R24: Record post-drive feedback → COMPLETED (L5, L6) */
  completeDrive(id: string, feedback: TestDriveFeedback): void;

  /** R03/R09/R19/R22/R24: Mark as no-show (terminal) */
  markNoShow(id: string): void;

  /**
   * Cancel booking.
   * R03/R09/R19/R22/R24: any non-terminal booking.
   * R20: own PENDING booking only (customer self-cancel).
   */
  cancelBooking(id: string, reason: string, cancelledBy: string): void;

  // ─── Selectors ───────────────────────────────────────────────────────────

  selectByCustomer(customerId: string): TestDriveBooking[];
  selectByOutlet(outletId: string): TestDriveBooking[];
  selectByStatus(status: TestDriveStatus): TestDriveBooking[];
  selectById(id: string): TestDriveBooking | undefined;
}

type TestDriveStore = TestDriveState & TestDriveActions;

// ─── ID generator ────────────────────────────────────────────────────────────

let _seq = 900;
function nextId(): string {
  return `TD-${String(++_seq).padStart(3, '0')}`;
}

// ─── B1 leads-store stub (L6) ─────────────────────────────────────────────────

function tryTransitionLead(leadId: string | undefined, actor: string): void {
  if (!leadId) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadsStore = (globalThis as any).__leadsStoreRef;
    if (leadsStore && typeof leadsStore.getState === 'function') {
      leadsStore.getState().transitionStage(leadId, 'TEST_DRIVE', actor);
    } else {
      console.info(
        '[SPEC-TEST-DRIVE-001 L6] B1 leads store absent — lead stage update deferred.',
        { leadId, actor },
      );
    }
  } catch {
    console.info(
      '[SPEC-TEST-DRIVE-001 L6] B1 leads store absent — lead stage update deferred.',
      { leadId, actor },
    );
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTestDriveStore = create<TestDriveStore>()(
  immer((set, get) => ({
    bookings: {},
    hydrated: false,

    _seed(fixtureBookings) {
      set((state) => {
        if (state.hydrated) return;
        for (const b of fixtureBookings) {
          state.bookings[b.id] = { ...b };
        }
        state.hydrated = true;
      });
    },

    createBooking(input) {
      const now = new Date().toISOString();

      // L8: prevent duplicate active booking for same VIN
      const activeForVin = Object.values(get().bookings).filter(
        (b) => b.vehicleVin === input.vehicleVin && ACTIVE_STATUSES.has(b.status),
      );
      if (activeForVin.length > 0) {
        throw new Error('duplicate-active-booking');
      }

      const booking: TestDriveBooking = {
        id: nextId(),
        ...input,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.bookings[booking.id] = booking;
      });

      // Seam 44: auto-create or advance a sales deal on test-drive booking.
      // Best-effort — booking creation succeeds even if deal sync fails.
      try {
        const deal = useSalesDealsStore.getState().upsertDealFromTestDrive({
          customerId: booking.customerId,
          customerName: booking.customerName,
          customerPhone: '',
          vehicleVin: booking.vehicleVin,
          vehicleMake: booking.vehicleMake,
          vehicleModel: booking.vehicleModel,
          vehicleYear: booking.vehicleYear,
          outletId: booking.outletId,
          city: booking.outletId,
        });
        // Back-reference: store linkedDealId on the booking for cross-module navigation
        set((state) => {
          if (state.bookings[booking.id]) {
            state.bookings[booking.id]!.linkedDealId = deal.id;
          }
        });
      } catch (e) {
        console.warn('[test-drive] failed to upsert sales deal (Seam 44):', e);
      }

      // Return the freshest state (includes linkedDealId if set above)
      return get().bookings[booking.id] ?? booking;
    },

    confirmBooking(id, advisorId, advisorName, confirmedDate, confirmedSlot) {
      set((state) => {
        const b = state.bookings[id];
        if (!b) throw new Error(`confirmBooking: booking "${id}" not found`);
        if (!canTransitionTestDrive(b.status, 'SCHEDULED')) {
          throw new Error(`confirmBooking: invalid transition ${b.status} → SCHEDULED`);
        }
        b.status = 'SCHEDULED';
        b.assignedAdvisorId = advisorId;
        b.assignedAdvisorName = advisorName;
        b.confirmedDate = confirmedDate;
        b.confirmedSlot = confirmedSlot;
        b.updatedAt = new Date().toISOString();
      });
    },

    reslotBooking(id, confirmedDate, confirmedSlot) {
      set((state) => {
        const b = state.bookings[id];
        if (!b) throw new Error(`reslotBooking: booking "${id}" not found`);
        if (b.status !== 'SCHEDULED') {
          throw new Error(`reslotBooking: can only reslot SCHEDULED bookings, got ${b.status}`);
        }
        b.confirmedDate = confirmedDate;
        b.confirmedSlot = confirmedSlot;
        b.updatedAt = new Date().toISOString();
      });
    },

    startChecklist(id, execution) {
      set((state) => {
        const b = state.bookings[id];
        if (!b) throw new Error(`startChecklist: booking "${id}" not found`);
        if (!canTransitionTestDrive(b.status, 'EXECUTING')) {
          throw new Error(`startChecklist: invalid transition ${b.status} → EXECUTING`);
        }
        // L12: required fields
        if (!execution.licenseNumber || execution.fuelLevelBefore === undefined || execution.odometerBefore === undefined) {
          throw new Error('startChecklist: licenseNumber, fuelLevelBefore, odometerBefore are required (L12)');
        }
        b.status = 'EXECUTING';
        b.execution = { ...execution, startedAt: execution.startedAt ?? new Date().toISOString() };
        b.updatedAt = new Date().toISOString();
      });
    },

    completeDrive(id, feedback) {
      const booking = get().bookings[id];
      if (!booking) throw new Error(`completeDrive: booking "${id}" not found`);
      if (!canTransitionTestDrive(booking.status, 'COMPLETED')) {
        throw new Error(`completeDrive: invalid transition ${booking.status} → COMPLETED`);
      }

      set((state) => {
        const b = state.bookings[id];
        if (!b) return;
        b.status = 'COMPLETED';
        b.feedback = { ...feedback, recordedAt: feedback.recordedAt ?? new Date().toISOString() };
        if (b.execution) {
          b.execution.completedAt = new Date().toISOString();
        }
        b.updatedAt = new Date().toISOString();
      });

      // L6: B1 leads-store stub
      tryTransitionLead(booking.leadId, feedback.recordedBy);
    },

    markNoShow(id) {
      set((state) => {
        const b = state.bookings[id];
        if (!b) throw new Error(`markNoShow: booking "${id}" not found`);
        if (!canTransitionTestDrive(b.status, 'NO_SHOW')) {
          throw new Error(`markNoShow: invalid transition ${b.status} → NO_SHOW`);
        }
        b.status = 'NO_SHOW';
        b.updatedAt = new Date().toISOString();
      });
    },

    cancelBooking(id, reason, cancelledBy) {
      set((state) => {
        const b = state.bookings[id];
        if (!b) throw new Error(`cancelBooking: booking "${id}" not found`);
        if (TERMINAL_STATUSES.has(b.status)) {
          throw new Error(`cancelBooking: cannot cancel terminal booking (${b.status})`);
        }
        b.status = 'CANCELLED';
        b.cancellationReason = reason;
        b.updatedAt = new Date().toISOString();
      });
      void cancelledBy; // used by callers for audit; store doesn't log yet
    },

    // ─── Selectors ─────────────────────────────────────────────────────────

    selectByCustomer(customerId) {
      return Object.values(get().bookings).filter((b) => b.customerId === customerId);
    },

    selectByOutlet(outletId) {
      if (outletId === 'all') return Object.values(get().bookings);
      return Object.values(get().bookings).filter((b) => b.outletId === outletId);
    },

    selectByStatus(status) {
      return Object.values(get().bookings).filter((b) => b.status === status);
    },

    selectById(id) {
      return get().bookings[id];
    },
  })),
);
