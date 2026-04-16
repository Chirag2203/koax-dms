'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { ConsignorPayout } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayoutSummaryProps {
  payouts: ConsignorPayout[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PayoutSummary({ payouts }: PayoutSummaryProps) {
  const t = useTranslations('portal.consignor.payouts.summary');

  const totalEarned = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const totalPending = payouts
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.netPayout, 0);

  return (
    <section className="px-6 md:px-12 lg:px-16 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total earned */}
        <div className="p-6 border border-[var(--color-line)] bg-[var(--color-bg-elevated,#faf8f2)]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-3">
            {t('totalEarned')}
          </p>
          <p className="font-display text-4xl text-[var(--color-forest,#1F4D3A)] tabular-nums leading-none">
            {formatInr(totalEarned)}
          </p>
        </div>

        {/* Total pending */}
        <div className="p-6 border border-[var(--color-line)] bg-[var(--color-bg-elevated,#faf8f2)]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-3">
            {t('totalPending')}
          </p>
          <p className="font-display text-4xl text-[var(--color-brass)] tabular-nums leading-none">
            {formatInr(totalPending)}
          </p>
        </div>
      </div>
    </section>
  );
}
