/**
 * Vendor invoice list view — SPEC-FINANCE-001 §1.3, §6.5
 *
 * L8: R12+ approve, R22+ mark-paid.
 * L13: vendorPan shown in full (public business data).
 * L15: Empty state per period.
 * L17: Five categories.
 * L22: Dispute reverts to pending (non-reversible without R22+ ack).
 * L23: Input-credit eligibility column.
 * L7: Aging indicator on overdue invoices.
 * SPEC-ARCH-UI-001 §DataTable.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { INRAmount } from '../shared/inr-amount';
import { GstinDisplay } from '../shared/gstin-display';
import { VendorInvoiceStatusChip } from './vendor-invoice-status-chip';
import { VendorInvoiceCategoryBadge } from './vendor-invoice-category-badge';
import { Gate } from '@/src/components/primitives';
import type { VendorInvoice, VendorInvoiceStatus, VendorInvoiceCategory } from '@dms/types';

type StatusFilter = VendorInvoiceStatus | 'all';
type CategoryFilter = VendorInvoiceCategory | 'all';

interface VendorInvoiceListViewProps {
  onSelect: (invoice: VendorInvoice) => void;
}

export function VendorInvoiceListView({ onSelect }: VendorInvoiceListViewProps) {
  const t = useTranslations('finance.vendorInvoices');
  const { period, outletScope, getVendorInvoiceList } = useFinanceStore((s) => ({
    period: s.period,
    outletScope: s.outletScope,
    getVendorInvoiceList: s.getVendorInvoiceList,
  }));

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const allInvoices = useMemo(
    () => getVendorInvoiceList(period, outletScope),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, outletScope],
  );

  const filtered = useMemo(() => {
    let rows = allInvoices;
    if (statusFilter !== 'all') rows = rows.filter((r) => r.status === statusFilter);
    if (categoryFilter !== 'all') rows = rows.filter((r) => r.category === categoryFilter);
    return rows;
  }, [allInvoices, statusFilter, categoryFilter]);

  const totalPendingPaise = useMemo(
    () => allInvoices
      .filter((r) => r.status === 'pending' || r.status === 'approved')
      .reduce((s, r) => s + r.totalAmountPaise + r.totalGstPaise, 0),
    [allInvoices],
  );

  const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'pending', label: t('filterPending') },
    { value: 'approved', label: t('filterApproved') },
    { value: 'paid', label: t('filterPaid') },
    { value: 'disputed', label: t('filterDisputed') },
  ];

  const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
    { value: 'all', label: t('filterAllCategories') },
    { value: 'parts', label: t('catParts') },
    { value: 'labour', label: t('catLabour') },
    { value: 'commission', label: t('catCommission') },
    { value: 'consumable', label: t('catConsumable') },
    { value: 'consignment-payout', label: t('catConsignmentPayout') },
  ];

  // L15: empty state
  if (allInvoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
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
          <p className="text-xs text-ink-muted uppercase tracking-wider">{t('pendingLiability')}</p>
          <INRAmount paise={totalPendingPaise} emptyDash className="text-base font-semibold text-ink-primary" />
        </div>
        <span className="text-xs text-ink-muted">{allInvoices.length} {t('invoices')}</span>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={[
              'h-8 px-3 rounded-md text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              statusFilter === value
                ? 'bg-accent text-white'
                : 'bg-bg-subtle border border-line text-ink-secondary hover:bg-bg-hover',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-muted">{t('category')}:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategoryFilter(value)}
              className={[
                'h-7 px-2.5 rounded text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                categoryFilter === value
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-bg-subtle border border-line text-ink-muted hover:text-ink-secondary hover:bg-bg-hover',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm" aria-label={t('tableLabel')}>
          <thead className="bg-bg-subtle border-b border-line">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colVendor')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colCategory')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colAmount')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colGst')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colStatus')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">{t('colRaised')}</th>
              <th className="w-8 px-3 py-3"><span className="sr-only">{t('action')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((inv) => (
              <VendorInvoiceRow key={inv.id} invoice={inv} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && allInvoices.length > 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-ink-muted">{t('noRowsForFilter')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row sub-component ────────────────────────────────────────────────────────

interface VendorInvoiceRowProps {
  invoice: VendorInvoice;
  onSelect: (inv: VendorInvoice) => void;
}

function VendorInvoiceRow({ invoice, onSelect }: VendorInvoiceRowProps) {
  const t = useTranslations('finance.vendorInvoices');

  // L7: compute aging for overdue invoices
  const isOverdue = invoice.dueAt
    ? new Date(invoice.dueAt) < new Date() && invoice.status !== 'paid'
    : false;

  return (
    <tr
      className="hover:bg-bg-hover transition-colors cursor-pointer"
      onClick={() => onSelect(invoice)}
    >
      <td className="px-4 py-3">
        <p className="text-sm text-ink-primary">{invoice.vendorName}</p>
        {/* L13: vendorGstin shown in full (public business data) */}
        <GstinDisplay gstin={invoice.vendorGstin} className="text-xs mt-0.5" />
      </td>
      <td className="px-4 py-3">
        {/* L17 + L23 */}
        <VendorInvoiceCategoryBadge category={invoice.category} showEligibility />
      </td>
      <td className="px-4 py-3 text-right">
        <INRAmount paise={invoice.totalAmountPaise} className="text-sm text-ink-primary" />
      </td>
      <td className="px-4 py-3 text-right">
        <INRAmount paise={invoice.totalGstPaise} className="text-xs text-ink-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <VendorInvoiceStatusChip status={invoice.status} />
          {/* L7: aging badge for overdue */}
          {isOverdue && (
            <span className="block text-xs text-[rgb(var(--state-overdue))] font-medium">
              {t('overdue')}
            </span>
          )}
          {invoice.status === 'disputed' && invoice.disputeReason && (
            <p className="text-xs text-ink-muted max-w-[160px] truncate" title={invoice.disputeReason}>
              {invoice.disputeReason}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-ink-secondary">
        {new Date(invoice.raisedAt).toLocaleDateString('en-IN')}
        {invoice.dueAt && (
          <p className={['text-xs', isOverdue ? 'text-[rgb(var(--state-overdue))]' : 'text-ink-muted'].join(' ')}>
            {t('due')} {new Date(invoice.dueAt).toLocaleDateString('en-IN')}
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(invoice); }}
            className="text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            aria-label={`${t('view')} ${invoice.invoiceNumber}`}
          >
            {t('view')}
          </button>
        </Gate>
      </td>
    </tr>
  );
}
