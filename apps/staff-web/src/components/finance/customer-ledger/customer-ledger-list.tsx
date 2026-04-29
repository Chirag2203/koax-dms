/**
 * Customer ledger list — SPEC-FINANCE-001 §1.4, §6.6, L18
 *
 * L7: Aging chips per row.
 * L13: PAN last-4 only.
 * L15: Empty state.
 * L18: 3-source aggregation: sales + service RO (mock) + custom-builds (mock).
 * SPEC-ARCH-UI-001 §DataTable.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { INRAmount } from '../shared/inr-amount';
import { AgingBadge } from './aging-badge';
import type { AgingState, CustomerLedgerEntry } from '@dms/types';

type AgingFilter = AgingState | 'all';

interface CustomerLedgerListProps {
  onSelect: (entry: CustomerLedgerEntry) => void;
}

export function CustomerLedgerList({ onSelect }: CustomerLedgerListProps) {
  const t = useTranslations('finance.customerLedger');
  const outletScope = useFinanceStore((s) => s.outletScope);
  const getCustomerLedger = useFinanceStore((s) => s.getCustomerLedger);

  const [agingFilter, setAgingFilter] = useState<AgingFilter>('all');

  // L14: pure selector, L18: 3-source
  const entries = useMemo(() => getCustomerLedger(outletScope), [getCustomerLedger, outletScope]);

  const filtered = useMemo(() => {
    if (agingFilter === 'all') return entries;
    return entries.filter((e) => e.agingState === agingFilter);
  }, [entries, agingFilter]);

  const totalOutstandingPaise = useMemo(
    () => entries.reduce((s, e) => s + e.totalOutstandingPaise, 0),
    [entries],
  );

  const overdueCount = useMemo(
    () => entries.filter((e) => e.agingState === 'red').length,
    [entries],
  );

  const AGING_OPTIONS: Array<{ value: AgingFilter; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'green', label: t('filterCurrent') },
    { value: 'amber', label: t('filterDueSoon') },
    { value: 'red', label: t('filterOverdue') },
  ];

  // L15: empty state
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-ink-primary">{t('emptyHeadline')}</p>
        <p className="text-xs text-ink-muted mt-1">{t('emptySubheadline')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-ink-muted uppercase tracking-wider">{t('totalOutstanding')}</p>
          <INRAmount paise={totalOutstandingPaise} emptyDash className="text-base font-semibold text-ink-primary" />
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">{entries.length} {t('customers')}</p>
          {overdueCount > 0 && (
            <p className="text-xs text-[rgb(var(--state-overdue))] font-medium">
              {overdueCount} {t('overdue')}
            </p>
          )}
        </div>
      </div>

      {/* Aging filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {AGING_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setAgingFilter(value)}
            className={[
              'h-8 px-3 rounded-md text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              agingFilter === value
                ? 'bg-accent text-white'
                : 'bg-bg-subtle border border-line text-ink-secondary hover:bg-bg-hover',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm" aria-label={t('tableLabel')}>
          <thead className="bg-bg-subtle border-b border-line">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colCustomer')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colOutstanding')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colAging')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colLastPayment')}</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colInvoices')}</th>
              <th className="w-8 px-3 py-3"><span className="sr-only">{t('action')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((entry) => (
              <tr
                key={entry.customerId}
                className="hover:bg-bg-hover transition-colors cursor-pointer"
                onClick={() => onSelect(entry)}
              >
                <td className="px-4 py-3">
                  <p className="text-sm text-ink-primary">{entry.customerName}</p>
                  {/* L13: PAN last-4 only */}
                  <p className="text-xs font-mono text-ink-muted">PAN: {entry.customerPanLast4}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <INRAmount
                    paise={entry.totalOutstandingPaise}
                    emptyDash
                    className={[
                      'text-sm font-medium',
                      entry.totalOutstandingPaise > 0 ? 'text-ink-primary' : 'text-ink-muted',
                    ].join(' ')}
                  />
                </td>
                <td className="px-4 py-3">
                  {/* L7: aging badge */}
                  {entry.totalOutstandingPaise > 0 ? (
                    <AgingBadge state={entry.agingState} ageDays={entry.oldestUnpaidAgeDays} />
                  ) : (
                    <span className="text-xs text-ink-muted">{t('settled')}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-ink-secondary">
                  {entry.lastPaymentAt
                    ? new Date(entry.lastPaymentAt).toLocaleDateString('en-IN')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-center text-sm text-ink-secondary">
                  {entry.rows.filter((r) => r.sourceModule !== 'payment').length}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelect(entry); }}
                    className="text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    aria-label={`${t('view')} ${entry.customerName}`}
                  >
                    {t('view')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && entries.length > 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-ink-muted">{t('noRowsForFilter')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
