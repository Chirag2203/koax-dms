'use client';

/**
 * Module-level error boundary — SPEC-ARCH-UI-001 §11 (Error Handling).
 * SPEC-INVENTORY-AGING-001 §9 (CLAUDE.md §17.0 contract).
 *
 * Catches any error inside the /inventory-aging route subtree. The
 * staff-web shell (sidebar + top bar + other modules) stays alive — only
 * this module's content is replaced with a recoverable fallback.
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
      moduleName="Inventory Aging"
      error={error}
      reset={reset}
    />
  );
}
