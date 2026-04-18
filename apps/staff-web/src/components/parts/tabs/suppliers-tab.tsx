/**
 * Suppliers tab — 8 rows, no filter bar. Row click opens SupplierDetailPanel.
 *
 * Spec reference: PLAN-PARTS-002 §6.5, §17.3
 */

'use client';

import { useMemo, useState } from 'react';
import { Factory, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { cn } from '@dms/ui';
import type { Supplier } from '@dms/types';
import { DataTable, AmountCell, Gate } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import {
  activePoCount,
  formatDateShort,
  lastOrderDate,
  lifetimeValue,
} from '../helpers';
import { SupplierDetailPanel } from '../supplier-detail-panel';
import { NewSupplierDialog } from '../new-supplier-dialog';

export function SuppliersTab() {
  const suppliers = usePartsStore((s) => s.suppliers);
  const purchaseOrders = usePartsStore((s) => s.purchaseOrders);

  const [selected, setSelected] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

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
      {/* Tab subheader with title + count + CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-ink-primary">Suppliers</h2>
          <span className="text-sm text-ink-muted">
            · {suppliers.length} total
          </span>
        </div>
        <Gate
          role={['R12', 'R19', 'R22', 'R24']}
          fallback="tooltip"
          tooltipMessage="Requires Parts Manager role"
        >
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-accent text-white',
              'text-sm font-medium hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Supplier
          </button>
        </Gate>
      </div>

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
      <NewSupplierDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
