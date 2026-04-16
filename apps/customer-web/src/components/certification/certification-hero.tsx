'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificationHero() {
  const t = useTranslations('certification');

  return (
    <section className="bg-bg-paper pt-32 pb-0 md:pt-40 px-6 md:px-12 lg:px-24">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">

        {/* Left: text block */}
        <div className="lg:col-span-7 pb-16 md:pb-24 flex flex-col justify-center pr-0 lg:pr-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent mb-6 block">
            {t('eyebrow')}
          </span>
          <h1
            className={cn(
              'font-display text-6xl md:text-7xl lg:text-8xl',
              'leading-[0.95] tracking-[-0.04em] text-ink-primary mb-8',
            )}
          >
            {t('headline')}
          </h1>
          <p className="font-sans text-lg text-ink-secondary max-w-xl leading-relaxed mb-12">
            {t('subtitle')}
          </p>

          {/* Stat */}
          <div className="flex items-end gap-4">
            <span
              className={cn(
                'font-display text-[7rem] leading-none tracking-[-0.04em]',
                'text-accent',
              )}
              aria-label={`${t('statNumber')} ${t('statLabel')}`}
            >
              {t('statNumber')}
            </span>
            <div className="pb-3">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
                {t('statLabel')}
              </p>
            </div>
          </div>
        </div>

        {/* Right: car photo — flush to bottom of the section */}
        <div className="lg:col-span-5 relative">
          <div className="aspect-[4/5] lg:aspect-auto lg:absolute lg:inset-0 overflow-hidden rounded-sm bg-bg-subtle">
            <Image
              src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80"
              alt="Close-up of a classic luxury car — BN Automobiles certification"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
              priority
            />
          </div>
        </div>

      </div>
    </section>
  );
}
