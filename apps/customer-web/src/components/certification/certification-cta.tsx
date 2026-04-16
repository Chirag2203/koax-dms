'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Component ────────────────────────────────────────────────────────────────

export function CertificationCta() {
  const t = useTranslations('certification');

  return (
    <section className="bg-bg-subtle px-6 md:px-12 lg:px-24 py-20 md:py-28 border-t border-line">
      <div className="max-w-[1440px] mx-auto text-center">

        <h2
          className={cn(
            'font-display text-3xl md:text-4xl tracking-[-0.03em] text-ink-primary mb-6',
          )}
        >
          {t('ctaTitle')}
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          {/* Primary CTA */}
          <Link
            href="/collection?certified=true"
            className={cn(
              'inline-flex items-center gap-2',
              'bg-ink-primary text-bg-paper rounded-full',
              'px-8 py-4 font-mono text-xs uppercase tracking-widest',
              'hover:bg-ink-secondary motion-safe:transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
          >
            {t('ctaBrowse')} →
          </Link>

          {/* Secondary CTA */}
          <Link
            href="/service"
            className={cn(
              'inline-flex items-center gap-2',
              'border border-line-strong text-ink-primary rounded-full',
              'px-8 py-4 font-mono text-xs uppercase tracking-widest',
              'hover:border-ink-primary hover:bg-bg-hover motion-safe:transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
          >
            {t('ctaInspection')} →
          </Link>
        </div>

      </div>
    </section>
  );
}
