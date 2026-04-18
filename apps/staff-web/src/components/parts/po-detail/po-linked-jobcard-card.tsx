/**
 * PoLinkedJobCardCard — sidebar card showing the service job card that originated this PO.
 *
 * Only rendered when po.linkedJobCardId is set.
 * Spec reference: PLAN-PARTS-006 §4.3
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { PurchaseOrder } from '@dms/types';
import { useServiceStore } from '@/src/lib/service/service-store';

export interface PoLinkedJobCardCardProps {
  po: PurchaseOrder;
}

export function PoLinkedJobCardCard({ po }: PoLinkedJobCardCardProps) {
  if (!po.linkedJobCardId) return null;

  return <LinkedJobCardInner jobCardId={po.linkedJobCardId} />;
}

function LinkedJobCardInner({ jobCardId }: { jobCardId: string }) {
  const jobCards = useServiceStore((s) => s.jobCards);
  const jobCard = useMemo(
    () => jobCards.find((jc) => jc.id === jobCardId),
    [jobCards, jobCardId],
  );

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        Linked Job Card
      </h3>
      {jobCard ? (
        <div className="flex flex-col gap-1">
          <Link
            href={`/service/jobcards/${jobCardId}`}
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            {jobCard.jobNo ?? jobCardId}
          </Link>
          {jobCard.vin && (
            <span className="text-[12px] text-ink-secondary">
              VIN: {jobCard.vin}
            </span>
          )}
          <Link
            href={`/service/jobcards/${jobCardId}`}
            className="text-[12px] text-accent hover:underline mt-1"
          >
            View Job Card →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[13px] text-ink-muted">{jobCardId}</span>
          <span className="text-[12px] text-ink-muted">Job card not found in local store.</span>
        </div>
      )}
    </div>
  );
}
