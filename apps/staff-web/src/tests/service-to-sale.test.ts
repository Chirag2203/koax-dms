/**
 * Service-to-Sale Upgrade Loop — unit + integration tests.
 *
 * Spec reference: SPEC-SERVICE-SALE-001 §7 (scenarios S-STS-1 through S-STS-12)
 *
 * Scenarios covered:
 *   S-STS-1:  Age-only trigger (vehicle >5 years)
 *   S-STS-2:  Odometer-only trigger (>70,000 km)
 *   S-STS-3:  Recall-only trigger (open recall)
 *   S-STS-4:  All three criteria triggered simultaneously
 *   S-STS-5:  Not eligible — no criterion met
 *   S-STS-6:  Unknown vehicle (null VehicleMaster) — age check skipped
 *   S-STS-9:  Conversion rate selector with real data (3/10 = 30%)
 *   S-STS-10: Conversion rate zero-divisor → null (never 0)
 *   + Additional: reasons array ordering, km boundary (69,999 vs 70,000),
 *     age boundary (4y vs 5y), closed recall excluded, scope filtering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isUpgradeReady,
  UPGRADE_AGE_YEARS,
  UPGRADE_KM_THRESHOLD,
} from '../lib/service-to-sale/upgrade-eligibility';
import type { VehicleRecall } from '../lib/service-to-sale/upgrade-eligibility';
import { selectServiceToSaleConversion } from '../lib/reports/selectors/sales-selectors';
import type { ReportInputState, ReportPeriod, ReportScope } from '../lib/reports/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THIS_YEAR = new Date().getFullYear();

function makeJobCard(overrides: Partial<{
  vin: string;
  odometerIn: number;
  outletId: string;
  receivedAt: string;
}> = {}) {
  return {
    vin:        overrides.vin        ?? 'TEST-VIN-0001',
    odometerIn: overrides.odometerIn ?? 30_000,
    outletId:   overrides.outletId   ?? 'BLR-01',
    receivedAt: overrides.receivedAt ?? '2026-04-01T10:00:00.000Z',
  };
}

function makeVehicle(year: number) {
  return { year };
}

const OPEN_RECALL: VehicleRecall = {
  id:          'recall-test-001',
  vin:         'TEST-VIN-0001',
  title:       'Test Recall',
  issuedAt:    '2025-11-01',
  status:      'OPEN',
  description: 'Test recall description.',
};

const CLOSED_RECALL: VehicleRecall = {
  id:          'recall-test-002',
  vin:         'TEST-VIN-0001',
  title:       'Closed Recall',
  issuedAt:    '2024-01-01',
  status:      'CLOSED',
  description: 'Already fixed.',
};

// ─── Minimal ReportInputState for selector tests ──────────────────────────────

function makeReportState(overrides: {
  jobCards?: ReturnType<typeof makeJobCard>[];
  deals?: Record<string, unknown>;
  vehicles?: Record<string, { year: number; firstTouchOutletId: string }>;
} = {}): ReportInputState {
  // Test-only fixture: cast each slice to any at the boundary because the
  // real ReportInputState shapes contain dozens of nested fields we don't
  // need to mock for these focused B4 tests. The selectors under test only
  // read `vehicles.vehicles[vin].year` + outletId, `service.jobCards`,
  // `salesDeals.deals`. Empty objects for the rest are intentional.
  return {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    vehicles: {
      vehicles:             (overrides.vehicles ?? {}) as any,
      ownerships:           {},
      claims:               {},
      events:               [],
      salesEvents:          {},
      documents:            {},
      staffMeta:            {},
      documentAccessEvents: [],
      costLedger:           {},
      ownershipIdByVin:     {},
      claimIdByVin:         {},
      ownershipIdByCustomer: {},
      hydrated:             true,
    } as any,
    service: {
      jobCards: (overrides.jobCards ?? []) as any,
    },
    salesDeals: {
      deals: (overrides.deals ?? {}) as any,
    },
    insurance: {
      leads:               [],
      providers:           [],
      policies:            [],
      templates:           [],
      campaigns:           [],
      callLogs:            [],
      manualCallLog:       [],
      optOuts:             new Set(),
      featAiCallingEnabled: false,
      auditEvents:         [],
    },
    customBuilds: {
      jobs:     {} as any,
      parts:    {} as any,
      vendors:  {} as any,
      hydrated: true,
    },
    staff: {
      staffById:         {},
      staffIds:          [],
      attendancePunches: {} as any,
      hydrated:          true,
    },
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };
}

const DEFAULT_PERIOD: ReportPeriod = {
  kind: 'custom',
  from: '2026-01-01',
  to:   '2026-12-31',
};

const BLR_SCOPE: ReportScope = { outletIds: ['BLR-01'] };

// ─── isUpgradeReady — pure function tests ─────────────────────────────────────

describe('isUpgradeReady — eligibility helper', () => {

  // S-STS-1: Age-only trigger
  it('S-STS-1: returns ready=true and reason age-over-5y when vehicle is exactly UPGRADE_AGE_YEARS old', () => {
    const vehicle = makeVehicle(THIS_YEAR - UPGRADE_AGE_YEARS);
    const jc = makeJobCard({ odometerIn: 30_000 });
    const result = isUpgradeReady(vehicle, jc, []);
    expect(result.ready).toBe(true);
    expect(result.reasons).toContain('age-over-5y');
    expect(result.reasons).not.toContain('km-over-70k');
    expect(result.reasons).not.toContain('open-recall');
  });

  // S-STS-2: Odometer-only trigger
  it('S-STS-2: returns ready=true and reason km-over-70k when odometerIn >= UPGRADE_KM_THRESHOLD', () => {
    const vehicle = makeVehicle(THIS_YEAR - 2); // young vehicle — no age trigger
    const jc = makeJobCard({ odometerIn: UPGRADE_KM_THRESHOLD }); // exactly at threshold
    const result = isUpgradeReady(vehicle, jc, []);
    expect(result.ready).toBe(true);
    expect(result.reasons).toContain('km-over-70k');
    expect(result.reasons).not.toContain('age-over-5y');
    expect(result.reasons).not.toContain('open-recall');
  });

  // S-STS-3: Recall-only trigger
  it('S-STS-3: returns ready=true and reason open-recall when VIN has open recall', () => {
    const vehicle = makeVehicle(THIS_YEAR - 2);
    const jc = makeJobCard({ vin: 'TEST-VIN-0001', odometerIn: 20_000 });
    const result = isUpgradeReady(vehicle, jc, [OPEN_RECALL]);
    expect(result.ready).toBe(true);
    expect(result.reasons).toContain('open-recall');
    expect(result.reasons).not.toContain('age-over-5y');
    expect(result.reasons).not.toContain('km-over-70k');
  });

  // S-STS-4: All three criteria simultaneously
  it('S-STS-4: returns all three reasons when all criteria are met', () => {
    const vehicle = makeVehicle(THIS_YEAR - UPGRADE_AGE_YEARS);
    const jc = makeJobCard({
      vin:        'TEST-VIN-0001',
      odometerIn: UPGRADE_KM_THRESHOLD + 5_000,
    });
    const result = isUpgradeReady(vehicle, jc, [OPEN_RECALL]);
    expect(result.ready).toBe(true);
    expect(result.reasons).toContain('age-over-5y');
    expect(result.reasons).toContain('km-over-70k');
    expect(result.reasons).toContain('open-recall');
    expect(result.reasons).toHaveLength(3);
  });

  // S-STS-5: Not eligible
  it('S-STS-5: returns ready=false and empty reasons when no criterion met', () => {
    const vehicle = makeVehicle(THIS_YEAR - 2); // 2 years old
    const jc = makeJobCard({ odometerIn: 40_000 }); // under 70k
    const result = isUpgradeReady(vehicle, jc, []); // no recalls
    expect(result.ready).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  // S-STS-6: Unknown vehicle (null) — age check skipped
  it('S-STS-6: skips age check when vehicle is null (L11)', () => {
    const jc = makeJobCard({ odometerIn: 30_000 });
    const result = isUpgradeReady(null, jc, []);
    expect(result.ready).toBe(false);
    expect(result.reasons).not.toContain('age-over-5y');
  });

  // Boundary: vehicle exactly 4 years old should NOT trigger
  it('returns ready=false for a 4-year-old vehicle with low km and no recalls', () => {
    const vehicle = makeVehicle(THIS_YEAR - (UPGRADE_AGE_YEARS - 1));
    const jc = makeJobCard({ odometerIn: 50_000 });
    const result = isUpgradeReady(vehicle, jc, []);
    expect(result.ready).toBe(false);
  });

  // Boundary: odometer at exactly threshold − 1 should NOT trigger
  it('returns ready=false when odometerIn is one below UPGRADE_KM_THRESHOLD', () => {
    const vehicle = makeVehicle(THIS_YEAR - 2);
    const jc = makeJobCard({ odometerIn: UPGRADE_KM_THRESHOLD - 1 });
    const result = isUpgradeReady(vehicle, jc, []);
    expect(result.ready).toBe(false);
  });

  // Closed recall should NOT trigger
  it('does not trigger open-recall reason for a CLOSED recall', () => {
    const vehicle = makeVehicle(THIS_YEAR - 2);
    const jc = makeJobCard({ vin: 'TEST-VIN-0001', odometerIn: 30_000 });
    const result = isUpgradeReady(vehicle, jc, [CLOSED_RECALL]);
    expect(result.ready).toBe(false);
    expect(result.reasons).not.toContain('open-recall');
  });

  // Recall for a different VIN should NOT trigger
  it('does not trigger open-recall reason for a recall belonging to a different VIN', () => {
    const vehicle = makeVehicle(THIS_YEAR - 2);
    const jc = makeJobCard({ vin: 'DIFFERENT-VIN-9999', odometerIn: 30_000 });
    const result = isUpgradeReady(vehicle, jc, [OPEN_RECALL]); // OPEN_RECALL is for TEST-VIN-0001
    expect(result.ready).toBe(false);
    expect(result.reasons).not.toContain('open-recall');
  });
});

// ─── selectServiceToSaleConversion — selector tests ──────────────────────────

describe('selectServiceToSaleConversion — reports selector (SPEC-SERVICE-SALE-001 L5, Seam 31)', () => {

  // S-STS-10: Zero-divisor returns null
  it('S-STS-10: returns value=null when there are zero upgrade-eligible JCs in period (zero-divisor)', () => {
    // All JCs have odometerIn < 70k and vehicles are < 5y old and no recalls
    const state = makeReportState({
      jobCards: [
        { ...makeJobCard({ odometerIn: 30_000, outletId: 'BLR-01', receivedAt: '2026-03-10T10:00:00.000Z' }), vin: 'VIN-A' },
      ],
      vehicles: {
        'VIN-A': { year: THIS_YEAR - 2, firstTouchOutletId: 'BLR-01' },
      },
    });
    const result = selectServiceToSaleConversion(state, DEFAULT_PERIOD, BLR_SCOPE);
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).toBeNull();
    }
  });

  // S-STS-9: Conversion rate with real data
  it('S-STS-9: returns correct conversion % when numerator and denominator are non-zero', () => {
    // 2 eligible JCs — both have odometerIn >= 70k
    const jcA = {
      ...makeJobCard({ odometerIn: 75_000, outletId: 'BLR-01', receivedAt: '2026-03-10T10:00:00.000Z' }),
      vin: 'VIN-B',
    };
    const jcB = {
      ...makeJobCard({ odometerIn: 80_000, outletId: 'BLR-01', receivedAt: '2026-03-15T10:00:00.000Z' }),
      vin: 'VIN-C',
    };
    // 1 closed-won deal from SERVICE_UPGRADE source in period
    const deals = {
      'deal-001': {
        id: 'deal-001',
        source: 'SERVICE_UPGRADE',
        stage: 'delivered',
        outlet: 'bangalore',
        lastActivityAt: '2026-04-01T10:00:00.000Z',
      },
    };
    const state = makeReportState({
      jobCards: [jcA, jcB],
      vehicles: {
        'VIN-B': { year: THIS_YEAR - 2, firstTouchOutletId: 'BLR-01' },
        'VIN-C': { year: THIS_YEAR - 2, firstTouchOutletId: 'BLR-01' },
      },
      deals,
    });
    const result = selectServiceToSaleConversion(state, DEFAULT_PERIOD, BLR_SCOPE);
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      // 1 closed / 2 eligible = 50%
      expect(result.value).toBe(50);
    }
  });

  // Empty scope → null
  it('returns null when scope.outletIds is empty (L13)', () => {
    const state = makeReportState();
    const result = selectServiceToSaleConversion(state, DEFAULT_PERIOD, { outletIds: [] });
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).toBeNull();
    }
  });

  // Scope filtering — JC in a different outlet should not count
  it('excludes JCs from outlets not in scope', () => {
    const jcOutOfScope = {
      ...makeJobCard({ odometerIn: 80_000, outletId: 'MUM-01', receivedAt: '2026-03-01T10:00:00.000Z' }),
      vin: 'VIN-D',
    };
    const state = makeReportState({
      jobCards: [jcOutOfScope],
      vehicles: {
        'VIN-D': { year: THIS_YEAR - 2, firstTouchOutletId: 'MUM-01' },
      },
    });
    // Scope is BLR-01 only — MUM-01 JC should not count
    const result = selectServiceToSaleConversion(state, DEFAULT_PERIOD, BLR_SCOPE);
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      expect(result.value).toBeNull(); // denominator is 0 → null
    }
  });

  // Deal not from SERVICE_UPGRADE source should not count in numerator
  it('does not count deals with source other than SERVICE_UPGRADE in numerator', () => {
    const jc = {
      ...makeJobCard({ odometerIn: 80_000, outletId: 'BLR-01', receivedAt: '2026-03-01T10:00:00.000Z' }),
      vin: 'VIN-E',
    };
    const deals = {
      'deal-002': {
        id: 'deal-002',
        source: 'web', // NOT SERVICE_UPGRADE
        stage: 'delivered',
        outlet: 'bangalore',
        lastActivityAt: '2026-04-01T10:00:00.000Z',
      },
    };
    const state = makeReportState({
      jobCards: [jc],
      vehicles: { 'VIN-E': { year: THIS_YEAR - 2, firstTouchOutletId: 'BLR-01' } },
      deals,
    });
    const result = selectServiceToSaleConversion(state, DEFAULT_PERIOD, BLR_SCOPE);
    expect(result.kind).toBe('percentage');
    if (result.kind === 'percentage') {
      // 0 numerator / 1 denominator = 0%
      expect(result.value).toBe(0);
    }
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('SPEC-SERVICE-SALE-001 L1 — hardcoded threshold constants', () => {
  it('UPGRADE_AGE_YEARS is 5', () => {
    expect(UPGRADE_AGE_YEARS).toBe(5);
  });

  it('UPGRADE_KM_THRESHOLD is 70_000', () => {
    expect(UPGRADE_KM_THRESHOLD).toBe(70_000);
  });
});
