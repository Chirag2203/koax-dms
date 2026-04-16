'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import type { ConsignorMessage } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecentMessagesPreviewProps {
  messages: ConsignorMessage[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(dateStr))
    .toUpperCase();
}

// ─── Message row ──────────────────────────────────────────────────────────────

function MessageRow({ message }: { message: ConsignorMessage }) {
  const t = useTranslations('portal.consignor.dashboard.recentMessages');
  const isUnread = !message.isRead;

  return (
    <div
      className={[
        'flex items-start gap-4 py-4 first:pt-0 last:pb-0',
        isUnread ? 'opacity-100' : 'opacity-80',
      ].join(' ')}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 mt-1.5">
        <span
          className={[
            'w-1.5 h-1.5 rounded-full block',
            isUnread ? 'bg-[var(--color-brass)]' : 'bg-transparent',
          ].join(' ')}
          aria-label={isUnread ? t('unread') : undefined}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
            {t('from')} {message.from === 'advisor' ? 'BN Advisor' : 'You'}
          </p>
          <time
            dateTime={message.date}
            className="font-mono text-[10px] text-[var(--color-ink-muted)] whitespace-nowrap flex-shrink-0"
          >
            {formatDate(message.date)}
          </time>
        </div>
        <p className="font-display text-base text-[var(--color-ink)] leading-snug truncate">
          {message.subject}
        </p>
        <p className="text-sm text-[var(--color-ink-secondary)] mt-0.5 line-clamp-1">
          {message.body}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentMessagesPreview({ messages }: RecentMessagesPreviewProps) {
  const t = useTranslations('portal.consignor.dashboard.recentMessages');
  const recent = messages.slice(0, 3);

  return (
    <section className="px-6 md:px-12 lg:px-16 py-8 pb-16">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl md:text-3xl text-[var(--color-ink)]">
          {t('title')}
        </h2>
        <Link
          href="/consignor/messages"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          {t('viewAll')}
          <ArrowRight size={11} aria-hidden="true" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="font-display text-lg italic text-[var(--color-ink-secondary)] py-4">
          {t('empty')}
        </p>
      ) : (
        <div className="border border-[var(--color-line)] divide-y divide-[var(--color-line)] px-5">
          {recent.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </section>
  );
}
