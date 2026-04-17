/**
 * Column definitions for the Stock List tab.
 * Spec reference: SPEC-PARTS-001 §3.1, PLAN-PARTS-002 §17.5
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { Part } from '@dms/types';
import { createElement as h } from 'react';
import { StateChip } from '@/src/components/primitives';
import { StockBadges } from '../stock-badges';
import { formatINR, stockStatusFor, stockStatusToChip } from '../helpers';

export interface StockListColumnOpts {
  outletFilter?: string;
}

export function buildStockListColumns(
  opts: StockListColumnOpts = {},
): ColumnDef<Part>[] {
  return [
    {
      accessorKey: 'partCode',
      header: 'Part Code',
      cell: ({ row }) =>
        h(
          'span',
          { className: 'font-mono text-[13px] text-ink-primary' },
          row.original.partCode,
        ),
      size: 160,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) =>
        h(
          'span',
          { className: 'text-[13px] text-ink-primary truncate block max-w-[260px]' },
          row.original.name,
        ),
      size: 280,
    },
    {
      accessorKey: 'brand',
      header: 'Brand',
      cell: ({ row }) =>
        h(
          'span',
          { className: 'text-[13px] text-ink-secondary' },
          row.original.brand,
        ),
      size: 120,
    },
    {
      id: 'fits',
      header: 'Fits',
      cell: ({ row }) => {
        const fits = row.original.fitsVehicles;
        const shown = fits.slice(0, 2);
        const extra = fits.length - shown.length;
        return h(
          'span',
          { className: 'inline-flex items-center gap-1 flex-wrap' },
          ...shown.map((f, i) =>
            h(
              'span',
              {
                key: i,
                className:
                  'inline-flex items-center px-1.5 py-0.5 rounded bg-bg-subtle text-[11px] text-ink-secondary max-w-[140px] truncate',
              },
              f,
            ),
          ),
          extra > 0
            ? h(
                'span',
                {
                  key: 'more',
                  className: 'text-[11px] text-ink-muted',
                },
                `+${extra} more`,
              )
            : null,
        );
      },
      enableSorting: false,
      size: 260,
    },
    {
      id: 'stock',
      header: 'Stock',
      cell: ({ row }) => h(StockBadges, { stock: row.original.stock }),
      enableSorting: false,
      size: 260,
    },
    {
      id: 'reorderLevel',
      header: 'Reorder',
      cell: ({ row }) => {
        const worst = row.original.stock.reduce(
          (acc, s) => (s.reorderLevel > acc ? s.reorderLevel : acc),
          0,
        );
        return h(
          'span',
          {
            className: 'font-mono tabular-nums text-[13px] text-ink-secondary',
          },
          worst,
        );
      },
      enableSorting: false,
      size: 80,
    },
    {
      accessorKey: 'avgCost',
      header: 'Avg Cost',
      cell: ({ row }) =>
        h(
          'span',
          { className: 'font-mono tabular-nums text-[13px] text-ink-primary' },
          formatINR(row.original.avgCost),
        ),
      size: 120,
    },
    {
      accessorKey: 'mrp',
      header: 'MRP',
      cell: ({ row }) =>
        h(
          'span',
          { className: 'font-mono tabular-nums text-[13px] text-ink-secondary' },
          formatINR(row.original.mrp),
        ),
      size: 120,
    },
    {
      id: 'location',
      header: 'Location',
      cell: ({ row }) => {
        // When an outlet filter is active, show that outlet's bin/rack.
        // Otherwise, show the stock row whose qty is highest (the "home"
        // outlet) so the Location column is meaningful at a glance.
        // Full per-outlet breakdown lives in the P3 Part Detail route.
        const filtered = opts.outletFilter
          ? row.original.stock.find((s) => s.outletId === opts.outletFilter)
          : undefined;
        const fallback = row.original.stock.reduce<typeof row.original.stock[number] | undefined>(
          (best, s) => (best === undefined || s.qty > best.qty ? s : best),
          undefined,
        );
        const pick = filtered ?? fallback;
        return h(
          'span',
          { className: 'font-mono text-[12px] text-ink-secondary' },
          pick?.location ?? '—',
        );
      },
      enableSorting: false,
      size: 110,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = stockStatusFor(row.original, opts.outletFilter);
        return h(StateChip, { status: stockStatusToChip(status) });
      },
      enableSorting: false,
      size: 100,
    },
  ];
}
