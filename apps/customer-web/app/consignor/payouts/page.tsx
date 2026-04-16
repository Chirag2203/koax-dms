'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { consignorPayouts } from '@dms/mocks/fixtures';
import { PayoutSummary, PayoutCard } from '@/src/components/consignor/payouts';

export default function ConsignorPayoutsPage() {
  const t = useTranslations('portal.consignor.payouts');

  return (
    <div className="max-w-5xl">
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CONSIGNOR PORTAL
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-[var(--color-ink)] leading-[1.1] mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-xl">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* ── 1. Summary cards ──────────────────────────────────────────────────── */}
      <PayoutSummary payouts={consignorPayouts} />

      {/* ── 2. Individual payout cards ────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-16 py-8 pb-16">
        {consignorPayouts.length === 0 ? (
          <div className="border border-[var(--color-line)] p-10 text-center">
            <p className="font-display text-lg italic text-[var(--color-ink-secondary)] mb-2">
              {t('empty')}
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">{t('emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {consignorPayouts.map((payout) => (
              <PayoutCard key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
