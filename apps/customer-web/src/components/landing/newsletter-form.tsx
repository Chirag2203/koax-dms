'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

// ─── Newsletter Form ──────────────────────────────────────────────────────────

type FormState = 'idle' | 'loading' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm() {
  const t = useTranslations('footer.newsletter');
  const [email, setEmail] = React.useState('');
  const [state, setState] = React.useState<FormState>('idle');
  const [validationError, setValidationError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError('');

    if (!EMAIL_RE.test(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setState('loading');

    // Simulated success — no real API call in the mocked phase
    await new Promise((resolve) => setTimeout(resolve, 500));

    setState('success');
    setEmail('');
  };

  if (state === 'success') {
    return (
      <p
        role="status"
        aria-live="polite"
        className="font-mono text-xs uppercase tracking-widest text-accent"
      >
        Thank you. Expect quarterly dispatches.
      </p>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Newsletter subscription"
      >
        <div className="flex items-end border-b border-stone-800 pb-2">
          <label htmlFor="newsletter-email" className="sr-only">
            {t('placeholder')}
          </label>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            placeholder={t('placeholder').toUpperCase()}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'loading'}
            className="w-full bg-transparent p-0 font-mono text-xs uppercase tracking-widest text-stone-400 placeholder-stone-700 focus:outline-none disabled:opacity-50"
            aria-describedby={validationError ? 'newsletter-error' : undefined}
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className="ml-4 shrink-0 font-mono text-xs uppercase tracking-widest text-accent transition-opacity hover:opacity-70 disabled:opacity-40"
          >
            {state === 'loading' ? '...' : t('subscribe')}
          </button>
        </div>

        {validationError && (
          <p
            id="newsletter-error"
            role="alert"
            className="mt-2 font-mono text-[10px] uppercase tracking-widest text-danger"
          >
            {validationError}
          </p>
        )}
      </form>

      {/* Consent text */}
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-stone-600">
        {t('consent')}
      </p>
    </div>
  );
}
