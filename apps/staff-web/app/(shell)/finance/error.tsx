'use client';

/**
 * Module-level error boundary — SPEC-ARCH-UI-001 §11 (Error Handling).
 *
 * Catches any error inside the /finance route subtree. The
 * staff-web shell (sidebar + top bar + other modules) stays alive — only
 * this module's content is replaced with a recoverable fallback.
 *
 * Receives `error` and `reset` from Next.js per App Router convention.
 */

import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="Finance"
      error={error}
      reset={reset}
    />
  );
}
