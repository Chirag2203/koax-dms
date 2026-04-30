/**
 * Test-drive store unit tests — SPEC-TEST-DRIVE-001
 *
 * Coverage:
 *  1.  canTransitionTestDrive — all valid transitions
 *  2.  canTransitionTestDrive — all invalid transitions
 *  3.  _seed — idempotent (double-seed is a no-op)
 *  4.  createBooking — creates a PENDING booking
 *  5.  createBooking — assigns auto-generated ID
 *  6.  createBooking (L8) — throws on duplicate active booking for same VIN
 *  7.  createBooking — allows second booking for same VIN after COMPLETED
 *  8.  createBooking — allows second booking for same VIN after CANCELLED
 *  9.  confirmBooking — PENDING → SCHEDULED, sets advisor + date + slot
 * 10.  confirmBooking — throws when booking not found
 * 11.  confirmBooking — throws on invalid transition (already SCHEDULED)
 * 12.  reslotBooking — updates confirmed date + slot without changing status
 * 13.  reslotBooking — throws if status is not SCHEDULED
 * 14.  startChecklist (L12) — SCHEDULED → EXECUTING, stores execution fields
 * 15.  startChecklist (L12) — throws when licenseNumber missing
 * 16.  startChecklist (L12) — throws when fuelLevelBefore missing
 * 17.  startChecklist (L12) — throws when odometerBefore missing
 * 18.  completeDrive — EXECUTING → COMPLETED, stores feedback
 * 19.  completeDrive — throws on invalid transition (PENDING → COMPLETED)
 * 20.  markNoShow — SCHEDULED → NO_SHOW (terminal, L9)
 * 21.  markNoShow — throws from COMPLETED (terminal)
 * 22.  cancelBooking — PENDING → CANCELLED
 * 23.  cancelBooking — SCHEDULED → CANCELLED
 * 24.  cancelBooking — throws on COMPLETED (terminal, L9)
 * 25.  cancelBooking — throws on NO_SHOW (terminal)
 * 26.  selectByOutlet — returns only bookings for the given outlet
 * 27.  selectByOutlet — 'all' returns all bookings
 * 28.  selectByStatus — returns only bookings with matching status
 * 29.  selectByCustomer — returns only bookings for the given customer
 * 30.  selectById — returns correct booking
 * 31.  selectById — returns undefined for unknown id
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §4, §6, L1, L3, L8, L9, L12
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTestDriveStore, canTransitionTestDrive } from '../test-drive-store';
import type { TestDriveBooking, TestDriveExecution, TestDriveFeedback } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBooking(overrides: Partial<TestDriveBooking> = {}): TestDriveBooking {
  return {
    id: 'TD-T01',
    customerId: 'CUST-001',
    customerName: 'Ravi Sharma',
    vehicleVin: 'WBY2Z21090VX45678',
    vehicleMake: 'BMW',
    vehicleModel: 'i8',
    vehicleYear: 2021,
    outletId: 'bangalore',
    requestedDate: '2026-05-10',
    requestedSlot: 'MORNING',
    status: 'PENDING',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  };
}

function makeExecution(overrides: Partial<TestDriveExecution> = {}): TestDriveExecution {
  return {
    licenseNumber: 'KA01 20230012345',
    licenseVerifiedAt: '2026-05-10T09:55:00.000Z',
    fuelLevelBefore: 75,
    odometerBefore: 12450,
    startedAt: '2026-05-10T10:05:00.000Z',
    ...overrides,
  };
}

function makeFeedback(overrides: Partial<TestDriveFeedback> = {}): TestDriveFeedback {
  return {
    interestLevel: 'warm',
    followUpDays: 7,
    recordedBy: 'ADV-001',
    recordedAt: '2026-05-10T11:30:00.000Z',
    ...overrides,
  };
}

/** Reset Zustand store to empty state before each test */
function resetStore() {
  useTestDriveStore.setState({ bookings: {}, hydrated: false });
}

