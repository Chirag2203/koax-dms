/**
 * Customer ledger detail page — SPEC-FINANCE-001 §1.4, §6.6
 *
 * L7: Aging per row.
 * L13: PAN last-4 only.
 * L18: 3-source rows.
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CustomerLedgerDetail } from '@/src/components/finance/customer-ledger/customer-ledger-detail';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';

interface Props {
  params: { customerId: string };
}

export default function CustomerLedgerDetailPage({ params }: Props) {
  const t = useTranslations('finance.customerLedger');
  const router = useRouter();
  const { customerId } = params;

  const outletScope = useFinanceStore((s) => s.outletScope);
  const getCustomerLedger = useFinanceStore((s) => s.getCustomerLedger);

  // L14: pure selector
  const entries = useMemo(() => getCustomerLedger(outletScope), [getCustomerLedger, outletScope]);
  const entry = entries.find((e) => e.customerId === customerId);

  if (!entry) {
    return (
      <>
        <FinanceStoreHydrator />
        <div className="px-6 py-8">
          <p className="text-sm text-ink-muted">{t('customerNotFound', { customerId })}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <FinanceStoreHydrator />
      <div className="px-6 py-8 max-w-3xl">
        <CustomerLedgerDetail
          entry={entry}
          onBack={() => router.push('/finance/customer-ledger')}
        />
      </div>
    </>
  );
}
