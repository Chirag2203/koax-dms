/**
 * Column definitions for the GRNs tab.
 * Spec reference: SPEC-PARTS-001 §3.4, PLAN-PARTS-002 §17.2
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { Grn, Supplier } from '@dms/types';
import { StateChip, OutletPill } from '@/src/components/primitives';
import {
  formatDateTime,
  grnHasDiscrepancy,
  grnReceivedOrdered,
  grnStatusToChip,
  outletIdToCode,
  staffName,
} from '../helpers';

export interface GrnColumnOpts {
  suppliers: Supplier[];
}

export function buildGrnColumns(opts: GrnColumnOpts): ColumnDef<Grn>[] {
  const supplierName = (id: string): string =>
    opts.suppliers.find((s) => s.id === id)?.name ?? id;

  return [
    {
      accessorKey: 'grnNo',
      header: 'GRN No',
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-ink-primary">
          {row.original.grnNo}
        </span>
      ),
      size: 140,
    },
    {
      accessorKey: 'poId',
      header: 'PO No',
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-accent">
          {row.original.poId ?? '—'}
        </span>
      ),
      size: 140,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      accessorFn: (row) => supplierName(row.supplierId),
      cell: ({ getValue }) => (
        <span className="text-[13px] text-ink-primary truncate block max-w-[180px]">
          {String(getValue())}
        </span>
      ),
      size: 200,
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
      cell: ({ row }) => <StateChip status={grnStatusToChip(row.original.status)} />,
      size: 140,
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
      size: 64,
    },
    {
      id: 'recvOrd',
      header: 'Recv/Ord',
      accessorFn: (row) => {
        const { received, ordered } = grnReceivedOrdered(row);
        return ordered === 0 ? 0 : received / ordered;
      },
      cell: ({ row }) => {
        const { received, ordered } = grnReceivedOrdered(row.original);
        const short = received < ordered;
        return (
          <span className="font-mono tabular-nums text-[13px]">
            <span
              className={
                short
                  ? 'text-[rgb(var(--state-overdue))]'
                  : 'text-ink-primary'
              }
            >
              {received}
            </span>
            <span className="text-ink-muted">/{ordered}</span>
          </span>
        );
      },
      size: 96,
    },
    {
      accessorKey: 'receivedAt',
      header: 'Received At',
      cell: ({ row }) => (
        <span className="text-[13px] text-ink-secondary">
          {formatDateTime(row.original.receivedAt)}
        </span>
      ),
      size: 140,
    },
    {
      id: 'receivedBy',
      header: 'Received By',
      accessorFn: (row) => staffName(row.receivedBy),
      cell: ({ getValue }) => (
        <span className="text-[13px] text-ink-secondary">
          {String(getValue())}
        </span>
      ),
      size: 130,
    },
    {
      id: 'discrepancy',
      header: 'Discrepancy',
      accessorFn: (row) => (grnHasDiscrepancy(row) ? 1 : 0),
      cell: ({ row }) =>
        grnHasDiscrepancy(row.original) ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--state-overdue))]">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--state-overdue))]"
            />
            Discrepancy
          </span>
        ) : (
          <span className="text-ink-muted" aria-hidden="true">
            —
          </span>
        ),
      size: 130,
    },
  ];
}
