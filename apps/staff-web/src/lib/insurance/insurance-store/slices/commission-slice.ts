/**
 * Commission ledger slice (P5).
 *
 * L_P5_1: commissionEarned = round(totalPremium × commissionPct / 100).
 *   commissionGst = round(commissionEarned × 18/100). Additive. TDS informational.
 * L_P5_2: reconciliation status is R22+ gated mutation.
 *   R19 = read-only. R09/R10 = PermissionError.
 * L21: commission ledger is R22 (CFO) + R19 (GM read) only.
 *
 * Spec reference: SPEC-INSURANCE-001 §10, §34, L4, L_P5_1, L_P5_2, L21
 */

import type { CommissionPeriod, IssuedPolicy } from '@dms/types';
import type { InsuranceSlice, CommissionActions, ReconcileMeta, StoreActor } from '../types';
import { PermissionError } from '../types';

// TDS threshold: 5% on commission > ₹15k/yr per agent (194D, informational only)
const TDS_THRESHOLD = 15000;

const ROLE_RANK: Record<string, number> = {
  R09: 9, R10: 10, R11: 11, R12: 12, R13: 13,
  R19: 19, R22: 22, R24: 24,
};

function rank(role: string): number {
  const explicit = ROLE_RANK[role];
  if (explicit !== undefined) return explicit;
  return parseInt(role.replace('R', ''), 10) || 0;
}

function assertCommissionAccess(actor: StoreActor): void {
  if (rank(actor.role) < 19) {
    throw new PermissionError('commission-ledger', 'R19+', actor.role);
  }
}

/** Group policies by YYYY-MM of issuedAt */
function groupByPeriod(policies: IssuedPolicy[]): Map<string, IssuedPolicy[]> {
  const map = new Map<string, IssuedPolicy[]>();
  for (const p of policies) {
    const period = p.issuedAt.slice(0, 7); // 'YYYY-MM'
    if (!map.has(period)) map.set(period, []);
    map.get(period)!.push(p);
  }
  return map;
}

function periodLabel(periodId: string): string {
  const [year, month] = periodId.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export const createCommissionSlice: InsuranceSlice<CommissionActions> = (set, get) => ({
  /**
   * L21 / L_P5_2: R19 can read; R09/R10 cannot access.
   * Returns aggregated periods sorted by periodId descending.
   */
  getCommissionPeriods(actor: StoreActor): CommissionPeriod[] {
    assertCommissionAccess(actor);

    const policies = get().policies;
    const byPeriod = groupByPeriod(policies);
    const periods: CommissionPeriod[] = [];

    for (const [periodId, pols] of byPeriod) {
      const totalPremium = pols.reduce((s, p) => s + p.totalPremium, 0);
      const commissionEarned = pols.reduce((s, p) => s + p.commissionEarned, 0);
      const commissionGst = pols.reduce((s, p) => s + p.commissionGst, 0);
      const commissionInvoiceTotal = commissionEarned + commissionGst;

      periods.push({
        periodId,
        periodLabel: periodLabel(periodId),
        totalPremium,
        commissionEarned,
        commissionGst,
        commissionInvoiceTotal,
        policyCount: pols.length,
        reconciliationStatus: 'pending',
      });
    }

    // Sort by period descending (most recent first)
    periods.sort((a, b) => b.periodId.localeCompare(a.periodId));
    return periods;
  },

  /**
   * Drill-down for a specific period.
   */
  getCommissionByPeriod(
    periodId: string,
    actor: StoreActor,
  ): { period: CommissionPeriod; policies: IssuedPolicy[] } {
    assertCommissionAccess(actor);

    const policies = get().policies.filter((p) => p.issuedAt.startsWith(periodId));
    if (policies.length === 0) throw new Error(`No policies found for period: ${periodId}`);

    const totalPremium = policies.reduce((s, p) => s + p.totalPremium, 0);
    const commissionEarned = policies.reduce((s, p) => s + p.commissionEarned, 0);
    const commissionGst = policies.reduce((s, p) => s + p.commissionGst, 0);

    // TDS info: per-advisor commission check
    const byAdvisor = new Map<string, number>();
    for (const p of policies) {
      byAdvisor.set(p.advisorId, (byAdvisor.get(p.advisorId) ?? 0) + p.commissionEarned);
    }
    const tdsFlaggedAdvisors = Array.from(byAdvisor.entries())
      .filter(([, earned]) => earned > TDS_THRESHOLD)
      .map(([advisorId]) => advisorId);
    void tdsFlaggedAdvisors; // informational — used in UI

    const period: CommissionPeriod = {
      periodId,
      periodLabel: periodLabel(periodId),
      totalPremium,
      commissionEarned,
      commissionGst,
      commissionInvoiceTotal: commissionEarned + commissionGst,
      policyCount: policies.length,
      reconciliationStatus: 'pending',
    };

    return { period, policies };
  },

  /**
   * L_P5_2: reconciliation status mutation is R22+ gated.
   * R19 is read-only. Receipt doc ref required for 'received'.
   */
  markReconciled(
    periodId: string,
    status: 'received' | 'disputed',
    meta: ReconcileMeta,
    actor: StoreActor,
  ): CommissionPeriod {
    if (rank(actor.role) < 22) {
      throw new PermissionError('mark-commission-reconciled', 'R22+', actor.role);
    }

    if (status === 'received' && !meta.receiptDocRef) {
      throw new Error('receiptDocRef is required to mark commission as received (L_P5_2).');
    }

    // In v1, reconciliation state is not stored in the Zustand state (no commission-periods slice state).
    // We return a constructed period object with the new status.
    const result = get().getCommissionByPeriod(periodId, actor);
    const now = new Date().toISOString();
    return {
      ...result.period,
      reconciliationStatus: status,
      receivedAmount: meta.receivedAmount,
      receiptDocRef: meta.receiptDocRef,
      reconciledBy: actor.id,
      reconciledAt: now,
    };
  },
});