// ─── canTransitionTestDrive ────────────────────────────────────────────────────

describe('canTransitionTestDrive — valid transitions (L1)', () => {
  it('PENDING → SCHEDULED is valid', () => {
    expect(canTransitionTestDrive('PENDING', 'SCHEDULED')).toBe(true);
  });

  it('PENDING → CANCELLED is valid', () => {
    expect(canTransitionTestDrive('PENDING', 'CANCELLED')).toBe(true);
  });

  it('SCHEDULED → EXECUTING is valid', () => {
    expect(canTransitionTestDrive('SCHEDULED', 'EXECUTING')).toBe(true);
  });

  it('SCHEDULED → CANCELLED is valid', () => {
    expect(canTransitionTestDrive('SCHEDULED', 'CANCELLED')).toBe(true);
  });

  it('EXECUTING → COMPLETED is valid', () => {
    expect(canTransitionTestDrive('EXECUTING', 'COMPLETED')).toBe(true);
  });

  it('EXECUTING → NO_SHOW is valid', () => {
    expect(canTransitionTestDrive('EXECUTING', 'NO_SHOW')).toBe(true);
  });
});

describe('canTransitionTestDrive — invalid transitions (L1, L9)', () => {
  it('PENDING → EXECUTING is invalid', () => {
    expect(canTransitionTestDrive('PENDING', 'EXECUTING')).toBe(false);
  });

  it('PENDING → COMPLETED is invalid', () => {
    expect(canTransitionTestDrive('PENDING', 'COMPLETED')).toBe(false);
  });

  it('COMPLETED → anything is invalid (terminal, L9)', () => {
    expect(canTransitionTestDrive('COMPLETED', 'PENDING')).toBe(false);
    expect(canTransitionTestDrive('COMPLETED', 'SCHEDULED')).toBe(false);
    expect(canTransitionTestDrive('COMPLETED', 'CANCELLED')).toBe(false);
  });

  it('NO_SHOW → anything is invalid (terminal, L9)', () => {
    expect(canTransitionTestDrive('NO_SHOW', 'PENDING')).toBe(false);
    expect(canTransitionTestDrive('NO_SHOW', 'SCHEDULED')).toBe(false);
  });

  it('CANCELLED → anything is invalid (terminal, L9)', () => {
    expect(canTransitionTestDrive('CANCELLED', 'PENDING')).toBe(false);
    expect(canTransitionTestDrive('CANCELLED', 'SCHEDULED')).toBe(false);
  });
});

// ─── _seed ─────────────────────────────────────────────────────────────────────

describe('_seed', () => {
  beforeEach(resetStore);

  it('loads fixture bookings into the store', () => {
    const bookings = [makeBooking({ id: 'TD-001' }), makeBooking({ id: 'TD-002' })];
    useTestDriveStore.getState()._seed(bookings);
    expect(Object.keys(useTestDriveStore.getState().bookings)).toHaveLength(2);
  });

  it('is idempotent — double seed does not duplicate', () => {
    const bookings = [makeBooking({ id: 'TD-001' })];
    useTestDriveStore.getState()._seed(bookings);
    useTestDriveStore.getState()._seed(bookings);
    expect(Object.keys(useTestDriveStore.getState().bookings)).toHaveLength(1);
  });

  it('sets hydrated = true after seeding', () => {
    useTestDriveStore.getState()._seed([makeBooking({ id: 'TD-001' })]);
    expect(useTestDriveStore.getState().hydrated).toBe(true);
  });
});

// ─── createBooking ─────────────────────────────────────────────────────────────

