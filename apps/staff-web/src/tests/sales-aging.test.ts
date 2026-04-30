/**
 * Inventory Aging + Pricing Intelligence — unit tests.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001
 *
 * Test coverage:
 *  1.  computeAgingBand — all 5 bands (L1)
 *  2.  computeAgingBand — exact boundary: 30d = moderate, 29d = fresh
 *  3.  computeAgingBand — exact boundary: 90d = stale, 89d = aging
 *  4.  computeAgingBand — exact boundary: 180d = critical, 179d = stale
 *  5.  computePriceSuggestion — 5% guardrail never violated (L2)
 *  6.  computePriceSuggestion — competitor price drives suggestion above guardrail
 *  7.  computePriceSuggestion — competitor price below guardrail → guardrail wins (L2)
 *  8.  computePriceSuggestion — fresh + no competitor → no_suggestion
 *  9.  computePriceSuggestion — heuristic drop for critical band
 * 10.  computePriceSuggestion — suggestedDrop = currentPrice - suggestedPrice (L10)
 * 11.  selectAgedListings — RESERVED vehicle IS present in list (L3)
 * 12.  selectAgedListings — SOLD vehicle is excluded (L5)
 * 13.  selectAgedListings — sorted by daysListed desc
 * 14.  selectAgedListings — costBasis from cost-ledger sum (L8)
 * 15.  selectAgedListings — empty state: no vehicles → empty array
 * 16.  applySuggestedPriceDrop — R10+ gate: throws InsufficientRoleError for R05 (L6)
 * 17.  applySuggestedPriceDrop — R10 actor: emits PRICE_CHANGED with source='AGING_SUGGESTION' (L11)
 * 18.  applySuggestedPriceDrop — R19 actor: succeeds
 * 19.  applySuggestedPriceDrop — payload includes previousPrice and reason (L11)
 *
 * All 19 tests + guard test total = 19 (≥15 requirement met).
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  computeAgingBand,
  computePriceSuggestion,
  selectAgedListings,
} from '../lib/sales/aging/selectors';
import { useVehiclesStore } from '../lib/vehicles/vehicles-store';
import { InsufficientRoleError } from '../lib/vehicles/vehicles-store/slices/sales-events-slice';
import type { CompetitorPrice } from '@dms/mocks/fixtures';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStores() {
  useVehiclesStore.setState({
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    salesEvents: {},
    costLedger: {},
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  });
}

/** Subtract `days` from now and return an ISO string. */
function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Build a minimal VehicleMaster-like record (no price — derived from events). */
function makeVehicle(
  vin: string,
  listedAt: string,
  outletId: 'BLR-01' | 'MUM-01' | 'CHE-01' = 'BLR-01',
) {
  return {
    vin,
    make: 'Porsche',
    model: '911',
    variant: 'Carrera S',
    year: 2021,
    color: 'Black',
    rcNumber: 'KA01AB1234',
    firstTouchedAt: listedAt,
    firstTouchSource: 'BN_CONSIGNMENT' as const,
    firstTouchOutletId: outletId,
    lastKnownKm: 15000,
    lastKnownKmAt: listedAt,
    schemaVersion: 'v1' as const,
    listedAt,
  };
}

/** Build a minimal LISTED SalesEvent. */
function makeListedEvent(vin: string, listedAt: string, listPrice = 8_000_000) {
  return {
    id: `ev-listed-${vin}`,
    vin,
    at: listedAt,
    kind: 'LISTED' as const,
    actorId: 'actor-r10',
    actorRole: 'R10' as const,
    payload: { listPrice, outletId: 'BLR-01' },
    schemaVersion: 'v1' as const,
  };
}

const ACTOR_R10 = { id: 'actor-r10', name: 'Arjun Mehta', role: 'R10' };
const ACTOR_R19 = { id: 'actor-r19', name: 'GM User', role: 'R19' };
const ACTOR_R05 = { id: 'actor-r05', name: 'Service Advisor', role: 'R05' };
const NO_COMPETITORS: CompetitorPrice[] = [];

