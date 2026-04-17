/**
 * PartOpenPos — sidebar card listing non-terminal POs for this part.
 *
 * Spec reference: PLAN-PARTS-003 §11
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Part } from '@dms/types';
import { AmountCell, OutletPill, StateChip } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  formatDateShort,
  outletIdToCode,
  poStatusToChip,
} from '../helpers';
import { getOpenPosForPart } from './part-detail-helpers';

const MAX_VISIBLE = 5;

export interface PartOpenPosProps {
  part: Part;
}

export function PartOpenPos({ part }: PartOpenPosProps) {
  const purchaseOrders = usePartsStore((s) => s.purchaseOrders);
  const suppliers = usePartsStore((s) => s.suppliers);

  const allOpen = useMemo(
    () => getOpenPosForPart(part.partCode, purchaseOrders),
    [part.partCode, purchaseOrders],
  );
  const visible = allOpen.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, allOpen.length - visible.length);

  const supplierName = (id: string): string =>
    suppliers.find((s) => s.id === id)?.name ?? id;

  return (
    <section className="rounded-md border border-line bg-bg-surface p-4">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        Open Purchase Orders
      </h2>

      {visible.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-ink-muted italic">
            No open purchase orders for this part.
          </p>
          <Link
            href={`/parts/po/new?part=${encodeURIComponent(part.partCode)}`}
            className="inline-flex items-center justify-center h-8 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-primary hover:bg-bg-subtle hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            Raise PO
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col">
            {visible.map((po) => (
              <li key={po.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/parts/po/${po.id}`}
                  className="block py-3 -mx-4 px-4 hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[13px] text-accent">
                      {po.poNo}
                    </span>
                    <StateChip status={poStatusToChip(po.status)} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-secondary">
                    <span className="truncate">
                      {supplierName(po.supplierId)}
                    </span>
                    <span className="text-ink-muted">·</span>
                    <OutletPill outlet={outletIdToCode(po.outletId)} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-muted">
                    <span>{po.lines.length} lines</span>
                    <span>·</span>
                    <AmountCell amount={po.total} size="sm" align="left" />
                    <span>·</span>
                    <span>
                      Expected {formatDateShort(po.expectedDeliveryAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <Link
              href="/parts?tab=po"
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
