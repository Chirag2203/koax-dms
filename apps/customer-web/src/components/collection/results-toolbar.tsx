'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResultsToolbarProps {
  count: number;
  total: number;
  sort: string;
  onSortChange: (sort: string) => void;
  className?: string;
}

// ─── ResultsToolbar ───────────────────────────────────────────────────────────

export function ResultsToolbar({
  count,
  total,
  sort,
  onSortChange,
  className,
}: ResultsToolbarProps) {
  const t = useTranslations('collection');

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4',
        className,
      )}
    >
      {/* Count */}
      <p
        className="font-mono text-sm text-ink-muted"
        aria-live="polite"
        aria-atomic="true"
      >
        {t('showing', { count, total })}
      </p>

      {/* Sort */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {t('sortBy')}
        </span>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label={t('sortBy')}
            className={cn(
              'appearance-none border border-line rounded-sm px-4 py-2 pr-8',
              'font-mono text-[11px] uppercase tracking-widest',
              'text-ink-secondary bg-bg-paper',
              'transition-colors cursor-pointer outline-none',
              'hover:border-accent focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent',
            )}
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="priceAsc">{t('sortPriceAsc')}</option>
            <option value="priceDesc">{t('sortPriceDesc')}</option>
            <option value="kmAsc">{t('sortKmAsc')}</option>
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted"
          >
            ▾
          </span>
        </div>
      </div>
    </div>
  );
}
