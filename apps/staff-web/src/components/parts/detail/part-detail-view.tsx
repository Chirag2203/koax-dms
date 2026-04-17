/**
 * PartDetailView — composer for `/parts/[partCode]`.
 *
 * Layout: breadcrumb + header + 70/30 grid (content + sidebar) on `xl:`.
 * Below xl, sidebar stacks below primary column.
 *
 * Spec reference: PLAN-PARTS-003 §3, §4
 */

'use client';

import type { Part } from '@dms/types';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { PartHeader } from './part-header';
import { PartOverviewCard } from './part-overview-card';
import { PartSupersessionRow } from './part-supersession-row';
import { PartStockDistribution } from './part-stock-distribution';
import { PartMovementHistory } from './part-movement-history';
import { PartOpenPos } from './part-open-pos';
import { PartPrimarySupplier } from './part-primary-supplier';
import { PartLinkedJobCards } from './part-linked-jobcards';

export interface PartDetailViewProps {
  part: Part;
}

export function PartDetailView({ part }: PartDetailViewProps) {
  // Stable base-array selector — the supersession row walks the full parts
  // array for in-catalog lookup and reverse predecessor lookup.
  const allParts = usePartsStore((s) => s.parts);

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
      <PartHeader part={part} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {/* Primary column */}
        <div className="flex flex-col gap-6 min-w-0">
          <PartOverviewCard part={part} />
          <PartSupersessionRow part={part} allParts={allParts} />
          <PartStockDistribution part={part} />
          <PartMovementHistory part={part} />
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 xl:self-start">
          <PartOpenPos part={part} />
          <PartPrimarySupplier part={part} />
          <PartLinkedJobCards part={part} />
        </aside>
      </div>
    </div>
  );
}
