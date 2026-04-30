'use client';

/**
 * Module-level error boundary — SPEC-ARCH-UI-001 §11 (Error Handling).
 *
 * Catches any error inside the /test-drives route subtree.
 * Spec reference: SPEC-TEST-DRIVE-001 §6
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
      moduleName="Test Drives"
      error={error}
      reset={reset}
    />
  );
}