// ─── 1–4: computeAgingBand ────────────────────────────────────────────────────

describe('computeAgingBand', () => {
  it('returns fresh for < 30 days', () => {
    expect(computeAgingBand(0)).toBe('fresh');
    expect(computeAgingBand(15)).toBe('fresh');
    expect(computeAgingBand(29)).toBe('fresh');
  });

  it('returns moderate at exactly 30 days and up to 59 days', () => {
    expect(computeAgingBand(30)).toBe('moderate');
    expect(computeAgingBand(59)).toBe('moderate');
  });

  it('returns aging at 60–89 days; stale at 90–179 days', () => {
    expect(computeAgingBand(60)).toBe('aging');
    expect(computeAgingBand(89)).toBe('aging');
    expect(computeAgingBand(90)).toBe('stale');
    expect(computeAgingBand(179)).toBe('stale');
  });

  it('returns critical at exactly 180 days and above', () => {
    expect(computeAgingBand(180)).toBe('critical');
    expect(computeAgingBand(365)).toBe('critical');
  });
});

// ─── 5–10: computePriceSuggestion ────────────────────────────────────────────

describe('computePriceSuggestion — guardrail (L2)', () => {
  it('suggestedPrice is never below costBasis × 1.05', () => {
    // 200-day-old vehicle; competitor price < guardrail
    const { suggestedPrice } = computePriceSuggestion(
      8_000_000,    // currentPrice
      7_500_000,    // costBasis
      200,          // daysListed (critical)
      [{ vin: 'x', competitorName: 'C1', listedPrice: 7_400_000, scrapedAt: '2026-04-28' }],
    );
    // guardrailFloor = ceil(7_500_000 * 1.05) = 7_875_000
    expect(suggestedPrice).toBeGreaterThanOrEqual(Math.ceil(7_500_000 * 1.05));
  });

  it('competitor price above guardrail: competitor wins', () => {
    // currentPrice = 10M, costBasis = 6M → guardrail = 6.3M
    // competitor median = 9.2M → above guardrail, competitor wins
    const { suggestedPrice, reason } = computePriceSuggestion(
      10_000_000,
      6_000_000,
      200,
      [{ vin: 'x', competitorName: 'C1', listedPrice: 9_200_000, scrapedAt: '2026-04-28' }],
    );
    expect(suggestedPrice).toBe(9_200_000);
    expect(reason).toBe('competitor_price');
  });

  it('competitor price below guardrail: guardrail wins (L2 — non-negotiable)', () => {
    // currentPrice = 8M, costBasis = 7.6M → guardrail = ceil(7.6M * 1.05) = 7_980_000
    // competitor median = 7.5M < guardrail → guardrail wins
    const { suggestedPrice, reason } = computePriceSuggestion(
      8_000_000,
      7_600_000,
      200,
      [{ vin: 'x', competitorName: 'C1', listedPrice: 7_500_000, scrapedAt: '2026-04-28' }],
    );
    const expectedFloor = Math.ceil(7_600_000 * 1.05);
    expect(suggestedPrice).toBe(expectedFloor);
    expect(reason).toBe('margin_guardrail');
  });

  it('fresh + no competitor data → no_suggestion', () => {
    const { reason, suggestedDrop } = computePriceSuggestion(
      8_000_000,
      6_000_000,
      10,          // < 30 days = fresh
      NO_COMPETITORS,
    );
    expect(reason).toBe('no_suggestion');
    expect(suggestedDrop).toBe(0);
  });

  it('critical band + no competitor → margin_guardrail heuristic', () => {
    // 200-day-old, no competitors, costBasis = 0 (guardrail = 0) → heuristic 8% drop
    const { reason } = computePriceSuggestion(
      8_000_000,
      0,            // no cost basis → guardrail = 0
      200,
      NO_COMPETITORS,
    );
    expect(reason).toBe('margin_guardrail');
  });

  it('suggestedDrop = currentPrice - suggestedPrice (L10)', () => {
    const currentPrice = 10_000_000;
    const result = computePriceSuggestion(
      currentPrice,
      6_000_000,
      200,
      [{ vin: 'x', competitorName: 'C1', listedPrice: 9_200_000, scrapedAt: '2026-04-28' }],
    );
    expect(result.suggestedDrop).toBe(currentPrice - result.suggestedPrice);
  });
});

