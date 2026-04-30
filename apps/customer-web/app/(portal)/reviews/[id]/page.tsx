/**
 * /reviews/[id] — Customer NPS review submission page.
 *
 * L1:  NPS 0–10 picker.
 * L9:  Free text optional (max 1,000 chars).
 * L10: One review per (customerId, vinOrJcId) — enforced in store.
 * L14: Review record ID is pre-minted; link comes from portal notification.
 *
 * v1: Uses fixture reviews to check if already submitted.
 * No real auth in v1 — uses mock customer context.
 *
 * Spec reference: SPEC-REVIEWS-001 §UI surfaces (customer portal submit page)
 */

import type { Metadata } from 'next';
import { NpsSubmitView } from '@/src/components/portal/reviews/nps-submit-view';

export const metadata: Metadata = {
  title: 'Share Your Experience — BN Automobiles',
};

interface ReviewPageProps {
  params: { id: string };
}

export default function ReviewPage({ params }: ReviewPageProps) {
  return <NpsSubmitView reviewId={params.id} />;
}
