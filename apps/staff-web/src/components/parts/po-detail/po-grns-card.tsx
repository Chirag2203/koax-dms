/**
 * PoGrnsCard — sidebar card listing GRNs filed against this PO.
 *
 * Rendered only when po.status ∈ {DISPATCHED, PARTIALLY_RECEIVED, RECEIVED, CLOSED}.
 * Spec reference: PLAN-PARTS-006 §4.3
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { PurchaseOrder } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { grnStatusToChip, formatDateTime } from '../helpers';
import { getGrnsForPo } from './po-detail-helpers';

export interface PoGrnsCardProps {
  po: PurchaseOrder;
}

const SHOW_STATUSES: string[] = [
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
];

export function PoGrnsCard({ po }: PoGrnsCardProps) {
  const grns = usePartsStore((s) => s.grns);
  const linked = useMemo(() => getGrnsForPo(po.id, grns), [po.id, grns]);

  if (!SHOW_STATUSES.includes(po.status)) return null;

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        GRNs{linked.length > 0 ? ` (${linked.length})` : ''}
      </h3>
      {linked.length === 0 ? (
        <p className="text-[13px] text-ink-muted">No GRNs filed yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linked.map((grn) => (
            <li key={grn.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/parts/grn/${grn.id}`}
                  className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                >
                  {grn.grnNo}
                </Link>
                {grn.receivedAt && (
                  <span className="text-[11px] text-ink-muted block">
                    {formatDateTime(grn.receivedAt)}
                  </span>
                )}
              </div>
              <StateChip status={grnStatusToChip(grn.status)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
