'use client';

/**
 * Module-level error boundary — SPEC-ARCH-UI-001 §11 (Error Handling).
 *
 * Catches errors inside the /reviews route subtree. The staff shell
 * (sidebar, top bar, other modules) stays alive.
 */

import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function ReviewsModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="Reviews"
      error={error}
      reset={reset}
    />
  );
}
