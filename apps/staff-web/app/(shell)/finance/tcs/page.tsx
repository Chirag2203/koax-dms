/**
 * TCS register page — SPEC-FINANCE-001 §1.2, §6.4
 *
 * L2: 1% TCS on cumulative sale > ₹10L per PAN per FY.
 * L3: Waivers tab — read-only from sales events.
 * L4: Indian FY scope.
 * L21: Threshold chips.
 * L24: Period + outlet scope controls.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TcsRegisterTable } from '@/src/components/finance/tcs/tcs-register-table';
import { PeriodPicker } from '@/src/components/finance/shared/period-picker';
import { OutletScopeToggle } from '@/src/components/finance/shared/outlet-scope-toggle';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';

export default function TcsPage() {
  const t = useTranslations('finance.tcs');
  const { period, outletScope, setPeriod, setOutletScope, getTcsRegister } =
    useFinanceStore((s) => ({
      period: s.period,
      outletScope: s.outletScope,
      setPeriod: s.setPeriod,
      setOutletScope: s.setOutletScope,
      getTcsRegister: s.getTcsRegister,
    }));

  // L14: pure selector
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getTcsRegister(period, outletScope), [period, outletScope]);

  return (
    <>
      <FinanceStoreHydrator />
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

        <TcsRegisterTable rows={rows} />
      </div>
    </>
  );
}
