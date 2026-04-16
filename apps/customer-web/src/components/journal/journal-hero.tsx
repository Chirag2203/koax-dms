'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';

// ─── Journal Hero ─────────────────────────────────────────────────────────────

export function JournalHero() {
  const t = useTranslations('journal');

  return (
    <header className="bg-bg-paper px-6 py-16 md:px-12 md:py-24 lg:px-24">
      <span className="mb-4 block font-mono text-xs uppercase tracking-[0.3em] text-accent">
        {t('hero.eyebrow')}
      </span>
      <h1 className="font-display text-6xl font-normal leading-[0.85] tracking-[-0.04em] text-ink-primary md:text-8xl lg:text-[120px]">
        {t('hero.title')}
      </h1>
    </header>
  );
}
