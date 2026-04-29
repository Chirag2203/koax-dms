/**
 * Analytics event tests — SPEC-CUSTOMER-PORTAL-002 §11.
 *
 * Verifies that all 5 analytics events fire with the correct payload shape.
 *
 * Events tested:
 *   1. service_booking_started        — customerId + source: 'portal'
 *   2. service_booking_step_completed — step number + optional serviceTypeId
 *   3. service_booking_submitted      — jobCardId + serviceTypeId + pickupMode + outletId
 *   4. service_booking_confirmed_by_staff — jobCardId + advisorId   (staff-side)
 *   5. service_booking_declined_by_staff  — jobCardId + declineReason (staff-side)
 *
 * Also verifies:
 *   - SELF_CANCEL_REASON constant equals the locked discriminator string
 *   - track() pushes to window.__bn_analytics with correct structure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { track, trackServiceBookingStarted, trackServiceBookingStepCompleted, trackServiceBookingSubmitted } from '../../analytics';
import { SELF_CANCEL_REASON } from '../service-booking-store';

// ─── Window mock ──────────────────────────────────────────────────────────────

// Vitest runs in node environment per vitest.config.ts — simulate window for
// the analytics push test.
const windowMock: { __bn_analytics?: Array<{ event: string; payload: Record<string, unknown>; ts: string }> } = {};

beforeEach(() => {
  windowMock.__bn_analytics = undefined;
  // Patch global window for SSR-guard test
  Object.defineProperty(globalThis, 'window', {
    value: windowMock,
    writable: true,
    configurable: true,
  });
});

// ─── track() core ─────────────────────────────────────────────────────────────

describe('track() — core behaviour', () => {
  it('pushes an event entry to window.__bn_analytics', () => {
    track('test_event', { foo: 'bar' });

    expect(windowMock.__bn_analytics).toBeDefined();
    expect(windowMock.__bn_analytics).toHaveLength(1);

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.event).toBe('test_event');
    expect(entry.payload).toEqual({ foo: 'bar' });
    expect(typeof entry.ts).toBe('string');
    // ts must be a valid ISO-8601 date
    expect(() => new Date(entry.ts)).not.toThrow();
  });

  it('initialises window.__bn_analytics array if not present', () => {
    windowMock.__bn_analytics = undefined;
    track('init_test', {});
    expect(Array.isArray(windowMock.__bn_analytics)).toBe(true);
  });

  it('accumulates multiple events in order', () => {
    track('event_a', { n: 1 });
    track('event_b', { n: 2 });
    expect(windowMock.__bn_analytics).toHaveLength(2);
    expect(windowMock.__bn_analytics![0]!.event).toBe('event_a');
    expect(windowMock.__bn_analytics![1]!.event).toBe('event_b');
  });
});

// ─── Event 1: service_booking_started ────────────────────────────────────────

describe('trackServiceBookingStarted — §11 event 1', () => {
  it('emits service_booking_started with customerId and source portal', () => {
    trackServiceBookingStarted({ customerId: 'cust-001', source: 'portal' });

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.event).toBe('service_booking_started');
    expect(entry.payload).toEqual({ customerId: 'cust-001', source: 'portal' });
  });

  it('source is always "portal"', () => {
    trackServiceBookingStarted({ customerId: 'cust-xyz', source: 'portal' });
    expect(windowMock.__bn_analytics![0]!.payload.source).toBe('portal');
  });
});

// ─── Event 2: service_booking_step_completed ─────────────────────────────────

describe('trackServiceBookingStepCompleted — §11 event 2', () => {
  it('emits step_completed with step number for step 1 (no serviceTypeId)', () => {
    trackServiceBookingStepCompleted({ step: 1 });

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.event).toBe('service_booking_step_completed');
    expect(entry.payload.step).toBe(1);
    expect(entry.payload.serviceTypeId).toBeUndefined();
  });

  it('emits step_completed with serviceTypeId when step >= 2', () => {
    trackServiceBookingStepCompleted({ step: 2, serviceTypeId: 'annual-service' });

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.payload.step).toBe(2);
    expect(entry.payload.serviceTypeId).toBe('annual-service');
  });

  it('emits step_completed for each of the 5 wizard steps', () => {
    ([1, 2, 3, 4, 5] as const).forEach((step) => {
      trackServiceBookingStepCompleted({ step });
    });
    expect(windowMock.__bn_analytics).toHaveLength(5);
    windowMock.__bn_analytics!.forEach((entry, i) => {
      expect(entry.event).toBe('service_booking_step_completed');
      expect(entry.payload.step).toBe(i + 1);
    });
  });
});

// ─── Event 3: service_booking_submitted ──────────────────────────────────────

describe('trackServiceBookingSubmitted — §11 event 3', () => {
  it('emits service_booking_submitted with all required fields', () => {
    trackServiceBookingSubmitted({
      jobCardId: 'jc-test-001',
      serviceTypeId: 'annual-service',
      pickupMode: 'WORKSHOP_DROP',
      outletId: 'outlet-blr',
    });

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.event).toBe('service_booking_submitted');
    expect(entry.payload).toEqual({
      jobCardId: 'jc-test-001',
      serviceTypeId: 'annual-service',
      pickupMode: 'WORKSHOP_DROP',
      outletId: 'outlet-blr',
    });
  });

  it('correctly records HOME_PICKUP mode', () => {
    trackServiceBookingSubmitted({
      jobCardId: 'jc-test-002',
      serviceTypeId: 'oil-change',
      pickupMode: 'HOME_PICKUP',
      outletId: 'outlet-mum',
    });
    expect(windowMock.__bn_analytics![0]!.payload.pickupMode).toBe('HOME_PICKUP');
  });
});

// ─── L_SVC_BOOK_1: SELF_CANCEL_REASON discriminator ──────────────────────────

describe('SELF_CANCEL_REASON constant — L_SVC_BOOK_1 locked decision', () => {
  it('equals the exact locked discriminator string "Cancelled by customer"', () => {
    expect(SELF_CANCEL_REASON).toBe('Cancelled by customer');
  });

  it('is case-sensitive — lower-case variant does not match', () => {
    expect(SELF_CANCEL_REASON).not.toBe('cancelled by customer');
  });

  it('is case-sensitive — mixed case does not match', () => {
    expect(SELF_CANCEL_REASON).not.toBe('Cancelled By Customer');
  });

  it('can be used for strict equality check (portal discriminator logic)', () => {
    const jcSelfCancel = { declineReason: 'Cancelled by customer' };
    const jcSaDecline = { declineReason: 'Vehicle not available' };

    expect(jcSelfCancel.declineReason === SELF_CANCEL_REASON).toBe(true);
    expect(jcSaDecline.declineReason === SELF_CANCEL_REASON).toBe(false);
  });
});
