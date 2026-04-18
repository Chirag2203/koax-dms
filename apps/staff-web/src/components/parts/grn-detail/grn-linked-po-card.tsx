/**
 * GrnLinkedPoCard — sidebar card linking to the originating PO.
 *
 * Walk-in GRNs (no poId) show "No linked PO (walk-in receipt)".
 * Spec reference: PLAN-PARTS-006 §5.3
 */

import type { Grn, PurchaseOrder } from '@dms/types';
import Link from 'next/link';
import { StateChip, AmountCell } from '@/src/components/primitives';
import { poStatusToChip } from '../helpers';

export interface GrnLinkedPoCardProps {
  grn: Grn;
  po: PurchaseOrder | undefined;
}

export function GrnLinkedPoCard({ grn, po }: GrnLinkedPoCardProps) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        Linked PO
      </h3>
      {!grn.poId ? (
        <p className="text-[13px] text-ink-muted">No linked PO (walk-in receipt).</p>
      ) : po ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/parts/po/${po.id}`}
              className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
            >
              {po.poNo}
            </Link>
            <StateChip status={poStatusToChip(po.status)} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-ink-muted font-mono uppercase tracking-wider text-[11px]">Total</span>
            <AmountCell amount={po.total} size="sm" align="right" />
          </div>
          <Link
            href={`/parts/po/${po.id}`}
            className="text-[12px] text-accent hover:underline mt-1"
          >
            View PO →
          </Link>
        </div>
      ) : (
        <div>
          <span className="font-mono text-[13px] text-ink-muted">{grn.poId}</span>
          <p className="text-[12px] text-ink-muted mt-1">PO details unavailable.</p>
        </div>
      )}
    </div>
  );
}
