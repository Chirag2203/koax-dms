/**
 * Vendor invoices list page — SPEC-FINANCE-001 §1.3, §6.5
 *
 * L8: R12+ approve, R22+ mark-paid.
 * L17: Five categories.
 * L22: Dispute lifecycle.
 * L24: Period + outlet scope controls.
 * L15: Empty state for period.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { VendorInvoiceListView } from '@/src/components/finance/vendor-invoices/vendor-invoice-list-view';
import { PeriodPicker } from '@/src/components/finance/shared/period-picker';
import { OutletScopeToggle } from '@/src/components/finance/shared/outlet-scope-toggle';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';
import type { VendorInvoice } from '@dms/types';

export default function VendorInvoicesPage() {
  const t = useTranslations('finance.vendorInvoices');
  const router = useRouter();
  const period = useFinanceStore((s) => s.period);
  const outletScope = useFinanceStore((s) => s.outletScope);
  const setPeriod = useFinanceStore((s) => s.setPeriod);
  const setOutletScope = useFinanceStore((s) => s.setOutletScope);

  const handleSelect = (invoice: VendorInvoice) => {
    router.push(`/finance/vendor-invoices/${invoice.id}`);
  };

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

        <VendorInvoiceListView onSelect={handleSelect} />
      </div>
    </>
  );
}
