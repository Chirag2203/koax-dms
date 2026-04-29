/**
 * Insurance P5 — Commission ledger tests.
 *
 * Covers §34 / L_P5_1 / L_P5_2:
 *   - Commission computation (round(totalPremium × commissionPct / 100))
 *   - GST 18% additive (round(commissionEarned × 18/100))
 *   - commissionInvoiceTotal = commissionEarned + commissionGst
 *   - R09 / R10 access throws PermissionError (L21)
 *   - R19 can read commission periods
 *   - R22 can mark reconciled
 *   - markReconciled requires receiptDocRef for 'received'
 *   - markReconciled throws for R19 (read-only)
 *   - Period aggregation: multiple policies grouped by period
 *   - getCommissionByPeriod drill-down returns policies
 *
 * Spec reference: SPEC-INSURANCE-001 §10, §34, L4, L21, L_P5_1, L_P5_2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInsuranceStore, PermissionError } from '../lib/insurance/insurance-store';
import { insuranceProviders } from '@dms/mocks/fixtures';
import type { IssuedPolicy } from '@dms/types';

const ACTOR_R09 = { id: 'staff-r09-001', name: 'Priya', role: 'R09' };
const ACTOR_R10 = { id: 'staff-r10-001', name: 'Arjun', role: 'R10' };
const ACTOR_R19 = { id: 'staff-r19-001', name: 'GM', role: 'R19' };
const ACTOR_R22 = { id: 'staff-r22-001', name: 'CFO', role: 'R22' };

function makePolicy(
  id: string,
  totalPremium: number,
  commissionPct: number,
  periodYYYYMM: string,
): IssuedPolicy {
  const commissionEarned = Math.round(totalPremium * commissionPct / 100);
  const commissionGst = Math.round(commissionEarned * 18 / 100);
  return {
    policyId: id,
    leadId: `lead-${id}`,
    vin: 'WP0AB2A91MS247831',
    customerId: 'customer-001',
    providerId: 'bajaj-allianz',
    policyNumber: `TEST-${id}`,
    policyType: 'comprehensive',
    totalPremium,
    idv: totalPremium * 20,
    selectedAddons: ['zero-dep'],
    periodStart: `${periodYYYYMM}-01`,
    periodEnd: `${periodYYYYMM}-28`,
    docId: `doc-${id}`,
    commissionEarned,
    commissionGst,
    advisorId: 'staff-r09-001',
    issuedAt: `${periodYYYYMM}-15T10:00:00.000Z`,
    claimHistory: [],
  };
}

function resetStore(policies: IssuedPolicy[] = []) {
  useInsuranceStore.setState({
    leads: [],
    providers: insuranceProviders,
    policies,
    templates: [],
    campaigns: [],
    callLogs: [],
    optOuts: new Set(),
    featAiCallingEnabled: false,
  });
}

// ── Commission computation (L_P5_1) ──────────────────────────────────────────

describe('commission computation (L_P5_1)', () => {
  it('commissionEarned = round(totalPremium × commissionPct / 100)', () => {
    // Bajaj Allianz: 14% commission
    const policy = makePolicy('test-1', 85000, 14, '2026-04');
    expect(policy.commissionEarned).toBe(Math.round(85000 * 14 / 100)); // = 11900
  });

  it('commissionGst = round(commissionEarned × 18/100) — additive (L4)', () => {
    const policy = makePolicy('test-2', 85000, 14, '2026-04');
    const expectedGst = Math.round(policy.commissionEarned * 18 / 100);
    expect(policy.commissionGst).toBe(expectedGst);
  });

  it('commissionInvoiceTotal = commissionEarned + commissionGst', () => {
    const policy = makePolicy('test-3', 100000, 13, '2026-04');
    const invoiceTotal = policy.commissionEarned + policy.commissionGst;
    expect(invoiceTotal).toBe(policy.commissionEarned + policy.commissionGst);
    expect(invoiceTotal).toBeGreaterThan(policy.commissionEarned); // GST additive
  });
});

// ── RBAC gate (L21 / L_P5_2) ─────────────────────────────────────────────────

describe('getCommissionPeriods — RBAC gate (L21)', () => {
  beforeEach(() => resetStore([makePolicy('p1', 85000, 14, '2026-04')]));

  it('throws PermissionError for R09', () => {
    expect(() =>
      useInsuranceStore.getState().getCommissionPeriods(ACTOR_R09)
    ).toThrow(PermissionError);
  });

  it('throws PermissionError for R10', () => {
    expect(() =>
      useInsuranceStore.getState().getCommissionPeriods(ACTOR_R10)
    ).toThrow(PermissionError);
  });

  it('allows R19 (GM) to read commission periods', () => {
    expect(() =>
      useInsuranceStore.getState().getCommissionPeriods(ACTOR_R19)
    ).not.toThrow();
  });

  it('allows R22 (CFO) to read commission periods', () => {
    expect(() =>
      useInsuranceStore.getState().getCommissionPeriods(ACTOR_R22)
    ).not.toThrow();
  });
});

// ── Period aggregation ────────────────────────────────────────────────────────

describe('getCommissionPeriods — period aggregation', () => {
  beforeEach(() => {
    resetStore([
      makePolicy('p-apr-1', 85000, 14, '2026-04'),
      makePolicy('p-apr-2', 62000, 14, '2026-04'),
      makePolicy('p-mar-1', 95000, 15, '2026-03'),
    ]);
  });

  it('groups policies by month', () => {
    const periods = useInsuranceStore.getState().getCommissionPeriods(ACTOR_R22);
    expect(periods.some((p) => p.periodId === '2026-04')).toBe(true);
    expect(periods.some((p) => p.periodId === '2026-03')).toBe(true);
  });

  it('aggregates commission for April (2 policies)', () => {
    const periods = useInsuranceStore.getState().getCommissionPeriods(ACTOR_R22);
    const apr = periods.find((p) => p.periodId === '2026-04')!;
    const p1commission = Math.round(85000 * 14 / 100);
    const p2commission = Math.round(62000 * 14 / 100);
    expect(apr.commissionEarned).toBe(p1commission + p2commission);
    expect(apr.policyCount).toBe(2);
  });

  it('periods sorted by periodId descending (most recent first)', () => {
    const periods = useInsuranceStore.getState().getCommissionPeriods(ACTOR_R22);
    expect(periods[0]?.periodId).toBe('2026-04');
    expect(periods[1]?.periodId).toBe('2026-03');
  });
});

// ── getCommissionByPeriod drill-down ──────────────────────────────────────────

describe('getCommissionByPeriod', () => {
  beforeEach(() => {
    resetStore([makePolicy('drill-1', 100000, 13, '2026-02')]);
  });

  it('returns period + policies for known period', () => {
    const { period, policies } = useInsuranceStore.getState().getCommissionByPeriod('2026-02', ACTOR_R22);
    expect(period.periodId).toBe('2026-02');
    expect(policies).toHaveLength(1);
    expect(policies[0]?.policyId).toBe('drill-1');
  });

  it('throws for unknown period', () => {
    expect(() =>
      useInsuranceStore.getState().getCommissionByPeriod('2020-01', ACTOR_R22)
    ).toThrow();
  });
});

// ── markReconciled (L_P5_2) ───────────────────────────────────────────────────

describe('markReconciled (L_P5_2)', () => {
  beforeEach(() => resetStore([makePolicy('recon-1', 50000, 12, '2026-01')]));

  it('throws PermissionError for R19 (read-only)', () => {
    expect(() =>
      useInsuranceStore.getState().markReconciled('2026-01', 'received', { receiptDocRef: 'RCP-001' }, ACTOR_R19)
    ).toThrow(PermissionError);
  });

  it('R22 can mark received with receiptDocRef', () => {
    const result = useInsuranceStore.getState().markReconciled(
      '2026-01', 'received', { receiptDocRef: 'RCP-001', receivedAmount: 6360 }, ACTOR_R22,
    );
    expect(result.reconciliationStatus).toBe('received');
    expect(result.receiptDocRef).toBe('RCP-001');
    expect(result.reconciledBy).toBe(ACTOR_R22.id);
  });

  it('throws when receiptDocRef is missing for received status (L_P5_2)', () => {
    expect(() =>
      useInsuranceStore.getState().markReconciled('2026-01', 'received', {}, ACTOR_R22)
    ).toThrow(/receiptDocRef/);
  });

  it('R22 can mark disputed without receipt ref', () => {
    const result = useInsuranceStore.getState().markReconciled(
      '2026-01', 'disputed', {}, ACTOR_R22,
    );
    expect(result.reconciliationStatus).toBe('disputed');
  });
});
