/**
 * ReportsHubView — main Reports & Analytics page content.
 *
 * §9.1: Hub layout with:
 *   - PageHeader + PeriodFilter (right-aligned)
 *   - OutletScopeToggle (R19+ only)
 *   - 3 KPI sections × 3-col grid
 *   - Print/Export stub button (L6)
 *
 * S-R-9: R09 sees access-denied via Gate.
 * L6: Print button fires info toast (DEF-REPORTS-6).
 * §15: Loading banner when stores not hydrated.
 *      Empty banner when all KPIs null.
 *
 * Spec reference: SPEC-REPORTS-001 §9.1 (S-R-1 through S-R-10)
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';

import { Gate } from '@/src/components/primitives/gate';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';

import type { ReportPeriod, ReportScope } from '@/src/lib/reports/types';
import { last30dPeriod } from '@/src/lib/reports/period';

import { PeriodFilter } from './period-filter';
import { OutletScopeToggle } from './outlet-scope-toggle';
import { KpiTile, KpiTileSkeleton } from './kpi-tile';
import { useReportData } from './use-report-data';

// ─── Outlet-to-ID mapping (for R10 scope enforcement) ────────────────────────

const STAFF_OUTLET_TO_ID: Record<string, string> = {
  bangalore: 'BLR-01',
  mumbai:    'MUM-01',
  chennai:   'CHE-01',
  all:       'BLR-01', // fallback for 'all' — R10 scope builder always has own outlet
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsHubView() {
  const t     = useTranslations('reports');
  const { toast, toasts, dismiss } = useToast();
  const { user } = useStaffAuth();

  // L12: Default to last30d
  const [period, setPeriod] = useState<ReportPeriod>(() => last30dPeriod());

  // L4: Scope enforcement — R10 and below see only their own outlet
  // useReportScope: build scope from auth; R10 cannot override via URL params
  const defaultScope = useMemo<ReportScope>(() => {
    if (!user) return { outletIds: ['BLR-01'] };
    const outletId = STAFF_OUTLET_TO_ID[user.outlet] ?? 'BLR-01';
    return { outletIds: [outletId] };
  }, [user]);

  const [scope, setScope] = useState<ReportScope>(() => ({
    outletIds: user ? [STAFF_OUTLET_TO_ID[user.outlet] ?? 'BLR-01'] : ['BLR-01'],
  }));

  // Ensure scope is always built from auth for non-GM users
  const effectiveScope = useMemo<ReportScope>(() => {
    if (!user) return defaultScope;
    // R10 and below: force single-outlet scope regardless of toggle state
    const hasRankGM = ['R19', 'R22', 'R24'].includes(user.role);
    if (!hasRankGM) return defaultScope;
    return scope;
  }, [user, scope, defaultScope]);

  const { kpis, isLoading } = useReportData(period, effectiveScope);

  // L6: Print button — info toast (DEF-REPORTS-6)
  function handlePrint() {
    toast(t('printComingSoon'), 'info');
  }

  // §15: All KPIs null = "no data" banner
  const allKpisNull = useMemo(() => {
    if (isLoading) return false;
    const { outletPnL, salesVelocity, serviceSla, insuranceAttach, cpoConversion, staffUtilisation } = kpis;
    const isNull = (k: typeof kpis[keyof typeof kpis]) => {
      if (k.kind === 'deferred') return true;
      if (k.kind === 'histogram') return k.buckets.every((b) => b.count === 0);
      return k.value === null;
    };
    return isNull(outletPnL) && isNull(salesVelocity) && isNull(serviceSla) &&
           isNull(insuranceAttach) && isNull(cpoConversion) && isNull(staffUtilisation);
  }, [kpis, isLoading]);

  // Service SLA chip color (§9.4)
  function slaChip(days: number | null): React.ReactNode {
    if (days === null) return null;
    if (days <= 5) return <span className="inline-block text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-sm">{t('kpi.serviceSlaTarget')}</span>;
    if (days <= 8) return <span className="inline-block text-xs font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-sm">Above target</span>;
    return <span className="inline-block text-xs font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-sm">SLA breach</span>;
  }

  const slaValue = kpis.serviceSla.kind === 'days' ? kpis.serviceSla.value : null;

  return (
    // S-R-9: Gate R10+ — R09 sees access-denied
    <Gate role={['R10', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22', 'R23', 'R24']} fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">

        {/* ── Toast container ── */}
        {toasts.length > 0 && (
          <div
            role="region"
            aria-live="polite"
            aria-label="Notifications"
            className="fixed top-4 right-4 z-[200] flex flex-col gap-2"
          >
            {toasts.map((t_item) => (
              <div
                key={t_item.id}
                className="flex items-center gap-3 bg-bg-surface border border-line-strong rounded-md shadow-3 px-4 py-3 text-sm text-ink-primary max-w-sm"
              >
                <span className="flex-1">{t_item.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t_item.id)}
                  aria-label="Dismiss"
                  className="text-ink-muted hover:text-ink-primary"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div>
            <h1 className="font-semibold leading-tight text-ink-primary" style={{ fontSize: 28, lineHeight: '1.25' }}>
              {t('title')}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Period filter */}
            <PeriodFilter period={period} onPeriodChange={setPeriod} />
          </div>
        </div>

        {/* ── Outlet scope toggle (R19+) ── */}
        <div className="px-6 pt-4 shrink-0">
          <OutletScopeToggle scope={scope} onScopeChange={setScope} />
        </div>

        {/* ── Loading banner §15 ── */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="mx-6 mt-4 px-4 py-3 rounded-md border border-line bg-bg-subtle text-sm text-ink-secondary shrink-0"
          >
            {t('loadingData')}
          </div>
        )}

        {/* ── No data banner §15 ── */}
        {!isLoading && allKpisNull && (
          <div
            role="status"
            aria-live="polite"
            className="mx-6 mt-4 px-4 py-3 rounded-md border border-line bg-bg-subtle text-sm text-ink-secondary shrink-0"
          >
            {t('noDataBanner')}
          </div>
        )}

        {/* ── KPI grid ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 mt-4">

          {/* Section 1: Business Performance */}
          <section aria-labelledby="section-business">
            <h2
              id="section-business"
              className="text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-4"
            >
              {t('sections.businessPerformance')}
            </h2>

            {/* §9.7: 3-col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Outlet P&L — R19+ only (L16) */}
              <Gate role={['R19', 'R22', 'R24']} fallback="hide">
                {isLoading
                  ? <KpiTileSkeleton />
                  : <KpiTile label={t('kpi.outletPnL')} kpi={kpis.outletPnL} />
                }
              </Gate>

              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.salesVelocity')}
                  kpi={kpis.salesVelocity}
                  subtitle={t('kpi.salesVelocityUnit')}
                />
              )}

              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.serviceSla')}
                  kpi={kpis.serviceSla}
                  subtitle={t('kpi.serviceSlaUnit')}
                  footer={slaChip(slaValue)}
                />
              )}
            </div>
          </section>

          {/* Section 2: Sales & Inventory */}
          <section aria-labelledby="section-sales">
            <h2
              id="section-sales"
              className="text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-4"
            >
              {t('sections.salesInventory')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.inventoryAging')}
                  kpi={kpis.inventoryAging}
                />
              )}

              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.cpoConversion')}
                  kpi={kpis.cpoConversion}
                />
              )}

              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.customBuildsRevenue')}
                  kpi={kpis.customBuildsRevenue}
                />
              )}
            </div>
          </section>

          {/* Section 3: Insurance & Staff */}
          <section aria-labelledby="section-insurance">
            <h2
              id="section-insurance"
              className="text-sm font-semibold text-ink-secondary uppercase tracking-wider mb-4"
            >
              {t('sections.insuranceStaff')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.insuranceAttach')}
                  kpi={kpis.insuranceAttach}
                />
              )}

              {/* Staff Utilisation — R12+ only (L16, §12) */}
              <Gate role={['R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22', 'R24']} fallback="hide">
                {isLoading ? <KpiTileSkeleton /> : (
                  <KpiTile
                    label={t('kpi.staffUtilisation')}
                    kpi={kpis.staffUtilisation}
                    subtitle={t('kpi.staffUtilTech')}
                  />
                )}
              </Gate>

              {isLoading ? <KpiTileSkeleton /> : (
                <KpiTile
                  label={t('kpi.partsMargin')}
                  kpi={kpis.partsMargin}
                />
              )}
            </div>
          </section>

          {/* Print / Export PDF — L6: stub, info toast */}
          <div className="flex justify-end pt-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 border border-line rounded-md px-4 py-2 text-sm text-ink-secondary hover:bg-bg-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              aria-label={t('printButton')}
            >
              <Printer size={15} aria-hidden="true" />
              {t('printButton')}
            </button>
          </div>
        </div>
      </div>
    </Gate>
  );
}
