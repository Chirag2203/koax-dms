/**
 * Unit tests — timeline-adapter
 *
 * Spec reference: PLAN-VEHICLES-003 §8 P1, S-V3-3, S-V3-4, S-V3-21
 */

import { describe, it, expect } from 'vitest';
import {
  buildVehicleTimeline,
  renderTimelineEntry,
  renderLegacyFallback,
} from '../timeline-adapter';
import type { RenderContext, TimelineEntry } from '../timeline-adapter';
import type { OwnershipChangeEvent, SalesEvent } from '@dms/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = '2026-04-20T12:00:00.000Z';

const ctx: RenderContext = {
  resolveCustomerName: (id) => `Customer:${id}`,
  resolveStaffName: (id) => `Staff:${id}`,
  resolveVehicleRef: (vin) => vin,
  resolveOwnershipRef: (id) => id,
  now: NOW,
};

function makeOwnershipEvent(overrides: Partial<OwnershipChangeEvent>): OwnershipChangeEvent {
  return {
    id: 'evt-1',
    vin: 'WBA3A5C50DF123456',
    at: '2026-01-01T10:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-001',
    actorRole: 'R09',
    payload: { source: 'BN_SALE', kmAtOpen: 25000, buyerCustomerId: 'cust-001' },
    schemaVersion: 'v1',
    ...overrides,
  };
}

function makeSalesEvent(overrides: Partial<SalesEvent> = {}): SalesEvent {
  return {
    id: 'sale-evt-1',
    vin: 'WBA3A5C50DF123456',
    at: '2026-01-01T11:00:00.000Z',
    kind: 'ACQUIRED',
    actorId: 'staff-001',
    actorRole: 'R09',
    payload: { acquisitionCost: 1_000_000, kmAtAcquisition: 24000, source: 'BN_SALE' },
    schemaVersion: 'v1',
    ...overrides,
  };
}

// ─── Chronological sort desc ──────────────────────────────────────────────────

describe('buildVehicleTimeline', () => {
  it('sorts entries in descending chronological order (newest first)', () => {
    const o1 = makeOwnershipEvent({ id: 'o1', at: '2026-01-01T08:00:00.000Z' });
    const o2 = makeOwnershipEvent({ id: 'o2', at: '2026-01-03T10:00:00.000Z' });
    const s1 = makeSalesEvent({ id: 's1', at: '2026-01-02T09:00:00.000Z' });

    const timeline = buildVehicleTimeline([o1, o2], [s1]);

    expect(timeline).toHaveLength(3);
    expect(timeline[0]!.event.id).toBe('o2'); // newest
    expect(timeline[1]!.event.id).toBe('s1');
    expect(timeline[2]!.event.id).toBe('o1'); // oldest
  });

  it('returns empty array when both inputs are empty', () => {
    expect(buildVehicleTimeline([], [])).toHaveLength(0);
  });

  it('collapses 2 consecutive same-kind+actor events within 5 minutes into 1 (S-V3-3)', () => {
    const base = '2026-02-10T14:00:00.000Z';
    const within5min = '2026-02-10T14:03:00.000Z'; // 3 minutes later
    const e1 = makeOwnershipEvent({ id: 'e1', at: base, kind: 'OPEN', actorId: 'staff-x' });
    const e2 = makeOwnershipEvent({ id: 'e2', at: within5min, kind: 'OPEN', actorId: 'staff-x' });

    const timeline = buildVehicleTimeline([e1, e2], []);
    // Both are OPEN by staff-x within 5min — should collapse to 1
    expect(timeline).toHaveLength(1);
  });

  it('does NOT collapse events of the same kind but different actors', () => {
    const base = '2026-02-10T14:00:00.000Z';
    const within5min = '2026-02-10T14:03:00.000Z';
    const e1 = makeOwnershipEvent({ id: 'e1', at: base, kind: 'OPEN', actorId: 'staff-x' });
    const e2 = makeOwnershipEvent({ id: 'e2', at: within5min, kind: 'OPEN', actorId: 'staff-y' });

    const timeline = buildVehicleTimeline([e1, e2], []);
    expect(timeline).toHaveLength(2);
  });

  it('does NOT collapse events of same actor but different kinds', () => {
    const base = '2026-02-10T14:00:00.000Z';
    const within5min = '2026-02-10T14:03:00.000Z';
    const e1 = makeOwnershipEvent({ id: 'e1', at: base, kind: 'OPEN', actorId: 'staff-x' });
    const e2 = makeOwnershipEvent({ id: 'e2', at: within5min, kind: 'CLOSE', actorId: 'staff-x' });

    const timeline = buildVehicleTimeline([e1, e2], []);
    expect(timeline).toHaveLength(2);
  });

  it('does NOT collapse same-kind+actor events > 5 minutes apart', () => {
    const base = '2026-02-10T14:00:00.000Z';
    const after6min = '2026-02-10T14:06:00.000Z';
    const e1 = makeOwnershipEvent({ id: 'e1', at: base, kind: 'OPEN', actorId: 'staff-x' });
    const e2 = makeOwnershipEvent({ id: 'e2', at: after6min, kind: 'OPEN', actorId: 'staff-x' });

    const timeline = buildVehicleTimeline([e1, e2], []);
    expect(timeline).toHaveLength(2);
  });
});

