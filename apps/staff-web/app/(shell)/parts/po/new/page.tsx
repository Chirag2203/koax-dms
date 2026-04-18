'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { NewPurchaseOrderForm } from '@/src/components/parts/new-po';

/**
 * /parts/po/new — create a new Purchase Order (DRAFT).
 *
 * Accepts ?part=<code> + ?jobCard=<id> pre-fill (spec §11.1).
 * Wrapped in <Suspense> because useSearchParams() requires it under
 * Next 14 App Router.
 *
 * Spec reference: PLAN-PARTS-004 §1
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
  const partCode = searchParams.get('part') ?? undefined;
  const jobCardId = searchParams.get('jobCard') ?? undefined;
  return (
    <NewPurchaseOrderForm
      initialPartCode={partCode}
      initialJobCardId={jobCardId}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-6 pt-6 text-sm text-ink-muted">
      Loading…
    </div>
  );
}
