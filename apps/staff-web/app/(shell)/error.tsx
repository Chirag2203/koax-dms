'use client';

/**
 * Shell-level error boundary — SPEC-ARCH-UI-001 §11 (Error Handling) L2.
 *
 * Catches errors that escape the per-module boundaries OR errors thrown in
 * the shell layout itself. Sidebar + top bar are still rendered (the shell
 * layout rendered before this boundary tripped); only the main content
 * area shows the fallback.
 *
 * Errors at this level are usually app-shell bugs (auth provider, theme
 * provider, command palette). Last layer before global-error.tsx.
 */

import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="this page"
      error={error}
      reset={reset}
    />
  );
}
