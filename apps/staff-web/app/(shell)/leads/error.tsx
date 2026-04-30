'use client';
import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';
export default function ModuleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleErrorFallback moduleName="Leads" error={error} reset={reset} />;
}
