'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
import type { ConsignorMessage } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageComposeProps {
  onMessageSent?: (message: ConsignorMessage) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessageCompose({ onMessageSent }: MessageComposeProps) {
  const t = useTranslations('portal.consignor.messages.compose');
  const [value, setValue] = React.useState('');
  const [toast, setToast] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    if (!value.trim()) return;

    // Create a local dummy message
    const newMessage: ConsignorMessage = {
      id: `msg-local-${Date.now()}`,
      from: 'consignor',
      senderName: 'You',
      subject: '',
      body: value.trim(),
      date: new Date().toISOString(),
      isRead: true,
    };

    onMessageSent?.(newMessage);
    setValue('');

    // Show success toast
    setToast(true);
    setTimeout(() => setToast(false), 3000);

    // Focus textarea after send
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-[var(--color-line)] bg-[var(--color-bg-paper,#fdf9f0)] px-6 md:px-12 lg:px-16 py-4">
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 px-4 py-2 bg-[var(--color-forest,#1F4D3A)]/10 border border-[var(--color-forest,#1F4D3A)]/20 text-[var(--color-forest,#1F4D3A)] font-mono text-[11px] uppercase tracking-widest"
        >
          {t('sent')}
        </div>
      )}

      <div className="flex items-end gap-3">
        <label htmlFor="consignor-compose" className="sr-only">
          {t('label')}
        </label>
        <textarea
          id="consignor-compose"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          rows={2}
          className={[
            'flex-1 border border-[var(--color-line)] bg-[var(--color-bg-elevated,#faf8f2)]',
            'rounded-sm px-4 py-3 text-sm text-[var(--color-ink)]',
            'placeholder:text-[var(--color-ink-muted)] resize-none leading-relaxed',
            'focus:outline-none focus:border-[var(--color-brass)] transition-colors',
          ].join(' ')}
          aria-label={t('label')}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim()}
          className={[
            'flex-shrink-0 flex items-center justify-center',
            'w-10 h-10 border transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
            value.trim()
              ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-white hover:bg-[var(--color-brass)]/90'
              : 'border-[var(--color-line)] text-[var(--color-ink-muted)] cursor-not-allowed',
          ].join(' ')}
          aria-label={t('send')}
        >
          <Send size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
