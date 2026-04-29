/**
 * Customer ledger detail — SPEC-FINANCE-001 §1.4, §6.6
 *
 * L7: Aging per invoice row.
 * L13: PAN last-4 only.
 * L18: 3-source rows shown in chronological order with source label.
 * SPEC-ARCH-UI-001 §Card, §Field.
 */

'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { INRAmount } from '../shared/inr-amount';
import { AgingBadge } from './aging-badge';
import type { CustomerLedgerEntry } from '@dms/types';

interface CustomerLedgerDetailProps {
  entry: CustomerLedgerEntry;
  onBack: () => void;
}

// L18: source module display labels
const SOURCE_LABELS: Record<string, string> = {
  sales: 'Vehicle Sale',
  service: 'Service RO',
  'custom-builds': 'Custom Build',
  payment: 'Payment Received',
};

export function CustomerLedgerDetail({ entry, onBack }: CustomerLedgerDetailProps) {
  const t = useTranslations('finance.customerLedger');

  // Running balance for display
  let runningBalancePaise = 0;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary transition-colors mb-2"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t('backToList')}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink-primary">{entry.customerName}</h2>
          {/* L13: PAN last-4 only */}
          <p className="text-xs font-mono text-ink-muted mt-0.5">PAN: {entry.customerPanLast4}</p>
        </div>
        {entry.totalOutstandingPaise > 0 && (
          <AgingBadge state={entry.agingState} ageDays={entry.oldestUnpaidAgeDays} />
        )}
      </div>

      {/* Summary card */}
      <Card title={t('ledgerSummary')}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field
            label={t('totalOutstanding')}
            value={
              <INRAmount
                paise={entry.totalOutstandingPaise}
                emptyDash
                className={entry.totalOutstandingPaise > 0 ? 'text-base font-semibold text-ink-primary' : 'text-base text-ink-muted'}
              />
            }
          />
          <Field
            label={t('agingDays')}
            value={
              entry.totalOutstandingPaise > 0
                ? `${entry.oldestUnpaidAgeDays} ${t('days')}`
                : t('settled')
            }
          />
          <Field
            label={t('colLastPayment')}
            value={entry.lastPaymentAt ? new Date(entry.lastPaymentAt).toLocaleDateString('en-IN') : '—'}
          />
          <Field
            label={t('invoiceCount')}
            value={String(entry.rows.filter((r) => r.sourceModule !== 'payment').length)}
          />
        </dl>
      </Card>

      {/* Transaction rows — chronological */}
      <Card title={t('transactionHistory')}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className="pb-2 text-left text-xs font-medium text-ink-muted">{t('colDate')}</th>
                <th className="pb-2 text-left text-xs font-medium text-ink-muted">{t('colSource')}</th>
                <th className="pb-2 text-left text-xs font-medium text-ink-muted">{t('colDescription')}</th>
                <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('colDebit')}</th>
                <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('colCredit')}</th>
                <th className="pb-2 text-right text-xs font-medium text-ink-muted">{t('colBalance')}</th>
                <th className="pb-2 text-left text-xs font-medium text-ink-muted">{t('colAging')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entry.rows.map((row, i) => {
                const isPayment = row.sourceModule === 'payment' || row.amountPaise < 0;
                const debitPaise = isPayment ? 0 : row.amountPaise;
                const creditPaise = isPayment ? Math.abs(row.amountPaise) : 0;
                runningBalancePaise += row.amountPaise;

                return (
                  <tr key={`${row.sourceId}-${i}`} className={isPayment ? 'bg-[rgb(var(--state-listed)/0.03)]' : ''}>
                    <td className="py-2.5 pr-4 text-xs text-ink-secondary">
                      {new Date(row.issuedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded px-1.5 py-0.5 font-mono text-xs uppercase tracking-widest bg-bg-subtle border border-line text-ink-muted">
                        {SOURCE_LABELS[row.sourceModule] ?? row.sourceModule}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-ink-secondary max-w-[180px] truncate" title={row.description}>
                      {row.description}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {debitPaise > 0 ? (
                        <INRAmount paise={debitPaise} className="text-xs text-ink-primary" />
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {creditPaise > 0 ? (
                        <INRAmount paise={creditPaise} className="text-xs text-[rgb(var(--state-listed))]" />
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <INRAmount
                        paise={runningBalancePaise}
                        className={['text-xs font-medium', runningBalancePaise > 0 ? 'text-ink-primary' : 'text-[rgb(var(--state-listed))]'].join(' ')}
                      />
                    </td>
                    <td className="py-2.5">
                      {/* L7: aging per invoice row */}
                      {!isPayment && row.outstandingPaise > 0 && (
                        <AgingBadge state={row.ageDays <= 30 ? 'green' : row.ageDays <= 60 ? 'amber' : 'red'} ageDays={row.ageDays} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
