/**
 * Reviews store hydrator — SPEC-REVIEWS-001
 *
 * Seeds the reviews store with fixture data on first render.
 * Pattern matches notifications-store-hydrator and settings-store-hydrator.
 * Mounted in AppShell so Reviews data is available to Reports hub (Seam 28).
 */

'use client';

import { useEffect, useRef } from 'react';
import { reviews } from '@dms/mocks/fixtures';
import { useReviewsStore } from './reviews-store';

export function ReviewsStoreHydrator({
  children,
}: {
  children?: React.ReactNode;
}) {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    useReviewsStore.getState()._seed(reviews);
  }, []);

  return <>{children}</>;
}
