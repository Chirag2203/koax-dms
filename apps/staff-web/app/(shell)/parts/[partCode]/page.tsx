'use client';

import { notFound } from 'next/navigation';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { PartDetailView } from '@/src/components/parts/detail/part-detail-view';

/**
 * Part Detail page.
 *
 * Reads the in-memory Zustand store so any mutations (P5+ stock adjustments,
 * GRN posting updating qty/avgCost) show up without a refresh.
 *
 * `params` is a PLAIN OBJECT (not `Promise<...>`). Next 14 App Router; matches
 * the pattern used by service/jobcards/[id]/page.tsx. S4 bug tracker called
 * this out three times across the service module.
 *
 * Spec reference: PLAN-PARTS-003 §1, §2
 */

interface PageProps {
  params: { partCode: string };
}

export default function Page({ params }: PageProps) {
  // `.find()` on a selector is safe (returns a stable reference — unlike
  // `.filter()` which creates a new array each render and re-renders).
  const part = usePartsStore((s) =>
    s.parts.find((p) => p.partCode === params.partCode),
  );

  if (!part) {
    notFound();
  }

  return <PartDetailView part={part} />;
}
