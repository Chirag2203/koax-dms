/**
 * ModuleErrorFallback — canonical UI for module-level error.tsx boundaries.
 *
 * Used by every `app/(shell)/<module>/error.tsx` so that a crash in any
 * module renders a consistent recoverable surface — the rest of the app
 * (sidebar, top bar, other modules) stays alive.
 *
 * Per SPEC-ARCH-UI-001 §4 (Card primitive) + §10 (toast vs dialog rules):
 * uses Card-style border + rounded-md + canonical Button primitive. No
 * arbitrary `text-[NNpx]`. Every CTA wired (per CLAUDE.md §10 #15).
 *
 * Layered with `app/global-error.tsx` (last-resort) and
 * `app/(shell)/error.tsx` (shell-level). This component is for L3
 * module-level boundaries.
 *
 * Usage:
 *   // app/(shell)/finance/error.tsx
 *   'use client';
 *   import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';
 *   export default function FinanceError({ error, reset }: ErrorProps) {
 *     return <ModuleErrorFallback moduleName="Finance" error={error} reset={reset} />;
 *   }
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCw, LayoutDashboard } from 'lucide-react';
import { Button } from './button';

export interface ModuleErrorFallbackProps {
  /** Display name of the module (e.g., "Finance", "Custom Builds"). */
  moduleName: string;
  /** The thrown error — provided by Next.js to the error.tsx boundary. */
  error: Error & { digest?: string };
  /** Reset function provided by Next.js — re-renders the route segment. */
  reset: () => void;
  /**
   * Optional path to "back" link. Defaults to /dashboard. Set to null to
   * hide the back link entirely.
   */
  backHref?: string | null;
}

const isProd = process.env.NODE_ENV === 'production';

export function ModuleErrorFallback({
  moduleName,
  error,
  reset,
  backHref = '/dashboard',
}: ModuleErrorFallbackProps) {
  // Log to console for dev visibility. In production this is where a
  // Sentry / Datadog hook would attach (per Doc 12 §observability — v1.5).
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(`[${moduleName}] module crashed:`, error);
  }, [error, moduleName]);

  return (
    <div className="px-6 py-8">
      <div className="rounded-md border border-line bg-bg-surface p-6 max-w-2xl">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-state-danger/10"
            aria-hidden="true"
          >
            <AlertCircle className="h-5 w-5 text-state-danger" />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-ink-primary">
              Something went wrong in {moduleName}
            </h1>
            <p className="text-sm text-ink-secondary mt-1">
              The rest of the app is still working. You can try this module
              again or go back to the dashboard. If the problem persists,
              please share the digest below with support.
            </p>

            {/* Error details */}
            <div className="mt-4 rounded-md border border-line bg-bg-subtle p-3 font-mono text-xs text-ink-muted break-all">
              {!isProd && error.message ? (
                <>
                  <div className="text-ink-secondary">{error.message}</div>
                  {error.digest && (
                    <div className="mt-1">digest: {error.digest}</div>
                  )}
                </>
              ) : error.digest ? (
                <>digest: {error.digest}</>
              ) : (
                <>An unexpected error occurred.</>
              )}
            </div>

            {/* Actions — every CTA wired (CLAUDE.md §10 #15) */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="md"
                onClick={reset}
                leadingIcon={<RotateCw className="h-4 w-4" aria-hidden="true" />}
              >
                Try again
              </Button>
              {backHref && (
                <Link
                  href={backHref}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-bg-surface text-ink-primary border border-line hover:bg-bg-subtle text-sm font-medium gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Back to dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
