/**
 * GrnPickerEmpty — placeholder when ?po= is missing or unknown.
 *
 * Spec reference: PLAN-PARTS-004 §18.8
 */

'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Package } from 'lucide-react';
import { cn } from '@dms/ui';

export interface GrnPickerEmptyProps {
  /** When provided, renders the "Unknown PO" variant. */
  unknownPoId?: string;
}

export function GrnPickerEmpty({ unknownPoId }: GrnPickerEmptyProps) {
  const isUnknown = Boolean(unknownPoId);

  return (
    <div className="mx-auto max-w-[480px] mt-16 py-12 px-8 rounded-md border border-line bg-bg-surface text-center">
      {isUnknown ? (
        <AlertTriangle
          aria-hidden="true"
          className="h-10 w-10 mx-auto mb-4 text-[rgb(var(--state-overdue))]"
        />
      ) : (
        <Package
          aria-hidden="true"
          className="h-10 w-10 mx-auto mb-4 text-ink-muted"
        />
      )}

      <h1 className="text-lg font-semibold text-ink-primary mb-2">
        {isUnknown ? (
          <>
            Unknown PO{' '}
            <span className="inline-flex items-center rounded bg-bg-subtle border border-line px-1.5 py-0.5 text-[13px] font-mono text-ink-primary ml-1">
              {unknownPoId}
            </span>
          </>
        ) : (
          'Select a PO to receive against'
        )}
      </h1>

      <p className="text-sm text-ink-muted max-w-[340px] mx-auto mb-6">
        {isUnknown
          ? 'That purchase order could not be found. It may have been deleted or the link may be incorrect.'
          : 'GRNs are always tied to an existing purchase order. Open a PO from the list to begin receiving.'}
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
