/**
 * W3.2 — Deal Lost reason capture tests.
 *
 * Coverage:
 *  1.  markDealLost rejects without lostReason category
 *  2.  markDealLost rejects when category='OTHER' but freeText < 10 chars
 *  3.  markDealLost happy path emits deal_lost event with category + freeText length (NOT text)
 *  4.  markDealLost happy path stores lostReason on deal
 *  5.  markDealLost with non-OTHER category and no freeText succeeds
 *  6.  markDealLost with non-OTHER category and optional freeText succeeds
 *
 * Spec: SPEC-SALES-001 §13 / L_S-LOST-1 / W3.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSalesDealsStore } from '../sales-deals-store';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-lost-001',
    customerName: 'Vikram Desai',
    customerPhone: '+919876543210',
    vehicleVin: 'VIN-LOST-TEST-001',
    vehicleName: '2023 Range Rover Sport',
    amount: 12000000,
    stage: 'contacted',
    source: 'referral',
    priority: 'high',
    city: 'mumbai',
    outlet: 'mumbai',
    createdAt: '2026-04-10T10:00:00.000Z',
    lastActivityAt: '2026-05-01T10:00:00.000Z',
    daysInStage: 21,
    ...overrides,
  };
}

const SA_ACTOR = { id: 'emp-sa-001', name: 'Anita SA', role: 'R05' };

function resetStore() {
  useSalesDealsStore.setState({ deals: {}, auditEvents: [] });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('W3.2 — markDealLost', () => {
  beforeEach(resetStore);

  it('(1) rejects when category is not provided (empty/undefined via cast)', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().markDealLost(
      deal.id,
      // Simulate missing category via type cast
      { category: '' as 'OTHER', capturedAt: '', capturedByEmployeeId: '' },
      SA_ACTOR,
    );

    expect('ok' in result && result.ok === false).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('MISSING_CATEGORY');
    }
  });

  it('(2) rejects when category=OTHER but freeText < 10 chars', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().markDealLost(
      deal.id,
      { category: 'OTHER', freeText: 'Too short', capturedAt: '', capturedByEmployeeId: '' },
      SA_ACTOR,
    );

    expect('ok' in result && result.ok === false).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('OTHER_REQUIRES_FREE_TEXT');
    }
  });

  it('(3) happy path emits deal_lost event with category + freeText LENGTH (not text)', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal }, auditEvents: [] });

    useSalesDealsStore.getState().markDealLost(
      deal.id,
      {
        category: 'PRICE_TOO_HIGH',
        freeText: 'Customer found a better deal at AutoNation',
        capturedAt: '',
        capturedByEmployeeId: '',
      },
      SA_ACTOR,
    );

    const events = useSalesDealsStore.getState().auditEvents;
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.kind).toBe('deal_lost');
    expect(event.payload.category).toBe('PRICE_TOO_HIGH');
    expect(typeof event.payload.freeTextLength).toBe('number');
    // Privacy: free text must NOT appear in audit event payload
    expect(JSON.stringify(event.payload)).not.toContain('AutoNation');
    expect(JSON.stringify(event.payload)).not.toContain('better deal');
  });

  it('(4) happy path stores lostReason on the deal', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().markDealLost(
      deal.id,
      { category: 'CHOSE_COMPETITOR', capturedAt: '', capturedByEmployeeId: '' },
      SA_ACTOR,
    );

    // Result is the updated Deal (not an error)
    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.stage).toBe('lost');
      expect(result.lostReason?.category).toBe('CHOSE_COMPETITOR');
      expect(result.lostReason?.capturedByEmployeeId).toBe('emp-sa-001');
    }
  });

  it('(5) non-OTHER category with no freeText succeeds', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().markDealLost(
      deal.id,
      { category: 'CHANGED_MIND', capturedAt: '', capturedByEmployeeId: '' },
      SA_ACTOR,
    );

    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.stage).toBe('lost');
    }
  });

  it('(6) non-OTHER category with optional freeText succeeds and stores it', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().markDealLost(
      deal.id,
      {
        category: 'TIMING',
        freeText: 'Customer is relocating overseas',
        capturedAt: '',
        capturedByEmployeeId: '',
      },
      SA_ACTOR,
    );

    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.lostReason?.freeText).toBe('Customer is relocating overseas');
    }
  });

  it('OTHER category with freeText >= 10 chars succeeds', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().markDealLost(
      deal.id,
      {
        category: 'OTHER',
        freeText: 'Customer decided to keep existing vehicle instead',
        capturedAt: '',
        capturedByEmployeeId: '',
      },
      SA_ACTOR,
    );

    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.stage).toBe('lost');
    }
  });
});
