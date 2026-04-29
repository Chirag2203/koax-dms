/**
 * GST reconciliation table — SPEC-FINANCE-001 §1.1, §6.2
 *
 * One row per SOLD event in the period.
 * L16: Drill-down per VIN.
 * L20: Discrepancy alert per row.
 * L13: PAN last-4 only.
 * L15: Empty-period empty state.
 * SPEC-ARCH-UI-001 §DataTable, §StatTile.
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { VinBadge } from '@/src/components/primitives';
import { Gate } from '@/src/components/primitives';
import { INRAmount } from '../shared/inr-amount';
import { DiscrepancyAlert } from './discrepancy-alert';
import type { MarginReconciliationRow } from '@dms/types';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';

type Filter = 'all' | 'open' | 'reconciled' | 'discrepancy';

interface GstReconciliationTableProps {
  rows: MarginReconciliationRow[];
}

/**
 * GST margin reconciliation table with filter chips and bulk reconcile action.
 * §1.1, §6.2; L15: empty state; L16: drill-down link.
 */
export function GstReconciliationTable({ rows }: GstReconciliationTableProps) {
  const t = useTranslations('finance.gst');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const markMarginRowReconciled = useFinanceStore((s) => s.markMarginRowReconciled);

  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    switch (filter) {
      case 'open': return rows.filter((r) => r.reconciliationStatus === 'open');
      case 'reconciled': return rows.filter((r) => r.reconciliationStatus === 'reconciled');
      case 'discrepancy': return rows.filter((r) => r.discrepancyDetected);
      default: return rows;
    }
  }, [rows, filter]);

  const totalGstPaise = useMemo(
    () => rows.reduce((s, r) => s + r.computedGstPaise, 0),
    [rows],
  );

  const handleBulkReconcile = () => {
    if (!user) return;
    let count = 0;
    for (const key of selected) {
      const [vin, eventId] = key.split(':');
      if (!vin || !eventId) continue;
      try {
        markMarginRowReconciled(vin, eventId, undefined, {
          id: user.id, name: user.name, role: user.role,
        });
        count++;
      } catch {
        // skip already-reconciled
      }
    }
    setSelected(new Set());
    toast(`${count} ${t('rowsReconciled')}`, 'success');
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const FILTER_CHIPS: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'open', label: t('filterOpen') },
    { value: 'reconciled', label: t('filterReconciled') },
    { value: 'discrepancy', label: t('filterDiscrepancy') },
  ];

  // L15: empty state
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-ink-primary">{t('emptyHeadline')}</p>
        <p className="text-xs text-ink-muted mt-1">{t('emptySubheadline')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* KPI summary tile */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted uppercase tracking-wider">{t('totalLiability')}</p>
          <INRAmount paise={rows.length > 0 ? totalGstPaise : null} emptyDash className="text-base font-semibold text-ink-primary" />
        </div>
        <span className="text-xs text-ink-muted">{rows.length} {t('transactions')}</span>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={[
              'h-8 px-3 rounded-md text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              filter === value
                ? 'bg-accent text-white'
                : 'bg-bg-subtle border border-line text-ink-secondary hover:bg-bg-hover',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bulk action — R22+ */}
      {selected.size > 0 && (
        <Gate role={['R22', 'R24']} fallback="hide">
          <div className="flex items-center gap-3 p-3 rounded-md bg-accent/5 border border-accent/20">
            <span className="text-sm text-ink-primary">{selected.size} {t('selected')}</span>
            <button
              type="button"
              onClick={handleBulkReconcile}
              className="h-8 px-3 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              {t('markReconciled')}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="h-8 px-3 rounded-md text-xs font-medium border border-line text-ink-secondary hover:bg-bg-hover"
            >
              {t('clearSelection')}
            </button>
          </div>
        </Gate>
      )}

      {/* Table — responsive, collapses on mobile */}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm" aria-label={t('tableLabel')}>
          <thead className="bg-bg-subtle border-b border-line">
            <tr>
              <Gate role={['R22', 'R24']} fallback="hide">
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">{t('select')}</span>
                </th>
              </Gate>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colVin')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colCustomer')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colSalePrice')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colComputedGst')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colStatus')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colDiscrepancy')}</th>
              <th className="w-8 px-3 py-3"><span className="sr-only">{t('drilldown')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((row) => {
              const key = `${row.vin}:${row.saleEventId}`;
              const isSelected = selected.has(key);
              return (
                <tr
                  key={key}
                  className={[
                    'hover:bg-bg-hover transition-colors',
                    isSelected ? 'bg-accent/5' : '',
                  ].join(' ')}
                >
                  <Gate role={['R22', 'R24']} fallback="hide">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(key)}
                        aria-label={`Select ${row.vin}`}
                        className="rounded border-line accent-accent"
                      />
                    </td>
                  </Gate>
                  <td className="px-4 py-3">
                    <VinBadge vin={row.vin} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-secondary">
                    {row.customerName}
                    <span className="ml-1 font-mono text-xs text-ink-muted">({row.customerPanLast4})</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <INRAmount paise={row.salePricePaise} className="text-sm text-ink-primary" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <INRAmount paise={row.computedGstPaise} className="text-sm text-ink-primary" />
                  </td>
                  <td className="px-4 py-3">
                    {row.reconciliationStatus === 'reconciled' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[rgb(var(--state-listed))]">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        {t('reconciled')}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">{t('open')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DiscrepancyAlert
                      storedGstPaise={row.storedGstPaise}
                      computedGstPaise={row.computedGstPaise}
                      ack={row.discrepancyAck}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/finance/gst/${row.vin}`}
                      className="text-ink-muted hover:text-accent transition-colors"
                      aria-label={`Drill down for VIN ${row.vin}`}
                    >
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* L15: empty after filter */}
        {filtered.length === 0 && rows.length > 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-ink-muted">{t('noRowsForFilter')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
