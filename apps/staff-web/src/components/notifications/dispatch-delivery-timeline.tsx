/**
 * DispatchDeliveryTimeline — ordered audit event list for a single dispatch.
 * SPEC-NOTIFICATIONS-001 §6.2
 *
 * Events shown newest-first. Each event shows the kind, timestamp, and any
 * extra context (errorReason, actorId).
 *
 * ≤120 LoC per spec §11
 */

'use client';

import type { NotificationAuditEvent } from '@dms/types';

const KIND_LABEL: Record<NotificationAuditEvent['kind'], string> = {
  sent: 'Dispatched',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Delivery failed',
  cancelled: 'Cancelled',
  'consent-blocked': 'Blocked — consent revoked',
  'retry-queued': 'Retry queued',
  'template-rejected': 'DLT template rejected',
  'dsr-export': 'DSR exported',
  'acknowledged-by-dpo': 'Acknowledged by DPO',
};

const KIND_COLOR: Partial<Record<NotificationAuditEvent['kind'], string>> = {
  delivered: 'bg-[rgb(var(--state-active))]',
  read: 'bg-[rgb(var(--state-active))]',
  failed: 'bg-[rgb(var(--state-overdue))]',
  cancelled: 'bg-[rgb(var(--ink-muted))]',
  'consent-blocked': 'bg-[rgb(var(--state-overdue))]',
  'template-rejected': 'bg-[rgb(var(--state-overdue))]',
};

function formatAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: false,
    })
      .format(new Date(iso))
      .replace(',', '');
  } catch {
    return iso;
  }
}

interface DispatchDeliveryTimelineProps {
  events: NotificationAuditEvent[];
}

export function DispatchDeliveryTimeline({ events }: DispatchDeliveryTimelineProps) {
  // Newest-first
  const sorted = [...events].sort((a, b) => (a.at > b.at ? -1 : 1));

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-ink-muted py-4 text-center">No events recorded</p>
    );
  }

  return (
    <ol className="space-y-3" aria-label="Delivery timeline">
      {sorted.map((event) => (
        <li key={event.id} className="flex items-start gap-3">
          {/* Dot */}
          <span
            className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${KIND_COLOR[event.kind] ?? 'bg-accent'}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink-primary">
                {KIND_LABEL[event.kind] ?? event.kind}
              </span>
              <span className="text-xs text-ink-muted font-mono tabular-nums flex-shrink-0">
                {formatAt(event.at)}
              </span>
            </div>
            {event.errorReason && (
              <p className="text-xs text-[rgb(var(--state-overdue))] mt-0.5 break-words">
                {event.errorReason}
              </p>
            )}
            {event.actorId && (
              <p className="text-xs text-ink-muted mt-0.5">
                By {event.actorId}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
