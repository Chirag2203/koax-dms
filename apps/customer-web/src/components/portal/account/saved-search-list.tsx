/**
 * SavedSearchList — displays the customer's saved inventory searches.
 *
 * Shows each saved search with its name, date, and a link back to the
 * inventory page with filters applied.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L5, S14
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Search, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@dms/ui';
import { useSavedSearchesStore } from '@/src/lib/storefront/use-saved-searches';

// ─── Component ────────────────────────────────────────────────────────────────

export function SavedSearchList({ className }: { className?: string }) {
  const t = useTranslations('inventory');
  const { searches, remove } = useSavedSearchesStore();

  if (searches.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 py-10 text-center',
          className,
        )}
      >
        <Search size={24} className="text-ink-muted/40" aria-hidden="true" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          {t('savedSearchesEmpty')}
        </p>
        <p className="text-sm text-ink-muted/60 max-w-xs">
          {t('savedSearchesEmptyHint')}
        </p>
        <Link
          href="/inventory"
          className="font-mono text-xs text-accent underline underline-offset-2 hover:text-accent/80 transition-colors"
        >
          {t('browseInventory')} →
        </Link>
      </div>
    );
  }

  return (
    <ul className={cn('divide-y divide-line', className)} role="list">
      {searches.map((search) => (
        <li
          key={search.id}
          className="flex items-center justify-between gap-4 py-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <Search
              size={14}
              className="mt-0.5 shrink-0 text-ink-muted"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-primary truncate">
                {search.name}
              </p>
              <p className="font-mono text-xs text-ink-muted mt-0.5">
                {new Date(search.savedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View search */}
            <Link
              href={`/inventory${search.queryString ? `?${search.queryString}` : ''}`}
              className={cn(
                'flex items-center gap-1 rounded-sm border border-line px-2.5 py-1.5',
                'font-mono text-xs uppercase tracking-widest text-ink-secondary',
                'hover:border-accent hover:text-accent transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              )}
              aria-label={`Apply saved search: ${search.name}`}
            >
              <ExternalLink size={10} aria-hidden="true" />
              {t('applySearch')}
            </Link>

            {/* Delete */}
            <button
              onClick={() => remove(search.id)}
              aria-label={`Delete saved search: ${search.name}`}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-sm',
                'text-ink-muted hover:text-ink-primary transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              )}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
