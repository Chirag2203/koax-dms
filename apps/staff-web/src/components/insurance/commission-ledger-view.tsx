/**
 * CommissionLedgerView — monthly commission summary.
 *
 * Gate: R22 (read+write) + R19 (read-only). R09/R10 blocked at store layer.
 * L21: R22 (CFO) + R19 (GM) only.
 * L_P5_1: commissionEarned = round(totalPremium × commissionPct / 100).
 *   commissionGst = round(commissionEarned × 18/100). TDS informational.
 * L_P5_2: reconciliation status is R22+ gated mutation.
 *
 * Spec reference: SPEC-INSURANCE-001 §10, §34, L4, L21, L_P5_1, L_P5_2
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, InfoIcon } from 'lucide-react';
import { useInsuranceStore, PermissionError } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';

// Mock actor — in production, comes from auth context
const ACTOR_R22 = { id: 'staff-r22-001', name: 'CFO', role: 'R22' };

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const RECON_BADGE: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  received: 'bg-success/15 text-success',
  disputed: 'bg-error/15 text-error',
};

export function CommissionLedgerView() {
  const getCommissionPeriods = useInsuranceStore((s) => s.getCommissionPeriods);
  const markReconciled = useInsuranceStore((s) => s.markReconciled);
  const [accessError, setAccessError] = useState('');
  const [reconcing, setReconcing] = useState<string | null>(null);
  const [receiptRef, setReceiptRef] = useState('');

  let periods;
  try {
    periods = getCommissionPeriods(ACTOR_R22);
    if (accessError) setAccessError('');
  } catch (e) {
    if (e instanceof PermissionError) {
      return (
        <div className="flex items-center justify-center h-full p-8 text-center">
          <div>
            <p className="text-[16px] font-medium text-error mb-2">Access Denied</p>
            <p className="text-[13px] text-ink-muted">
              Commission ledger requires R19+ (GM read) or R22+ (CFO). Your role does not have access.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6 text-error text-[13px]">
        Error loading commission data. {e instanceof Error ? e.message : ''}
      </div>
    );
  }

  const totalCommission = periods.reduce((s, p) => s + p.commissionEarned, 0);
  const totalGst = periods.reduce((s, p) => s + p.commissionGst, 0);

  function handleMarkReceived(periodId: string) {
    if (!receiptRef.trim()) return;
    try {
      markReconciled(periodId, 'received', { receiptDocRef: receiptRef }, ACTOR_R22);
      setReconcing(null);
      setReceiptRef('');
    } catch (e) {
      setAccessError(e instanceof Error ? e.message : 'Failed.');
    }
  }

  return (
    <Gate role="R19" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="text-[22px] font-semibold text-ink-primary">Commission Ledger</h1>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              R22+ write · R19 read-only · L_P5_1 / L_P5_2
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 h-9 px-3 rounded border border-line bg-bg-surface text-[13px] text-ink-primary hover:bg-bg-hover transition-colors"
          >
            <Download size={14} aria-hidden="true" />
            Export CSV
          </button>
        </div>

        {/* Summary tiles */}
        <div className="px-6 pt-4 pb-2 grid grid-cols-3 gap-4 shrink-0">
          <div className="rounded-lg border border-line bg-bg-surface p-4">
            <p className="text-[11px] text-ink-muted uppercase tracking-wide mb-1">Total Commission Earned</p>
            <p className="text-[22px] font-semibold text-ink-primary">{fmt(totalCommission)}</p>
          </div>
          <div className="rounded-lg border border-line bg-bg-surface p-4">
            <p className="text-[11px] text-ink-muted uppercase tracking-wide mb-1">Commission GST (18%)</p>
            <p className="text-[22px] font-semibold text-ink-primary">{fmt(totalGst)}</p>
          </div>
          <div className="rounded-lg border border-line bg-bg-surface p-4">
            <p className="text-[11px] text-ink-muted uppercase tracking-wide mb-1">Invoice Total</p>
            <p className="text-[22px] font-semibold text-ink-primary">{fmt(totalCommission + totalGst)}</p>
          </div>
        </div>

        {/* TDS notice */}
        <div className="px-6 py-2 shrink-0">
          <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 p-3">
            <InfoIcon size={13} className="text-info shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-info">
              TDS u/s 194D (5%) applies on commission income exceeding ₹15,000/year per advisor.
              This is informational — TDS is deducted by the insurer, not from this ledger (L_P5_1).
            </p>
          </div>
        </div>

        {/* Period table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {periods.length === 0 && (
            <div className="rounded-lg border border-line bg-bg-surface p-8 text-center mt-4">
              <p className="text-[14px] text-ink-muted">No commission data. Policies will appear here once issued.</p>
            </div>
          )}

          {periods.length > 0 && (
            <table className="w-full text-[13px] mt-4" role="table">
              <thead>
                <tr className="border-b border-line">
                  {['Period', 'Policies', 'Total Premium', 'Commission', 'GST (18%)', 'Invoice Total', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="text-left text-[11px] font-medium text-ink-muted uppercase tracking-wide py-2.5 pr-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.periodId} className="border-b border-line/50 hover:bg-bg-hover/30 transition-colors">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/insurance/commissions/${p.periodId}`}
                        className="font-medium text-ink-primary hover:text-accent"
                      >
                        {p.periodLabel}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-ink-secondary">{p.policyCount}</td>
                    <td className="py-3 pr-4 text-ink-secondary">{fmt(p.totalPremium)}</td>
                    <td className="py-3 pr-4 text-ink-primary font-medium">{fmt(p.commissionEarned)}</td>
                    <td className="py-3 pr-4 text-ink-secondary">{fmt(p.commissionGst)}</td>
                    <td className="py-3 pr-4 text-ink-primary font-medium">{fmt(p.commissionInvoiceTotal)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${RECON_BADGE[p.reconciliationStatus]}`}>
                        {p.reconciliationStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      {p.reconciliationStatus === 'pending' && (
                        reconcing === p.periodId ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Receipt ref"
                              value={receiptRef}
                              onChange={(e) => setReceiptRef(e.target.value)}
                              className="h-7 px-2 text-[12px] rounded border border-line bg-bg-canvas text-ink-primary w-28 focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                            <button
                              type="button"
                              onClick={() => handleMarkReceived(p.periodId)}
                              className="h-7 px-2 text-[12px] rounded bg-success/20 text-success hover:bg-success/30 transition-colors"
                            >
                              Mark Received
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReconcing(p.periodId)}
                            className="text-[12px] h-7 px-2 rounded border border-line text-ink-secondary hover:bg-bg-hover transition-colors"
                          >
                            Reconcile
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {accessError && (
            <div className="mt-4 rounded border border-error/40 bg-error/10 p-3">
              <p className="text-[13px] text-error">{accessError}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-[11px] text-ink-muted">
            Commission disclosure per IRDAI aggregator guidelines. Commission GST 18% additive (Doc 06 L25).
            Access restricted to R22 (CFO) + R19 (GM) per L21.
          </p>
        </div>
      </div>
    </Gate>
  );
}
