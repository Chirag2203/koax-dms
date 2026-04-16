'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns an array of page numbers and ellipsis markers to display */
function buildPages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('ellipsis');

  pages.push(total);

  return pages;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const t = useTranslations('collection');

  if (totalPages <= 1) return null;

  const pages = buildPages(currentPage, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-2', className)}
    >
      {/* Mobile: Page X of Y */}
      <p className="font-mono text-sm text-ink-muted md:hidden">
        {t('page', { current: currentPage, total: totalPages })}
      </p>

      {/* Desktop: full pagination */}
      <div className="hidden md:flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t('previous')}
          className={cn(
            'px-3 py-2 font-mono text-sm transition-colors',
            'rounded-sm border border-transparent',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            currentPage === 1
              ? 'cursor-not-allowed text-ink-muted/40'
              : 'text-ink-muted hover:text-ink-primary hover:border-line cursor-pointer',
          )}
        >
          {t('previous')}
        </button>

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-3 py-2 font-mono text-sm text-ink-muted/40"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(
                'h-9 w-9 font-mono text-sm transition-colors rounded-sm',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                page === currentPage
                  ? 'text-accent font-medium border border-accent/30 bg-accent/5'
                  : 'text-ink-muted hover:text-ink-primary border border-transparent hover:border-line cursor-pointer',
              )}
            >
              {page}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={t('next')}
          className={cn(
            'px-3 py-2 font-mono text-sm transition-colors',
            'rounded-sm border border-transparent',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            currentPage === totalPages
              ? 'cursor-not-allowed text-ink-muted/40'
              : 'text-ink-muted hover:text-ink-primary hover:border-line cursor-pointer',
          )}
        >
          {t('next')}
        </button>
      </div>

      {/* Mobile: prev/next only */}
      <div className="flex items-center gap-4 md:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t('previous')}
          className={cn(
            'font-mono text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            currentPage === 1
              ? 'cursor-not-allowed text-ink-muted/40'
              : 'text-ink-muted hover:text-ink-primary cursor-pointer',
          )}
        >
          ← {t('previous')}
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={t('next')}
          className={cn(
            'font-mono text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            currentPage === totalPages
              ? 'cursor-not-allowed text-ink-muted/40'
              : 'text-ink-muted hover:text-ink-primary cursor-pointer',
          )}
        >
          {t('next')} →
        </button>
      </div>
    </nav>
  );
}
