'use client';

/**
 * Module-level error boundary for /test-drives/new — CLAUDE.md §17.0
 */

import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function NewTestDriveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="New Test Drive Booking"
      error={error}
      reset={reset}
    />
  );
}
