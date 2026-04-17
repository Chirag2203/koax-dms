/**
 * Column definitions for the Low Stock tab.
 * Spec reference: SPEC-PARTS-001 §3.2, PLAN-PARTS-002 §6.2, §17.4
 *
 * .tsx extension because one cell renderer returns a <Link>; the inline
 * stopPropagation handler is cleaner in JSX than React.createElement.
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { Part, PurchaseOrder } from '@dms/types';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StockBadges } from '../stock-badges';
import {
  shortfallFor,
  daysOfCover,
  lastPoDateFor,
  formatDateShort,
} from '../helpers';

export interface LowStockColumnOpts {
  outletFilter?: string;
  purchaseOrders: PurchaseOrder[];
}

export function buildLowStockColumns(
  opts: LowStockColumnOpts,
): ColumnDef<Part>[] {
  const { outletFilter, purchaseOrders } = opts;

  return [
    {
      accessorKey: 'partCode',
      header: 'Part Code',
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-ink-primary">
          {row.original.partCode}
        </span>
      ),
      size: 160,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="text-[13px] text-ink-primary truncate block max-w-[260px]">
          {row.original.name}
        </span>
      ),
      size: 280,
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => <StockBadges stock={row.original.stock} />,
      enableSorting: false,
      size: 260,
    },
    {
      id: 'shortfall',
      header: 'Shortfall',
      accessorFn: (row) => shortfallFor(row, outletFilter),
      cell: ({ getValue }) => {
        const v = getValue() as number;
        return (
          <span className="font-mono tabular-nums text-[13px] font-medium text-[rgb(var(--state-overdue))]">
            {v}
          </span>
        );
      },
      size: 100,
    },
    {
      id: 'doc',
      header: 'DoC',
      accessorFn: (row) => daysOfCover(row, outletFilter) ?? -1,
      cell: ({ row }) => {
        const v = daysOfCover(row.original, outletFilter);
        if (v === null) {
          return <span className="text-[13px] text-ink-muted">—</span>;
        }
        return (
          <span className="font-mono tabular-nums text-[13px] text-ink-secondary">
            {v}&nbsp;d
          </span>
        );
      },
      size: 80,
    },
    {
      id: 'lastPo',
      header: 'Last PO',
      accessorFn: (row) =>
        lastPoDateFor(row.partCode, purchaseOrders) ?? '',
      cell: ({ row }) => {
        const iso = lastPoDateFor(row.original.partCode, purchaseOrders);
        return (
          <span className="text-[13px] text-ink-secondary">
            {formatDateShort(iso ?? undefined)}
          </span>
        );
      },
      size: 110,
    },
    {
      id: 'raisePo',
      header: '',
      cell: ({ row }) => (
        <Link
          href={`/parts/po/new?part=${row.original.partCode}`}
          aria-label={`Raise PO for ${row.original.partCode}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-primary hover:bg-bg-subtle hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          Raise PO
          <ArrowRight aria-hidden="true" className="h-3 w-3" />
        </Link>
      ),
      enableSorting: false,
      size: 130,
    },
  ];
}
