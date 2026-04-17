/**
 * Suppliers tab — 8 rows, no filter bar. Row click opens SupplierDetailPanel.
 *
 * Spec reference: PLAN-PARTS-002 §6.5, §17.3
 */

'use client';

import { useMemo, useState } from 'react';
import { Factory } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Supplier } from '@dms/types';
import { DataTable, AmountCell } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  activePoCount,
  formatDateShort,
  lastOrderDate,
  lifetimeValue,
} from '../helpers';
import { SupplierDetailPanel } from '../supplier-detail-panel';

export function SuppliersTab() {
  const suppliers = usePartsStore((s) => s.suppliers);
  const purchaseOrders = usePartsStore((s) => s.purchaseOrders);

  const [selected, setSelected] = useState<string | null>(null);

  // Pre-compute aggregates once per (suppliers, pos) tuple so row renders stay cheap.
  const enriched = useMemo(
    () =>
      suppliers.map((s) => ({
        supplier: s,
        active: activePoCount(s.id, purchaseOrders),
        ltv: lifetimeValue(s.id, purchaseOrders),
        last: lastOrderDate(s.id, purchaseOrders),
      })),
    [suppliers, purchaseOrders],
  );

  const columns = useMemo<ColumnDef<(typeof enriched)[number]>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row) => row.supplier.name,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span className="text-[13px] font-medium text-ink-primary">
              {row.original.supplier.name}
            </span>
            {row.original.supplier.currency !== 'INR' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-bg-subtle text-[10px] uppercase tracking-widest text-ink-muted">
                {row.original.supplier.currency}
              </span>
            )}
          </span>
        ),
        size: 280,
      },
      {
        id: 'gstin',
        header: 'GSTIN',
        accessorFn: (row) => row.supplier.gstin ?? '',
        cell: ({ row }) =>
          row.original.supplier.gstin ? (
            <span className="font-mono text-[13px] text-ink-secondary">
              {row.original.supplier.gstin}
            </span>
          ) : (
            <span className="text-ink-muted" aria-hidden="true">
              —
            </span>
          ),
        size: 180,
      },
      {
        id: 'paymentTerms',
        header: 'Payment Terms',
        accessorFn: (row) => row.supplier.paymentTerms,
        cell: ({ row }) => (
          <span className="text-[13px] text-ink-secondary">
            {row.original.supplier.paymentTerms}
          </span>
        ),
        size: 140,
      },
      {
        id: 'active',
        header: 'Active POs',
        accessorFn: (row) => row.active,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-[13px] text-ink-primary">
            {row.original.active}
          </span>
        ),
        size: 96,
      },
      {
        id: 'ltv',
        header: 'Lifetime Value',
        accessorFn: (row) => row.ltv,
        cell: ({ row }) => <AmountCell amount={row.original.ltv} size="sm" />,
        size: 160,
      },
      {
        id: 'last',
        header: 'Last Order',
        accessorFn: (row) => row.last ?? '',
        cell: ({ row }) => (
          <span className="text-[13px] text-ink-secondary">
            {formatDateShort(row.original.last ?? undefined)}
          </span>
        ),
        size: 110,
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <DataTable
        columns={columns}
        data={enriched}
        density="compact"
        pageSize={25}
        onRowClick={(row) => setSelected(row.supplier.id)}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Factory aria-hidden="true" className="h-10 w-10 text-ink-muted" />
            <p className="text-sm text-ink-secondary">No suppliers yet.</p>
          </div>
        }
      />
      <SupplierDetailPanel
        supplierId={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
