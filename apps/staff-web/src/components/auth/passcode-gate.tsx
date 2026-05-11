'use client';

/**
 * Passcode-entry modal. Renders over a blurred backdrop on /auth/passcode.
 *
 * Submits to POST /api/auth/passcode which:
 *   - Verifies against env.LOGIN_PASSCODE (constant-time compare).
 *   - On success, sets an HttpOnly HMAC-signed cookie.
 *   - On failure, returns 401 after a 1s server-side delay (anti-brute-force).
 *
 * On success we navigate to `nextUrl` (the original path the user tried to
 * visit before being bounced to the passcode page).
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, AlertTriangle, Loader2 } from 'lucide-react';

export interface PasscodeGateProps {
  nextUrl: string;
  configError?: boolean;
}

export function PasscodeGate({ nextUrl, configError = false }: PasscodeGateProps) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    configError
      ? 'Server is not configured. Contact the administrator.'
      : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (passcode.trim().length === 0) {
      setError('Enter the passcode to continue.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        // Cookie is now set server-side. Navigate to the original target.
        // router.refresh() ensures the middleware re-runs with the new cookie.
        router.replace(nextUrl);
        router.refresh();
        return;
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') ?? '60';
        setError(`Too many attempts. Try again in ${retryAfter} seconds.`);
      } else if (res.status === 500) {
        setError('Server is not configured. Contact the administrator.');
      } else {
        setError('Incorrect passcode. Try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-title"
      aria-describedby="passcode-desc"
      className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md rounded-md border border-line bg-bg-surface/95 backdrop-blur-md shadow-2xl">
        <div className="px-8 pt-8 pb-6 border-b border-line">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-10 items-center justify-center rounded-md bg-accent/10">
              <KeyRound
                className="size-5 text-accent"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono uppercase tracking-widest text-ink-muted">
                koax
              </span>
              <span className="text-sm text-ink-secondary">
                Dealer Management System
              </span>
            </div>
          </div>

          <h1
            id="passcode-title"
            className="text-2xl font-semibold text-ink-primary mb-2"
          >
            Restricted access
          </h1>
          <p id="passcode-desc" className="text-sm text-ink-muted leading-relaxed">
            This is a private demo. Enter the access passcode to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="passcode"
              className="block text-xs uppercase tracking-wide text-ink-muted"
            >
              Passcode
            </label>
            <input
              ref={inputRef}
              id="passcode"
              name="passcode"
              type="password"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError(null);
              }}
              disabled={submitting}
              className="block w-full h-10 rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary font-mono tracking-wider placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
              placeholder="••••••••••"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'passcode-error' : undefined}
            />
          </div>

          {error && (
            <div
              id="passcode-error"
              role="alert"
              className="flex items-start gap-2 rounded-md border border-state-danger/40 bg-state-danger/8 px-3 py-2.5"
            >
              <AlertTriangle
                className="size-4 text-state-danger shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-xs text-state-danger leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || passcode.length === 0}
            className="flex w-full items-center justify-center gap-2 h-10 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Verifying…
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <div className="px-8 py-4 border-t border-line bg-bg-subtle/40 rounded-b-md">
          <p className="text-xs text-ink-subtle leading-relaxed">
            Access logged. Sessions expire after 7 days. For credentials, contact
            the administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
