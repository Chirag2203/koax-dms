'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

// ─── Types ─────────────────────────────────────────────────────────────────────

type FormState = 'idle' | 'loading' | 'success';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Journal Newsletter ────────────────────────────────────────────────────────

export function JournalNewsletter() {
  const t = useTranslations('journal');
  const tf = useTranslations('footer.newsletter');

  const [email, setEmail] = React.useState('');
  const [state, setState] = React.useState<FormState>('idle');
  const [validationError, setValidationError] = React.useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError('');

    if (!EMAIL_RE.test(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setState('loading');
    await new Promise((resolve) => setTimeout(resolve, 500));
    setState('success');
    setEmail('');
  }

  return (
    <section
      aria-label="Newsletter signup"
      className="bg-bg-subtle px-6 py-16 text-center md:px-12 md:py-24 lg:px-24"
    >
      <h2 className="mb-4 font-display text-3xl font-normal">
        {t('newsletter.title')}
      </h2>
      <p className="mx-auto mb-10 max-w-md text-ink-secondary">
        {t('newsletter.subtitle')}
      </p>

      {state === 'success' ? (
        <p
          role="status"
          aria-live="polite"
          className="font-mono text-xs uppercase tracking-widest text-accent"
        >
          {t('newsletter.success')}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-label="Newsletter subscription"
          className="mx-auto flex max-w-md flex-col gap-4 md:flex-row"
        >
          <div className="flex-1">
            <label htmlFor="journal-email" className="sr-only">
              {tf('placeholder')}
            </label>
            <input
              id="journal-email"
              type="email"
              autoComplete="email"
              placeholder={tf('placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'loading'}
              aria-describedby={validationError ? 'journal-email-err' : undefined}
              className="w-full border-0 border-b border-line bg-transparent pb-3 font-mono text-sm text-ink-primary placeholder-ink-muted focus:border-accent focus:outline-none disabled:opacity-50"
            />
            {validationError && (
              <p
                id="journal-email-err"
                role="alert"
                className="mt-1 text-left font-mono text-[10px] text-danger"
              >
                {validationError}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={state === 'loading'}
            className="shrink-0 rounded-full bg-ink-primary px-8 py-3 font-mono text-[10px] uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {state === 'loading' ? '...' : tf('subscribe')}
          </button>
        </form>
      )}

      <p className="mt-4 font-mono text-[10px] leading-relaxed text-ink-muted">
        {tf('consent')}
      </p>
    </section>
  );
}
