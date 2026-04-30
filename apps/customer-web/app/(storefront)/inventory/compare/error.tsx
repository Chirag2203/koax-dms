/**
 * Error boundary for the /inventory/compare route.
 *
 * Per §17.0 — every module must have error.tsx.
 */

'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-32 text-center">
      <span className="mb-4 block font-mono text-xs uppercase tracking-widest text-accent">
        Something went wrong
      </span>
      <h1 className="mb-4 font-display text-4xl italic tracking-tighter text-ink-primary">
        Unable to load comparison
      </h1>
      <p className="mb-8 font-mono text-sm text-ink-muted max-w-sm mx-auto leading-relaxed">
        {error.message || 'The comparison could not be loaded. Please return to inventory and try again.'}
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-sm border border-accent bg-accent/10 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-accent transition-colors hover:bg-accent/20"
        >
          <RefreshCw size={12} aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/inventory"
          className="flex items-center gap-2 font-mono text-xs text-ink-muted underline underline-offset-2 hover:text-ink-primary transition-colors"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          Back to inventory
        </Link>
      </div>
    </div>
  );
}
