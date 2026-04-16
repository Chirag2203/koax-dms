'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CollectionEmptyStateProps {
  onClear: () => void;
  className?: string;
}

// ─── CollectionEmptyState ─────────────────────────────────────────────────────

export function CollectionEmptyState({ onClear, className }: CollectionEmptyStateProps) {
  const t = useTranslations('collection');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-24 px-6 text-center',
        className,
      )}
    >
      {/* Decorative rule */}
      <div className="mb-12 h-px w-16 bg-line" aria-hidden="true" />

      <p className="font-display text-3xl mb-4 text-ink-primary italic">
        {t('noResults')}
      </p>

      <p className="text-ink-secondary mb-8 max-w-md leading-relaxed">
        {t('noResultsHint')}
      </p>

      <button
        onClick={onClear}
        className={cn(
          'inline-flex items-center rounded-full',
          'bg-accent px-8 py-3',
          'font-mono text-[11px] uppercase tracking-widest text-white',
          'transition-colors hover:bg-accent/90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        )}
      >
        {t('clearAll')}
      </button>
    </div>
  );
}
