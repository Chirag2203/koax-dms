/**
 * GrnDetailView — composer for `/parts/grn/[id]`.
 *
 * Layout: breadcrumb + header + 70/30 grid (primary + sidebar).
 * Spec reference: PLAN-PARTS-006 §5
 */

'use client';

import { useMemo } from 'react';
import type { Grn } from '@dms/types';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { GrnHeader } from './grn-header';
import { GrnSupplierReceiptCard } from './grn-supplier-receipt-card';
import { GrnLinesTable } from './grn-lines-table';
import { GrnLandedCostCard } from './grn-landed-cost-card';
import { GrnTimelineCard } from './grn-timeline-card';
import { GrnLinkedPoCard } from './grn-linked-po-card';
import { GrnQcCard } from './grn-qc-card';
import { GrnDiscrepancyCard } from './grn-discrepancy-card';
import { getLinkedPo } from './grn-detail-helpers';

export interface GrnDetailViewProps {
  grn: Grn;
}

export function GrnDetailView({ grn }: GrnDetailViewProps) {
  const suppliers = usePartsStore((s) => s.suppliers);
  const pos = usePartsStore((s) => s.purchaseOrders);

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === grn.supplierId),
    [suppliers, grn.supplierId],
  );

  const po = useMemo(() => getLinkedPo(grn, pos), [grn, pos]);

  const hasPo = !!grn.poId;

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
      <GrnHeader grn={grn} po={po} supplier={supplier} />

      {/* Terminal rejection banner */}
      {grn.status === 'REJECTED' && grn.rejectedReason && (
        <div className="mb-6 rounded-md border border-[rgb(var(--state-danger)/0.3)] bg-[rgb(var(--state-danger)/0.05)] px-4 py-3">
          <p className="text-sm font-semibold text-[rgb(var(--state-danger))]">Rejected</p>
          <p className="text-[13px] text-ink-secondary mt-0.5">
            &quot;{grn.rejectedReason}&quot;
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {/* Primary column */}
        <div className="flex flex-col gap-6 min-w-0">
          <GrnSupplierReceiptCard grn={grn} supplier={supplier} po={po} />
          <GrnLinesTable grn={grn} hasPo={hasPo} />
          {grn.landedCostAdders && <GrnLandedCostCard grn={grn} />}
          <GrnTimelineCard grn={grn} />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 xl:self-start">
          <GrnLinkedPoCard grn={grn} po={po} />
          <GrnQcCard grn={grn} po={po} />
          {grn.threeWayMatchStatus === 'DISCREPANCY' && (
            <GrnDiscrepancyCard grn={grn} />
          )}
        </aside>
      </div>
    </div>
  );
}
