/**
 * GST margin drill-down page — SPEC-FINANCE-001 §1.1, §6.3, L16
 *
 * L16: Per-VIN margin breakdown.
 * L20: Discrepancy acknowledge (R22+).
 * L1: GST formula waterfall display.
 */

'use client';

import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GstMarginDetailCard } from '@/src/components/finance/gst/gst-margin-detail-card';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';

interface Props {
  params: { vin: string };
}

export default function GstVinDetailPage({ params }: Props) {
  const t = useTranslations('finance.gst');
  const { vin } = params;

  const period = useFinanceStore((s) => s.period);
  const outletScope = useFinanceStore((s) => s.outletScope);
  const getMarginReconciliation = useFinanceStore((s) => s.getMarginReconciliation);

  // L14: pure selector
  const rows = useMemo(() => getMarginReconciliation(period, outletScope), [getMarginReconciliation, period, outletScope]);
  const row = rows.find((r) => r.vin === vin);

  if (!row) {
    // L15: empty / not-found
    return (
      <>
        <FinanceStoreHydrator />
        <div className="px-6 py-8">
          <Link
            href="/finance/gst"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary mb-6"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t('backToGst')}
          </Link>
          <p className="text-sm text-ink-muted">{t('vinNotFound', { vin })}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <FinanceStoreHydrator />
      <div className="px-6 py-8 space-y-6">
        <div>
          <Link
            href="/finance/gst"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary mb-4 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {t('backToGst')}
          </Link>
          <h1 className="text-2xl font-semibold text-ink-primary">{t('marginDetailTitle')}</h1>
          <p className="text-sm text-ink-muted mt-1 font-mono">{vin}</p>
        </div>
        <GstMarginDetailCard row={row} />
      </div>
    </>
  );
}
