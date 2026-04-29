/**
 * Reports & Analytics — selector unit tests.
 *
 * Spec reference: SPEC-REPORTS-001 §16 (T-R-1 through T-R-15)
 * Tests: ≥27 assertions across 9 selectors.
 * Mock store state inline — no real hydrators called.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReportInputState, ReportPeriod, ReportScope } from '../types';
import type { SalesEvent, BuildJob, InsuranceLead, AttendancePunch, JobCard, StaffProfile, VehicleMaster } from '@dms/types';

import { selectOutletPnL } from '../selectors/p-and-l-selectors';
import {
  selectSalesVelocity,
  selectInventoryAging,
  selectCpoConversion,
} from '../selectors/sales-selectors';
import { selectServiceSlaMedian } from '../selectors/service-selectors';
import { selectInsuranceAttachmentRate } from '../selectors/insurance-selectors';
import { selectPartsMarginPct } from '../selectors/parts-selectors';
import { selectCustomBuildsRevContribution } from '../selectors/custom-builds-selectors';
import { selectStaffUtilisation } from '../selectors/staff-selectors';
import { thisFYPeriod, lastFYPeriod, last30dPeriod } from '../period';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: Partial<ReportInputState> = {}): ReportInputState {
  return {
    vehicles: {
      vehicles: {},
      ownerships: {},
      claims: {},
      events: [],
      salesEvents: {},
      documents: {},
      staffMeta: {},
      documentAccessEvents: [],
      costLedger: {},
      ownershipIdByVin: {},
      claimIdByVin: {},
      ownershipIdByCustomer: {},
      hydrated: true,
    },
    salesDeals: {
      deals: {},
    },
    service: {
      jobCards: [],
    },
    insurance: {
      leads: [],
      providers: [],
      policies: [],
      templates: [],
      campaigns: [],
      callLogs: [],
      manualCallLog: [],
      optOuts: new Set(),
      featAiCallingEnabled: false,
      auditEvents: [],
    },
    customBuilds: {
      jobs: [],
      parts: [],
      vendors: [],
      hydrated: true,
    },
    staff: {
      staffById: {},
      staffIds: [],
      attendancePunches: {},
      hydrated: true,
    },
    ...overrides,
  };
}

function makeScope(outletIds: string[] = ['BLR-01']): ReportScope {
  return { outletIds };
}

function makePeriod(overrides: Partial<ReportPeriod> = {}): ReportPeriod {
  return {
    kind: 'custom',
    from: '2026-04-01',
    to:   '2026-04-30',
    ...overrides,
  };
}

function makeSoldEvent(vin: string, at: string, finalPrice: number, outletId: string): SalesEvent {
  return {
    id: `ev-${Math.random()}`,
    vin,
    at,
    kind: 'SOLD',
    actorId: 'staff-r10-001',
    actorRole: 'R10',
    dealId: 'deal-001',
    payload: { finalPrice, outletId, sellerSignatures: [] },
    schemaVersion: 'v1',
  };
}

function makeListedEvent(vin: string, outletId: string): SalesEvent {
  return {
    id: `ev-listed-${Math.random()}`,
    vin,
    at: '2026-03-01T08:00:00.000Z',
    kind: 'LISTED',
    actorId: 'staff-r10-001',
    actorRole: 'R10',
    payload: { listPrice: 1000000, outletId },
    schemaVersion: 'v1',
  };
}

// ─── T-R-11: FY period boundary ───────────────────────────────────────────────

describe('period helpers (T-R-11)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T10:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('thisFYPeriod returns 2026-04-01 to 2027-03-31 on 2026-04-29', () => {
    const p = thisFYPeriod();
    expect(p.from).toBe('2026-04-01');
    expect(p.to).toBe('2027-03-31');
    expect(p.kind).toBe('thisFY');
  });

  it('lastFYPeriod returns 2025-04-01 to 2026-03-31 on 2026-04-29', () => {
    const p = lastFYPeriod();
    expect(p.from).toBe('2025-04-01');
    expect(p.to).toBe('2026-03-31');
    expect(p.kind).toBe('lastFY');
  });

  it('last30dPeriod returns 30 days window ending today', () => {
    const p = last30dPeriod();
    expect(p.to).toBe('2026-04-29');
    expect(p.from).toBe('2026-03-31');
  });

  it('thisFYPeriod before April = FY starts previous year', () => {
    vi.setSystemTime(new Date('2026-03-15T10:00:00Z'));
    const p = thisFYPeriod();
    expect(p.from).toBe('2025-04-01');
    expect(p.to).toBe('2026-03-31');
  });
});

// ─── T-R-1: Sales velocity ────────────────────────────────────────────────────

describe('selectSalesVelocity (T-R-1)', () => {
  const period = makePeriod({ from: '2026-04-01', to: '2026-04-30' });

  it('happy path: counts SOLD events in scope and returns trend', () => {
    const vin  = 'VIN001';
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 10000, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-10T09:00:00.000Z', 5000000, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-20T09:00:00.000Z', 5000000, 'BLR-01'),
          ],
        },
      },
    });

    const result = selectSalesVelocity(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('count');
    expect(result.kind === 'count' && result.value).not.toBeNull();
    // trend has 8 items
    if (result.kind === 'count') {
      expect(result.trend).toHaveLength(8);
    }
  });

  it('outlet scoping: excludes events from other outlets (T-R-15)', () => {
    const vinBlr = 'VIN-BLR';
    const vinMum = 'VIN-MUM';
    const state  = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vinBlr]: {
            vin: vinBlr, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
          [vinMum]: {
            vin: vinMum, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'MH01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'MUM-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vinBlr]: [makeListedEvent(vinBlr, 'BLR-01'), makeSoldEvent(vinBlr, '2026-04-10T09:00:00.000Z', 5000000, 'BLR-01')],
          [vinMum]: [makeListedEvent(vinMum, 'MUM-01'), makeSoldEvent(vinMum, '2026-04-10T09:00:00.000Z', 6000000, 'MUM-01')],
        },
      },
    });

    const blrOnly = selectSalesVelocity(state, period, makeScope(['BLR-01']));
    const mumOnly = selectSalesVelocity(state, period, makeScope(['MUM-01']));

    // BLR scope: 1 sold; MUM scope: 1 sold
    expect(blrOnly.kind).toBe('count');
    expect(mumOnly.kind).toBe('count');
    if (blrOnly.kind === 'count' && mumOnly.kind === 'count') {
      expect(blrOnly.value).toBe(1);
      expect(mumOnly.value).toBe(1);
    }
  });

  it('empty period: returns null value when no SOLD events (T-R-8)', () => {
    const result = selectSalesVelocity(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('count');
    if (result.kind === 'count') expect(result.value).toBeNull();
  });

  it('empty outletIds: returns null (L13)', () => {
    const result = selectSalesVelocity(makeState(), period, { outletIds: [] });
    expect(result.kind).toBe('count');
    if (result.kind === 'count') expect(result.value).toBeNull();
  });
});

// ─── T-R-2: P&L ──────────────────────────────────────────────────────────────

describe('selectOutletPnL (T-R-2)', () => {
  const period = makePeriod({ from: '2026-04-01', to: '2026-04-30' });

  it('happy path: revenue minus direct cost', () => {
    const vin = 'VIN-PNL';
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-15T09:00:00.000Z', 10_000_000, 'BLR-01'),
          ],
        },
        costLedger: {
          [vin]: [
            { id: 'cl-001', vin, category: 'acquisition', date: '2026-04-01', amount: 8_000_000, addedBy: 'staff', addedAt: '2026-04-01T00:00:00.000Z' },
            { id: 'cl-002', vin, category: 'refurb-mechanical', date: '2026-04-05', amount: 500_000, addedBy: 'staff', addedAt: '2026-04-05T00:00:00.000Z' },
          ],
        },
      },
    });

    const result = selectOutletPnL(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('currency');
    if (result.kind === 'currency') {
      expect(result.value).not.toBeNull();
      // Revenue 10M - directCost 8.5M = 1.5M (no salary data in test)
      expect(result.value).toBeGreaterThan(0);
    }
  });

  it('negative P&L: directCost > revenue returns negative value', () => {
    const vin = 'VIN-NEG';
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-15T09:00:00.000Z', 1_000_000, 'BLR-01'),
          ],
        },
        costLedger: {
          [vin]: [
            { id: 'cl-003', vin, category: 'acquisition', date: '2026-04-01', amount: 5_000_000, addedBy: 'staff', addedAt: '2026-04-01T00:00:00.000Z' },
          ],
        },
      },
    });

    const result = selectOutletPnL(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('currency');
    if (result.kind === 'currency') {
      expect(result.value).toBeLessThan(0);
    }
  });

  it('empty period: returns null when no SOLD events', () => {
    const result = selectOutletPnL(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('currency');
    if (result.kind === 'currency') expect(result.value).toBeNull();
  });

  it('invalid scope: returns null (L13)', () => {
    const result = selectOutletPnL(makeState(), period, { outletIds: [] });
    expect(result.kind).toBe('currency');
    if (result.kind === 'currency') expect(result.value).toBeNull();
  });
});

// ─── T-R-3: Inventory aging ───────────────────────────────────────────────────

describe('selectInventoryAging (T-R-3)', () => {
  const period = makePeriod();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T00:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('happy path: vehicles bucketed correctly by age', () => {
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          'VIN-A1': { vin: 'VIN-A1', firstTouchOutletId: 'BLR-01', listedAt: '2026-04-20T00:00:00.000Z', make: 'BMW', model: 'M3', variant: 'x', year: 2020, color: 'white', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z', firstTouchSource: 'BN_SALE', lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1' } as VehicleMaster,
          'VIN-A2': { vin: 'VIN-A2', firstTouchOutletId: 'BLR-01', listedAt: '2026-03-20T00:00:00.000Z', make: 'Audi', model: 'A4', variant: 'y', year: 2021, color: 'grey', rcNumber: 'KA02', firstTouchedAt: '2020-01-01T00:00:00.000Z', firstTouchSource: 'BN_SALE', lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1' } as VehicleMaster,
        },
      },
    });

    const result = selectInventoryAging(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('histogram');
    if (result.kind === 'histogram') {
      const lt30 = result.buckets.find((b) => b.label === '<30d');
      const b30_60 = result.buckets.find((b) => b.label === '30–60d');
      expect(lt30?.count).toBe(1);
      expect(b30_60?.count).toBe(1);
    }
  });

  it('outlet scoping: excludes vehicles from other outlets', () => {
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          'VIN-MUM': { vin: 'VIN-MUM', firstTouchOutletId: 'MUM-01', listedAt: '2026-04-20T00:00:00.000Z', make: 'BMW', model: 'M3', variant: 'x', year: 2020, color: 'white', rcNumber: 'MH01', firstTouchedAt: '2020-01-01T00:00:00.000Z', firstTouchSource: 'BN_SALE', lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1' } as VehicleMaster,
        },
      },
    });

    const result = selectInventoryAging(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('histogram');
    if (result.kind === 'histogram') {
      expect(result.buckets.every((b) => b.count === 0)).toBe(true);
    }
  });

  it('empty scope: returns empty histogram (L13)', () => {
    const result = selectInventoryAging(makeState(), period, { outletIds: [] });
    expect(result.kind).toBe('histogram');
    if (result.kind === 'histogram') {
      expect(result.buckets).toHaveLength(0);
    }
  });
});

// ─── T-R-4: Service SLA ───────────────────────────────────────────────────────

describe('selectServiceSlaMedian (T-R-4)', () => {
  const period = makePeriod();

  it('happy path: median computed correctly for 5 JC durations', () => {
    // durations: 2, 4, 5, 7, 9 → median = 5
    const jcs: Partial<JobCard>[] = [
      { id: 'jc1', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-01T09:00:00.000Z', deliveredAt: '2026-04-03T09:00:00.000Z' }, // 2d
      { id: 'jc2', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-05T09:00:00.000Z', deliveredAt: '2026-04-09T09:00:00.000Z' }, // 4d
      { id: 'jc3', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-10T09:00:00.000Z', deliveredAt: '2026-04-15T09:00:00.000Z' }, // 5d
      { id: 'jc4', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-12T09:00:00.000Z', deliveredAt: '2026-04-19T09:00:00.000Z' }, // 7d
      { id: 'jc5', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-15T09:00:00.000Z', deliveredAt: '2026-04-24T09:00:00.000Z' }, // 9d
    ];

    const state = makeState({ service: { jobCards: jcs as JobCard[] } });
    const result = selectServiceSlaMedian(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('days');
    if (result.kind === 'days') {
      expect(result.value).toBe(5);
    }
  });

  it('SLA chip: green when median = 4d (< 5)', () => {
    // 3 JCs with 3d, 4d, 5d → median = 4d
    const jcs: Partial<JobCard>[] = [
      { id: 'jc-g1', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-01T00:00:00.000Z', deliveredAt: '2026-04-04T00:00:00.000Z' }, // 3d
      { id: 'jc-g2', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-05T00:00:00.000Z', deliveredAt: '2026-04-09T00:00:00.000Z' }, // 4d
      { id: 'jc-g3', outletId: 'BLR-01', status: 'DELIVERED', receivedAt: '2026-04-10T00:00:00.000Z', deliveredAt: '2026-04-15T00:00:00.000Z' }, // 5d
    ];
    const state = makeState({ service: { jobCards: jcs as JobCard[] } });
    const result = selectServiceSlaMedian(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('days');
    if (result.kind === 'days') expect(result.value).toBe(4);
  });

  it('empty period: returns null when no DELIVERED JCs', () => {
    const result = selectServiceSlaMedian(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('days');
    if (result.kind === 'days') expect(result.value).toBeNull();
  });

  it('outlet exclusion: ignores JCs from other outlets', () => {
    const jcs: Partial<JobCard>[] = [
      { id: 'jc-m', outletId: 'MUM-01', status: 'DELIVERED', receivedAt: '2026-04-01T00:00:00.000Z', deliveredAt: '2026-04-06T00:00:00.000Z' },
    ];
    const state = makeState({ service: { jobCards: jcs as JobCard[] } });
    const result = selectServiceSlaMedian(state, period, makeScope(['BLR-01']));
    if (result.kind === 'days') expect(result.value).toBeNull();
  });
});

// ─── T-R-5: Insurance attachment rate ─────────────────────────────────────────

describe('selectInsuranceAttachmentRate (T-R-5)', () => {
  const period = makePeriod({ from: '2026-04-01', to: '2026-04-30' });
  const vin    = 'VIN-INS';

  it('happy path: lead within 7d counts as attached', () => {
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-10T09:00:00.000Z', 5000000, 'BLR-01'),
          ],
        },
      },
      insurance: {
        ...makeState().insurance,
        leads: [
          {
            vin, customerId: 'cust-001', stage: 'due-soon',
            createdAt: '2026-04-12T09:00:00.000Z', // 2d after SOLD — within 7d window
            outlet: 'bangalore',
          } as unknown as InsuranceLead,
        ],
      },
    });

    const result = selectInsuranceAttachmentRate(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).toBe(100.0); // 1/1 × 100
    }
  });

  it('lead outside 7d window: not counted as attached', () => {
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-10T09:00:00.000Z', 5000000, 'BLR-01'),
          ],
        },
      },
      insurance: {
        ...makeState().insurance,
        leads: [
          {
            vin, customerId: 'cust-001', stage: 'due-soon',
            createdAt: '2026-04-20T09:00:00.000Z', // 10d after SOLD — OUTSIDE 7d window
            outlet: 'bangalore',
          } as unknown as InsuranceLead,
        ],
      },
    });

    const result = selectInsuranceAttachmentRate(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).toBe(0.0); // lead not attached
    }
  });

  it('no SOLD events: returns null (L9)', () => {
    const result = selectInsuranceAttachmentRate(makeState(), period, makeScope(['BLR-01']));
    if (result.kind === 'percentage') expect(result.value).toBeNull();
  });
});

// ─── T-R-6: CPO conversion empty state ───────────────────────────────────────

describe('selectCpoConversion (T-R-6)', () => {
  const period = makePeriod();

  it('zero active CPO-certified listings → null (L9)', () => {
    const result = selectCpoConversion(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') expect(result.value).toBeNull();
  });

  it('has sold vehicles: returns non-null percentage', () => {
    const vin = 'VIN-CPO';
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z',
            listedAt: '2026-04-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-15T09:00:00.000Z', 5000000, 'BLR-01'),
          ],
        },
      },
    });

    const result = selectCpoConversion(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).not.toBeNull();
    }
  });

  it('division by zero: returns null safely (L9)', () => {
    // No vehicles at all
    const result = selectCpoConversion(makeState(), period, { outletIds: ['BLR-01'] });
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') expect(result.value).toBeNull();
  });
});

// ─── T-R-7: Custom builds contribution ───────────────────────────────────────

describe('selectCustomBuildsRevContribution (T-R-7)', () => {
  const period = makePeriod();
  const vin    = 'VIN-CB';

  it('happy path: DELIVERED build revenue / total revenue', () => {
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-15T09:00:00.000Z', 10_000_000, 'BLR-01'),
          ],
        },
      },
      customBuilds: {
        ...makeState().customBuilds,
        jobs: [
          {
            id: 'job-001', vin, customerId: 'cust-001', outletId: 'BLR-01',
            stage: 'DELIVERED' as const, title: 'Build 1',
            quoteTotal: 2_000_000, deliveredAt: '2026-04-20T00:00:00.000Z',
            createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-20T00:00:00.000Z',
            parts: [], activityLog: [], schemaVersion: 'v1',
          } as unknown as BuildJob,
        ],
      },
    });

    const result = selectCustomBuildsRevContribution(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).toBe(20.0); // 2M / 10M = 20%
    }
  });

  it('no DELIVERED jobs: returns null (L9)', () => {
    const result = selectCustomBuildsRevContribution(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') expect(result.value).toBeNull();
  });

  it('outlet filter: excludes jobs from other outlets', () => {
    const state = makeState({
      vehicles: {
        ...makeState().vehicles,
        vehicles: {
          [vin]: {
            vin, make: 'BMW', model: 'M3', variant: 'x', year: 2020,
            color: 'black', rcNumber: 'KA01', firstTouchedAt: '2020-01-01T00:00:00.000Z',
            firstTouchSource: 'BN_SALE', firstTouchOutletId: 'BLR-01',
            lastKnownKm: 0, lastKnownKmAt: '2026-01-01T00:00:00.000Z', schemaVersion: 'v1',
          },
        },
        salesEvents: {
          [vin]: [
            makeListedEvent(vin, 'BLR-01'),
            makeSoldEvent(vin, '2026-04-15T09:00:00.000Z', 10_000_000, 'BLR-01'),
          ],
        },
      },
      customBuilds: {
        ...makeState().customBuilds,
        jobs: [
          {
            id: 'job-mum', vin, customerId: 'cust-001', outletId: 'MUM-01', // different outlet
            stage: 'DELIVERED' as const, title: 'Build MUM',
            quoteTotal: 3_000_000, deliveredAt: '2026-04-20T00:00:00.000Z',
            createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-20T00:00:00.000Z',
            parts: [], activityLog: [], schemaVersion: 'v1',
          } as unknown as BuildJob,
        ],
      },
    });

    // BLR scope: MUM job excluded → no build revenue → 0% contribution (totalRevenue > 0)
    const result = selectCustomBuildsRevContribution(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      // build revenue for BLR = 0, total revenue = 10M → 0.0% (not null, since sales exist)
      expect(result.value).toBe(0);
    }
  });
});

// ─── T-R-10: Staff utilisation ────────────────────────────────────────────────

describe('selectStaffUtilisation (T-R-10)', () => {
  const period = makePeriod({ from: '2026-04-01', to: '2026-04-30' });

  it('happy path: hours worked / hours available percentage', () => {
    const techId = 'staff-r11-001';
    const punch1: AttendancePunch = {
      punchId: 'p1', staffId: techId, deviceId: 'dev-01', eventType: 'punch-in',
      timestamp: '2026-04-01T09:00:00.000Z', isOverride: false,
    };
    const punch2: AttendancePunch = {
      punchId: 'p2', staffId: techId, deviceId: 'dev-01', eventType: 'punch-out',
      timestamp: '2026-04-01T17:00:00.000Z', isOverride: false,
    };

    const techProfile = {
      id: techId, name: 'Tech One', email: 'tech@test.com', avatar: 'TO',
      role: 'R11' as const, roleName: 'Service Technician', department: 'SERVICE' as const,
      outlet: 'bangalore' as const, status: 'ACTIVE' as const, reportsTo: null,
      startDate: '2022-01-01', permissions: [], dpdpConsentGiven: true,
      createdAt: '2022-01-01T00:00:00.000Z', updatedAt: '2022-01-01T00:00:00.000Z',
      stateOfPosting: 'KA' as const, fingerprintEnrolled: true, schemaVersion: 'v1' as const,
    } as StaffProfile;

    const state = makeState({
      staff: {
        ...makeState().staff,
        staffById: { [techId]: techProfile },
        staffIds: [techId],
        attendancePunches: {
          [techId]: [punch1, punch2], // 8 hours
        },
      },
    });

    const result = selectStaffUtilisation(state, period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).not.toBeNull();
      expect(result.value).toBeGreaterThan(0);
    }
  });

  it('over-utilised: percentage capped at 100% (T-R-10 spec)', () => {
    const techId = 'staff-r11-cap';
    // 16 hours worked in 1 day (over standard 8h)
    const punches: AttendancePunch[] = [
      { punchId: 'p-in',  staffId: techId, deviceId: 'dev', eventType: 'punch-in',  timestamp: '2026-04-01T06:00:00.000Z', isOverride: false },
      { punchId: 'p-out', staffId: techId, deviceId: 'dev', eventType: 'punch-out', timestamp: '2026-04-01T22:00:00.000Z', isOverride: false },
    ];

    const profile = {
      id: techId, name: 'Tech Cap', email: 'cap@test.com', avatar: 'TC',
      role: 'R11' as const, roleName: 'Technician', department: 'SERVICE' as const,
      outlet: 'bangalore' as const, status: 'ACTIVE' as const, reportsTo: null,
      startDate: '2022-01-01', permissions: [], dpdpConsentGiven: true,
      createdAt: '2022-01-01T00:00:00.000Z', updatedAt: '2022-01-01T00:00:00.000Z',
      stateOfPosting: 'KA' as const, fingerprintEnrolled: true, schemaVersion: 'v1' as const,
    } as StaffProfile;

    // 1 working day period to simplify math
    const oneDayPeriod = makePeriod({ from: '2026-04-01', to: '2026-04-01' });
    const state = makeState({
      staff: {
        ...makeState().staff,
        staffById: { [techId]: profile },
        staffIds: [techId],
        attendancePunches: { [techId]: punches },
      },
    });

    const result = selectStaffUtilisation(state, oneDayPeriod, makeScope(['BLR-01']));
    if (result.kind === 'percentage' && result.value !== null) {
      expect(result.value).toBeLessThanOrEqual(100);
    }
  });

  it('no tech profiles: returns null', () => {
    const result = selectStaffUtilisation(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') expect(result.value).toBeNull();
  });
});

// ─── T-R-14: Parts margin deferred (L14) ─────────────────────────────────────

describe('selectPartsMarginPct (L14 / DEF-REPORTS-4)', () => {
  const period = makePeriod();

  it('always returns { kind: deferred } in v1', () => {
    const result = selectPartsMarginPct(makeState(), period, makeScope(['BLR-01']));
    expect(result.kind).toBe('deferred');
  });

  it('returns deferred regardless of scope', () => {
    const result = selectPartsMarginPct(makeState(), period, { outletIds: [] });
    expect(result.kind).toBe('deferred');
  });
});
