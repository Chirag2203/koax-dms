/**
 * Shoot detail page — SPEC-SHOOTS-001 §6
 * Route: /shoots/[id]
 *
 * Photographer assignment, shoot status management, asset grid, completion checklist.
 */

import { Suspense } from 'react';
import { ShootDetailView } from '@/src/components/shoots/shoot-detail-view';
import { ShootsStoreHydrator } from '@/src/lib/shoots/shoots-store-hydrator';

export default async function ShootDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <ShootsStoreHydrator />
      <Suspense fallback={null}>
        <ShootDetailView shootId={id} />
      </Suspense>
    </>
  );
}
