'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorialQuoteProps {
  className?: string;
}

// ─── EditorialQuote ───────────────────────────────────────────────────────────

export function EditorialQuote({ className }: EditorialQuoteProps) {
  const t = useTranslations('collection');

  return (
    <div
      className={cn(
        'col-span-full w-full',
        'bg-accent/5 py-16 px-6 md:px-12 lg:px-24',
        'my-8',
        className,
      )}
      aria-label="Editorial quote"
    >
      {/* Eyebrow */}
      <p className="mb-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
        The BN Philosophy
      </p>

      {/* Quote */}
      <blockquote>
        <p
          className={cn(
            'font-display text-2xl md:text-4xl italic text-ink-primary',
            'text-center max-w-3xl mx-auto leading-snug',
          )}
        >
          &ldquo;{t('quote')}&rdquo;
        </p>
      </blockquote>

      {/* Decorative rule */}
      <div className="mx-auto mt-10 h-px w-16 bg-accent/30" aria-hidden="true" />
    </div>
  );
}
