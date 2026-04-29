/**
 * NotificationsTable — paginated dispatch log table.
 * SPEC-NOTIFICATIONS-001 L12, L13, §6.1
 *
 * L12: 50 rows, sentAt DESC, URL-driven ?page=N
 * L13: empty state with "No notifications dispatched in this period"
 *
 * ≤200 LoC per spec §11
 */

'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { PaginatedResult, NotificationDispatch } from '@dms/types';
import { NotificationsDispatchRow } from './notifications-dispatch-row';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NotificationsTableProps {
  result: PaginatedResult<NotificationDispatch>;
}

export function NotificationsTable({ result }: NotificationsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (result.items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-ink-primary">
          No notifications dispatched in this period
        </p>
        <p className="mt-1 text-xs text-ink-muted max-w-xs">
          Widen the date range or remove some filters to see more results
        </p>
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="mt-4 h-8 px-3 rounded-md text-xs text-ink-secondary border border-line hover:bg-bg-hover hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full text-sm bg-bg-surface" role="grid" aria-label="Dispatch log">
          <thead>
            <tr className="border-b border-line bg-bg-subtle">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap">
                Timestamp
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Channel
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Template
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Module
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((dispatch) => (
              <NotificationsDispatchRow key={dispatch.id} dispatch={dispatch} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-ink-muted">
            Showing{' '}
            <span className="font-mono tabular-nums">
              {(result.page - 1) * result.pageSize + 1}–
              {Math.min(result.page * result.pageSize, result.total)}
            </span>{' '}
            of{' '}
            <span className="font-mono tabular-nums">{result.total}</span> dispatches
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={result.page <= 1}
              onClick={() => goToPage(result.page - 1)}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-line bg-bg-surface hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className="text-xs text-ink-muted font-mono px-2 tabular-nums">
              {result.page} / {result.totalPages}
            </span>
            <button
              type="button"
              disabled={result.page >= result.totalPages}
              onClick={() => goToPage(result.page + 1)}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-line bg-bg-surface hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Next page"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
