/**
 * AuditView — R23-gated DPO audit view. Full PII access (R23 exempt from L3).
 * SPEC-NOTIFICATIONS-001 §6.5, L3 (R23 DPO exemption), L7 (DSR export)
 *
 * Shows: failed dispatch alerts, full unmasked audit event log, DSR export.
 *
 * ≤200 LoC per spec §11
 */

'use client';

import { useMemo, useState } from 'react';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import { Gate } from '../../primitives/gate';
import { FailedDispatchesAlert } from './failed-dispatches-alert';
import { ExportDsrDialog } from './export-dsr-dialog';
import { ChannelBadge } from '../shared/channel-badge';
import { ModuleBadge } from '../shared/module-badge';
import { Download } from 'lucide-react';
import Link from 'next/link';

function formatAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Kolkata', hour12: false,
    }).format(new Date(iso)).replace(',', '');
  } catch { return iso; }
}

const KIND_LABEL: Record<string, string> = {
  sent: 'Dispatched',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  cancelled: 'Cancelled',
  'consent-blocked': 'Consent blocked',
  'retry-queued': 'Retry queued',
  'template-rejected': 'Template rejected',
  'dsr-export': 'DSR exported',
  'acknowledged-by-dpo': 'Acknowledged by DPO',
};

export function AuditView() {
  const [dsrOpen, setDsrOpen] = useState(false);

  const dispatches = useNotificationsStore((s) => s.dispatches);
  const auditEvents = useNotificationsStore((s) => s.auditEvents);

  const failedDispatches = useMemo(
    () => dispatches.filter((d) => d.status === 'failed'),
    [dispatches],
  );

  // Audit log sorted newest first
  const sortedEvents = useMemo(
    () => [...auditEvents].sort((a, b) => (a.at > b.at ? -1 : 1)),
    [auditEvents],
  );

  // Index dispatches for quick lookup
  const dispatchMap = useMemo(
    () => new Map(dispatches.map((d) => [d.id, d])),
    [dispatches],
  );

  return (
    <Gate
      permission="notifications:audit:view"
      fallback="disable"
      tooltipMessage="DPO access (R23) required to view the full audit log."
    >
      <div className="space-y-6">
        {/* Failed dispatch alerts */}
        {failedDispatches.length > 0 && (
          <FailedDispatchesAlert dispatches={failedDispatches} />
        )}

        {/* Header + DSR export */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Full Audit Event Log</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {sortedEvents.length} events — R23 DPO exempt from L3 PII masking
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDsrOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium border border-line text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Download size={14} aria-hidden="true" />
            Export DSR
          </button>
        </div>

        {/* Audit table */}
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm bg-bg-surface" role="grid" aria-label="Audit event log">
            <thead>
              <tr className="border-b border-line bg-bg-subtle">
                {['Timestamp', 'Event', 'Dispatch', 'Channel', 'Module', 'Recipient', 'Actor', 'Error'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-ink-muted uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-muted">
                    No audit events recorded.
                  </td>
                </tr>
              ) : (
                sortedEvents.map((event) => {
                  const dispatch = dispatchMap.get(event.dispatchId);
                  return (
                    <tr
                      key={event.id}
                      className="border-b border-line hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-ink-muted font-mono tabular-nums whitespace-nowrap">
                        {formatAt(event.at)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-ink-primary whitespace-nowrap">
                        {KIND_LABEL[event.kind] ?? event.kind}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/notifications/${event.dispatchId}`}
                          className="text-accent hover:underline"
                        >
                          {event.dispatchId.slice(-8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {dispatch ? <ChannelBadge channel={dispatch.channel} /> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {dispatch ? <ModuleBadge module={dispatch.module} /> : '—'}
                      </td>
                      {/* R23: full phone visible in DPO view */}
                      <td className="px-4 py-3 text-xs font-mono text-ink-secondary">
                        {dispatch?.recipient.raw ?? dispatch?.recipient.customerId ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted">
                        {event.actorId ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[rgb(var(--state-overdue))] max-w-xs truncate">
                        {event.errorReason ?? '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ExportDsrDialog open={dsrOpen} onClose={() => setDsrOpen(false)} />
      </div>
    </Gate>
  );
}
