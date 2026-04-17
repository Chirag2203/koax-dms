/**
 * PartHeader — breadcrumb + h1 + subtitle chip row + CTAs.
 *
 * Spec reference: PLAN-PARTS-003 §6
 * Chrome matches service jobcard-detail-view.tsx (cross-module consistency).
 */

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Part } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import { stockStatusFor, stockStatusToChip } from '../helpers';

export interface PartHeaderProps {
  part: Part;
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function PartHeader({ part }: PartHeaderProps) {
  const stockStatus = stockStatusFor(part);
  const isCriticalChip =
    part.criticality === 'CRITICAL' || part.criticality === 'SAFETY';
  const criticalityLabel = titleCase(part.criticality); // "Critical" / "Safety"

  return (
    <>
      {/* Breadcrumb — ordered list for screen-reader semantics */}
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
          <li
            aria-current="page"
            className="font-mono text-[13px] text-ink-primary"
          >
            {part.partCode}
          </li>
        </ol>
      </nav>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-[28px] font-semibold leading-[1.25] text-ink-primary">
            {part.partCode}
          </h1>
          <p className="mt-1 text-[15px] text-ink-secondary">{part.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StateChip status={stockStatusToChip(stockStatus)} />
            {isCriticalChip && (
              <StateChip status="crit-safety" label={criticalityLabel} />
            )}
            <span className="inline-flex items-center h-5 px-2 rounded bg-bg-subtle text-[11px] uppercase tracking-wide text-ink-secondary">
              {titleCase(part.category)}
            </span>
            <span className="text-ink-muted">·</span>
            <span className="text-[13px] text-ink-secondary">{part.brand}</span>
            <span className="text-ink-muted">·</span>
            <span className="font-mono text-[13px] text-ink-secondary">
              {part.uom}
            </span>
            <span className="text-ink-muted">·</span>
            <span className="font-mono text-[13px] text-ink-secondary">
              HSN {part.hsnCode}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/parts/grn/new"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
              'bg-bg-surface text-sm font-medium text-ink-primary',
              'hover:bg-bg-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            New GRN
          </Link>
          <Link
            href={`/parts/po/new?part=${encodeURIComponent(part.partCode)}`}
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white',
              'text-sm font-medium hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            Raise PO
          </Link>
        </div>
      </div>
    </>
  );
}
