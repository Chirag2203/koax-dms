/**
 * PoTimelineCard — vertical timeline derived from PO timestamps.
 *
 * Spec reference: PLAN-PARTS-006 §10
 */

'use client';

import { useMemo } from 'react';
import type { PurchaseOrder } from '@dms/types';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { staffName, formatDateTime } from '../helpers';
import { deriveTimeline } from './po-detail-helpers';
import { cn } from '@dms/ui';

export interface PoTimelineCardProps {
  po: PurchaseOrder;
}

export function PoTimelineCard({ po }: PoTimelineCardProps) {
  const grns = usePartsStore((s) => s.grns);
  const events = useMemo(() => deriveTimeline(po, grns), [po, grns]);

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Timeline
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-ink-muted">No activity yet.</p>
      ) : (
        <ol className="pl-5 relative before:absolute before:left-[4px] before:top-0 before:bottom-0 before:w-px before:bg-line">
          {events.map((event, idx) => (
            <li key={event.id} className={cn('relative pb-5 last:pb-0')}>
              {/* Bullet */}
              <span
                className={cn(
                  'absolute -left-5 top-[3px] h-2.5 w-2.5 rounded-full border-2',
                  event.isCurrent
                    ? 'border-accent bg-bg-surface'
                    : 'bg-accent border-accent',
                )}
                aria-hidden="true"
              />
              {/* Content */}
              <div className="min-w-0">
                {event.timestamp && (
                  <span className="font-mono text-[11px] text-ink-muted block mb-0.5">
                    {formatDateTime(event.timestamp)}
                    {event.actorId ? ` · ${staffName(event.actorId)}` : ''}
                  </span>
                )}
                <span
                  className={cn(
                    'text-[13px] font-medium',
                    event.isTerminal
                      ? 'text-[rgb(var(--state-overdue))]'
                      : event.isCurrent
                        ? 'text-accent'
                        : 'text-ink-primary',
                  )}
                >
                  {event.label}
                </span>
                {event.sub && (
                  <p className="text-[12px] text-ink-muted mt-0.5 italic">
                    &quot;{event.sub}&quot;
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
