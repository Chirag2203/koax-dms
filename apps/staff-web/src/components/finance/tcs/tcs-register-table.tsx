/**
 * TCS register table — SPEC-FINANCE-001 §1.2, §6.4
 *
 * Two tabs: Cumulative + Waivers + Deposit schedule.
 * L2: Cumulative per-PAN per-FY.
 * L3: Waivers tab.
 * L21: Threshold chips.
 * L13: PAN last-4 only.
 * L15: Empty state.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { INRAmount } from '../shared/inr-amount';
import { TcsThresholdChip } from './tcs-threshold-chip';
import { TcsWaiverRow } from './tcs-waiver-row';
import type { TcsRegisterRow } from '@dms/types';

type Tab = 'cumulative' | 'waivers' | 'deposit';
type ThresholdFilter = 'all' | 'approaching' | 'near' | 'breached' | 'waived';

interface TcsRegisterTableProps {
  rows: TcsRegisterRow[];
}

export function TcsRegisterTable({ rows }: TcsRegisterTableProps) {
  const t = useTranslations('finance.tcs');
  const [tab, setTab] = useState<Tab>('cumulative');
  const [thresholdFilter, setThresholdFilter] = useState<ThresholdFilter>('all');

  const filteredRows = useMemo(() => {
    if (thresholdFilter === 'all') return rows;
    if (thresholdFilter === 'waived') return rows.filter((r) => r.waivedSalesCount > 0);
    return rows.filter((r) => r.thresholdState === thresholdFilter);
  }, [rows, thresholdFilter]);

  const waiverRows = useMemo(
    () => rows.flatMap((r) => r.events.filter((e) => e.tcsWaived).map((e) => ({ ...e, customerPanLast4: r.customerPanLast4 }))),
    [rows],
  );

  const totalTcsCollectedPaise = useMemo(
    () => rows.reduce((s, r) => s + r.tcsCollectedTotalPaise, 0),
    [rows],
  );

  const TABS: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'cumulative', label: t('tabCumulative') },
    { id: 'waivers', label: t('tabWaivers'), count: waiverRows.length },
    { id: 'deposit', label: t('tabDeposit') },
  ];

  const FILTER_OPTIONS: Array<{ value: ThresholdFilter; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'approaching', label: t('filterApproaching') },
    { value: 'near', label: t('filterNear') },
    { value: 'breached', label: t('filterBreached') },
    { value: 'waived', label: t('filterWaived') },
  ];

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-ink-primary">{t('emptyHeadline')}</p>
        <p className="text-xs text-ink-muted mt-1">{t('emptySubheadline')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-muted uppercase tracking-wider">{t('totalTcsCollected')}</p>
          <INRAmount paise={totalTcsCollectedPaise} emptyDash className="text-base font-semibold text-ink-primary" />
        </div>
        <span className="text-xs text-ink-muted">{rows.length} {t('customers')}</span>
      </div>

      {/* Tab bar — SPEC-ARCH-UI-001 §5 */}
      <div className="flex items-end gap-0 border-b border-line -mb-px overflow-x-auto" role="tablist">
        {TABS.map((t2) => (
          <button
            key={t2.id}
            role="tab"
            aria-selected={tab === t2.id}
            onClick={() => setTab(t2.id)}
            className={[
              'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              tab === t2.id
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-secondary hover:text-ink-primary',
            ].join(' ')}
          >
            {t2.label}
            {t2.count != null && t2.count > 0 && (
              <span className="ml-1.5 font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                {t2.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Cumulative */}
      {tab === 'cumulative' && (
        <div className="space-y-3">
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setThresholdFilter(value)}
                className={[
                  'h-8 px-3 rounded-md text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  thresholdFilter === value
                    ? 'bg-accent text-white'
                    : 'bg-bg-subtle border border-line text-ink-secondary hover:bg-bg-hover',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full text-sm" aria-label={t('tableLabel')}>
              <thead className="bg-bg-subtle border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colCustomer')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colCumulative')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colThreshold')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colTcsCollected')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colSalesCount')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colLastSale')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredRows.map((row) => (
                  <tr key={row.customerId} className="hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm text-ink-primary">{row.customerName}</p>
                      <p className="text-xs font-mono text-ink-muted">PAN: {row.customerPanLast4}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <INRAmount paise={row.cumulativePurchasePaise} className="text-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <TcsThresholdChip
                        state={row.thresholdState}
                        cumulativePaise={row.cumulativePurchasePaise}
                        tcsApplicablePaise={row.tcsApplicablePaise}
                        waivedSalesCount={row.waivedSalesCount}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <INRAmount paise={row.tcsCollectedTotalPaise} emptyDash className="text-sm" />
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-ink-secondary">
                      {row.salesCount}
                      {row.waivedSalesCount > 0 && (
                        <span className="ml-1 text-xs text-ink-muted">({row.waivedSalesCount} {t('waived')})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-secondary">
                      {row.lastSaleAt ? new Date(row.lastSaleAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-sm text-ink-muted">{t('noRowsForFilter')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Waivers — L3 */}
      {tab === 'waivers' && (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm" aria-label={t('waiversTableLabel')}>
            <thead className="bg-bg-subtle border-b border-line">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colVin')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colSaleDate')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colPan')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colInvoiceValue')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colWaiverReason')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colWaivedBy')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {waiverRows.map((row) => (
                <TcsWaiverRow
                  key={row.eventId}
                  eventId={row.eventId}
                  vin={row.vin}
                  saleDate={row.saleDate}
                  customerPanLast4={row.customerPanLast4}
                  invoiceValuePaise={row.invoiceValuePaise}
                  tcsWaivedReason={row.tcsWaivedReason}
                  tcsWaivedBy={row.tcsWaivedBy}
                />
              ))}
            </tbody>
          </table>
          {waiverRows.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-ink-muted">{t('noWaivers')}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Deposit schedule — v1 computed totals */}
      {tab === 'deposit' && (
        <div className="rounded-md border border-line p-6 text-center">
          <p className="text-sm text-ink-primary font-medium">{t('depositScheduleTitle')}</p>
          <p className="text-xs text-ink-muted mt-1">{t('depositScheduleSubtitle')}</p>
          <div className="mt-4">
            <p className="text-xs text-ink-muted uppercase tracking-wider">{t('totalTcsToDeposit')}</p>
            <INRAmount paise={totalTcsCollectedPaise} className="text-xl font-semibold text-ink-primary mt-1" />
          </div>
          <p className="text-xs text-ink-muted mt-4">{t('depositReceiptDeferred')}</p>
        </div>
      )}
    </div>
  );
}
