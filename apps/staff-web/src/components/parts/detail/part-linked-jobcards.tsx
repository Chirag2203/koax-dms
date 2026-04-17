/**
 * PartLinkedJobCards — sidebar card listing Service JCs consuming this part.
 *
 * Reads from the Service store. Requires ServiceStoreHydrator to be mounted
 * under /parts/layout.tsx (handled in P3).
 *
 * Spec reference: PLAN-PARTS-003 §13
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Part } from '@dms/types';
import type { StateChipStatus } from '@/src/components/primitives';
import { StateChip } from '@/src/components/primitives';
import { useServiceStore } from '@/src/lib/service/service-store';
import { formatDateShort, staffName } from '../helpers';
import {
  customerName,
  getLinkedJobCards,
  vehicleLabel,
} from './part-detail-helpers';

const MAX_VISIBLE = 5;

export interface PartLinkedJobCardsProps {
  part: Part;
}

// Service JobCardStatus → StateChip variant (minimal local mapping; full map
// lives in the service tabs but is not exported cleanly).
function jobStatusToChip(status: string): StateChipStatus {
  switch (status) {
    case 'RECEIVED':
      return 'svc-received';
    case 'DIAGNOSED':
      return 'svc-diagnosed';
    case 'IN_PROGRESS':
      return 'svc-in-progress';
    case 'WAITING_PARTS':
      return 'svc-waiting-parts';
    case 'ADDITIONAL_WORK_APPROVAL':
      return 'svc-approval';
    case 'QC':
      return 'svc-qc';
    case 'READY_FOR_DELIVERY':
      return 'svc-ready';
    case 'DELIVERED':
      return 'svc-delivered';
    case 'CANCELLED':
      return 'svc-cancelled';
    case 'REOPENED':
      return 'svc-reopened';
    default:
      return 'svc-received';
  }
}

export function PartLinkedJobCards({ part }: PartLinkedJobCardsProps) {
  const jobCards = useServiceStore((s) => s.jobCards);

  const linked = useMemo(
    () => getLinkedJobCards(part.partCode, jobCards),
    [part.partCode, jobCards],
  );

  const visible = linked.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, linked.length - visible.length);

  return (
    <section className="rounded-md border border-line bg-bg-surface p-4">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        Linked Service Job Cards
      </h2>

      {visible.length === 0 ? (
        <p className="text-[12px] text-ink-muted italic">
          No service job cards have consumed this part.
        </p>
      ) : (
        <>
          <ul className="flex flex-col">
            {visible.map((jc) => (
              <li key={jc.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/service/jobcards/${jc.id}`}
                  className="block py-3 -mx-4 px-4 hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[13px] text-accent">
                      {jc.jobNo}
                    </span>
                    <StateChip status={jobStatusToChip(jc.status)} />
                  </div>
                  <div className="mt-1 text-[12px] text-ink-secondary truncate">
                    {vehicleLabel(jc.vin)} · {customerName(jc.customerId)} ·{' '}
                    {formatDateShort(jc.receivedAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <Link
              href="/service?tab=jobcards"
              className="inline-flex items-center gap-1 mt-3 text-[12px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              +{hiddenCount} more
            </Link>
          )}
        </>
      )}
    </section>
  );
}
