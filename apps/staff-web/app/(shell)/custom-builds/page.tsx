import { Suspense } from 'react';
import { CustomBuildsBoard } from '@/src/components/custom-builds/board/custom-builds-board';

/**
 * /custom-builds — Build Jobs Kanban board + list toggle.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §5, P1.1 L18
 */
export default function CustomBuildsPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-64 bg-bg-subtle rounded animate-pulse" /></div>}>
      <CustomBuildsBoard />
    </Suspense>
  );
}
