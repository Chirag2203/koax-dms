/**
 * SavedSearchButton — save the current filter URL as a named search.
 *
 * Authenticated customers can save searches; unauthenticated users see
 * a sign-in prompt.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L5, L13, S12, S13
 */

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark } from 'lucide-react';
import { cn } from '@dms/ui';
import { useAuth } from '@/src/providers/auth-provider';
import { useSavedSearchesStore } from '@/src/lib/storefront/use-saved-searches';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedSearchButtonProps {
  queryString: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SavedSearchButton({ queryString, className }: SavedSearchButtonProps) {
  const t = useTranslations('inventory');
  const { isAuthenticated } = useAuth();
  const save = useSavedSearchesStore((s) => s.save);

  const [state, setState] = React.useState<'idle' | 'naming' | 'saved' | 'unauthenticated'>('idle');
  const [name, setName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Skip render if no active filters
  if (!queryString) return null;

  function handleClick() {
    if (!isAuthenticated) {
      setState('unauthenticated');
      return;
    }
    setState('naming');
    setName('');
    // Focus input on next paint
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSave() {
    if (!name.trim()) return;
    save(name.trim(), queryString);
    setState('saved');
    setTimeout(() => setState('idle'), 2500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setState('idle');
  }

  if (state === 'unauthenticated') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-sm border border-line bg-bg-subtle px-3 py-2',
          className,
        )}
      >
        <span className="font-mono text-xs text-ink-muted">{t('saveSearchSignIn')}</span>
        <a
          href="/sign-in"
          className="font-mono text-xs text-accent underline underline-offset-2 hover:text-accent/80"
        >
          {t('signIn')}
        </a>
        <button
          onClick={() => setState('idle')}
          aria-label="Dismiss"
          className="ml-auto text-ink-muted hover:text-ink-primary"
        >
          <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  if (state === 'naming') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('saveSearchPlaceholder')}
          aria-label={t('saveSearchName')}
          className={cn(
            'flex-1 rounded-sm border border-line bg-bg-paper px-3 py-1.5',
            'font-mono text-xs text-ink-primary placeholder:text-ink-muted',
            'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          )}
          maxLength={60}
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className={cn(
            'rounded-sm border border-accent bg-accent/10 px-3 py-1.5',
            'font-mono text-xs uppercase tracking-widest text-accent',
            'transition-colors hover:bg-accent/20',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {t('save')}
        </button>
        <button
          onClick={() => setState('idle')}
          aria-label="Cancel"
          className="text-ink-muted hover:text-ink-primary"
        >
          <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <span className={cn('flex items-center gap-1.5 font-mono text-xs text-accent', className)}>
        <Bookmark size={12} className="fill-accent" aria-hidden="true" />
        {t('searchSaved')}
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5',
        'font-mono text-xs text-ink-muted hover:text-accent transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm',
        className,
      )}
    >
      <Bookmark size={12} aria-hidden="true" />
      {t('saveSearch')}
    </button>
  );
}
