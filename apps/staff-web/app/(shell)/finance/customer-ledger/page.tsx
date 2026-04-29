/**
 * Customer ledger list page — SPEC-FINANCE-001 §1.4, §6.6
 *
 * L7: Aging indicators.
 * L13: PAN last-4 only.
 * L15: Empty state.
 * L18: 3-source aggregation.
 * L27: Outlet scope.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CustomerLedgerList } from '@/src/components/finance/customer-ledger/customer-ledger-list';
import { CustomerLedgerDetail } from '@/src/components/finance/customer-ledger/customer-ledger-detail';
import { OutletScopeToggle } from '@/src/components/finance/shared/outlet-scope-toggle';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';
import type { CustomerLedgerEntry } from '@dms/types';

export default function CustomerLedgerPage() {
  const t = useTranslations('finance.customerLedger');
  const outletScope = useFinanceStore((s) => s.outletScope);
  const setOutletScope = useFinanceStore((s) => s.setOutletScope);

  const [selected, setSelected] = useState<CustomerLedgerEntry | null>(null);

  if (selected) {
    return (
      <>
        <FinanceStoreHydrator />
        <div className="px-6 py-8 max-w-3xl">
          <CustomerLedgerDetail
            entry={selected}
            onBack={() => setSelected(null)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <FinanceStoreHydrator />
      <div className="px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">{t('pageTitle')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('pageSubtitle')}</p>
        </div>
        <OutletScopeToggle value={outletScope} onChange={setOutletScope} />
        <CustomerLedgerList onSelect={setSelected} />
      </div>
    </>
  );
}
