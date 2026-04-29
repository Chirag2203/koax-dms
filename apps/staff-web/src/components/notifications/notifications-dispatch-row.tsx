/**
 * NotificationsDispatchRow — single row in the dispatch log table.
 * SPEC-NOTIFICATIONS-001 §6.1
 * L3: PII always masked in central log (phone, name).
 *
 * ≤100 LoC per spec §11
 */

'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { NotificationDispatch } from '@dms/types';
import { StateChip } from '../primitives/state-chip';
import { ChannelBadge } from './shared/channel-badge';
import { ModuleBadge } from './shared/module-badge';
import { maskPhone } from '../../lib/notifications/pii-redaction';
import type { NotificationStatus } from '@dms/types';

function statusToChip(
  status: NotificationStatus,
): React.ComponentProps<typeof StateChip>['status'] {
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

function formatSentAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: false,
    })
      .format(new Date(iso))
      .replace(',', '');
  } catch {
    return iso;
  }
}

interface NotificationsDispatchRowProps {
  dispatch: NotificationDispatch;
}

export function NotificationsDispatchRow({ dispatch }: NotificationsDispatchRowProps) {
  // L3: phone always masked in central log
  const maskedPhone = dispatch.recipient.raw ? maskPhone(dispatch.recipient.raw) : '—';
  const displayRecipient = dispatch.recipient.customerId
    ? dispatch.recipient.customerId
    : maskedPhone;

  return (
    <tr className="border-b border-line hover:bg-bg-hover transition-colors">
      <td className="px-4 py-3 text-xs text-ink-muted font-mono tabular-nums whitespace-nowrap">
        {formatSentAt(dispatch.sentAt)}
      </td>
      <td className="px-4 py-3">
        <ChannelBadge channel={dispatch.channel} />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/notifications/templates/${dispatch.templateId}`}
          className="text-sm text-accent hover:underline"
        >
          {dispatch.templateName}
        </Link>
      </td>
      <td className="px-4 py-3">
        {/* L3: masked phone */}
        <span className="text-sm text-ink-secondary font-mono">{maskedPhone}</span>
        {dispatch.recipient.customerId && (
          <Link
            href={`/customers/${dispatch.recipient.customerId}`}
            className="block text-xs text-ink-muted hover:text-accent transition-colors"
          >
            {displayRecipient}
          </Link>
        )}
      </td>
      <td className="px-4 py-3">
        <StateChip status={statusToChip(dispatch.status)} />
        {dispatch.retryCount > 0 && (
          <span className="ml-1 text-[10px] text-ink-muted font-mono">
            {dispatch.retryCount}× retry
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <ModuleBadge module={dispatch.module} />
      </td>
      <td className="px-4 py-3 text-xs text-ink-muted font-mono">
        {dispatch.sourceEntityId ? (
          <span>{dispatch.sourceEntityId}</span>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/notifications/${dispatch.id}`}
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          View
          <ExternalLink size={10} aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}
