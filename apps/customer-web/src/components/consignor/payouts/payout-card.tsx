'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import type { ConsignorPayout } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayoutCardProps {
  payout: ConsignorPayout;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type PayoutStatus = ConsignorPayout['status'];

const STATUS_CLASSES: Record<PayoutStatus, string> = {
  pending:
    'bg-[var(--color-warning,#D97706)]/10 text-[var(--color-warning,#D97706)]',
  processing: 'bg-[var(--color-brass)]/10 text-[var(--color-brass)]',
  completed:
    'bg-[var(--color-forest,#1F4D3A)]/10 text-[var(--color-forest,#1F4D3A)]',
};

function StatusBadge({ status }: { status: PayoutStatus }) {
  const t = useTranslations('portal.consignor.payouts.card.status');
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest rounded-sm',
        STATUS_CLASSES[status],
      ].join(' ')}
    >
      {t(status)}
    </span>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function BreakdownRow({
  label,
  value,
  isTotal = false,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
}) {
  return (
    <tr
      className={
        isTotal
          ? 'border-t-2 border-[var(--color-ink)] bg-[var(--color-bg-subtle,#f3f1ea)]'
          : ''
      }
    >
      <td
        className={[
          'py-3 pr-4 text-left',
          isTotal
            ? 'font-mono text-sm font-semibold text-[var(--color-ink)] uppercase tracking-wide'
            : 'text-sm text-[var(--color-ink-secondary)]',
        ].join(' ')}
      >
        {label}
      </td>
      <td
        className={[
          'py-3 text-right font-mono tabular-nums',
          isTotal
            ? 'text-lg font-semibold text-[var(--color-brass)]'
            : 'text-sm text-[var(--color-ink)]',
        ].join(' ')}
      >
        {value}
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PayoutCard({ payout }: PayoutCardProps) {
  const t = useTranslations('portal.consignor.payouts.card');

  const feeAmount = payout.salePrice * (payout.feePercentage / 100);

  return (
    <article className="border border-[var(--color-line)] overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-line)] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-[var(--color-ink)] leading-snug">
            {payout.vehicleName}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={payout.status} />
        </div>
      </div>

      {/* Financial breakdown table */}
      <div className="px-6 py-5">
        <table className="w-full border-collapse">
          <tbody className="divide-y divide-[var(--color-line)]/50">
            <BreakdownRow
              label={t('salePrice')}
              value={formatInr(payout.salePrice)}
            />
            <BreakdownRow
              label={t('bnFee', { rate: payout.feePercentage })}
              value={`– ${formatInr(feeAmount)}`}
            />
            {payout.reimbursables !== undefined && payout.reimbursables !== 0 && (
              <BreakdownRow
                label={t('reimbursables')}
                value={formatInr(payout.reimbursables)}
              />
            )}
            <BreakdownRow
              label={t('netPayout')}
              value={formatInr(payout.netPayout)}
              isTotal
            />
          </tbody>
        </table>
      </div>

      {/* Footer — date indicator */}
      <div className="px-6 pb-5">
        {payout.status === 'completed' && payout.completedDate ? (
          <p className="flex items-center gap-2 font-mono text-[11px] text-[var(--color-forest,#1F4D3A)] uppercase tracking-widest">
            <CheckCircle2 size={13} strokeWidth={1.5} aria-hidden="true" />
            {t('paidOn', { date: formatDate(payout.completedDate) })}
          </p>
        ) : payout.estimatedDate ? (
          <p className="font-mono text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest">
            {t('expectedBy', { date: formatDate(payout.estimatedDate) })}
          </p>
        ) : null}
      </div>
    </article>
  );
}
