/**
 * Journal preview — SPEC-FINANCE-001 §1.5, §6.7
 *
 * L9: Tally Prime column format (header row from tally-csv/headers.ts).
 * L25: HSN/SAC on all legs.
 * L28: Balance assertion display — imbalanced vouchers surfaced visually.
 * L30: Idempotent export.
 * SPEC-ARCH-UI-001 §DataTable.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { INRAmount } from '../shared/inr-amount';
import type { JournalEntry } from '@dms/types';

interface JournalPreviewProps {
  entries: JournalEntry[];
}

export function JournalPreview({ entries }: JournalPreviewProps) {
  const t = useTranslations('finance.journal');

  // L28: check balance per voucher for visual indicator
  const voucherBalanceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const entry of entries) {
      const drSum = entry.legs.filter((l) => l.drCr === 'Dr').reduce((s, l) => s + l.amountPaise, 0);
      const crSum = entry.legs.filter((l) => l.drCr === 'Cr').reduce((s, l) => s + l.amountPaise, 0);
      map.set(entry.voucherNumber, drSum === crSum);
    }
    return map;
  }, [entries]);

  const imbalancedCount = useMemo(
    () => [...voucherBalanceMap.values()].filter((ok) => !ok).length,
    [voucherBalanceMap],
  );

  const totalDebitPaise = useMemo(
    () => entries.flatMap((e) => e.legs).filter((l) => l.drCr === 'Dr').reduce((s, l) => s + l.amountPaise, 0),
    [entries],
  );

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-ink-muted">{t('noEntries')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wider">{t('voucherCount')}</p>
            <p className="text-base font-semibold text-ink-primary">{entries.length}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted uppercase tracking-wider">{t('totalDebit')}</p>
            <INRAmount paise={totalDebitPaise} className="text-base font-semibold text-ink-primary" />
          </div>
        </div>
        {/* L28: balance health indicator */}
        {imbalancedCount > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--state-overdue))]">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{imbalancedCount} {t('imbalancedVouchers')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--state-listed))]">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{t('allBalanced')}</span>
          </div>
        )}
      </div>

      {/* Voucher table — L9: Tally Prime columns */}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm" aria-label={t('tableLabel')}>
          <thead className="bg-bg-subtle border-b border-line">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colDate')}</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colVoucherType')}</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colVoucherNo')}</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colLedger')}</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colDrCr')}</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colAmount')}</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colNarration')}</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colBalance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => {
              const balanced = voucherBalanceMap.get(entry.voucherNumber) ?? false;
              return entry.legs.map((leg, legIdx) => (
                <tr
                  key={`${entry.voucherNumber}-${legIdx}`}
                  className={[
                    'hover:bg-bg-hover transition-colors',
                    !balanced ? 'bg-[rgb(var(--state-overdue)/0.04)]' : '',
                  ].join(' ')}
                >
                  {/* Show date + type only on first leg */}
                  <td className="px-3 py-2 text-xs text-ink-secondary">
                    {legIdx === 0 ? new Date(entry.voucherDate).toLocaleDateString('en-IN') : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-secondary">
                    {legIdx === 0 ? (
                      <span className="rounded px-1.5 py-0.5 bg-bg-subtle border border-line font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                        {entry.voucherType}
                      </span>
                    ) : ''}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                    {legIdx === 0 ? entry.voucherNumber : ''}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-primary">{leg.ledgerName}</td>
                  <td className="px-3 py-2">
                    <span
                      className={[
                        'font-mono text-[10px] font-medium',
                        leg.drCr === 'Dr' ? 'text-ink-primary' : 'text-[rgb(var(--state-listed))]',
                      ].join(' ')}
                    >
                      {leg.drCr}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <INRAmount paise={leg.amountPaise} className="text-xs text-ink-primary" />
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted max-w-[140px] truncate" title={entry.narration}>
                    {legIdx === 0 ? entry.narration : ''}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {/* L28: balance indicator per voucher (shown on first leg only) */}
                    {legIdx === 0 && (
                      balanced
                        ? <CheckCircle2 size={12} className="text-[rgb(var(--state-listed))] mx-auto" aria-label={t('balanced')} />
                        : <AlertTriangle size={12} className="text-[rgb(var(--state-overdue))] mx-auto" aria-label={t('imbalanced')} />
                    )}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
