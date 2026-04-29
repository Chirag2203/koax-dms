'use client';

/**
 * DocumentActivityFeed — chronological DocumentAccessEvent feed.
 *
 * Separate renderer (L33) — NOT merged into buildVehicleTimeline.
 * Shows: actor + kind + filename + timestamp + purpose chip (S-V3-24).
 * R09+ required — gated in parent via Gate.
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, L33, S-V3-24
 * LoC budget: ≤160
 */

import {
  Upload, RefreshCw, Trash2, Download, Pencil, Circle,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { DocumentAccessEvent, DocumentAccessKind } from '@dms/types';

// ─── Icon + label maps ────────────────────────────────────────────────────────

const KIND_ICON: Record<DocumentAccessKind, React.ElementType> = {
  UPLOAD:   Upload,
  REPLACE:  RefreshCw,
  DELETE:   Trash2,
  DOWNLOAD: Download,
  UPDATE:   Pencil,
};

const KIND_LABEL: Record<DocumentAccessKind, string> = {
  UPLOAD:   'Uploaded',
  REPLACE:  'Replaced',
  DELETE:   'Deleted',
  DOWNLOAD: 'Downloaded',
  UPDATE:   'Updated metadata',
};

const PURPOSE_LABEL: Record<string, string> = {
  CUSTOMER_HANDOFF: 'Customer handoff',
  AUDIT:            'Audit',
  RTO_FILING:       'RTO filing',
  OTHER:            'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diffMs / 86_400_000);
  if (d === 0) {
    const h = Math.floor(diffMs / 3_600_000);
    return h === 0 ? 'just now' : `${h}h ago`;
  }
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getFileName(event: DocumentAccessEvent): string {
  const p = event.payload as Record<string, unknown> | undefined;
  if (p?.['fileName']) return String(p['fileName']);
  return `doc-${event.docId.slice(-6)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocumentActivityFeedProps {
  events: DocumentAccessEvent[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentActivityFeed({ events }: DocumentActivityFeedProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-ink-muted text-center py-6">
        No document activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const Icon = KIND_ICON[event.kind] ?? Circle;
        const label = KIND_LABEL[event.kind] ?? event.kind;
        const fileName = getFileName(event);
        const isLast = i === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                'bg-bg-subtle border border-line text-ink-secondary',
              )}>
                <Icon className="h-3 w-3" aria-hidden="true" />
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-line mt-1" style={{ minHeight: 12 }} />
              )}
            </div>

            {/* Content */}
            <div className="pb-3 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink-primary leading-snug">
                    {label}
                    {' '}
                    <span className="font-normal text-ink-secondary truncate">
                      {fileName}
                    </span>
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {event.actorId}
                    {' · '}
                    <span title={event.at}>{formatRelative(event.at)}</span>
                  </p>
                </div>

                {/* Purpose chip — shown on DOWNLOAD events (S-V3-24) */}
                {event.kind === 'DOWNLOAD' && event.purpose && (
                  <span className={cn(
                    'shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                    'bg-[rgb(var(--state-draft)/0.12)] text-[rgb(var(--state-draft))] border-[rgb(var(--state-draft)/0.25)]',
                  )}>
                    {PURPOSE_LABEL[event.purpose] ?? event.purpose}
                  </span>
                )}
              </div>

              {/* Blocked-by-sale note */}
              {event.kind === 'DELETE' &&
               Boolean((event.payload as Record<string, unknown> | undefined)?.['blockedByClosedSaleId']) && (
                <p className="text-[11px] text-[rgb(var(--state-overdue))] mt-0.5">
                  Blocked — linked to closed sale
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
