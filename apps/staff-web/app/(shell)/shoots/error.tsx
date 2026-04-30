'use client';

/**
 * Module-level error boundary — SPEC-SHOOTS-001 (Error Handling).
 *
 * Catches any error inside the /shoots route subtree. The staff-web shell
 * (sidebar, top bar, other modules) stays alive — only this module's content
 * is replaced with a recoverable fallback.
 *
 * Per SPEC-ARCH-UI-001 §11 L4: uses ModuleErrorFallback primitive.
 */

import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function ShootsModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="Shoots"
      error={error}
      reset={reset}
    />
  );
}
