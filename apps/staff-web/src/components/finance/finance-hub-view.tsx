/**
 * Finance hub view — SPEC-FINANCE-001 §1.0
 *
 * 6 KPI StatTiles + module navigation grid.
 * L8: R10 and below = no access (sidebar hidden at shell level).
 * L27: Outlet scope filter.
 * L24: Period picker.
 * SPEC-ARCH-UI-001 §StatTile.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Receipt,
  FileText,
  Users,
  BookOpen,
  BarChart3,
  IndianRupee,
} from 'lucide-react';
import { INRAmount } from './shared/inr-amount';
import { PeriodPicker } from './shared/period-picker';
import { OutletScopeToggle } from './shared/outlet-scope-toggle';
import { useFinanceStore } from '@/src/lib/finance/finance-store';

// ─── Module nav cards ─────────────────────────────────────────────────────────

interface ModuleCard {
  href: string;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  accentColor: string;
}

const MODULE_CARDS: ModuleCard[] = [
  {
    href: '/finance/gst',
    icon: <Receipt size={20} aria-hidden="true" />,
    titleKey: 'moduleGst',
    descKey: 'moduleGstDesc',
    accentColor: 'text-[rgb(var(--state-listed))]',
  },
  {
    href: '/finance/tcs',
    icon: <IndianRupee size={20} aria-hidden="true" />,
    titleKey: 'moduleTcs',
    descKey: 'moduleTcsDesc',
    accentColor: 'text-[rgb(var(--state-pending))]',
  },
  {
    href: '/finance/vendor-invoices',
    icon: <FileText size={20} aria-hidden="true" />,
    titleKey: 'moduleVendorInvoices',
    descKey: 'moduleVendorInvoicesDesc',
    accentColor: 'text-accent',
  },
  {
    href: '/finance/customer-ledger',
    icon: <Users size={20} aria-hidden="true" />,
    titleKey: 'moduleCustomerLedger',
    descKey: 'moduleCustomerLedgerDesc',
    accentColor: 'text-[rgb(var(--state-overdue))]',
  },
  {
    href: '/finance/journal',
    icon: <BookOpen size={20} aria-hidden="true" />,
    titleKey: 'moduleJournal',
    descKey: 'moduleJournalDesc',
    accentColor: 'text-ink-secondary',
  },
];

export function FinanceHubView() {
  const t = useTranslations('finance.hub');
  const { period, outletScope, setPeriod, setOutletScope, getMarginReconciliation, getTcsRegister, getCustomerLedger, getVendorInvoiceList } =
    useFinanceStore((s) => ({
      period: s.period,
      outletScope: s.outletScope,
      setPeriod: s.setPeriod,
      setOutletScope: s.setOutletScope,
      getMarginReconciliation: s.getMarginReconciliation,
      getTcsRegister: s.getTcsRegister,
      getCustomerLedger: s.getCustomerLedger,
      getVendorInvoiceList: s.getVendorInvoiceList,
    }));

  // L14: pure selectors
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gstRows = useMemo(() => getMarginReconciliation(period, outletScope), [period, outletScope]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tcsRows = useMemo(() => getTcsRegister(period, outletScope), [period, outletScope]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ledgerEntries = useMemo(() => getCustomerLedger(outletScope), [outletScope]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vendorInvoices = useMemo(() => getVendorInvoiceList(period, outletScope), [period, outletScope]);

  // Computed KPIs
  const totalGstLiabilityPaise = useMemo(
    () => gstRows.reduce((s, r) => s + r.computedGstPaise, 0),
    [gstRows],
  );
  const totalTcsCollectedPaise = useMemo(
    () => tcsRows.reduce((s, r) => s + r.tcsCollectedTotalPaise, 0),
    [tcsRows],
  );
  const totalOutstandingPaise = useMemo(
    () => ledgerEntries.reduce((s, e) => s + e.totalOutstandingPaise, 0),
    [ledgerEntries],
  );
  const pendingInvoiceCount = useMemo(
    () => vendorInvoices.filter((v) => v.status === 'pending' || v.status === 'approved').length,
    [vendorInvoices],
  );
  const pendingInvoicePaise = useMemo(
    () => vendorInvoices
      .filter((v) => v.status === 'pending' || v.status === 'approved')
      .reduce((s, v) => s + v.totalAmountPaise + v.totalGstPaise, 0),
    [vendorInvoices],
  );
  const discrepancyCount = useMemo(
    () => gstRows.filter((r) => r.discrepancyDetected).length,
    [gstRows],
  );

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        <PeriodPicker value={period} onChange={setPeriod} />
        <OutletScopeToggle value={outletScope} onChange={setOutletScope} />
      </div>

      {/* KPI tiles — SPEC-ARCH-UI-001 §StatTile */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label={t('kpiGstLiability')}
          value={<INRAmount paise={totalGstLiabilityPaise} emptyDash className="text-xl font-semibold text-ink-primary" />}
          href="/finance/gst"
        />
        <StatTile
          label={t('kpiTcsCollected')}
          value={<INRAmount paise={totalTcsCollectedPaise} emptyDash className="text-xl font-semibold text-ink-primary" />}
          href="/finance/tcs"
        />
        <StatTile
          label={t('kpiOutstanding')}
          value={<INRAmount paise={totalOutstandingPaise} emptyDash className="text-xl font-semibold text-ink-primary" />}
          href="/finance/customer-ledger"
        />
        <StatTile
          label={t('kpiPendingInvoices')}
          value={
            <div>
              <p className="text-xl font-semibold text-ink-primary">{pendingInvoiceCount}</p>
              <INRAmount paise={pendingInvoicePaise} emptyDash className="text-xs text-ink-muted" />
            </div>
          }
          href="/finance/vendor-invoices"
        />
        <StatTile
          label={t('kpiDiscrepancies')}
          value={
            <p className={['text-xl font-semibold', discrepancyCount > 0 ? 'text-[rgb(var(--state-overdue))]' : 'text-ink-primary'].join(' ')}>
              {discrepancyCount}
            </p>
          }
          href="/finance/gst"
        />
        <StatTile
          label={t('kpiPeriod')}
          value={<p className="text-sm font-semibold text-ink-primary font-mono">{period.label}</p>}
          href="/finance/journal"
        />
      </div>

      {/* Module grid */}
      <div>
        <h2 className="text-xs text-ink-muted uppercase tracking-wider mb-3">{t('modules')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex items-start gap-4 rounded-md border border-line bg-bg-surface p-5 hover:border-accent/40 hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className={`mt-0.5 ${card.accentColor} transition-transform group-hover:scale-110`}>
                {card.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-ink-primary group-hover:text-accent transition-colors">
                  {t(card.titleKey)}
                </p>
                <p className="text-xs text-ink-muted mt-0.5 leading-snug">{t(card.descKey)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── StatTile sub-component ───────────────────────────────────────────────────

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-line bg-bg-surface p-4 hover:border-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent block"
    >
      <p className="text-xs text-ink-muted uppercase tracking-wider mb-2">{label}</p>
      {value}
    </Link>
  );
}
