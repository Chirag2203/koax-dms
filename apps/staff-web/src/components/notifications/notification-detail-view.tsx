/**
 * NotificationDetailView — full dispatch record.
 * SPEC-NOTIFICATIONS-001 §6.2
 *
 * Header card, template card, recipient card (L3 masking),
 * consent snapshot card (L18), delivery timeline, source link.
 *
 * ≤220 LoC per spec §11
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useNotificationsStore } from '../../lib/notifications/notifications-store';
import { Card, Field } from '../custom-builds/shared/detail-card';
import { StateChip } from '../primitives/state-chip';
import { ChannelBadge } from './shared/channel-badge';
import { ModuleBadge } from './shared/module-badge';
import { DispatchDeliveryTimeline } from './dispatch-delivery-timeline';
import { maskPhone } from '../../lib/notifications/pii-redaction';
import type { NotificationStatus } from '@dms/types';

function statusToChip(status: NotificationStatus): React.ComponentProps<typeof StateChip>['status'] {
  const map: Record<NotificationStatus, React.ComponentProps<typeof StateChip>['status']> = {
    queued: 'notif-queued',
    sent: 'notif-sent',
    delivered: 'notif-delivered',
    read: 'notif-read',
    failed: 'notif-failed',
    'opted-out': 'notif-opted-out',
    cancelled: 'notif-cancelled',
  };
  return map[status];
}

function formatAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: false,
    }).format(new Date(iso)).replace(',', '');
  } catch { return iso; }
}

interface NotificationDetailViewProps {
  dispatchId: string;
}

export function NotificationDetailView({ dispatchId }: NotificationDetailViewProps) {
  const dispatches = useNotificationsStore((s) => s.dispatches);
  const templates = useNotificationsStore((s) => s.templates);
  const auditEvents = useNotificationsStore((s) => s.auditEvents);

  const dispatch = useMemo(() => dispatches.find((d) => d.id === dispatchId), [dispatches, dispatchId]);
  const template = useMemo(
    () => dispatch ? templates.find((t) => t.id === dispatch.templateId) : undefined,
    [templates, dispatch],
  );
  const events = useMemo(
    () => auditEvents.filter((e) => e.dispatchId === dispatchId),
    [auditEvents, dispatchId],
  );

  if (!dispatch) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-ink-muted">Dispatch record not found.</p>
      </div>
    );
  }

  const maskedPhone = dispatch.recipient.raw ? maskPhone(dispatch.recipient.raw) : '—';

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card
        title="Dispatch"
        rightSlot={<StateChip status={statusToChip(dispatch.status)} />}
      >
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Dispatch ID" value={<span className="font-mono text-xs">{dispatch.id}</span>} />
          <Field label="Sent at" value={formatAt(dispatch.sentAt)} />
          <Field label="Channel" value={<ChannelBadge channel={dispatch.channel} />} />
          <Field label="Module" value={<ModuleBadge module={dispatch.module} />} />
          {dispatch.retryCount > 0 && (
            <Field label="Retries" value={`${dispatch.retryCount}× retry`} />
          )}
          {dispatch.errorReason && (
            <Field
              label="Error"
              value={<span className="text-[rgb(var(--state-overdue))]">{dispatch.errorReason}</span>}
            />
          )}
          {dispatch.providerMessageId && (
            <Field
              label="Provider ID"
              value={<span className="font-mono text-xs">{dispatch.providerMessageId}</span>}
            />
          )}
        </dl>
      </Card>

      {/* Template card */}
      <Card title="Template">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field
            label="Template"
            value={
              <Link
                href={`/notifications/templates/${dispatch.templateId}`}
                className="text-accent hover:underline inline-flex items-center gap-1"
              >
                {dispatch.templateName}
                <ExternalLink size={10} aria-hidden="true" />
              </Link>
            }
          />
          <Field
            label="DLT ID"
            value={
              template?.dltTemplateId ? (
                <span className="font-mono text-xs">{template.dltTemplateId}</span>
              ) : (
                '—'
              )
            }
          />
          {Object.entries(dispatch.variables).length > 0 && (
            <div className="col-span-full">
              <dt className="text-xs text-ink-muted uppercase tracking-wider mb-2">Variables</dt>
              <dd className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(dispatch.variables).map(([key, val]) => (
                  <div key={key} className="rounded-md border border-line bg-bg-subtle px-2 py-1.5">
                    <span className="block text-xs text-ink-muted font-mono uppercase">{key}</span>
                    <span className="text-xs text-ink-primary">{val}</span>
                  </div>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Recipient card — L3: phone masked */}
      <Card title="Recipient">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Phone (masked)" value={<span className="font-mono">{maskedPhone}</span>} />
          {dispatch.recipient.customerId && (
            <Field
              label="Customer"
              value={
                <Link
                  href={`/customers/${dispatch.recipient.customerId}`}
                  className="text-accent hover:underline inline-flex items-center gap-1"
                >
                  {dispatch.recipient.customerId}
                  <ExternalLink size={10} aria-hidden="true" />
                </Link>
              }
            />
          )}
        </dl>
      </Card>

      {/* Consent snapshot card — L18: frozen at dispatch time */}
      {dispatch.consentSnapshot && (
        <Card title="Consent Snapshot (L18 — frozen at dispatch)">
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Purpose" value={dispatch.consentSnapshot.purpose} />
            <Field label="Captured at" value={formatAt(dispatch.consentSnapshot.capturedAt)} />
            <Field label="Captured by" value={dispatch.consentSnapshot.capturedBy} />
            <Field label="Source" value={dispatch.consentSnapshot.source} />
          </dl>
        </Card>
      )}

      {/* Source entity card */}
      {dispatch.sourceEntityId && (
        <Card title="Source">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Entity type" value={dispatch.sourceEntityType ?? '—'} />
            <Field
              label="Entity ID"
              value={<span className="font-mono text-xs">{dispatch.sourceEntityId}</span>}
            />
          </dl>
        </Card>
      )}

      {/* Delivery timeline */}
      <Card title="Delivery Timeline">
        <DispatchDeliveryTimeline events={events} />
      </Card>
    </div>
  );
}
