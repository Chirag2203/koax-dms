/**
 * PurchaseOrderDetailView — composer for `/parts/po/[id]`.
 *
 * Layout: breadcrumb + header + 70/30 grid (primary + sidebar).
 * Spec reference: PLAN-PARTS-006 §4
 */

'use client';

import { useMemo } from 'react';
import type { PurchaseOrder } from '@dms/types';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { PoHeader } from './po-header';
import { PoOverviewCard } from './po-overview-card';
import { PoLinesTable } from './po-lines-table';
import { PoTimelineCard } from './po-timeline-card';
import { PoSupplierCard } from './po-supplier-card';
import { PoApprovalCard } from './po-approval-card';
import { PoGrnsCard } from './po-grns-card';
import { PoGroupSiblingsCard } from './po-group-siblings-card';
import { PoLinkedJobCardCard } from './po-linked-jobcard-card';

export interface PurchaseOrderDetailViewProps {
  po: PurchaseOrder;
}

export function PurchaseOrderDetailView({ po }: PurchaseOrderDetailViewProps) {
  const suppliers = usePartsStore((s) => s.suppliers);
  const supplier = useMemo(
    () => suppliers.find((s) => s.id === po.supplierId),
    [suppliers, po.supplierId],
  );

  const showApprovalCard =
    po.status === 'PENDING_APPROVAL' ||
    po.status === 'APPROVED' ||
    po.status === 'REJECTED' ||
    po.status === 'DISPATCHED' ||
    po.status === 'PARTIALLY_RECEIVED' ||
    po.status === 'RECEIVED' ||
    po.status === 'CLOSED';

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
      <PoHeader po={po} supplier={supplier} />

      {/* Terminal status banner */}
      {(po.status === 'REJECTED' || po.status === 'CANCELLED') && po.rejectedReason && (
        <div className="mb-6 rounded-md border border-[rgb(var(--state-danger)/0.3)] bg-[rgb(var(--state-danger)/0.05)] px-4 py-3 flex items-start gap-2">
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--state-danger))]">
              {po.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
            </p>
            <p className="text-[13px] text-ink-secondary mt-0.5">
              &quot;{po.rejectedReason}&quot;
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {/* Primary column */}
        <div className="flex flex-col gap-6 min-w-0">
          <PoOverviewCard po={po} />
          <PoLinesTable po={po} />
          <PoTimelineCard po={po} />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 xl:self-start">
          <PoSupplierCard supplier={supplier} />
          {showApprovalCard && <PoApprovalCard po={po} supplier={supplier} />}
          <PoGrnsCard po={po} />
          <PoGroupSiblingsCard po={po} />
          <PoLinkedJobCardCard po={po} />
        </aside>
      </div>
    </div>
  );
}
