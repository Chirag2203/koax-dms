/**
 * Column definitions for the Purchase Orders tab.
 * Spec reference: SPEC-PARTS-001 §3.3, PLAN-PARTS-002 §17.1
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { PurchaseOrder, Supplier } from '@dms/types';
import { StateChip, OutletPill, AmountCell } from '@/src/components/primitives';
import {
  formatDateShort,
  isPoExpectedDeliveryOverdue,
  outletIdToCode,
  poStatusToChip,
  staffName,
} from '../helpers';

export interface PoColumnOpts {
  suppliers: Supplier[];
}

export function buildPoColumns(opts: PoColumnOpts): ColumnDef<PurchaseOrder>[] {
  const supplierName = (id: string): string =>
    opts.suppliers.find((s) => s.id === id)?.name ?? id;

  return [
    {
      accessorKey: 'poNo',
      header: 'PO No',
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-ink-primary">
          {row.original.poNo}
        </span>
      ),
      size: 140,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      accessorFn: (row) => supplierName(row.supplierId),
      cell: ({ getValue }) => (
        <span className="text-[13px] text-ink-primary truncate block max-w-[200px]">
          {String(getValue())}
        </span>
      ),
      size: 220,
    },
    {
      id: 'outlet',
      header: 'Outlet',
      accessorFn: (row) => row.outletId,
      cell: ({ row }) => (
        <OutletPill outlet={outletIdToCode(row.original.outletId)} />
      ),
      size: 80,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => <StateChip status={poStatusToChip(row.original.status)} />,
      size: 160,
    },
    {
      id: 'lines',
      header: 'Lines',
      accessorFn: (row) => row.lines.length,
      cell: ({ getValue }) => (
        <span className="font-mono tabular-nums text-[13px] text-ink-secondary">
          {String(getValue())}
        </span>
      ),
      size: 72,
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }) => (
        <AmountCell amount={row.original.total} size="sm" />
      ),
      size: 140,
    },
    {
      id: 'createdBy',
      header: 'Created By',
      accessorFn: (row) => staffName(row.createdBy),
      cell: ({ getValue }) => (
        <span className="text-[13px] text-ink-secondary">
          {String(getValue())}
        </span>
      ),
      size: 140,
    },
    {
      id: 'expectedDelivery',
      header: 'Expected Del',
      accessorKey: 'expectedDeliveryAt',
      cell: ({ row }) => {
        const overdue = isPoExpectedDeliveryOverdue(row.original);
        return (
          <span
            className={`text-[13px] ${
              overdue
                ? 'font-medium text-[rgb(var(--state-stale))]'
                : 'text-ink-secondary'
            }`}
          >
            {formatDateShort(row.original.expectedDeliveryAt)}
          </span>
        );
      },
      size: 120,
    },
  ];
}
