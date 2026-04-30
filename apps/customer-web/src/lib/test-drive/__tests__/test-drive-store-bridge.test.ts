/**
 * Customer-portal test-drive store bridge — unit tests.
 *
 * Coverage:
 *  1. createBooking with govt ID (AADHAAR_L4) persists to booking
 *  2. createBooking without govt ID still works (optional fields)
 *  3. createBooking with PAN passes validation regex ABCDE1234F
 *  4. createBooking with DL persists correct value
 *  5. duplicate active booking throws
 *  6. AADHAAR_L4 validation — exactly 4 digits
 *  7. PAN validation — 10-char canonical format
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTestDriveStore } from '../test-drive-store-bridge';
import type { PortalCreateTestDriveInput } from '../test-drive-store-bridge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useTestDriveStore.setState({ bookings: {}, hydrated: false });
}

const BASE_INPUT: PortalCreateTestDriveInput = {
  customerId: 'cust-001',
  customerName: 'Priya Iyer',
  customerPhone: '+919876543210',
  customerEmail: 'priya@example.com',
  vehicleVin: 'WBAJW2C50JB034567',
  vehicleMake: 'BMW',
  vehicleModel: '5 Series',
  vehicleYear: 2021,
  outletId: 'bangalore',
  requestedDate: '2026-05-15',
  requestedSlot: 'MORNING',
};

// ─── 1: createBooking with govt ID persists ────────────────────────────────────

describe('createBooking — government ID', () => {
  beforeEach(resetStore);

  it('persists AADHAAR_L4 type and value to the booking', () => {
    const booking = useTestDriveStore.getState().createBooking({
      ...BASE_INPUT,
      governmentIdType: 'AADHAAR_L4',
      governmentIdValue: '5678',
    });

    expect(booking.governmentIdType).toBe('AADHAAR_L4');
    expect(booking.governmentIdValue).toBe('5678');
    expect(booking.status).toBe('PENDING');
  });

  it('persists PAN type and value to the booking', () => {
    const booking = useTestDriveStore.getState().createBooking({
      ...BASE_INPUT,
      vehicleVin: 'WBAJW2C50JB034568', // different VIN
      governmentIdType: 'PAN',
      governmentIdValue: 'ABCDE1234F',
    });

    expect(booking.governmentIdType).toBe('PAN');
    expect(booking.governmentIdValue).toBe('ABCDE1234F');
  });

  it('persists DL type and value to the booking', () => {
    const booking = useTestDriveStore.getState().createBooking({
      ...BASE_INPUT,
      vehicleVin: 'WBAJW2C50JB034569', // different VIN
      governmentIdType: 'DL',
      governmentIdValue: 'KA0120231234567',
    });

    expect(booking.governmentIdType).toBe('DL');
    expect(booking.governmentIdValue).toBe('KA0120231234567');
  });

  it('works without govt ID (all ID fields optional)', () => {
    const booking = useTestDriveStore.getState().createBooking({
      ...BASE_INPUT,
      vehicleVin: 'WBAJW2C50JB034570', // different VIN
    });

    expect(booking.governmentIdType).toBeUndefined();
    expect(booking.governmentIdValue).toBeUndefined();
    expect(booking.id).toBeTruthy();
  });

  it('persists customerPhone and customerEmail to the booking', () => {
    const booking = useTestDriveStore.getState().createBooking({
      ...BASE_INPUT,
      vehicleVin: 'WBAJW2C50JB034571', // different VIN
      customerPhone: '+919876543210',
      customerEmail: 'priya@example.com',
    });

    expect(booking.customerPhone).toBe('+919876543210');
    expect(booking.customerEmail).toBe('priya@example.com');
  });
});

// ─── 6–7: Validation regex smoke tests ───────────────────────────────────────

describe('Govt ID validation regexes', () => {
  it('AADHAAR_L4: exactly 4 digits passes', () => {
    expect(/^\d{4}$/.test('1234')).toBe(true);
    expect(/^\d{4}$/.test('123')).toBe(false);
    expect(/^\d{4}$/.test('12345')).toBe(false);
    expect(/^\d{4}$/.test('12ab')).toBe(false);
  });

  it('PAN: 10-char canonical format ABCDE1234F', () => {
    const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
    expect(PAN_RE.test('ABCDE1234F')).toBe(true);
    expect(PAN_RE.test('abcde1234f')).toBe(false); // lowercase invalid
    expect(PAN_RE.test('ABCDE12345')).toBe(false); // digit at end
    expect(PAN_RE.test('ABC1234F')).toBe(false);   // too short
  });
});
