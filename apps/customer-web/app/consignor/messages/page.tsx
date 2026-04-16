'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { consignorMessages } from '@dms/mocks/fixtures';
import type { ConsignorMessage } from '@dms/types/domain';
import { MessageThread } from '@/src/components/consignor/messages/message-thread';
import { MessageCompose } from '@/src/components/consignor/messages/message-compose';

export default function ConsignorMessagesPage() {
  const t = useTranslations('portal.consignor.messages');
  const [messages, setMessages] = React.useState<ConsignorMessage[]>(consignorMessages);

  function handleMessageSent(newMessage: ConsignorMessage) {
    setMessages((prev) => [...prev, newMessage]);
  }

  return (
    <div className="max-w-5xl flex flex-col min-h-[calc(100vh-4rem)]">
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8 flex-shrink-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CONSIGNOR PORTAL
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-[var(--color-ink)] leading-[1.1] mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-[var(--color-ink-secondary)] leading-relaxed max-w-xl">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* ── Message thread ────────────────────────────────────────────────────── */}
      <div className="flex-1 pb-4">
        <MessageThread messages={messages} />
      </div>

      {/* ── Compose bar (sticky bottom) ───────────────────────────────────────── */}
      <MessageCompose onMessageSent={handleMessageSent} />
    </div>
  );
}
