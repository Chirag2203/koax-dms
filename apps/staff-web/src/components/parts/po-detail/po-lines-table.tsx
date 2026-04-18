/**
 * PoLinesTable — 7-col table with received-so-far cross-join.
 *
 * Spec reference: PLAN-PARTS-006 §4.2
 */

'use client';

import { useMemo } from 'react';
import type { PurchaseOrder, PurchaseOrderLine } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { formatINR } from '../helpers';
import { receivedQtyForLine } from './po-detail-helpers';
import { cn } from '@dms/ui';

export interface PoLinesTableProps {
  po: PurchaseOrder;
}

const DISPATCHED_PLUS: string[] = [
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
];

export function PoLinesTable({ po }: PoLinesTableProps) {
  const grns = usePartsStore((s) => s.grns);
  const parts = usePartsStore((s) => s.parts);

  const showReceived = DISPATCHED_PLUS.includes(po.status);

  const rows = useMemo(
    () =>
      po.lines.map((line) => ({
        line,
        part: parts.find((p) => p.partCode === line.partCode),
        receivedSoFar: showReceived
          ? receivedQtyForLine(line, po.id, grns)
          : undefined,
      })),
    [po.lines, po.id, grns, parts, showReceived],
  );

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Lines ({po.lines.length})
      </h2>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-2 pr-4 text-left font-mono text-[11px] uppercase tracking-widest text-ink-muted w-10">
                #
              </th>
              <th className="pb-2 pr-4 text-left font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Part
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted w-20">
                Qty
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Unit Price
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Line Total
              </th>
              {showReceived && (
                <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                  Received
                </th>
              )}
              <th className="pb-2 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ line, part, receivedSoFar }, idx) => (
              <PoLineRow
                key={line.id}
                index={idx + 1}
                line={line}
                partName={part?.name}
                orderedQty={line.qty}
                receivedSoFar={receivedSoFar}
                showReceived={showReceived}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td
                colSpan={showReceived ? 4 : 3}
                className="pt-3 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted"
              >
                Total
              </td>
              <td className="pt-3 pr-4">
                <AmountCell amount={po.total} align="right" size="md" />
              </td>
              {showReceived && <td />}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

// ─── Line Row ─────────────────────────────────────────────────────────────────

interface PoLineRowProps {
  index: number;
  line: PurchaseOrderLine;
  partName: string | undefined;
  orderedQty: number;
  receivedSoFar: number | undefined;
  showReceived: boolean;
}

function PoLineRow({
  index,
  line,
  partName,
  orderedQty,
  receivedSoFar,
  showReceived,
}: PoLineRowProps) {
  const isComplete = receivedSoFar !== undefined && receivedSoFar >= orderedQty;
  const isPartial = receivedSoFar !== undefined && receivedSoFar > 0 && receivedSoFar < orderedQty;

  return (
    <tr className="border-b border-line/50 hover:bg-bg-subtle/50 transition-colors">
      <td className="py-3 pr-4 font-mono text-[12px] text-ink-muted">{index}</td>
      <td className="py-3 pr-4">
        <span className="font-mono text-[13px] text-ink-primary block">{line.partCode}</span>
        {partName && (
          <span className="text-[12px] text-ink-muted">{partName}</span>
        )}
      </td>
      <td className="py-3 pr-4 text-right font-mono tabular-nums text-[13px] text-ink-primary">
        {orderedQty}
      </td>
      <td className="py-3 pr-4">
        <AmountCell amount={line.unitPrice} align="right" size="sm" />
      </td>
      <td className="py-3 pr-4">
        <AmountCell amount={line.lineTotal} align="right" size="sm" />
      </td>
      {showReceived && (
        <td className="py-3 pr-4 text-right">
          <span
            className={cn(
              'font-mono tabular-nums text-[13px]',
              isComplete && 'text-[rgb(var(--state-listed))]',
              isPartial && 'text-[rgb(var(--state-overdue))]',
              !isComplete && !isPartial && 'text-ink-muted',
            )}
          >
            {receivedSoFar} / {orderedQty}
          </span>
        </td>
      )}
      <td />
    </tr>
  );
}
