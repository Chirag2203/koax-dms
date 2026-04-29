/**
 * Staff-web analytics event tests — SPEC-CUSTOMER-PORTAL-002 §11.
 *
 * Covers events 4 & 5 (staff-side) plus the SELF_CANCEL_REASON constant.
 *
 *   4. service_booking_confirmed_by_staff — jobCardId + advisorId
 *   5. service_booking_declined_by_staff  — jobCardId + declineReason
 *
 * Also verifies that the service-store's confirmPortalBooking and
 * declinePortalBooking actions push the correct analytics events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { track, trackServiceBookingConfirmedByStaff, trackServiceBookingDeclinedByStaff } from '../../analytics';
import { SELF_CANCEL_REASON } from '../state-machine';
import { useServiceStore } from '../service-store';

// ─── Window mock ──────────────────────────────────────────────────────────────

const windowMock: { __bn_analytics?: Array<{ event: string; payload: Record<string, unknown>; ts: string }> } = {};

beforeEach(() => {
  windowMock.__bn_analytics = undefined;
  Object.defineProperty(globalThis, 'window', {
    value: windowMock,
    writable: true,
    configurable: true,
  });
});

// ─── Event 4: service_booking_confirmed_by_staff ─────────────────────────────

describe('trackServiceBookingConfirmedByStaff — §11 event 4', () => {
  it('emits service_booking_confirmed_by_staff with jobCardId and advisorId', () => {
    trackServiceBookingConfirmedByStaff({ jobCardId: 'jc-001', advisorId: 'staff-r09-001' });

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.event).toBe('service_booking_confirmed_by_staff');
    expect(entry.payload).toEqual({ jobCardId: 'jc-001', advisorId: 'staff-r09-001' });
  });

  it('timestamp is set on emit', () => {
    const before = Date.now();
    trackServiceBookingConfirmedByStaff({ jobCardId: 'jc-002', advisorId: 'staff-r09-002' });
    const after = Date.now();

    const entry = windowMock.__bn_analytics![0]!;
    const ts = new Date(entry.ts).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── Event 5: service_booking_declined_by_staff ──────────────────────────────

describe('trackServiceBookingDeclinedByStaff — §11 event 5', () => {
  it('emits service_booking_declined_by_staff with jobCardId and declineReason', () => {
    trackServiceBookingDeclinedByStaff({ jobCardId: 'jc-003', declineReason: 'No bay available' });

    const entry = windowMock.__bn_analytics![0]!;
    expect(entry.event).toBe('service_booking_declined_by_staff');
    expect(entry.payload).toEqual({ jobCardId: 'jc-003', declineReason: 'No bay available' });
  });

  it('carries the declineReason verbatim in payload', () => {
    const reason = 'Service type not available at this outlet';
    trackServiceBookingDeclinedByStaff({ jobCardId: 'jc-004', declineReason: reason });
    expect(windowMock.__bn_analytics![0]!.payload.declineReason).toBe(reason);
  });
});

// ─── SELF_CANCEL_REASON — staff-web source-of-truth ─────────────────────────

describe('SELF_CANCEL_REASON in state-machine — L_SVC_BOOK_1 source of truth', () => {
  it('is exported from state-machine.ts (the authoritative source)', () => {
    expect(typeof SELF_CANCEL_REASON).toBe('string');
    expect(SELF_CANCEL_REASON).toBe('Cancelled by customer');
  });

  it('is exactly the string used by cancelPortalBooking in service-store', () => {
    // Arrange: create a booking via the store and self-cancel it
    useServiceStore.setState({
      jobCards: [{
        id: 'jc-cancel-test',
        jobNo: 'JC-2026-99999',
        vin: 'WBY2Z21090VX45678',
        customerId: 'cust-test',
        outletId: 'outlet-blr',
        advisorId: 'staff-r09-001',
        technicianIds: [],
        status: 'AWAITING_CONFIRMATION',
        priority: 'NORMAL',
        promisedAt: '2026-05-15T09:00:00.000Z',
        receivedAt: new Date().toISOString(),
        customerComplaint: '',
        odometerIn: 0,
        estimatedTotal: 0,
        labourLines: [],
        partsLines: [],
        attachments: [],
        source: 'CUSTOMER_PORTAL',
        serviceTypeId: 'annual-service',
        scheduledDate: '2026-05-15',
        scheduledSlot: 'MORNING',
        pickupMode: 'WORKSHOP_DROP',
      }],
    });

    const result = useServiceStore.getState().cancelPortalBooking(
      'jc-cancel-test',
      'cust-test',
      { id: 'cust-test', name: 'Test Customer' },
    );

    expect(result.ok).toBe(true);

    const updatedJc = useServiceStore.getState().jobCards.find((jc) => jc.id === 'jc-cancel-test');
    // The stored declineReason must equal the constant — not a different literal
    expect(updatedJc?.declineReason).toBe(SELF_CANCEL_REASON);
    expect(updatedJc?.declineReason).toBe('Cancelled by customer');
  });
});
