/**
 * Low Stock tab — parts at or below reorder level on at least one outlet.
 *
 * Same filter bar as Stock List; adds Shortfall / DoC / Last PO / "Raise PO"
 * per row; every row carries a `border-l-2 border-state-overdue` accent to
 * signal the alert-list context. Default sort = shortfall desc.
 *
 * Spec reference: PLAN-PARTS-002 §6.2, §17.4
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PackageSearch } from 'lucide-react';
import { DataTable } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  PartsFilterBar,
  DEFAULT_PARTS_FILTERS,
  isPartsFiltersDefault,
  matchesPartsFilters,
  type PartsFilters,
} from '../parts-filter-bar';
import { isLowStockPart, shortfallFor } from '../helpers';
import { buildLowStockColumns } from './low-stock-columns';

export function LowStockTab() {
  const router = useRouter();
  const parts = usePartsStore((s) => s.parts);
  const purchaseOrders = usePartsStore((s) => s.purchaseOrders);

  const [filters, setFilters] = useState<PartsFilters>(DEFAULT_PARTS_FILTERS);

  const brands = useMemo(
    () => Array.from(new Set(parts.map((p) => p.brand))).sort(),
    [parts],
  );

  const lowStockBase = useMemo(() => parts.filter(isLowStockPart), [parts]);

  const filtered = useMemo(() => {
    const rows = lowStockBase.filter((p) => matchesPartsFilters(p, filters));
    // Default sort: shortfall desc (worst first)
    return rows.sort(
      (a, b) =>
        shortfallFor(
          b,
          filters.outletId === 'ALL' ? undefined : filters.outletId,
        ) -
        shortfallFor(
          a,
          filters.outletId === 'ALL' ? undefined : filters.outletId,
        ),
    );
  }, [lowStockBase, filters]);

  const columns = useMemo(
    () =>
      buildLowStockColumns({
        outletFilter: filters.outletId === 'ALL' ? undefined : filters.outletId,
        purchaseOrders,
      }),
    [filters.outletId, purchaseOrders],
  );

  const filtersAreDefault = isPartsFiltersDefault(filters);

  // Two empty-state variants (spec §17.4):
  //   - success: no filters active + zero low-stock parts
  //   - filtered: filters active, zero results
  const emptyState =
    filtersAreDefault && lowStockBase.length === 0 ? (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2
          aria-hidden="true"
          className="h-10 w-10 text-[rgb(var(--state-listed))]"
        />
        <p className="text-sm text-ink-secondary">
          Great — no parts below reorder level.
        </p>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <PackageSearch
          aria-hidden="true"
          className="h-10 w-10 text-ink-muted"
        />
        <p className="text-sm text-ink-secondary">
          No parts match these filters.
        </p>
        {!filtersAreDefault && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_PARTS_FILTERS)}
            className="text-[13px] font-medium text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            Clear filters
          </button>
        )}
      </div>
    );

  return (
    <div className="flex flex-col gap-4 p-6">
      <PartsFilterBar filters={filters} onChange={setFilters} brands={brands} />

      <div
        // Apply the left-accent strip only to DATA rows (exclude the empty-
        // state row, which wraps a single <td colspan>). The `:has` selector
        // targets <tr> that contain at least one <td> without a `colspan`
        // attribute — i.e. real data rows. This keeps the primitive unchanged
        // while preventing the accent from painting onto the empty state.
        className="[&_tbody_tr:has(td:not([colspan]))]:border-l-2 [&_tbody_tr:has(td:not([colspan]))]:border-[rgb(var(--state-overdue))]"
      >
        <DataTable
          columns={columns}
          data={filtered}
          density="compact"
          pageSize={25}
          onRowClick={(row) => router.push(`/parts/${row.partCode}`)}
          emptyState={emptyState}
        />
      </div>
    </div>
  );
}