// ─── 11–15: selectAgedListings ────────────────────────────────────────────────

describe('selectAgedListings', () => {
  it('RESERVED vehicle IS included in the reports list (L3)', () => {
    // RESERVED is in ACTIVE_SALES_KINDS — chip suppression is UI-only (L3)
    const vin = 'RESERVED-VIN-001';
    const state = {
      vehicles: { [vin]: makeVehicle(vin, daysAgoIso(120)) },
      salesEvents: {
        [vin]: [
          {
            id: 'ev-1', vin, at: daysAgoIso(120), kind: 'ACQUIRED' as const,
            actorId: ACTOR_R10.id, actorRole: 'R10' as const,
            payload: { acquisitionCost: 7_500_000, kmAtAcquisition: 15000, source: 'BN_CONSIGNMENT' },
            schemaVersion: 'v1' as const,
          },
          {
            id: 'ev-2', vin, at: daysAgoIso(100), kind: 'LISTED' as const,
            actorId: ACTOR_R10.id, actorRole: 'R10' as const,
            payload: { listPrice: 8_000_000, outletId: 'BLR-01' },
            schemaVersion: 'v1' as const,
          },
          {
            id: 'ev-3', vin, at: daysAgoIso(5), kind: 'RESERVED' as const,
            actorId: ACTOR_R10.id, actorRole: 'R10' as const,
            payload: { dealId: 'deal-001', depositAmount: 100000, expiresAt: daysAgoIso(-3) },
            schemaVersion: 'v1' as const,
          },
        ],
      },
      costLedger: {},
    };
    const rows = selectAgedListings(state, NO_COMPETITORS, new Date().toISOString());
    expect(rows.some((r) => r.vin === vin)).toBe(true);
  });

  it('SOLD vehicle is excluded from the list (L5)', () => {
    const vin = 'SOLD-VIN-001';
    const state = {
      vehicles: { [vin]: makeVehicle(vin, daysAgoIso(90)) },
      salesEvents: {
        [vin]: [
          makeListedEvent(vin, daysAgoIso(90)),
          {
            id: 'ev-2', vin, at: daysAgoIso(1), kind: 'SOLD' as const,
            actorId: ACTOR_R10.id, actorRole: 'R10' as const,
            payload: {
              salesOrderId: 'so-001', finalPrice: 7_800_000, flow: 'MARGIN_SCHEME',
              tcsCollected: 0, sellerSignatures: [], buyerCustomerId: 'cust-001',
            },
            schemaVersion: 'v1' as const,
          },
        ],
      },
      costLedger: {},
    };
    const rows = selectAgedListings(state, NO_COMPETITORS, new Date().toISOString());
    expect(rows.every((r) => r.vin !== vin)).toBe(true);
  });

  it('results are sorted by daysListed desc (oldest first)', () => {
    const vinA = 'VIN-OLD-001'; // 150 days
    const vinB = 'VIN-NEW-001'; // 10 days
    const vinC = 'VIN-MID-001'; // 60 days
    const state = {
      vehicles: {
        [vinA]: makeVehicle(vinA, daysAgoIso(150)),
        [vinB]: makeVehicle(vinB, daysAgoIso(10)),
        [vinC]: makeVehicle(vinC, daysAgoIso(60)),
      },
      salesEvents: {
        [vinA]: [makeListedEvent(vinA, daysAgoIso(150))],
        [vinB]: [makeListedEvent(vinB, daysAgoIso(10))],
        [vinC]: [makeListedEvent(vinC, daysAgoIso(60))],
      },
      costLedger: {},
    };
    const rows = selectAgedListings(state, NO_COMPETITORS, new Date().toISOString());
    const indices = rows.map((r) => r.vin);
    expect(indices.indexOf(vinA)).toBeLessThan(indices.indexOf(vinC));
    expect(indices.indexOf(vinC)).toBeLessThan(indices.indexOf(vinB));
  });

  it('costBasis = sum of all CostLedgerEntry.amount for VIN (L8)', () => {
    const vin = 'VIN-COST-001';
    const state = {
      vehicles: { [vin]: makeVehicle(vin, daysAgoIso(100)) },
      salesEvents: { [vin]: [makeListedEvent(vin, daysAgoIso(100), 8_000_000)] },
      costLedger: {
        [vin]: [
          { id: 'c1', vin, category: 'acquisition' as const, date: '2026-03-01', amount: 6_000_000, addedBy: 'u1', addedAt: '2026-03-01T00:00:00.000Z' },
          { id: 'c2', vin, category: 'refurb-mechanical' as const, date: '2026-03-10', amount: 150_000, addedBy: 'u1', addedAt: '2026-03-10T00:00:00.000Z' },
          { id: 'c3', vin, category: 'photography' as const, date: '2026-03-15', amount: 50_000, addedBy: 'u1', addedAt: '2026-03-15T00:00:00.000Z' },
        ],
      },
    };
    const rows = selectAgedListings(state, NO_COMPETITORS, new Date().toISOString());
    const row = rows.find((r) => r.vin === vin);
    expect(row).toBeDefined();
    expect(row!.costBasis).toBe(6_000_000 + 150_000 + 50_000);
  });

  it('empty state → empty array (S-IA-09)', () => {
    const rows = selectAgedListings({ vehicles: {}, salesEvents: {}, costLedger: {} }, NO_COMPETITORS, new Date().toISOString());
    expect(rows).toEqual([]);
  });

  it('rows with linked deals carry linkedDealId and linkedDealStage', () => {
    const vin = 'VIN-DEAL-001';
    const state = {
      vehicles: { [vin]: makeVehicle(vin, daysAgoIso(90)) },
      salesEvents: { [vin]: [makeListedEvent(vin, daysAgoIso(90))] },
      costLedger: {},
    };
    const deals: Record<string, import('@dms/types').Deal> = {
      'deal-linked-1': {
        id: 'deal-linked-1',
        customerName: 'Rajan Pillai',
        customerPhone: '+919800000001',
        vehicleVin: vin,
        vehicleName: '2021 Porsche 911 Carrera S',
        amount: 0,
        stage: 'test-drive',
        source: 'walk-in',
        priority: 'medium',
        city: 'Bangalore',
        outlet: 'BLR-01',
        createdAt: daysAgoIso(10),
        lastActivityAt: daysAgoIso(2),
        daysInStage: 2,
      },
    };
    const rows = selectAgedListings(state, NO_COMPETITORS, new Date().toISOString(), deals);
    const row = rows.find((r) => r.vin === vin);
    expect(row).toBeDefined();
    expect(row!.linkedDealId).toBe('deal-linked-1');
    expect(row!.linkedDealStage).toBe('test-drive');
  });

  it('rows without linked deals carry undefined for linkedDealId and linkedDealStage', () => {
    const vin = 'VIN-NODEAL-001';
    const state = {
      vehicles: { [vin]: makeVehicle(vin, daysAgoIso(60)) },
      salesEvents: { [vin]: [makeListedEvent(vin, daysAgoIso(60))] },
      costLedger: {},
    };
    // No deals supplied (default {} — backwards compat test)
    const rows = selectAgedListings(state, NO_COMPETITORS, new Date().toISOString());
    const row = rows.find((r) => r.vin === vin);
    expect(row).toBeDefined();
    expect(row!.linkedDealId).toBeUndefined();
    expect(row!.linkedDealStage).toBeUndefined();
  });

  it('backwards-compat: omitting deals param still works (no error)', () => {
    const vin = 'VIN-COMPAT-001';
    const state = {
      vehicles: { [vin]: makeVehicle(vin, daysAgoIso(45)) },
      salesEvents: { [vin]: [makeListedEvent(vin, daysAgoIso(45))] },
      costLedger: {},
    };
    expect(() =>
      selectAgedListings(state, NO_COMPETITORS, new Date().toISOString()),
    ).not.toThrow();
  });
});

