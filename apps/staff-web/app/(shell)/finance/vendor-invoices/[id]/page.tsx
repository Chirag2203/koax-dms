/**
 * Vendor invoice detail page — SPEC-FINANCE-001 §1.3, §6.5, L16
 *
 * L8: R12+ approve, R22+ mark-paid, R12+ dispute.
 * L16: Per-invoice drill-down.
 * L22: Non-reversible approval / dispute flow.
 * L25: HSN/SAC validation at approval.
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { VendorInvoiceDetailView } from '@/src/components/finance/vendor-invoices/vendor-invoice-detail-view';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';

interface Props {
  params: { id: string };
}

export default function VendorInvoiceDetailPage({ params }: Props) {
  const t = useTranslations('finance.vendorInvoices');
  const router = useRouter();
  const { id } = params;

  const period = useFinanceStore((s) => s.period);
  const outletScope = useFinanceStore((s) => s.outletScope);
  const getVendorInvoiceList = useFinanceStore((s) => s.getVendorInvoiceList);

  // L14: pure selector
  const invoices = useMemo(() => getVendorInvoiceList(period, outletScope), [getVendorInvoiceList, period, outletScope]);
  const invoice = invoices.find((inv) => inv.id === id);

  if (!invoice) {
    return (
      <>
        <FinanceStoreHydrator />
        <div className="px-6 py-8">
          <p className="text-sm text-ink-muted">{t('invoiceNotFound', { id })}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <FinanceStoreHydrator />
      <div className="px-6 py-8 max-w-3xl">
        <VendorInvoiceDetailView
          invoice={invoice}
          onBack={() => router.push('/finance/vendor-invoices')}
        />
      </div>
    </>
  );
}
