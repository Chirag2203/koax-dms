'use client';

import { notFound } from 'next/navigation';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { GrnDetailView } from '@/src/components/parts/grn-detail';

/**
 * GRN Detail page — `/parts/grn/[id]`
 *
 * Reads Zustand store so QC / Post transitions re-render immediately.
 * `params` is a plain object (Next 14 App Router pattern).
 *
 * Spec reference: PLAN-PARTS-006 §1
 */

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const grn = usePartsStore((s) => s.grns.find((g) => g.id === params.id));

  if (!grn) {
    notFound();
  }

  return <GrnDetailView grn={grn} />;
}
