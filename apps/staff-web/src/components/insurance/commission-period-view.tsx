/**
 * CommissionPeriodView — drill-down for a single period.
 *
 * Shows policy-level commission breakdown.
 * Gate: R22+ write, R19 read.
 *
 * Spec reference: SPEC-INSURANCE-001 §34, L_P5_1, L_P5_2
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useInsuranceStore, PermissionError } from '@/src/lib/insurance/insurance-store';
import { Gate } from '@/src/components/primitives/gate';

interface Props { periodId: string }

const ACTOR_R22 = { id: 'staff-r22-001', name: 'CFO', role: 'R22' };

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function CommissionPeriodView({ periodId }: Props) {
  const getCommissionByPeriod = useInsuranceStore((s) => s.getCommissionByPeriod);

  let data: ReturnType<typeof getCommissionByPeriod>;
  try {
    data = getCommissionByPeriod(periodId, ACTOR_R22);
  } catch (e) {
    if (e instanceof PermissionError) {
      return (
        <div className="flex items-center justify-center h-full p-8 text-center">
          <p className="text-[14px] text-error">Access denied. R19+ required.</p>
        </div>
      );
    }
    return (
      <div className="p-6 text-ink-muted text-[13px]">
        Period not found or no policies in this period.
      </div>
    );
  }

  const { period, policies } = data;

  return (
    <Gate role="R19" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        <div className="px-6 py-5 border-b border-line shrink-0">
          <Link
            href="/insurance/commissions"
            className="inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink-primary mb-3"
          >
            <ArrowLeft size={12} />
            Back to ledger
          </Link>
          <h1 className="text-[22px] font-semibold text-ink-primary">{period.periodLabel}</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {period.policyCount} policies · Commission: {fmt(period.commissionEarned)} + GST {fmt(period.commissionGst)}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-[13px]" role="table">
            <thead>
              <tr className="border-b border-line">
                {['Policy No.', 'VIN', 'Provider', 'Advisor', 'Premium', 'Commission', 'GST', 'Invoice Total'].map((h) => (
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
              {policies.map((p) => (
                <tr key={p.policyId} className="border-b border-line/50 hover:bg-bg-hover/30 transition-colors">
                  <td className="py-3 pr-4 font-mono text-[12px] text-ink-primary">{p.policyNumber}</td>
                  <td className="py-3 pr-4 font-mono text-[12px] text-ink-secondary">{p.vin.slice(-7)}</td>
                  <td className="py-3 pr-4 text-ink-secondary">{p.providerId}</td>
                  <td className="py-3 pr-4 text-ink-secondary">{p.advisorId}</td>
                  <td className="py-3 pr-4 text-ink-secondary">{fmt(p.totalPremium)}</td>
                  <td className="py-3 pr-4 text-ink-primary font-medium">{fmt(p.commissionEarned)}</td>
                  <td className="py-3 pr-4 text-ink-secondary">{fmt(p.commissionGst)}</td>
                  <td className="py-3 pr-4 text-ink-primary font-medium">{fmt(p.commissionEarned + p.commissionGst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Gate>
  );
}
