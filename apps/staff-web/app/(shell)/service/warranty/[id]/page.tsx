'use client';

import { notFound } from 'next/navigation';
import { useServiceStore } from '@/src/lib/service/service-store';
import { WarrantyClaimDetailView } from '@/src/components/service/warranty-claim-detail-view';

/**
 * Warranty claim detail page.
 *
 * Reads live from the Zustand service store so status mutations
 * (approve, reject, mark paid) reflect immediately.
 *
 * Spec reference: PLAN-SERVICE-002 §U14
 */

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const claim = useServiceStore((s) => s.warrantyClaims.find((wc) => wc.id === params.id));

  if (!claim) {
    notFound();
  }

  return <WarrantyClaimDetailView claim={claim} />;
}
