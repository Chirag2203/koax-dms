/**
 * /reviews — Staff moderation queue.
 *
 * L3:  Status machine: pending-moderation → approved | hidden.
 *      Approve: R10+. Hide: R02+.
 * L13: Outlet-scoped for non-R19+ staff.
 *
 * Spec reference: SPEC-REVIEWS-001 §UI surfaces (moderation queue)
 */

import type { Metadata } from 'next';
import { ReviewsModerationView } from '@/src/components/reviews/reviews-moderation-view';
import { ReviewsStoreHydrator } from '@/src/lib/reviews/reviews-store-hydrator';

export const metadata: Metadata = {
  title: 'Reviews — BN Automobiles DMS',
};

export default function ReviewsPage() {
  return (
    <>
      <ReviewsStoreHydrator />
      <ReviewsModerationView />
    </>
  );
}
