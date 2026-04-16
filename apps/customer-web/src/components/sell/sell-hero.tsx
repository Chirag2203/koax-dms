'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

// ─── Sell Hero ─────────────────────────────────────────────────────────────────

export function SellHero() {
  const t = useTranslations('sell');

  return (
    <header className="bg-bg-paper px-6 py-16 md:px-12 md:py-24 lg:px-24">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-start-2 md:col-span-6">
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-accent">
            {t('hero.eyebrow')}
          </p>
          <h1 className="mb-12 font-display text-5xl font-normal leading-[0.9] tracking-[-0.04em] text-ink-primary md:text-7xl">
            {t('hero.titleLine1')}
            <br />
            {t('hero.titleLine2')}
            <br />
            <span className="italic">{t('hero.titleLine3')}</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-secondary">
            {t('hero.subtitle')}
          </p>
        </div>
      </div>
    </header>
  );
}
