/**
 * GrnPickerEmpty — when ?po= is missing or unknown.
 *
 * No-?po variant now shows an inline list of receivable POs
 * (DISPATCHED / PARTIALLY_RECEIVED) so the user can start a GRN from
 * the top-level "New GRN" sidebar action instead of bouncing back.
 *
 * Spec reference: PLAN-PARTS-004 §18.8 + PLAN-PARTS-007 §bugfix
 */

'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Package, ChevronRight } from 'lucide-react';
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

  // Receivable POs — DISPATCHED or PARTIALLY_RECEIVED
  const receivable = allPos
    .filter((p) => RECEIVABLE.has(p.status))
    .sort(
      (a, b) =>
        new Date(b.dispatchedAt ?? b.createdAt).getTime() -
        new Date(a.dispatchedAt ?? a.createdAt).getTime(),
    );

  // Unknown-PO variant keeps the old shell (can't show a list — user had a
  // specific PO in mind that no longer exists).
  if (isUnknown) {
    return (
      <div className="mx-auto max-w-[480px] mt-16 py-12 px-8 rounded-md border border-line bg-bg-surface text-center">
        <AlertTriangle
          aria-hidden="true"
          className="h-10 w-10 mx-auto mb-4 text-[rgb(var(--state-overdue))]"
        />
        <h1 className="text-lg font-semibold text-ink-primary mb-2">
          Unknown PO{' '}
          <span className="inline-flex items-center rounded bg-bg-subtle border border-line px-1.5 py-0.5 text-[13px] font-mono text-ink-primary ml-1">
            {unknownPoId}
          </span>
        </h1>
        <p className="text-sm text-ink-muted max-w-[340px] mx-auto mb-6">
          That purchase order could not be found. It may have been deleted or
          the link may be incorrect.
        </p>
        <Link
          href="/parts?tab=po"
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
            'hover:bg-accent/90 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          )}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Purchase Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] mt-8 px-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Package aria-hidden="true" className="h-6 w-6 text-ink-muted" />
        <div>
          <h1 className="text-[22px] font-semibold leading-[1.3] text-ink-primary">
            Select a PO to receive against
          </h1>
          <p className="text-sm text-ink-muted">
            GRNs are always tied to an existing purchase order. Pick a
            dispatched or partially-received PO below.
          </p>
        </div>
      </div>

      {receivable.length === 0 ? (
        <div className="rounded-md border border-line bg-bg-surface py-12 px-8 text-center">
          <p className="text-sm text-ink-muted mb-4">
            No dispatched or partially-received POs available. A PO must be
            marked dispatched before a GRN can be filed.
          </p>
          <Link
            href="/parts?tab=po"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
              'hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            View Purchase Orders
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 rounded-md border border-line bg-bg-surface p-2">
          {receivable.map((po) => {
            const supplier = suppliers.find((s) => s.id === po.supplierId);
            return (
              <li key={po.id}>
                <Link
                  href={`/parts/grn/new?po=${encodeURIComponent(po.id)}`}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 rounded-md',
                    'hover:bg-bg-subtle transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[13px] text-accent shrink-0">
                      {po.poNo}
                    </span>
                    <StateChip status={poStatusToChip(po.status)} />
                    <span className="text-[13px] text-ink-secondary truncate">
                      {supplier?.name ?? '—'}
                    </span>
                    <span className="text-[12px] text-ink-muted shrink-0">
                      · {OUTLET_NAMES[po.outletId] ?? po.outletId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[11px] text-ink-muted">
                      Dispatched{' '}
                      {formatDate(po.dispatchedAt ?? po.createdAt)}
                    </span>
                    <span className="font-mono text-[13px] text-ink-primary">
                      {formatINR(po.total)}
                    </span>
                    <ChevronRight
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

      <div className="mt-4 text-center">
        <Link
          href="/parts?tab=po"
          className="text-[12px] text-accent hover:underline"
        >
          ← Back to Purchase Orders tab
        </Link>
      </div>
    </div>
  );
}
