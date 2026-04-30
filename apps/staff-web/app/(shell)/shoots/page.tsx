/**
 * Shoots queue page — SPEC-SHOOTS-001 §6
 * Route: /shoots
 *
 * Stage tabs: Pending / Scheduled / In-Progress / Completed
 * L9: Filter state via URL search params (tab param).
 */

import { Suspense } from 'react';
import { ShootsQueueView } from '@/src/components/shoots/shoots-queue-view';
import { ShootsStoreHydrator } from '@/src/lib/shoots/shoots-store-hydrator';

interface SearchParams {
  tab?: string;
}

export default async function ShootsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? 'pending';

  return (
    <>
      <ShootsStoreHydrator />
      <Suspense fallback={null}>
        <ShootsQueueView activeTab={tab} />
      </Suspense>
    </>
  );
}
