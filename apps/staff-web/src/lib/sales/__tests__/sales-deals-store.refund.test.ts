/**
 * W3.3 — Refund / cancellation flow tests.
 *
 * Coverage:
 *  1.  refundDeal rejects R09 actor → UNAUTHORIZED
 *  2.  refundDeal rejects when stage = 'new-lead' → INVALID_STAGE
 *  3.  refundDeal happy path on 'sales-order' → stage refunded + refund block + audit event
 *  4.  refundDeal happy path on 'delivered' → works
 *  5.  refundDeal rejects when reason < 30 chars → REASON_TOO_SHORT
 *  6.  R12 can refund (lowest eligible role)
 *  7.  R05 cannot refund → UNAUTHORIZED
 *
 * Spec: SPEC-SALES-001 §14 / L_S-REFUND-1 / W3.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSalesDealsStore } from '../sales-deals-store';
import type { Deal } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-refund-001',
    customerName: 'Sneha Patel',
    customerPhone: '+919876543210',
    vehicleVin: 'VIN-REFUND-001',
    vehicleName: '2023 Mercedes GLE',
    amount: 9500000,
    stage: 'sales-order',
    source: 'web',
    priority: 'medium',
    city: 'chennai',
    outlet: 'chennai',
    createdAt: '2026-04-20T10:00:00.000Z',
    lastActivityAt: '2026-05-02T10:00:00.000Z',
    daysInStage: 5,
    ...overrides,
  };
}

const SA_ACTOR = { id: 'emp-sa-001', name: 'Ravi SA', role: 'R05' };
const SALES_MANAGER = { id: 'emp-mgr-001', name: 'Deepak Mgr', role: 'R09' };
const ACCOUNTS_MANAGER = { id: 'emp-acc-001', name: 'Meera Acc', role: 'R12' };
const GM_ACTOR = { id: 'emp-gm-001', name: 'Suresh GM', role: 'R19' };

const VALID_REASON = 'Customer exercised remorse period — financing rejected by HDFC bank';

function resetStore() {
  useSalesDealsStore.setState({ deals: {}, auditEvents: [] });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('W3.3 — refundDeal', () => {
  beforeEach(resetStore);

  it('(1) R09 actor → returns UNAUTHORIZED', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      { category: 'CUSTOMER_REMORSE', reason: VALID_REASON, refundedAmount: 9500000 },
      SALES_MANAGER,
    );

    expect('ok' in result && result.ok === false).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('UNAUTHORIZED');
    }
  });

  it('(2) stage = new-lead → returns INVALID_STAGE', () => {
    const deal = makeDeal({ stage: 'new-lead' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      { category: 'CUSTOMER_REMORSE', reason: VALID_REASON, refundedAmount: 0 },
      ACCOUNTS_MANAGER,
    );

    expect('ok' in result && result.ok === false).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('INVALID_STAGE');
    }
  });

  it('(3) happy path on sales-order → stage refunded + refund block populated + audit event', () => {
    const deal = makeDeal({ stage: 'sales-order' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal }, auditEvents: [] });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      {
        category: 'FINANCE_REJECTED',
        reason: VALID_REASON,
        refundedAmount: 9500000,
      },
      ACCOUNTS_MANAGER,
    );

    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.stage).toBe('refunded');
      expect(result.refund).toBeDefined();
      expect(result.refund?.category).toBe('FINANCE_REJECTED');
      expect(result.refund?.refundedAmount).toBe(9500000);
      expect(result.refund?.refundedByEmployeeId).toBe('emp-acc-001');
    }

    // Audit event emitted
    const events = useSalesDealsStore.getState().auditEvents;
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.kind).toBe('deal_refunded');
    expect(event.payload.category).toBe('FINANCE_REJECTED');
    expect(event.payload.refundedAmount).toBe(9500000);
    expect(typeof event.payload.reasonLength).toBe('number');
    // Privacy: reason text must NOT appear in audit event payload
    expect(JSON.stringify(event.payload)).not.toContain('remorse');
    expect(JSON.stringify(event.payload)).not.toContain('HDFC');
  });

  it('(4) happy path on delivered stage', () => {
    const deal = makeDeal({ stage: 'delivered' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      { category: 'DOA', reason: VALID_REASON, refundedAmount: 9500000 },
      GM_ACTOR,
    );

    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.stage).toBe('refunded');
    }
  });

  it('(5) reason < 30 chars → returns REASON_TOO_SHORT', () => {
    const deal = makeDeal();
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      { category: 'OTHER', reason: 'Short reason', refundedAmount: 0 },
      ACCOUNTS_MANAGER,
    );

    expect('ok' in result && result.ok === false).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('REASON_TOO_SHORT');
    }
  });

  it('(6) R12 can refund (lowest eligible role)', () => {
    const deal = makeDeal({ stage: 'sales-order' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      { category: 'CUSTOMER_REMORSE', reason: VALID_REASON, refundedAmount: 9500000 },
      ACCOUNTS_MANAGER,
    );

    expect('stage' in result).toBe(true);
    if ('stage' in result) {
      expect(result.stage).toBe('refunded');
    }
  });

  it('(7) R05 cannot refund → UNAUTHORIZED', () => {
    const deal = makeDeal({ stage: 'sales-order' });
    useSalesDealsStore.setState({ deals: { [deal.id]: deal } });

    const result = useSalesDealsStore.getState().refundDeal(
      deal.id,
      { category: 'DOA', reason: VALID_REASON, refundedAmount: 0 },
      SA_ACTOR,
    );

    expect('ok' in result && result.ok === false).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('UNAUTHORIZED');
    }
  });
});
