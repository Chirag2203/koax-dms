/**
 * PoGroupSiblingsCard — sidebar card listing other POs in the same group.
 *
 * Only rendered when po.groupRef is set (P4.1 multi-outlet split submissions).
 * Spec reference: PLAN-PARTS-006 §4.3
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { PurchaseOrder } from '@dms/types';
import { StateChip } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { poStatusToChip, OUTLET_NAMES } from '../helpers';
import { getGroupSiblings } from './po-detail-helpers';

export interface PoGroupSiblingsCardProps {
  po: PurchaseOrder;
}

const MAX_VISIBLE = 3;

export function PoGroupSiblingsCard({ po }: PoGroupSiblingsCardProps) {
  const pos = usePartsStore((s) => s.purchaseOrders);
  const siblings = useMemo(() => getGroupSiblings(po, pos), [po, pos]);

  if (!po.groupRef) return null;
  if (siblings.length === 0) return null;

  const visible = siblings.slice(0, MAX_VISIBLE);
  const overflow = siblings.length - MAX_VISIBLE;

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-1">
        Group Siblings
      </h3>
      <p className="text-[11px] text-ink-muted mb-3">
        Group:{' '}
        <span className="font-mono">{po.groupRef}</span>
      </p>
      <ul className="flex flex-col gap-2">
        {visible.map((sibling) => (
          <li key={sibling.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/parts/po/${sibling.id}`}
                className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
              >
                {sibling.poNo}
              </Link>
              <span className="text-[11px] text-ink-muted block">
                {OUTLET_NAMES[sibling.outletId] ?? sibling.outletId}
              </span>
            </div>
            <StateChip status={poStatusToChip(sibling.status)} />
          </li>
        ))}
      </ul>
      {overflow > 0 && (
        <div className="mt-2 pt-2 border-t border-line">
          <Link
            href={`/parts?tab=po&group=${encodeURIComponent(po.groupRef)}`}
            className="text-[12px] text-accent hover:underline"
          >
            +{overflow} more in this group
          </Link>
        </div>
      )}
    </div>
  );
}