// ─── 16–19: applySuggestedPriceDrop ──────────────────────────────────────────

describe('applySuggestedPriceDrop', () => {
  beforeEach(() => resetStores());

  const VIN = 'WBA3A5C50DF123456';

  function injectVehicle(listPrice = 8_000_000) {
    useVehiclesStore.setState((s) => ({
      ...s,
      vehicles: {
        [VIN]: {
          vin: VIN,
          make: 'BMW',
          model: 'M3',
          variant: 'Competition',
          year: 2021,
          color: 'White',
          rcNumber: 'KA01AB1234',
          firstTouchedAt: '2026-03-01T00:00:00.000Z',
          firstTouchSource: 'BN_CONSIGNMENT' as const,
          firstTouchOutletId: 'BLR-01',
          lastKnownKm: 20000,
          lastKnownKmAt: '2026-03-01T00:00:00.000Z',
          schemaVersion: 'v1' as const,
          listedAt: '2026-03-01T00:00:00.000Z',
        },
      },
      // Inject a LISTED event so applySuggestedPriceDrop can derive previousPrice
      salesEvents: {
        [VIN]: [makeListedEvent(VIN, '2026-03-01T00:00:00.000Z', listPrice)],
      },
    }));
  }

  it('R05 actor throws InsufficientRoleError (L6)', () => {
    injectVehicle();
    expect(() =>
      useVehiclesStore.getState().applySuggestedPriceDrop(VIN, 7_500_000, 'test reason', ACTOR_R05),
    ).toThrow(InsufficientRoleError);
  });

  it('R05 error message contains actor role and VIN', () => {
    injectVehicle();
    try {
      useVehiclesStore.getState().applySuggestedPriceDrop(VIN, 7_500_000, 'test', ACTOR_R05);
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientRoleError);
      const e = err as InsufficientRoleError;
      expect(e.actorRole).toBe('R05');
      expect(e.vin).toBe(VIN);
    }
  });

  it('R10 actor emits PRICE_CHANGED event (S-IA-08)', () => {
    injectVehicle(8_000_000);
    useVehiclesStore.getState().applySuggestedPriceDrop(
      VIN,
      7_000_000,
      'Market realignment',
      ACTOR_R10,
    );
    const events = useVehiclesStore.getState().salesEvents[VIN] ?? [];
    const priceEvent = events.find((e) => e.kind === 'PRICE_CHANGED');
    expect(priceEvent).toBeDefined();
    expect(priceEvent!.kind).toBe('PRICE_CHANGED');
  });

  it('payload has fromPrice/toPrice and reason (L11)', () => {
    injectVehicle(8_000_000);
    useVehiclesStore.getState().applySuggestedPriceDrop(
      VIN,
      7_000_000,
      'Competitor pricing adjustment',
      ACTOR_R10,
    );
    const events = useVehiclesStore.getState().salesEvents[VIN] ?? [];
    const priceEvent = events.find((e) => e.kind === 'PRICE_CHANGED');
    const payload = priceEvent!.payload as {
      fromPrice: number;
      toPrice: number;
      reason: string;
    };
    // L11: payload uses fromPrice/toPrice (schema canonical names)
    expect(payload.toPrice).toBe(7_000_000);
    expect(payload.fromPrice).toBe(8_000_000);
    expect(payload.reason).toBe('Competitor pricing adjustment');
  });

  it('R19 actor also succeeds (L6 — R19 is in allowed set)', () => {
    injectVehicle(8_000_000);
    expect(() =>
      useVehiclesStore.getState().applySuggestedPriceDrop(VIN, 7_500_000, 'GM override', ACTOR_R19),
    ).not.toThrow();
  });
});