describe('createBooking', () => {
  beforeEach(resetStore);

  it('creates a booking with PENDING status (S1)', () => {
    const booking = useTestDriveStore.getState().createBooking({
      customerId: 'CUST-001',
      customerName: 'Ravi Sharma',
      vehicleVin: 'WBY2Z21090VX45678',
      vehicleMake: 'BMW',
      vehicleModel: 'i8',
      vehicleYear: 2021,
      outletId: 'bangalore',
      requestedDate: '2026-05-10',
      requestedSlot: 'MORNING',
    });
    expect(booking.status).toBe('PENDING');
    expect(booking.customerId).toBe('CUST-001');
  });

  it('assigns an auto-generated TD-NNN id', () => {
    const booking = useTestDriveStore.getState().createBooking({
      customerId: 'CUST-001',
      customerName: 'Ravi Sharma',
      vehicleVin: 'WBY2Z21090VX45678',
      vehicleMake: 'BMW',
      vehicleModel: 'i8',
      vehicleYear: 2021,
      outletId: 'bangalore',
      requestedDate: '2026-05-10',
      requestedSlot: 'MORNING',
    });
    expect(booking.id).toMatch(/^TD-\d{3}$/);
  });

  it('(L8) throws duplicate-active-booking when PENDING booking exists for same VIN (S6)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', vehicleVin: 'VIN-SAME' })]);
    expect(() =>
      store.createBooking({
        customerId: 'CUST-002',
        customerName: 'Priya Mehta',
        vehicleVin: 'VIN-SAME',
        vehicleMake: 'Mercedes',
        vehicleModel: 'C-Class',
        vehicleYear: 2022,
        outletId: 'mumbai',
        requestedDate: '2026-05-11',
        requestedSlot: 'AFTERNOON',
      }),
    ).toThrow('duplicate-active-booking');
  });

  it('(L8) allows booking for same VIN after COMPLETED (S6 counter-case)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', vehicleVin: 'VIN-SAME', status: 'COMPLETED' })]);
    expect(() =>
      store.createBooking({
        customerId: 'CUST-002',
        customerName: 'Priya Mehta',
        vehicleVin: 'VIN-SAME',
        vehicleMake: 'Mercedes',
        vehicleModel: 'C-Class',
        vehicleYear: 2022,
        outletId: 'mumbai',
        requestedDate: '2026-05-11',
        requestedSlot: 'AFTERNOON',
      }),
    ).not.toThrow();
  });

  it('(L8) allows booking for same VIN after CANCELLED', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', vehicleVin: 'VIN-SAME', status: 'CANCELLED' })]);
    expect(() =>
      store.createBooking({
        customerId: 'CUST-002',
        customerName: 'Priya Mehta',
        vehicleVin: 'VIN-SAME',
        vehicleMake: 'Mercedes',
        vehicleModel: 'C-Class',
        vehicleYear: 2022,
        outletId: 'mumbai',
        requestedDate: '2026-05-11',
        requestedSlot: 'AFTERNOON',
      }),
    ).not.toThrow();
  });
});

// ─── confirmBooking ────────────────────────────────────────────────────────────

describe('confirmBooking', () => {
  beforeEach(resetStore);

  it('transitions PENDING → SCHEDULED and stores advisor details (S2)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001' })]);
    store.confirmBooking('TD-001', 'ADV-001', 'Vikram Nair', '2026-05-10', 'MORNING');
    const b = store.selectById('TD-001');
    expect(b?.status).toBe('SCHEDULED');
    expect(b?.assignedAdvisorName).toBe('Vikram Nair');
    expect(b?.confirmedDate).toBe('2026-05-10');
  });

  it('throws when booking not found', () => {
    const store = useTestDriveStore.getState();
    expect(() =>
      store.confirmBooking('TD-999', 'ADV-001', 'Vikram Nair', '2026-05-10', 'MORNING'),
    ).toThrow('booking "TD-999" not found');
  });

  it('throws on invalid transition (SCHEDULED → SCHEDULED)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    expect(() =>
      store.confirmBooking('TD-001', 'ADV-001', 'Vikram Nair', '2026-05-10', 'MORNING'),
    ).toThrow('invalid transition SCHEDULED → SCHEDULED');
  });
});

