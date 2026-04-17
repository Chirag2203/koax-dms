/**
 * GRNs tab — filter bar + DataTable of Goods Receipt Notes.
 *
 * Filters: Status / Outlet / Date Range / Has Discrepancy toggle / Search.
 * Row click → /parts/grn/[id] (P5 404 until P5).
 *
 * Spec reference: PLAN-PARTS-002 §6.4, §17.2
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Search, TriangleAlert } from 'lucide-react';
import type { GrnStatus } from '@dms/types';
import { DataTable } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  DATE_RANGE_OPTIONS,
  grnHasDiscrepancy,
  matchesDateRange,
  OUTLET_NAMES,
  OUTLET_ORDER,
  type DateRangeId,
} from '../helpers';
import { buildGrnColumns } from './grn-columns';

// ─── Filter shape ─────────────────────────────────────────────────────────────

interface GrnFilters {
  status: 'ALL' | GrnStatus;
  outletId: 'ALL' | string;
  dateRange: DateRangeId;
  hasDiscrepancy: boolean;
  search: string;
}

const DEFAULT_GRN_FILTERS: GrnFilters = {
  status: 'ALL',
  outletId: 'ALL',
  dateRange: 'this-month',
  hasDiscrepancy: false,
  search: '',
};

function isDefault(f: GrnFilters): boolean {
  return (
    f.status === 'ALL' &&
    f.outletId === 'ALL' &&
    f.dateRange === 'this-month' &&
    !f.hasDiscrepancy &&
    f.search === ''
  );
}

const GRN_STATUSES: GrnStatus[] = [
  'DRAFT',
  'PENDING_QC',
  'MATCHED',
  'REJECTED',
  'POSTED',
];

function titleCase(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GrnsTab() {
  const router = useRouter();
  const grns = usePartsStore((s) => s.grns);
  const suppliers = usePartsStore((s) => s.suppliers);

  const [filters, setFilters] = useState<GrnFilters>(DEFAULT_GRN_FILTERS);

  const filtered = useMemo(
    () =>
      grns
        .filter((g) => {
          if (filters.status !== 'ALL' && g.status !== filters.status) return false;
          if (filters.outletId !== 'ALL' && g.outletId !== filters.outletId) return false;
          if (!matchesDateRange(g.receivedAt, filters.dateRange)) return false;
          if (filters.hasDiscrepancy && !grnHasDiscrepancy(g)) return false;
          if (filters.search.trim()) {
            const q = filters.search.trim().toLowerCase();
            if (
              !g.grnNo.toLowerCase().includes(q) &&
              !(g.poId?.toLowerCase().includes(q) ?? false)
            ) {
              return false;
            }
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
        ),
    [grns, filters],
  );

  const columns = useMemo(() => buildGrnColumns({ suppliers }), [suppliers]);
  const filtersAreDefault = isDefault(filters);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Filter bar */}
      <div
        className={cn(
          'rounded-md border border-line bg-bg-surface p-3',
          'flex flex-wrap items-end gap-3',
        )}
      >
        <Field label="Status">
          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as GrnFilters['status'] })
            }
            className={selectCls('w-44')}
          >
            <option value="ALL">All statuses</option>
            {GRN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Outlet">
          <select
            aria-label="Filter by outlet"
            value={filters.outletId}
            onChange={(e) => setFilters({ ...filters, outletId: e.target.value })}
            className={selectCls('w-40')}
          >
            <option value="ALL">All outlets</option>
            {OUTLET_ORDER.map((id) => (
              <option key={id} value={id}>
                {OUTLET_NAMES[id] ?? id}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date Range">
          <select
            aria-label="Filter by date range"
            value={filters.dateRange}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateRange: e.target.value as DateRangeId,
              })
            }
            className={selectCls('w-40')}
          >
            {DATE_RANGE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Discrepancy">
          <button
            type="button"
            aria-pressed={filters.hasDiscrepancy}
            onClick={() =>
              setFilters({ ...filters, hasDiscrepancy: !filters.hasDiscrepancy })
            }
            className={cn(
              'h-10 rounded-md border px-3 text-[13px] font-medium flex items-center gap-2 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              filters.hasDiscrepancy
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-bg-subtle border-line text-ink-secondary hover:text-ink-primary',
            )}
          >
            <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
            Has discrepancy
          </button>
        </Field>

        <Field label="Search" className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
            />
            <input
              type="search"
              aria-label="Search GRNs by number or PO"
              placeholder="GRN no or PO no"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className={cn(
                'h-10 w-full rounded-md bg-bg-subtle border border-line pl-10 pr-3',
                'text-sm text-ink-primary placeholder:text-ink-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            />
          </div>
        </Field>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        density="compact"
        pageSize={25}
        onRowClick={(row) => router.push(`/parts/grn/${row.id}`)}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Inbox aria-hidden="true" className="h-10 w-10 text-ink-muted" />
            <p className="text-sm text-ink-secondary">
              No GRNs match these filters.
            </p>
            {!filtersAreDefault && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_GRN_FILTERS)}
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

// ─── Local helpers ────────────────────────────────────────────────────────────

function selectCls(width: string): string {
  return cn(
    'h-10 rounded-md bg-bg-subtle border border-line px-3',
    'text-sm text-ink-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
    width,
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
