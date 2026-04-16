'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Component ────────────────────────────────────────────────────────────────

export function QuoteBlock() {
  const t = useTranslations('certification');

  return (
    <section className="bg-bg-paper px-6 md:px-12 lg:px-24 py-20 md:py-32">
      <div className="max-w-4xl mx-auto text-center">

        {/* Opening quote mark */}
        <div
          className="font-display text-7xl text-accent/30 leading-none mb-4 select-none"
          aria-hidden="true"
        >
          &ldquo;
        </div>

        {/* Quote text */}
        <blockquote
          className={cn(
            'font-display italic text-2xl md:text-3xl',
            'text-ink-primary leading-snug tracking-tight mb-10',
          )}
        >
          {t('quoteText')}
        </blockquote>

        {/* Attribution */}
        <div className="flex flex-col items-center gap-4">
          {/* Portrait */}
          <div className="w-16 h-16 rounded-full overflow-hidden relative bg-bg-subtle">
            <Image
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80"
              alt="Vikram Singh, Certification Lead"
              fill
              sizes="64px"
              className="object-cover grayscale"
            />
          </div>

          {/* Name + title */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent mb-1">
              {t('quoteAttribution')}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              BN Automobiles · Bangalore
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