// ─── reslotBooking ─────────────────────────────────────────────────────────────

describe('reslotBooking', () => {
  beforeEach(resetStore);

  it('updates confirmed date and slot without changing status (S4)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED', confirmedDate: '2026-05-10', confirmedSlot: 'MORNING' })]);
    store.reslotBooking('TD-001', '2026-05-12', 'AFTERNOON');
    const b = store.selectById('TD-001');
    expect(b?.status).toBe('SCHEDULED');
    expect(b?.confirmedDate).toBe('2026-05-12');
    expect(b?.confirmedSlot).toBe('AFTERNOON');
  });

  it('throws if status is not SCHEDULED', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'PENDING' })]);
    expect(() => store.reslotBooking('TD-001', '2026-05-12', 'AFTERNOON')).toThrow(
      'can only reslot SCHEDULED bookings',
    );
  });
});

// ─── startChecklist ────────────────────────────────────────────────────────────

describe('startChecklist (L12)', () => {
  beforeEach(resetStore);

  it('transitions SCHEDULED → EXECUTING and stores execution data (S5)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    store.startChecklist('TD-001', makeExecution());
    const b = store.selectById('TD-001');
    expect(b?.status).toBe('EXECUTING');
    expect(b?.execution?.licenseNumber).toBe('KA01 20230012345');
    expect(b?.execution?.fuelLevelBefore).toBe(75);
    expect(b?.execution?.odometerBefore).toBe(12450);
  });

  it('(L12) throws when licenseNumber is missing', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    expect(() =>
      store.startChecklist('TD-001', makeExecution({ licenseNumber: '' })),
    ).toThrow('licenseNumber');
  });

  it('(L12) throws when fuelLevelBefore is missing', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    expect(() =>
      store.startChecklist('TD-001', makeExecution({ fuelLevelBefore: undefined as unknown as 75 })),
    ).toThrow('fuelLevelBefore');
  });

  it('(L12) throws when odometerBefore is missing', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    expect(() =>
      store.startChecklist('TD-001', makeExecution({ odometerBefore: undefined as unknown as number })),
    ).toThrow('odometerBefore');
  });

  it('throws on invalid transition (PENDING → EXECUTING)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'PENDING' })]);
    expect(() => store.startChecklist('TD-001', makeExecution())).toThrow(
      'invalid transition PENDING → EXECUTING',
    );
  });
});

// ─── completeDrive ─────────────────────────────────────────────────────────────

describe('completeDrive', () => {
  beforeEach(resetStore);

  it('transitions EXECUTING → COMPLETED and stores feedback (S7)', () => {
    const store = useTestDriveStore.getState();
    store._seed([
      makeBooking({
        id: 'TD-001',
        status: 'EXECUTING',
        execution: makeExecution(),
      }),
    ]);
    store.completeDrive('TD-001', makeFeedback({ interestLevel: 'hot' }));
    const b = store.selectById('TD-001');
    expect(b?.status).toBe('COMPLETED');
    expect(b?.feedback?.interestLevel).toBe('hot');
  });

  it('throws on invalid transition (PENDING → COMPLETED)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'PENDING' })]);
    expect(() => store.completeDrive('TD-001', makeFeedback())).toThrow(
      'invalid transition PENDING → COMPLETED',
    );
  });
});

// ─── markNoShow ────────────────────────────────────────────────────────────────

describe('markNoShow', () => {
  beforeEach(resetStore);

  it('transitions SCHEDULED → NO_SHOW (S8)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    store.markNoShow('TD-001');
    expect(store.selectById('TD-001')?.status).toBe('NO_SHOW');
  });

  it('(L9) throws when trying to mark COMPLETED booking as NO_SHOW', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'COMPLETED' })]);
    expect(() => store.markNoShow('TD-001')).toThrow('invalid transition COMPLETED → NO_SHOW');
  });
});

