/**
 * GST margin reconciliation page — SPEC-FINANCE-001 §1.1, §6.2
 *
 * L1: GST margin scheme display.
 * L8: R12+ view, R22+ bulk-reconcile.
 * L16: Drill-down links to /finance/gst/[vin].
 * L20: Discrepancy alerts.
 * L24: Period + outlet scope controls.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { GstReconciliationTable } from '@/src/components/finance/gst/gst-reconciliation-table';
import { PeriodPicker } from '@/src/components/finance/shared/period-picker';
import { OutletScopeToggle } from '@/src/components/finance/shared/outlet-scope-toggle';
import { useFinanceStore } from '@/src/lib/finance/finance-store';

export default function GstPage() {
  const t = useTranslations('finance.gst');
  const period = useFinanceStore((s) => s.period);
  const outletScope = useFinanceStore((s) => s.outletScope);
  const setPeriod = useFinanceStore((s) => s.setPeriod);
  const setOutletScope = useFinanceStore((s) => s.setOutletScope);
  const getMarginReconciliation = useFinanceStore((s) => s.getMarginReconciliation);

  // L14: pure selector
  const rows = useMemo(() => getMarginReconciliation(period, outletScope), [getMarginReconciliation, period, outletScope]);

  return (
    <div className="px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">{t('pageTitle')}</h1>
        <p className="text-sm text-ink-muted mt-1">{t('pageSubtitle')}</p>
      </div>

      {/* Controls — L24 */}
      <div className="flex items-center gap-3 flex-wrap">
        <PeriodPicker value={period} onChange={setPeriod} />
        <OutletScopeToggle value={outletScope} onChange={setOutletScope} />
      </div>

      <GstReconciliationTable rows={rows} />
    </div>
  );
}
