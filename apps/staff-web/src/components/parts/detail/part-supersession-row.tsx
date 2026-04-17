/**
 * PartSupersessionRow — conditional amber/blue banner card (3 states).
 *
 * States:
 *   A — part is superseded by a part that IS in catalog (amber, linked)
 *   B — part is superseded by a part NOT in catalog (amber, muted, no link)
 *   C — part IS a successor (reverse lookup — blue, linked back)
 *
 * A + C can stack. None visible → component returns null.
 *
 * Spec reference: PLAN-PARTS-003 §8
 */

'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Part } from '@dms/types';
import {
  getPredecessorParts,
  getSuccessorPart,
} from './part-detail-helpers';

export interface PartSupersessionRowProps {
  part: Part;
  allParts: Part[];
}

export function PartSupersessionRow({
  part,
  allParts,
}: PartSupersessionRowProps) {
  const successor = getSuccessorPart(part, allParts);
  const predecessors = getPredecessorParts(part.partCode, allParts);

  if (!successor && predecessors.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {successor && <SuccessorCard successor={successor} />}
      {predecessors.length > 0 && (
        <PredecessorCard predecessors={predecessors} />
      )}
    </div>
  );
}

// ─── State A / B ─────────────────────────────────────────────────────────────

function SuccessorCard({
  successor,
}: {
  successor: ReturnType<typeof getSuccessorPart>;
}) {
  if (!successor) return null;

  const inCatalog = successor.kind === 'in-catalog';

  return (
    <div
      className={cn(
        'rounded-md border border-line bg-bg-surface',
        'border-l-2 border-l-[rgb(var(--state-overdue))]',
        'px-4 py-3 flex items-center gap-3',
      )}
    >
      <AlertTriangle
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[rgb(var(--state-overdue))]"
      />
      <div
        className={cn(
          'text-[13px] flex-1 min-w-0',
          inCatalog ? 'text-ink-secondary' : 'text-ink-muted',
        )}
      >
        Superseded by{' '}
        <span className="font-mono text-ink-primary">{successor.code}</span>
        {successor.name ? (
          <span className="text-ink-secondary"> — {successor.name}</span>
        ) : (
          <span className="text-ink-muted"> (not in catalog yet)</span>
        )}
      </div>
      {inCatalog && (
        <Link
          href={`/parts/${successor.code}`}
          className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          View
          <ArrowRight aria-hidden="true" className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

// ─── State C ─────────────────────────────────────────────────────────────────

function PredecessorCard({ predecessors }: { predecessors: Part[] }) {
  const first = predecessors[0];
  if (!first) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-line bg-bg-surface',
        'border-l-2 border-l-[rgb(var(--state-reserved))]',
        'px-4 py-3 flex items-center gap-3',
      )}
    >
      <RotateCcw
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[rgb(var(--state-reserved))]"
      />
      <div className="text-[13px] flex-1 min-w-0 text-ink-secondary">
        Replaces{' '}
        {predecessors.map((p, i) => (
          <span key={p.partCode}>
            {i > 0 && <span className="text-ink-muted"> · </span>}
            <Link
              href={`/parts/${p.partCode}`}
              className="font-mono text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              {p.partCode}
            </Link>
            <span className="text-ink-secondary"> — {p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