// ─── renderTimelineEntry ──────────────────────────────────────────────────────

describe('renderTimelineEntry', () => {
  it('renders OWNERSHIP OPEN (BN_SALE) with enriched titleKey', () => {
    const entry: TimelineEntry = {
      kind: 'OWNERSHIP',
      event: makeOwnershipEvent({ payload: { source: 'BN_SALE', kmAtOpen: 25000, buyerCustomerId: 'cust-001' } }),
    };
    const view = renderTimelineEntry(entry, ctx);
    expect(view.titleKey).toBe('staff.vehicles.timeline.open.bnSale');
    expect(view.titleParams['buyerName']).toBe('Customer:cust-001');
  });

  it('renders SALES ACQUIRED with correct titleKey', () => {
    const entry: TimelineEntry = { kind: 'SALES', event: makeSalesEvent() };
    const view = renderTimelineEntry(entry, ctx);
    expect(view.titleKey).toBe('staff.vehicles.timeline.sales.acquired');
  });

  it('renders SOLD with margin scheme titleKey', () => {
    const soldEvent = makeSalesEvent({
      kind: 'SOLD',
      payload: {
        salesOrderId: 'SO-001',
        finalPrice: 1_200_000,
        flow: 'MARGIN_SCHEME',
        tcsCollected: 12_000,
        sellerSignatures: [],
        buyerCustomerId: 'cust-001',
      },
    });
    const view = renderTimelineEntry({ kind: 'SALES', event: soldEvent }, ctx);
    expect(view.titleKey).toBe('staff.vehicles.timeline.sales.soldMarginScheme');
  });

  it('SOLD with TCS chip emits tcsCollected chip', () => {
    const soldEvent = makeSalesEvent({
      kind: 'SOLD',
      payload: {
        salesOrderId: 'SO-001',
        finalPrice: 1_200_000,
        flow: 'MARGIN_SCHEME',
        tcsCollected: 12_000,
        sellerSignatures: [],
        buyerCustomerId: 'cust-001',
      },
    });
    const view = renderTimelineEntry({ kind: 'SALES', event: soldEvent }, ctx);
    expect(view.chips.some(c => c.labelKey === 'staff.vehicles.timeline.chips.tcsCollected')).toBe(true);
  });
});

// ─── Legacy fallback (S-V3-21) ────────────────────────────────────────────────

describe('legacy fallback (S-V3-21)', () => {
  it('unknown ownership kind falls through to renderLegacyFallback — no crash', () => {
    const entry = {
      kind: 'OWNERSHIP' as const,
      event: makeOwnershipEvent({ kind: 'UNKNOWN_FUTURE_KIND' as never }),
    };
    // Should not throw
    expect(() => renderTimelineEntry(entry, ctx)).not.toThrow();
    const view = renderTimelineEntry(entry, ctx);
    expect(view.titleKey).toBe('staff.vehicles.timeline.legacyRaw');
    expect(view.chips).toHaveLength(0);
    expect(view.meta).toHaveLength(0);
  });

  it('unknown sales kind falls through to renderLegacyFallback — no crash', () => {
    const entry = {
      kind: 'SALES' as const,
      event: makeSalesEvent({ kind: 'FUTURE_SALES_KIND' as never }),
    };
    expect(() => renderTimelineEntry(entry, ctx)).not.toThrow();
    const view = renderTimelineEntry(entry, ctx);
    expect(view.titleKey).toBe('staff.vehicles.timeline.legacyRaw');
  });

  it('renderLegacyFallback returns kind + actor in titleParams', () => {
    const entry: TimelineEntry = {
      kind: 'OWNERSHIP',
      event: makeOwnershipEvent({ kind: 'OPEN', actorId: 'staff-x' }),
    };
    const fallback = renderLegacyFallback(entry, ctx);
    expect(fallback.titleKey).toBe('staff.vehicles.timeline.legacyRaw');
    expect(fallback.titleParams['actor']).toBe('Staff:staff-x');
    expect(fallback.chips).toEqual([]);
    expect(fallback.meta).toEqual([]);
  });
});

// ─── Joint badge preservation (L20) ──────────────────────────────────────────

describe('joint badge (L20)', () => {
  it('OPEN event with isJoint=true propagates isJoint to view', () => {
    const entry: TimelineEntry = {
      kind: 'OWNERSHIP',
      event: makeOwnershipEvent({
        kind: 'OPEN',
        payload: { source: 'BN_SALE', kmAtOpen: 0, isJoint: true, buyerCustomerId: 'cust-001' },
      }),
    };
    const view = renderTimelineEntry(entry, ctx);
    expect(view.isJoint).toBe(true);
  });

  it('OPEN event without isJoint has isJoint undefined', () => {
    const entry: TimelineEntry = {
      kind: 'OWNERSHIP',
      event: makeOwnershipEvent({
        kind: 'OPEN',
        payload: { source: 'BN_SALE', kmAtOpen: 0, buyerCustomerId: 'cust-001' },
      }),
    };
    const view = renderTimelineEntry(entry, ctx);
    expect(view.isJoint).toBeFalsy();
  });
});
