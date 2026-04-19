/**
 * GrnPickerEmpty — when ?po= is missing or unknown.
 *
 * Wraps the canonical P3/P5 detail-page shell (max-w-[1440px] + breadcrumb
 * + 28px h1 + divider) so "New GRN" from the /parts landing lands on a
 * page that matches the rest of the staff surface.
 *
 * Spec reference: PLAN-PARTS-004 §18.8 + PLAN-PARTS-007 §bugfix
 */

'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronRight, ChevronRight as Chevron } from 'lucide-react';
import { cn } from '@dms/ui';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { StateChip } from '@/src/components/primitives';
import {
  OUTLET_NAMES,
  formatINR,
  formatDate,
  poStatusToChip,
} from '../helpers';

export interface GrnPickerEmptyProps {
  /** When provided, renders the "Unknown PO" variant. */
  unknownPoId?: string;
}

const RECEIVABLE = new Set(['DISPATCHED', 'PARTIALLY_RECEIVED']);

export function GrnPickerEmpty({ unknownPoId }: GrnPickerEmptyProps) {
  const isUnknown = Boolean(unknownPoId);
  const allPos = usePartsStore((s) => s.purchaseOrders);
  const suppliers = usePartsStore((s) => s.suppliers);

  const receivable = allPos
    .filter((p) => RECEIVABLE.has(p.status))
    .sort(
      (a, b) =>
        new Date(b.dispatchedAt ?? b.createdAt).getTime() -
        new Date(a.dispatchedAt ?? a.createdAt).getTime(),
    );

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
      {/* Breadcrumb — same pattern as /parts/po/[id] */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href="/parts"
              className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              Parts
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3 w-3 text-ink-muted" />
          </li>
          <li>
            <Link
              href="/parts?tab=grn"
              className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              GRNs
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3 w-3 text-ink-muted" />
          </li>
          <li
            aria-current="page"
            className="text-[13px] text-ink-primary"
          >
            New
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            New GRN
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            {isUnknown
              ? 'The linked PO could not be found — pick another purchase order to receive against.'
              : 'GRNs are always tied to an existing purchase order. Pick a dispatched or partially-received PO to begin receiving.'}
          </p>
        </div>
      </div>

      {/* Unknown-PO warning banner */}
      {isUnknown && (
        <div
          className={cn(
            'mb-6 rounded-md border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.1)]',
            'px-4 py-3 flex items-start gap-3',
          )}
        >
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5"
          />
          <div className="text-sm text-ink-primary">
            <p className="font-medium">Unknown PO</p>
            <p className="text-[12px] text-ink-muted mt-0.5">
              The link referenced{' '}
              <span className="font-mono text-ink-primary">{unknownPoId}</span>,
              which doesn&apos;t exist. It may have been deleted or the link
              may be incorrect.
            </p>
          </div>
        </div>
      )}

      {/* Receivable PO list — primary card */}
      <section className="rounded-md border border-line bg-bg-surface">
        <header className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            Receivable POs{receivable.length > 0 ? ` (${receivable.length})` : ''}
          </h2>
          <span className="text-[11px] text-ink-muted">
            Sorted by most recent dispatch
          </span>
        </header>

        {receivable.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-ink-muted mb-4">
              No dispatched or partially-received POs available. Mark a PO as
              dispatched before filing a GRN against it.
            </p>
            <Link
              href="/parts?tab=po"
              className={cn(
                'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              View Purchase Orders
            </Link>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-line">
            {receivable.map((po) => {
              const supplier = suppliers.find((s) => s.id === po.supplierId);
              return (
                <li key={po.id}>
                  <Link
                    href={`/parts/grn/new?po=${encodeURIComponent(po.id)}`}
                    className={cn(
                      'flex items-center justify-between gap-4 px-6 py-4',
                      'hover:bg-bg-subtle transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:-ring-offset-1',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[14px] font-semibold text-accent shrink-0">
                        {po.poNo}
                      </span>
                      <StateChip status={poStatusToChip(po.status)} />
                      <span className="text-[13px] text-ink-secondary truncate">
                        {supplier?.name ?? '—'}
                      </span>
                      <span className="text-[12px] text-ink-muted shrink-0">
                        · {OUTLET_NAMES[po.outletId] ?? po.outletId}
                      </span>
                      <span className="text-[12px] text-ink-muted shrink-0">
                        · {po.lines.length} line{po.lines.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                          Dispatched
                        </span>
                        <span className="text-[12px] text-ink-secondary">
                          {formatDate(po.dispatchedAt ?? po.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end min-w-[110px]">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                          Total
                        </span>
                        <span className="font-mono text-[14px] text-ink-primary">
                          {formatINR(po.total)}
                        </span>
                      </div>
                      <Chevron
                        className="h-4 w-4 text-ink-muted"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
