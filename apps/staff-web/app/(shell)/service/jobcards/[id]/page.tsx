'use client';

import { notFound } from 'next/navigation';
import { useServiceStore } from '@/src/lib/service/service-store';
import { JobCardDetailView } from '@/src/components/service/jobcard-detail-view';

/**
 * Job Card detail page.
 *
 * Reads from the in-memory Zustand store so all mutations (labour, parts,
 * inspection, status changes) are visible without a page refresh.
 *
 * Spec reference: PLAN-SERVICE-002 §P1 store integration
 */

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const jobCard = useServiceStore((s) => s.jobCards.find((jc) => jc.id === params.id));

  if (!jobCard) {
    notFound();
  }

  return <JobCardDetailView jobCard={jobCard} />;
}
