/**
 * Stock List tab — default landing tab.
 *
 * Filter bar + DataTable over 65 parts. Per-outlet stock badges in the
 * Stock column. Row click → /parts/[partCode] (P3 404 until P3 ships).
 *
 * Spec reference: PLAN-PARTS-002 §6.1, §17.5; SPEC-PARTS-001 §3.1
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackageSearch } from 'lucide-react';
import { DataTable } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  PartsFilterBar,
  DEFAULT_PARTS_FILTERS,
  isPartsFiltersDefault,
  matchesPartsFilters,
  type PartsFilters,
} from '../parts-filter-bar';
import { buildStockListColumns } from './stock-list-columns';

export function StockListTab() {
  const router = useRouter();
  const parts = usePartsStore((s) => s.parts);

  const [filters, setFilters] = useState<PartsFilters>(DEFAULT_PARTS_FILTERS);

  // Derive unique brand list from fixtures (memoized on parts identity)
  const brands = useMemo(
    () => Array.from(new Set(parts.map((p) => p.brand))).sort(),
    [parts],
  );

  const filtered = useMemo(
    () => parts.filter((p) => matchesPartsFilters(p, filters)),
    [parts, filters],
  );

  const columns = useMemo(
    () =>
      buildStockListColumns({
        outletFilter: filters.outletId === 'ALL' ? undefined : filters.outletId,
      }),
    [filters.outletId],
  );

  const filtersAreDefault = isPartsFiltersDefault(filters);

  return (
    <div className="flex flex-col gap-4 p-6">
      <PartsFilterBar filters={filters} onChange={setFilters} brands={brands} />

      <DataTable
        columns={columns}
        data={filtered}
        density="compact"
        pageSize={25}
        onRowClick={(row) => router.push(`/parts/${row.partCode}`)}
        emptyState={
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
        }
      />
    </div>
  );
}
