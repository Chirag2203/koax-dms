/**
 * Column definitions for the Movement History DataTable.
 *
 * Extracted per the P2 tab-column pattern so the tab shell stays ≤ 350 LoC.
 * Spec reference: PLAN-PARTS-003 §10
 *
 * .tsx because Ref cells render <Link> with conditional branching and a
 * two-line layout for ADJUST/TRANSFER — easier read in JSX than createElement.
 */

import type { ColumnDef } from '@tanstack/react-table';
import type { StockMovement } from '@dms/types';
import Link from 'next/link';
import { StateChip, OutletPill } from '@/src/components/primitives';
import {
  formatDateTime,
  outletIdToCode,
  staffName,
} from '../helpers';
import {
  movementTypeToChip,
  transferPairDescription,
} from './part-detail-helpers';

export interface PartMovementColumnOpts {
  /** All movements, passed for transfer-pair lookup in the Ref cell. */
  allMovements: StockMovement[];
  /** GRN IDs present in store — governs whether GRN refs render as links. */
  grnIds: Set<string>;
}

export function buildPartMovementColumns(
  opts: PartMovementColumnOpts,
): ColumnDef<StockMovement>[] {
  return [
    {
      accessorKey: 'at',
      header: 'At',
      cell: ({ row }) => (
        <span className="text-[13px] text-ink-secondary">
          {formatDateTime(row.original.at)}
        </span>
      ),
      size: 140,
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: ({ row }) => (
        <StateChip status={movementTypeToChip(row.original.type)} />
      ),
      size: 120,
    },
    {
      accessorKey: 'qty',
      header: 'Qty',
      cell: ({ row }) => {
        const qty = row.original.qty;
        const positive = qty > 0;
        return (
          <span
            className={`font-mono tabular-nums text-[13px] ${
              positive
                ? 'text-[rgb(var(--state-listed))]'
                : 'text-[rgb(var(--state-stale))]'
            }`}
          >
            {positive ? '+' : ''}
            {qty}
          </span>
        );
      },
      size: 80,
    },
    {
      id: 'outlet',
      header: 'Outlet',
      accessorKey: 'outletId',
      cell: ({ row }) => (
        <OutletPill outlet={outletIdToCode(row.original.outletId)} />
      ),
      size: 80,
    },
    {
      id: 'ref',
      header: 'Ref',
      accessorFn: (row) => row.refId,
      cell: ({ row }) => {
        const { refType, refId, reason } = row.original;

        if (refType === 'GRN') {
          const href = opts.grnIds.has(refId)
            ? `/parts/grn/${refId}`
            : undefined;
          if (href) {
            return (
              <Link
                href={href}
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-[13px] text-accent hover:text-accent/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                {refId}
              </Link>
            );
          }
          return (
            <span className="font-mono text-[13px] text-ink-secondary">
              {refId}
            </span>
          );
        }

        if (refType === 'JOBCARD') {
          return (
            <Link
              href={`/service/jobcards/${refId}`}
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-[13px] text-accent hover:text-accent/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              {refId}
            </Link>
          );
        }

        if (refType === 'ADJUST') {
          return (
            <div className="flex flex-col">
              <span className="font-mono text-[13px] text-ink-secondary">
                {refId}
              </span>
              {reason ? (
                <span className="text-[11px] text-ink-muted">{reason}</span>
              ) : null}
            </div>
          );
        }

        // TRANSFER — show refId + "FROM → TO" on second line
        const pair = transferPairDescription(row.original, opts.allMovements);
        return (
          <div className="flex flex-col">
            <span className="font-mono text-[13px] text-ink-secondary">
              {refId}
            </span>
            {pair ? (
              <span className="text-[11px] text-ink-muted">{pair}</span>
            ) : null}
          </div>
        );
      },
      enableSorting: false,
      size: 160,
    },
    {
      id: 'actor',
      header: 'Actor',
      accessorFn: (row) => staffName(row.actorId),
      cell: ({ getValue }) => (
        <span className="text-[13px] text-ink-secondary">
          {String(getValue())}
        </span>
      ),
      size: 140,
    },
  ];
}
