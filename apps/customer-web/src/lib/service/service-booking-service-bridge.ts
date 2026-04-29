/**
 * Portal service store — customer-web standalone store for service bookings.
 *
 * Intentionally separate from staff-web's useServiceStore so there is no
 * cross-app module coupling. Both apps read the same @dms/mocks fixtures;
 * they maintain independent in-memory states (fine for mock phase —
 * in production both would hit the same backend).
 *
 * This store handles the portal booking actions:
 *   - createBookingFromPortal  — creates JC with AWAITING_CONFIRMATION
 *   - cancelPortalBooking      — customer self-cancel (L5 path override)
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §7.1, §14 NFR-S, §21 P1
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { JobCard } from '@dms/types';
import type { ServiceBookingRequest } from '@dms/types';
import {
  jobCards as fixtureJobCards,
  timelineEvents as fixtureTimelineEvents,
} from '@dms/mocks/fixtures';
import { SELF_CANCEL_REASON } from './service-booking-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now()}-${rand}`;
}

function now(): string {
  return new Date().toISOString();
}

function nextJobNo(existingJobCards: JobCard[]): string {
  const nums = existingJobCards.map((jc) => {
    const m = jc.jobNo.match(/JC-(\d{4})-(\d{5})/);
    return m ? parseInt(m[2] ?? '0', 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `JC-2026-${String(max + 1).padStart(5, '0')}`;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface PortalServiceState {
  jobCards: JobCard[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface PortalServiceActions {
  /**
   * Creates a JobCard with status AWAITING_CONFIRMATION from a customer portal
   * booking request.
   *
   * Security (SPEC-CUSTOMER-PORTAL-002 §14 NFR-S):
   *   - customerId is derived from sessionCustomerId only — never from input
   *   - ownedVins is derived from the authenticated session's vehicles — never trusted from client
   *   - VIN must be in ownedVins, else returns VIN_NOT_OWNED
   */
  createBookingFromPortal(
    sessionCustomerId: string,
    input: Omit<ServiceBookingRequest, 'requestId'>,
    ownedVins: string[],
  ): { ok: true; jobCard: JobCard } | { ok: false; error: 'VIN_NOT_OWNED' | 'DUPLICATE_BOOKING' };

  /**
   * Customer self-cancels their AWAITING_CONFIRMATION booking.
   * Per L5 path-specific override — R20 may cancel their own pending JC.
   * Once SA confirms (→ RECEIVED), self-cancel is blocked.
   */
  cancelPortalBooking(
    jobCardId: string,
    sessionCustomerId: string,
  ): { ok: true } | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' | 'WRONG_STATUS' };

  /** Returns all JCs for this customer (RLS). */
  selectBookingsByCustomer(customerId: string): JobCard[];
}

export type PortalServiceStore = PortalServiceState & PortalServiceActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePortalServiceStore = create<PortalServiceStore>()(
  immer((set, get) => ({
    // Deep-clone fixtures so mutations don't affect shared fixture objects
    jobCards: structuredClone(fixtureJobCards),

    createBookingFromPortal(sessionCustomerId, input, ownedVins) {
      // NFR-S: VIN must belong to the authenticated customer
      if (!ownedVins.includes(input.vin)) {
        return { ok: false, error: 'VIN_NOT_OWNED' };
      }

      // Duplicate guard: AWAITING_CONFIRMATION or RECEIVED for same VIN + date + slot
      const existing = get().jobCards.find(
        (jc) =>
          jc.vin === input.vin &&
          (jc.status === 'AWAITING_CONFIRMATION' || jc.status === 'RECEIVED') &&
          jc.scheduledDate === input.scheduledDate &&
          jc.scheduledSlot === input.scheduledSlot,
      );
      if (existing) {
        return { ok: false, error: 'DUPLICATE_BOOKING' };
      }

      let created!: JobCard;

      set((state) => {
        const jc: JobCard = {
          id: makeId('jc'),
          jobNo: nextJobNo(state.jobCards),
          vin: input.vin,
          customerId: sessionCustomerId, // always from session — NEVER from client input
          outletId: input.outletId,
          advisorId: 'staff-r09-001', // default advisor — SA assigns themselves on confirm
          technicianIds: [],
          status: 'AWAITING_CONFIRMATION',
          priority: 'NORMAL',
          promisedAt: `${input.scheduledDate}T${input.scheduledSlot === 'MORNING' ? '09' : '13'}:00:00.000Z`,
          receivedAt: now(),
          customerComplaint: input.concerns ?? '',
          odometerIn: 0,
          estimatedTotal: 0,
          labourLines: [],
          partsLines: [],
          attachments: [],
          source: 'CUSTOMER_PORTAL',
          serviceTypeId: input.serviceTypeId,
          scheduledDate: input.scheduledDate,
          scheduledSlot: input.scheduledSlot,
          pickupMode: input.pickupMode,
          pickupAddress: input.pickupAddress,
          concerns: input.concerns,
        };
        state.jobCards.push(jc);

        // Notification stub — TODO: wire to DLT_SVC_BOOKING_CREATED before go-live
        // eslint-disable-next-line no-console
        console.log('[DLT STUB] notifyBookingCreated', {
          templateId: 'DLT_SVC_BOOKING_CREATED',
          jobCardId: jc.id,
          jobNo: jc.jobNo,
          customerId: sessionCustomerId,
          scheduledDate: input.scheduledDate,
          scheduledSlot: input.scheduledSlot,
          serviceTypeId: input.serviceTypeId,
        });

        created = jc;
      });

      return { ok: true, jobCard: created };
    },

    cancelPortalBooking(jobCardId, sessionCustomerId) {
      const jc = get().jobCards.find((j) => j.id === jobCardId);
      if (!jc) return { ok: false, error: 'NOT_FOUND' };
      if (jc.customerId !== sessionCustomerId) return { ok: false, error: 'NOT_OWNER' };
      if (jc.status !== 'AWAITING_CONFIRMATION') return { ok: false, error: 'WRONG_STATUS' };

      set((state) => {
        const mutableJc = state.jobCards.find((j) => j.id === jobCardId);
        if (!mutableJc) return;
        mutableJc.status = 'CANCELLED';
        mutableJc.declineReason = SELF_CANCEL_REASON; // L_SVC_BOOK_1
      });

      return { ok: true };
    },

    selectBookingsByCustomer(customerId) {
      // RLS: only return this customer's bookings
      return get().jobCards.filter(
        (jc) => jc.customerId === customerId && jc.source === 'CUSTOMER_PORTAL',
      );
    },
  })),
);
