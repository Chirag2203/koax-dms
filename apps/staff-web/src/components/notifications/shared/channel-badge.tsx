/**
 * ChannelBadge — colour-coded chip for NotificationChannel.
 * SPEC-NOTIFICATIONS-001 §6.1 (dispatch table)
 * SPEC-ARCH-UI-001 §3.12 (canonical chip pattern)
 */

'use client';

import type { NotificationChannel } from '@dms/types';

interface ChannelBadgeProps {
  channel: NotificationChannel;
}

// Approved color map — all use state-* token pattern per SPEC-ARCH-UI-001 §9
const CHANNEL_CONFIG: Record<
  NotificationChannel,
  { label: string; dot: string; chip: string }
> = {
  WHATSAPP: {
    label: 'WhatsApp',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  SMS: {
    label: 'SMS',
    dot: 'bg-[rgb(var(--state-refurb))]',
    chip: 'bg-[rgb(var(--state-refurb)/0.1)] text-[rgb(var(--state-refurb))]',
  },
  EMAIL: {
    label: 'Email',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  PUSH: {
    label: 'Push',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
};

export function ChannelBadge({ channel }: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channel];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs uppercase tracking-widest ${config.chip}`}
      aria-label={`Channel: ${config.label}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
