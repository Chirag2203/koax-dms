'use client';

/**
 * Customer-portal test-drive store — reads + creates bookings.
 *
 * Intentionally separate from staff-web's useTestDriveStore.
 * Both apps read the same @dms/mocks fixture seed; in-memory state diverges
 * post-seed (fine for mock phase).
 *
 * Portal actions:
 *   - createBooking   — customer books (R20)
 *   - cancelBooking   — customer self-cancel of own PENDING booking (S3)
 *   - selectByCustomer
 *   - selectById
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §4 L3 L8 S3 S6 S11 S12
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TestDriveBooking,
  TestDriveStatus,
  TestDriveSlot,
} from '@dms/types';
import { testDriveBookings as fixtureBookings } from '@dms/mocks/fixtures';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: ReadonlySet<TestDriveStatus> = new Set([
  'PENDING',
  'SCHEDULED',
  'EXECUTING',
]);

export const CUSTOMER_SELF_CANCEL_REASON = 'Cancelled by customer' as const;

// ─── ID generator ────────────────────────────────────────────────────────────

let _seq = 800;
function nextId(): string {
  return `TD-P${String(++_seq).padStart(3, '0')}`;
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface PortalCreateTestDriveInput {
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
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface PortalTestDriveState {
  bookings: Record<string, TestDriveBooking>;
  hydrated: boolean;
}

interface PortalTestDriveActions {
  _seed(bookings: TestDriveBooking[]): void;

  /** R20: Customer creates a new PENDING booking */
  createBooking(input: PortalCreateTestDriveInput): TestDriveBooking;

  /** R20: Customer cancels own PENDING booking (S3) */
  cancelBooking(id: string, customerId: string): void;

  selectByCustomer(customerId: string): TestDriveBooking[];
  selectById(id: string): TestDriveBooking | undefined;
}

type PortalTestDriveStore = PortalTestDriveState & PortalTestDriveActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTestDriveStore = create<PortalTestDriveStore>()(
  immer((set, get) => ({
    bookings: {},
    hydrated: false,

    _seed(fixtures) {
      set((state) => {
        if (state.hydrated) return;
        for (const b of fixtures) {
          state.bookings[b.id] = { ...b };
        }
        state.hydrated = true;
      });
    },

    createBooking(input) {
      const now = new Date().toISOString();

      // L8: duplicate active booking prevention
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

      return booking;
    },

    cancelBooking(id, customerId) {
      set((state) => {
        const b = state.bookings[id];
        if (!b) return;
        if (b.customerId !== customerId) return; // own booking only
        if (b.status !== 'PENDING') return;      // can only cancel PENDING
        b.status = 'CANCELLED';
        b.cancellationReason = CUSTOMER_SELF_CANCEL_REASON;
        b.updatedAt = new Date().toISOString();
      });
    },

    selectByCustomer(customerId) {
      return Object.values(get().bookings).filter((b) => b.customerId === customerId);
    },

    selectById(id) {
      return get().bookings[id];
    },
  })),
);

// ─── Hydrator (seeded from fixtures) ─────────────────────────────────────────

let _seeded = false;

export function seedPortalTestDriveStore() {
  if (_seeded) return;
  _seeded = true;
  useTestDriveStore.getState()._seed(fixtureBookings);
}
