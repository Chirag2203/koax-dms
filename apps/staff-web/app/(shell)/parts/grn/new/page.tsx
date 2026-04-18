'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { GrnPickerEmpty, NewGrnForm } from '@/src/components/parts/new-grn';

/**
 * /parts/grn/new — create a new GRN (DRAFT) against an existing PO.
 *
 * Requires ?po=<id>. Missing / unknown → <GrnPickerEmpty> placeholder.
 * Walk-in (no PO) flow is P5 scope.
 *
 * Spec reference: PLAN-PARTS-004 §1, §5, §18.8
 */

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <PageInner />
    </Suspense>
  );
}

function PageInner() {
  const searchParams = useSearchParams();
  const poId = searchParams.get('po');

  // Stable base-array selector; guard inside useMemo-free branch is fine —
  // the .find() returns a stable ref for identity equality.
  const po = usePartsStore((s) =>
    poId ? s.purchaseOrders.find((p) => p.id === poId) : undefined,
  );

  if (!poId) {
    return <GrnPickerEmpty />;
  }
  if (!po) {
    return <GrnPickerEmpty unknownPoId={poId} />;
  }
  // Defensive: PO with zero lines — shouldn't happen but guard anyway.
  if (po.lines.length === 0) {
    return <GrnPickerEmpty unknownPoId={poId} />;
  }

  return <NewGrnForm poId={poId} />;
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-6 text-sm text-ink-muted">
      Loading…
    </div>
  );
}
