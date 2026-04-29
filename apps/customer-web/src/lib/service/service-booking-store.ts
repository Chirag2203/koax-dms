/**
 * Customer-web service booking store — Zustand + immer.
 *
 * Manages the booking wizard state (multi-step form) and the list of the
 * authenticated customer's Job Cards (portal bookings only).
 *
 * Security contract (SPEC-CUSTOMER-PORTAL-002 §14 NFR-S):
 *   - customerId is NEVER stored in the wizard form state.
 *   - createBooking() receives customerId as a separate argument from the
 *     session (not from user input) and passes it to the service-store action
 *     that enforces VIN ownership validation.
 *   - The store derives customerId exclusively from the portal auth session.
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §5.4, §7.1, §21 P1
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { JobCard } from '@dms/types';
import type { ServiceBookingRequest } from '@dms/types';

// ─── Wizard step types ────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardFormData {
  // Step 1 — Vehicle
  selectedVin: string | null;
  // Step 2 — Service
  selectedServiceTypeId: string | null;
  // Step 3 — Date & Slot
  selectedDate: string | null;        // YYYY-MM-DD
  selectedSlot: 'MORNING' | 'AFTERNOON' | null;
  // Step 4 — Location
  outletId: string;
  pickupMode: 'WORKSHOP_DROP' | 'HOME_PICKUP';
  pickupAddress: {
    line1: string;
    line2?: string;
    city: string;
    pinCode: string;
  } | null;
  // Step 5 — Review
  concerns: string;
}

export interface SubmitResult {
  jobCardId: string;
  jobNo: string;
  scheduledDate: string;
  serviceTypeName: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface ServiceBookingState {
  // Wizard
  currentStep: WizardStep;
  formData: WizardFormData;
  isSubmitting: boolean;
  submitError: string | null;
  submitResult: SubmitResult | null;

  // Bookings list (RLS: only the authenticated customer's bookings)
  bookings: JobCard[];
  isLoadingBookings: boolean;
  bookingsError: string | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface ServiceBookingActions {
  // Wizard navigation
  goToStep(step: WizardStep): void;
  nextStep(): void;
  prevStep(): void;
  resetWizard(): void;

  // Form field updates
  selectVin(vin: string): void;
  selectServiceType(serviceTypeId: string): void;
  selectDate(date: string): void;
  selectSlot(slot: 'MORNING' | 'AFTERNOON'): void;
  setPickupMode(mode: 'WORKSHOP_DROP' | 'HOME_PICKUP'): void;
  setPickupAddress(addr: WizardFormData['pickupAddress']): void;
  setConcerns(text: string): void;
  setOutletId(outletId: string): void;

  // Submission
  submitBooking(
    sessionCustomerId: string,
    ownedVins: string[],
    serviceTypeNameMap: Record<string, string>,
    createBookingFn: (
      sessionCustomerId: string,
      input: Omit<ServiceBookingRequest, 'requestId'>,
      ownedVins: string[],
    ) => { ok: true; jobCard: JobCard } | { ok: false; error: string },
  ): Promise<void>;

  // Bookings list
  loadBookings(customerId: string, allJobCards: JobCard[]): void;

  // Self-cancel
  cancelBooking(
    jobCardId: string,
    sessionCustomerId: string,
    cancelFn: (
      jobCardId: string,
      sessionCustomerId: string,
    ) => { ok: true } | { ok: false; error: string },
  ): { ok: true } | { ok: false; error: string };
}

export type ServiceBookingStore = ServiceBookingState & ServiceBookingActions;

// ─── Default form data ────────────────────────────────────────────────────────

const DEFAULT_OUTLET_ID = 'outlet-blr'; // default — Bangalore HQ

function defaultFormData(): WizardFormData {
  return {
    selectedVin: null,
    selectedServiceTypeId: null,
    selectedDate: null,
    selectedSlot: null,
    outletId: DEFAULT_OUTLET_ID,
    pickupMode: 'WORKSHOP_DROP',
    pickupAddress: null,
    concerns: '',
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useServiceBookingStore = create<ServiceBookingStore>()(
  immer((set, get) => ({
    // Initial state
    currentStep: 1,
    formData: defaultFormData(),
    isSubmitting: false,
    submitError: null,
    submitResult: null,
    bookings: [],
    isLoadingBookings: false,
    bookingsError: null,

    // ── Wizard navigation ───────────────────────────────────────────────────

    goToStep(step) {
      set((state) => { state.currentStep = step; });
    },

    nextStep() {
      set((state) => {
        if (state.currentStep < 5) state.currentStep = (state.currentStep + 1) as WizardStep;
      });
    },

    prevStep() {
      set((state) => {
        if (state.currentStep > 1) state.currentStep = (state.currentStep - 1) as WizardStep;
      });
    },

    resetWizard() {
      set((state) => {
        state.currentStep = 1;
        state.formData = defaultFormData();
        state.isSubmitting = false;
        state.submitError = null;
        state.submitResult = null;
      });
    },

    // ── Form field updates ──────────────────────────────────────────────────

    selectVin(vin) {
      set((state) => { state.formData.selectedVin = vin; });
    },

    selectServiceType(serviceTypeId) {
      set((state) => { state.formData.selectedServiceTypeId = serviceTypeId; });
    },

    selectDate(date) {
      set((state) => {
        state.formData.selectedDate = date;
        state.formData.selectedSlot = null; // reset slot when date changes
      });
    },

    selectSlot(slot) {
      set((state) => { state.formData.selectedSlot = slot; });
    },

    setPickupMode(mode) {
      set((state) => {
        state.formData.pickupMode = mode;
        if (mode === 'WORKSHOP_DROP') {
          state.formData.pickupAddress = null;
        }
      });
    },

    setPickupAddress(addr) {
      set((state) => { state.formData.pickupAddress = addr; });
    },

    setConcerns(text) {
      set((state) => { state.formData.concerns = text; });
    },

    setOutletId(outletId) {
      set((state) => { state.formData.outletId = outletId; });
    },

    // ── Submit booking ──────────────────────────────────────────────────────

    async submitBooking(sessionCustomerId, ownedVins, serviceTypeNameMap, createBookingFn) {
      const { formData } = get();

      if (
        !formData.selectedVin ||
        !formData.selectedServiceTypeId ||
        !formData.selectedDate ||
        !formData.selectedSlot
      ) {
        set((state) => { state.submitError = 'Please complete all required fields.'; });
        return;
      }

      if (formData.pickupMode === 'HOME_PICKUP' && !formData.pickupAddress) {
        set((state) => { state.submitError = 'Please enter a pickup address.'; });
        return;
      }

      set((state) => {
        state.isSubmitting = true;
        state.submitError = null;
      });

      try {
        const input: Omit<ServiceBookingRequest, 'requestId'> = {
          vin: formData.selectedVin,
          serviceTypeId: formData.selectedServiceTypeId,
          scheduledDate: formData.selectedDate,
          scheduledSlot: formData.selectedSlot,
          outletId: formData.outletId,
          pickupMode: formData.pickupMode,
          pickupAddress: formData.pickupAddress ?? undefined,
          concerns: formData.concerns || undefined,
        };

        const result = createBookingFn(sessionCustomerId, input, ownedVins);

        if (!result.ok) {
          const errorMsg =
            result.error === 'VIN_NOT_OWNED'
              ? 'This vehicle is not linked to your account.'
              : result.error === 'DUPLICATE_BOOKING'
              ? 'You already have a pending booking for this vehicle on this date and slot.'
              : 'Booking could not be created. Please try again.';

          set((state) => {
            state.isSubmitting = false;
            state.submitError = errorMsg;
          });
          return;
        }

        const serviceTypeName =
          serviceTypeNameMap[formData.selectedServiceTypeId] ?? formData.selectedServiceTypeId;

        set((state) => {
          state.isSubmitting = false;
          state.submitResult = {
            jobCardId: result.jobCard.id,
            jobNo: result.jobCard.jobNo,
            scheduledDate: formData.selectedDate!,
            serviceTypeName,
          };
        });
      } catch {
        set((state) => {
          state.isSubmitting = false;
          state.submitError = 'Booking could not be created. Please try again.';
        });
      }
    },

    // ── Bookings list ───────────────────────────────────────────────────────

    loadBookings(customerId, allJobCards) {
      set((state) => {
        state.isLoadingBookings = false;
        // RLS: filter strictly to this customer's bookings
        state.bookings = allJobCards.filter((jc) => jc.customerId === customerId);
        state.bookingsError = null;
      });
    },

    // ── Self-cancel ─────────────────────────────────────────────────────────

    cancelBooking(jobCardId, sessionCustomerId, cancelFn) {
      const result = cancelFn(jobCardId, sessionCustomerId);
      if (result.ok) {
        // Optimistic update: mark as CANCELLED in local list
        set((state) => {
          const booking = state.bookings.find((b) => b.id === jobCardId);
          if (booking) {
            booking.status = 'CANCELLED';
            booking.declineReason = 'Cancelled by customer';
          }
        });
      }
      return result;
    },
  })),
);
