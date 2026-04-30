'use client';

/**
 * Shoot detail page error boundary — SPEC-SHOOTS-001
 * Matches the module-level boundary pattern.
 */

import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function ShootDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="Shoot Detail"
      error={error}
      reset={reset}
      backHref="/shoots"
    />
  );
}
