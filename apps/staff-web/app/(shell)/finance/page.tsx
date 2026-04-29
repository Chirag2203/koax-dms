/**
 * Finance hub page — SPEC-FINANCE-001 §1.0
 *
 * L8: R10 and below = no finance access. Gate at sidebar level.
 * L27: Outlet scope + period controls on this page.
 *
 * Note: static metadata used because the app has no `i18n/request.ts`
 * server-side config; `getTranslations` from next-intl/server would crash.
 */

import type { Metadata } from 'next';
import { FinanceHubView } from '@/src/components/finance/finance-hub-view';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';

export const metadata: Metadata = {
  title: 'Finance — BN Automobiles DMS',
};

export default function FinancePage() {
  return (
    <>
      <FinanceStoreHydrator />
      <div className="px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">Finance</h1>
          <p className="text-sm text-ink-muted mt-1">GST, TCS, vendor invoices, customer ledger &amp; journal</p>
        </div>
        <FinanceHubView />
      </div>
    </>
  );
}
