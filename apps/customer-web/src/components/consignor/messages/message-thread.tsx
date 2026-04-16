'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { ConsignorMessage } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageThreadProps {
  messages: ConsignorMessage[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

// ─── Single message bubble ────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ConsignorMessage }) {
  const t = useTranslations('portal.consignor.messages');
  const isAdvisor = message.from === 'advisor';
  const isUnread = !message.isRead;

  return (
    <div
      className={[
        'flex gap-3',
        isAdvisor ? 'justify-start' : 'justify-end',
      ].join(' ')}
    >
      <div
        className={[
          'max-w-[85%] md:max-w-[70%]',
          isAdvisor ? '' : 'flex flex-col items-end',
        ].join(' ')}
      >
        {/* Sender + date */}
        <div
          className={[
            'flex items-center gap-2 mb-1.5',
            isAdvisor ? 'justify-start' : 'justify-end',
          ].join(' ')}
        >
          {/* Unread brass dot */}
          {isUnread && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-brass)] flex-shrink-0"
              aria-label="Unread"
            />
          )}
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ink-muted)]">
            {isAdvisor ? t('advisor') : t('you')}
          </span>
          {isAdvisor && message.from === 'advisor' && (
            <span className="font-mono text-[9px] text-[var(--color-ink-muted)]">
              · BN AUTOMOBILES
            </span>
          )}
          <time
            dateTime={message.date}
            className="font-mono text-[9px] text-[var(--color-ink-muted)]"
          >
            {formatDateTime(message.date)}
          </time>
        </div>

        {/* Message card */}
        <div
          className={[
            'px-4 py-4 border',
            isAdvisor
              ? 'border-[var(--color-line)] bg-[var(--color-bg-subtle,#f3f1ea)]'
              : 'border-[var(--color-brass)]/20 bg-[var(--color-brass)]/5',
          ].join(' ')}
        >
          {/* Subject */}
          {message.subject && (
            <p className="font-display text-base font-medium text-[var(--color-ink)] leading-snug mb-2">
              {message.subject}
            </p>
          )}
          {/* Body */}
          <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed whitespace-pre-line">
            {message.body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessageThread({ messages }: MessageThreadProps) {
  const t = useTranslations('portal.consignor.messages');

  // Sorted oldest to newest (newest at bottom)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="px-6 md:px-12 lg:px-16 py-16 text-center">
        <p className="font-display text-lg italic text-[var(--color-ink-secondary)] mb-2">
          {t('empty')}
        </p>
        <p className="text-sm text-[var(--color-ink-muted)]">{t('emptyHint')}</p>
      </div>
    );
  }

  return (
    <div
      className="px-6 md:px-12 lg:px-16 py-6 space-y-6"
      role="log"
      aria-label="Message thread"
      aria-live="polite"
    >
      {sorted.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
