/**
 * Portal service store tests — SPEC-CUSTOMER-PORTAL-002 §17.
 *
 * Covers:
 *   1. createBookingFromPortal happy path — creates JC with AWAITING_CONFIRMATION + CUSTOMER_PORTAL source
 *   2. Server rejects client-supplied customerId — VIN ownership verified from ownedVins arg only
 *   3. Customer self-cancel flow — AWAITING_CONFIRMATION → CANCELLED
 *   4. Self-cancel blocked after confirmation (RECEIVED status)
 *   5. Duplicate booking guard
 *   6. RLS — selectBookingsByCustomer returns only the authenticated customer's bookings
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePortalServiceStore } from '../service-booking-service-bridge';

// Helper to get a fresh store state for each test
function getStore() {
  return usePortalServiceStore.getState();
}

const MOCK_CUSTOMER_ID = 'cust-arjun-mehta';
const OTHER_CUSTOMER_ID = 'cust-priya-sharma';

const BASE_INPUT = {
  vin: 'WBY2Z21090VX45678',
  serviceTypeId: 'annual-service',
  scheduledDate: '2026-05-15',
  scheduledSlot: 'MORNING' as const,
  outletId: 'bn-bangalore',
  pickupMode: 'WORKSHOP_DROP' as const,
};

describe('createBookingFromPortal', () => {
  beforeEach(() => {
    // Reset store to fixture state before each test
    usePortalServiceStore.setState({
      jobCards: [],
    });
  });

  it('happy path — creates JC with AWAITING_CONFIRMATION and CUSTOMER_PORTAL source', () => {
    const store = getStore();
    const ownedVins = [BASE_INPUT.vin];

    const result = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.jobCard.status).toBe('AWAITING_CONFIRMATION');
    expect(result.jobCard.source).toBe('CUSTOMER_PORTAL');
    expect(result.jobCard.customerId).toBe(MOCK_CUSTOMER_ID);
    expect(result.jobCard.serviceTypeId).toBe(BASE_INPUT.serviceTypeId);
    expect(result.jobCard.scheduledDate).toBe(BASE_INPUT.scheduledDate);
    expect(result.jobCard.scheduledSlot).toBe(BASE_INPUT.scheduledSlot);
    expect(result.jobCard.jobNo).toMatch(/^JC-2026-\d{5}$/);
  });

  it('SECURITY: rejects if VIN is not in ownedVins (client-supplied customerId bypass attempt)', () => {
    const store = getStore();
    // Attacker provides their customerId in session but a VIN they do not own
    const attackerOwnedVins: string[] = []; // empty — attacker doesn't own the VIN

    const result = store.createBookingFromPortal(
      MOCK_CUSTOMER_ID,
      { ...BASE_INPUT, vin: 'WBA12345678901234' }, // VIN not in ownedVins
      attackerOwnedVins,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('VIN_NOT_OWNED');
  });

  it('SECURITY: customerId in returned JC is always sessionCustomerId — never from input', () => {
    const store = getStore();
    const ownedVins = [BASE_INPUT.vin];

    const result = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // customerId must equal session customer — input has no customerId field to tamper with
    expect(result.jobCard.customerId).toBe(MOCK_CUSTOMER_ID);
    expect(result.jobCard.customerId).not.toBe(OTHER_CUSTOMER_ID);
  });

  it('duplicate booking guard — same VIN + date + slot returns DUPLICATE_BOOKING', () => {
    const store = getStore();
    const ownedVins = [BASE_INPUT.vin];

    // First booking succeeds
    const first = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);
    expect(first.ok).toBe(true);

    // Second booking with same VIN + date + slot should fail
    const second = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBe('DUPLICATE_BOOKING');
  });
});

describe('cancelPortalBooking — customer self-cancel (L5 path override)', () => {
  beforeEach(() => {
    usePortalServiceStore.setState({ jobCards: [] });
  });

  it('customer can self-cancel their own AWAITING_CONFIRMATION booking', () => {
    const store = getStore();
    const ownedVins = [BASE_INPUT.vin];

    const createResult = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const jobCardId = createResult.jobCard.id;
    const cancelResult = store.cancelPortalBooking(jobCardId, MOCK_CUSTOMER_ID);

    expect(cancelResult.ok).toBe(true);

    // Re-read state after mutation (zustand immer writes to a new state object)
    const currentState = getStore();
    const updatedJc = currentState.jobCards.find((jc) => jc.id === jobCardId);
    expect(updatedJc?.status).toBe('CANCELLED');
    expect(updatedJc?.declineReason).toBe('Cancelled by customer');
  });

  it('blocks cancel if booking is RECEIVED (post-confirmation — v1.5 feature)', () => {
    const store = getStore();
    const ownedVins = [BASE_INPUT.vin];

    const createResult = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const jobCardId = createResult.jobCard.id;

    // Manually advance status to RECEIVED (simulates SA confirmation)
    usePortalServiceStore.setState((state) => ({
      jobCards: state.jobCards.map((jc) =>
        jc.id === jobCardId ? { ...jc, status: 'RECEIVED' as const } : jc,
      ),
    }));

    const cancelResult = store.cancelPortalBooking(jobCardId, MOCK_CUSTOMER_ID);
    expect(cancelResult.ok).toBe(false);
    if (cancelResult.ok) return;
    expect(cancelResult.error).toBe('WRONG_STATUS');
  });

  it('blocks cancel by a different customer (RLS enforcement)', () => {
    const store = getStore();
    const ownedVins = [BASE_INPUT.vin];

    const createResult = store.createBookingFromPortal(MOCK_CUSTOMER_ID, BASE_INPUT, ownedVins);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const jobCardId = createResult.jobCard.id;

    // Different customer tries to cancel
    const cancelResult = store.cancelPortalBooking(jobCardId, OTHER_CUSTOMER_ID);
    expect(cancelResult.ok).toBe(false);
    if (cancelResult.ok) return;
    expect(cancelResult.error).toBe('NOT_OWNER');
  });
});

describe('selectBookingsByCustomer — RLS', () => {
  beforeEach(() => {
    usePortalServiceStore.setState({ jobCards: [] });
  });

  it('returns only the authenticated customer\'s portal bookings', () => {
    const store = getStore();

    // Customer A booking
    store.createBookingFromPortal(
      MOCK_CUSTOMER_ID,
      { ...BASE_INPUT, vin: 'WBY2Z21090VX45678' },
      ['WBY2Z21090VX45678'],
    );

    // Customer B booking (different VIN)
    store.createBookingFromPortal(
      OTHER_CUSTOMER_ID,
      { ...BASE_INPUT, vin: 'WBAFG21090VX99999', scheduledDate: '2026-05-16' },
      ['WBAFG21090VX99999'],
    );

    const customerABookings = store.selectBookingsByCustomer(MOCK_CUSTOMER_ID);
    const customerBBookings = store.selectBookingsByCustomer(OTHER_CUSTOMER_ID);

    expect(customerABookings).toHaveLength(1);
    expect(customerABookings[0]?.customerId).toBe(MOCK_CUSTOMER_ID);

    expect(customerBBookings).toHaveLength(1);
    expect(customerBBookings[0]?.customerId).toBe(OTHER_CUSTOMER_ID);
  });

  it('returns empty array for a customer with no portal bookings', () => {
    const store = getStore();
    const bookings = store.selectBookingsByCustomer('cust-no-bookings');
    expect(bookings).toEqual([]);
  });
});
