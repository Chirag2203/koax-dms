/**
 * GrnLinesTable — 6-col 3-way match table.
 *
 * Row tint bg-bg-subtle when DAMAGED/WRONG.
 * Received cell: amber if < ordered, red if 0.
 *
 * Spec reference: PLAN-PARTS-006 §5.2
 */

'use client';

import { useMemo } from 'react';
import type { Grn } from '@dms/types';
import { AmountCell } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { buildGrnLineDisplay, type GrnLineDisplay } from './grn-line-columns';
import { cn } from '@dms/ui';

export interface GrnLinesTableProps {
  grn: Grn;
  hasPo: boolean;
}

const CONDITION_LABELS: Record<string, string> = {
  OK: 'OK',
  DAMAGED: 'Damaged',
  WRONG: 'Wrong item',
};

export function GrnLinesTable({ grn, hasPo }: GrnLinesTableProps) {
  const parts = usePartsStore((s) => s.parts);

  const rows = useMemo(
    () =>
      grn.lines.map((line) => {
        const part = parts.find((p) => p.partCode === line.partCode);
        return buildGrnLineDisplay(line, part?.name, hasPo);
      }),
    [grn.lines, parts, hasPo],
  );

  const grandTotal = rows.reduce((acc, r) => acc + r.lineTotal, 0);

  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-4">
        Lines ({grn.lines.length})
      </h2>
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-2 pr-4 text-left font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Part
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted w-20">
                Ordered
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted w-20">
                Received
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Unit Price
              </th>
              <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Line Total
              </th>
              <th className="pb-2 text-left font-mono text-[11px] uppercase tracking-widest text-ink-muted w-28">
                Condition
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <GrnLineRow key={row.id} row={row} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <td
                colSpan={3}
                className="pt-3 text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted"
              >
                Total
              </td>
              <td className="pt-3 pr-4">
                <AmountCell amount={grandTotal} align="right" size="md" />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

// ─── Line row ─────────────────────────────────────────────────────────────────

function GrnLineRow({ row }: { row: GrnLineDisplay }) {
  const isAbnormal = row.condition === 'DAMAGED' || row.condition === 'WRONG';
  const isShort = row.hasPo && row.receivedQty < row.orderedQty && row.receivedQty > 0;
  const isMissing = row.hasPo && row.receivedQty === 0;

  return (
    <tr
      className={cn(
        'border-b border-line/50 transition-colors',
        isAbnormal && 'bg-bg-subtle',
      )}
    >
      <td className="py-3 pr-4">
        <span className="font-mono text-[13px] text-ink-primary block">{row.partCode}</span>
        {row.partName && (
          <span className="text-[12px] text-ink-muted">{row.partName}</span>
        )}
      </td>
      <td className="py-3 pr-4 text-right font-mono tabular-nums text-[13px] text-ink-muted">
        {row.hasPo ? row.orderedQty : '—'}
      </td>
      <td className="py-3 pr-4 text-right">
        <span
          className={cn(
            'font-mono tabular-nums text-[13px]',
            isMissing && 'text-[rgb(var(--state-danger))]',
            isShort && 'text-[rgb(var(--state-overdue))]',
            !isMissing && !isShort && 'text-ink-primary',
          )}
        >
          {row.receivedQty}
        </span>
      </td>
      <td className="py-3 pr-4">
        <AmountCell amount={row.unitPrice} align="right" size="sm" />
      </td>
      <td className="py-3 pr-4">
        <AmountCell amount={row.lineTotal} align="right" size="sm" />
      </td>
      <td className="py-3">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider',
            row.condition === 'OK' && 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
            row.condition === 'DAMAGED' && 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
            row.condition === 'WRONG' && 'bg-[rgb(var(--state-danger)/0.1)] text-[rgb(var(--state-danger))]',
          )}
        >
          {CONDITION_LABELS[row.condition]}
        </span>
      </td>
    </tr>
  );
}
