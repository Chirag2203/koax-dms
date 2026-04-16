'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

// ─── Service Hero ─────────────────────────────────────────────────────────────

export function ServiceHero() {
  const t = useTranslations('service');

  return (
    <header className="bg-bg-paper px-6 py-16 md:px-12 md:py-24 lg:px-24">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 className="mb-8 font-display text-5xl font-normal leading-tight tracking-[-0.04em] md:text-7xl">
            {t('hero.titleLine1')}
            <br />
            <span className="italic">{t('hero.titleLine2')}</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-secondary">
            {t('hero.subtitle')}
          </p>
        </div>
        <div className="flex flex-col items-end justify-end text-right md:col-span-5">
          <div className="mb-2 flex items-center gap-3 text-accent">
            <span className="font-mono text-xs uppercase tracking-widest">
              {t('hero.certified')}
            </span>
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-ink-muted opacity-60">
            {t('hero.status')}
          </div>
        </div>
      </div>
    </header>
  );
}
