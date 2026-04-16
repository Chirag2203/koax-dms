'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Component ────────────────────────────────────────────────────────────────

export function CitiesHero() {
  const t = useTranslations('cities');

  return (
    <section className="bg-bg-paper pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-end">

        {/* Left — headline block */}
        <div className="md:col-span-7">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mb-6 block">
            {t('eyebrow')}
          </span>
          <h1
            className={cn(
              'font-display text-6xl md:text-7xl lg:text-8xl',
              'leading-[0.95] tracking-[-0.04em] text-ink-primary',
            )}
          >
            {t('headline')}
          </h1>
          <p className="mt-8 font-sans text-lg text-ink-secondary max-w-lg leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Right — simplified India location indicator */}
        <div
          className={cn(
            'md:col-span-5',
            'relative h-[320px] md:h-[400px]',
            'bg-bg-subtle border border-line rounded-sm',
            'overflow-hidden',
          )}
          aria-label={t('mapLabel')}
          role="img"
        >
          {/* Decorative SVG grid */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-ink-muted" />
          </svg>

          {/* Location markers */}
          <div className="absolute inset-0 flex flex-col justify-center items-center gap-6">
            <div className="space-y-5 text-left">
              {/* Bangalore — active */}
              <div className="flex items-center gap-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                </span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-primary">
                    Bangalore HQ
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                    Indiranagar · 12°58′N 77°38′E
                  </p>
                </div>
              </div>

              {/* Mumbai */}
              <div className="flex items-center gap-4">
                <span className="inline-flex rounded-full h-3 w-3 bg-accent/60" />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-secondary">
                    Mumbai Atelier
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                    Bandra West · 19°03′N 72°49′E
                  </p>
                </div>
              </div>

              {/* Chennai */}
              <div className="flex items-center gap-4">
                <span className="inline-flex rounded-full h-3 w-3 bg-accent/60" />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-secondary">
                    Chennai Studio
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">
                    Nungambakkam · 13°03′N 80°14′E
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Corner labels */}
          <span className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-widest text-ink-subtle opacity-50">
            BN Network / India
          </span>
          <span className="absolute bottom-4 right-4 font-mono text-[9px] uppercase tracking-widest text-ink-subtle opacity-50">
            Est. 2018
          </span>
        </div>

      </div>
    </section>
  );
}
