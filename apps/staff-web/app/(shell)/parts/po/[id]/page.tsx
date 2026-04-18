'use client';

import { notFound } from 'next/navigation';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { PurchaseOrderDetailView } from '@/src/components/parts/po-detail';

/**
 * PO Detail page — `/parts/po/[id]`
 *
 * Reads Zustand store so GRN posts / status transitions re-render immediately.
 * `params` is a plain object (Next 14 App Router pattern).
 *
 * Spec reference: PLAN-PARTS-006 §1
 */

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const po = usePartsStore((s) => s.purchaseOrders.find((p) => p.id === params.id));

  if (!po) {
    notFound();
  }

  return <PurchaseOrderDetailView po={po} />;
}
