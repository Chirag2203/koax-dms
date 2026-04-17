/**
 * PartMovementHistory — paginated DataTable over a single part's movements.
 *
 * Spec reference: PLAN-PARTS-003 §10
 */

'use client';

import { useMemo } from 'react';
import type { Part } from '@dms/types';
import { DataTable } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  getMovementsForPart,
} from './part-detail-helpers';
import { buildPartMovementColumns } from './part-movement-columns';

export interface PartMovementHistoryProps {
  part: Part;
}

export function PartMovementHistory({ part }: PartMovementHistoryProps) {
  // Stable base-array selectors + memoized filter (spec §5 Zustand contract)
  const allMovements = usePartsStore((s) => s.stockMovements);
  const grns = usePartsStore((s) => s.grns);

  const rows = useMemo(
    () => getMovementsForPart(part.partCode, allMovements),
    [part.partCode, allMovements],
  );

  const grnIds = useMemo(() => new Set(grns.map((g) => g.id)), [grns]);

  const columns = useMemo(
    () =>
      buildPartMovementColumns({
        allMovements,
        grnIds,
      }),
    [allMovements, grnIds],
  );

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Movement History
      </h2>

      <DataTable
        columns={columns}
        data={rows}
        density="compact"
        pageSize={20}
        emptyState={
          <div className="py-8 text-center text-[13px] text-ink-muted italic">
            No stock movements yet.
          </div>
        }
      />
    </section>
  );
}