// ─── cancelBooking ─────────────────────────────────────────────────────────────

describe('cancelBooking', () => {
  beforeEach(resetStore);

  it('cancels a PENDING booking (S3)', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'PENDING' })]);
    store.cancelBooking('TD-001', 'Customer request', 'CUST-001');
    const b = store.selectById('TD-001');
    expect(b?.status).toBe('CANCELLED');
    expect(b?.cancellationReason).toBe('Customer request');
  });

  it('cancels a SCHEDULED booking', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'SCHEDULED' })]);
    store.cancelBooking('TD-001', 'Vehicle sold', 'ADV-001');
    expect(store.selectById('TD-001')?.status).toBe('CANCELLED');
  });

  it('(L9) throws when trying to cancel a COMPLETED booking', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'COMPLETED' })]);
    expect(() => store.cancelBooking('TD-001', 'reason', 'ADV-001')).toThrow(
      'cannot cancel terminal booking (COMPLETED)',
    );
  });

  it('(L9) throws when trying to cancel a NO_SHOW booking', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', status: 'NO_SHOW' })]);
    expect(() => store.cancelBooking('TD-001', 'reason', 'ADV-001')).toThrow(
      'cannot cancel terminal booking (NO_SHOW)',
    );
  });
});

// ─── Selectors ─────────────────────────────────────────────────────────────────

describe('selectByOutlet (S14)', () => {
  beforeEach(resetStore);

  it('returns only bookings for the given outlet', () => {
    const store = useTestDriveStore.getState();
    store._seed([
      makeBooking({ id: 'TD-001', outletId: 'bangalore' }),
      makeBooking({ id: 'TD-002', outletId: 'mumbai' }),
      makeBooking({ id: 'TD-003', outletId: 'bangalore' }),
    ]);
    const result = store.selectByOutlet('bangalore');
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.outletId === 'bangalore')).toBe(true);
  });

  it("returns all bookings when outlet is 'all'", () => {
    const store = useTestDriveStore.getState();
    store._seed([
      makeBooking({ id: 'TD-001', outletId: 'bangalore' }),
      makeBooking({ id: 'TD-002', outletId: 'mumbai' }),
    ]);
    expect(store.selectByOutlet('all')).toHaveLength(2);
  });
});

describe('selectByStatus', () => {
  beforeEach(resetStore);

  it('returns only bookings with the given status (S13)', () => {
    const store = useTestDriveStore.getState();
    store._seed([
      makeBooking({ id: 'TD-001', status: 'PENDING' }),
      makeBooking({ id: 'TD-002', status: 'SCHEDULED' }),
      makeBooking({ id: 'TD-003', status: 'PENDING' }),
    ]);
    const result = store.selectByStatus('PENDING');
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.status === 'PENDING')).toBe(true);
  });
});

describe('selectByCustomer', () => {
  beforeEach(resetStore);

  it('returns only bookings for the given customer', () => {
    const store = useTestDriveStore.getState();
    store._seed([
      makeBooking({ id: 'TD-001', customerId: 'CUST-A' }),
      makeBooking({ id: 'TD-002', customerId: 'CUST-B' }),
      makeBooking({ id: 'TD-003', customerId: 'CUST-A' }),
    ]);
    expect(store.selectByCustomer('CUST-A')).toHaveLength(2);
  });
});

describe('selectById', () => {
  beforeEach(resetStore);

  it('returns the correct booking', () => {
    const store = useTestDriveStore.getState();
    store._seed([makeBooking({ id: 'TD-001', customerName: 'Anil Kapoor' })]);
    expect(store.selectById('TD-001')?.customerName).toBe('Anil Kapoor');
  });

  it('returns undefined for unknown id', () => {
    const store = useTestDriveStore.getState();
    expect(store.selectById('TD-999')).toBeUndefined();
  });
});
