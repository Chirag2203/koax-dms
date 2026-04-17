/**
 * Purchase Orders tab — filter bar + DataTable of POs.
 *
 * Filters: Status / Supplier / Outlet / Date Range / Search.
 * Row click → /parts/po/[id] (P5 404 until P5).
 *
 * Reads `?supplier=<id>` on mount into initial filter state (spec §17.3 /
 * decision (b) in §16 changelog — read-once deep-link from Suppliers panel).
 *
 * Spec reference: PLAN-PARTS-002 §6.3, §17.1
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PackageSearch, Search } from 'lucide-react';
import type { PurchaseOrderStatus } from '@dms/types';
import { DataTable } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  DATE_RANGE_OPTIONS,
  matchesDateRange,
  OUTLET_NAMES,
  OUTLET_ORDER,
  type DateRangeId,
} from '../helpers';
import { buildPoColumns } from './po-columns';

// ─── Filter shape ─────────────────────────────────────────────────────────────

interface PoFilters {
  status: 'ALL' | PurchaseOrderStatus;
  supplierId: 'ALL' | string;
  outletId: 'ALL' | string;
  dateRange: DateRangeId;
  search: string;
}

const DEFAULT_PO_FILTERS: PoFilters = {
  status: 'ALL',
  supplierId: 'ALL',
  outletId: 'ALL',
  dateRange: 'this-month',
  search: '',
};

function isDefault(f: PoFilters): boolean {
  return (
    f.status === 'ALL' &&
    f.supplierId === 'ALL' &&
    f.outletId === 'ALL' &&
    f.dateRange === 'this-month' &&
    f.search === ''
  );
}

const PO_STATUSES: PurchaseOrderStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
];

function titleCase(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PurchaseOrdersTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrders = usePartsStore((s) => s.purchaseOrders);
  const suppliers = usePartsStore((s) => s.suppliers);

  // Read-once deep-link from Suppliers panel: if ?supplier=<id> is present,
  // seed the supplier filter. Subsequent user changes are not re-synced.
  const initialSupplier = searchParams.get('supplier');
  const [filters, setFilters] = useState<PoFilters>(() => ({
    ...DEFAULT_PO_FILTERS,
    supplierId:
      initialSupplier && suppliers.some((s) => s.id === initialSupplier)
        ? initialSupplier
        : 'ALL',
    // When a supplier is pre-filtered, broaden the date range so the user
    // sees all POs for that supplier regardless of recency.
    dateRange: initialSupplier ? 'all' : 'this-month',
  }));

  const filtered = useMemo(
    () =>
      purchaseOrders
        .filter((po) => {
          if (filters.status !== 'ALL' && po.status !== filters.status) return false;
          if (filters.supplierId !== 'ALL' && po.supplierId !== filters.supplierId)
            return false;
          if (filters.outletId !== 'ALL' && po.outletId !== filters.outletId) return false;
          if (!matchesDateRange(po.createdAt, filters.dateRange)) return false;
          if (filters.search.trim()) {
            const q = filters.search.trim().toLowerCase();
            const supplierName =
              suppliers.find((s) => s.id === po.supplierId)?.name ?? '';
            if (
              !po.poNo.toLowerCase().includes(q) &&
              !supplierName.toLowerCase().includes(q)
            ) {
              return false;
            }
          }
          return true;
        })
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [purchaseOrders, suppliers, filters],
  );

  const columns = useMemo(() => buildPoColumns({ suppliers }), [suppliers]);
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
              setFilters({ ...filters, status: e.target.value as PoFilters['status'] })
            }
            className={selectCls('w-44')}
          >
            <option value="ALL">All statuses</option>
            {PO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Supplier">
          <select
            aria-label="Filter by supplier"
            value={filters.supplierId}
            onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
            className={selectCls('w-56')}
          >
            <option value="ALL">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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

        <Field label="Search" className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
            />
            <input
              type="search"
              aria-label="Search POs by number or supplier"
              placeholder="PO no or supplier"
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
        onRowClick={(row) => router.push(`/parts/po/${row.id}`)}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <PackageSearch aria-hidden="true" className="h-10 w-10 text-ink-muted" />
            <p className="text-sm text-ink-secondary">
              No purchase orders match these filters.
            </p>
            {!filtersAreDefault && (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_PO_FILTERS)}
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
