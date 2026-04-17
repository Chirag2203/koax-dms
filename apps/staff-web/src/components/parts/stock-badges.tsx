/**
 * StockBadges — per-outlet qty mini-chips with a single group-level aria-label.
 *
 * Always renders 3 chips in fixed order BLR / MUM / CHE. Missing outlet rows
 * render as dashed-outline "—" chips. Screen readers see the whole group as
 * one utterance (e.g. "Stock: Bangalore 8, Mumbai 3 low, Chennai 6").
 *
 * Spec reference: PLAN-PARTS-002 §7, §17.4 StockBadges primitive
 */

'use client';

import type { PartStock } from '@dms/types';
import { cn } from '@dms/ui';
import { OUTLET_NAMES, OUTLET_ORDER, OUTLET_SHORT } from './helpers';

// ─── Aria label composer (pure) ──────────────────────────────────────────────

/**
 * `[{BLR-01, 8, 4}, {MUM-01, 3, 5}, {CHE-01, 6, 4}]`
 *   → "Stock: Bangalore 8, Mumbai 3 low, Chennai 6"
 */
export function buildStockAriaLabel(stock: PartStock[]): string {
  const parts = OUTLET_ORDER.map((outletId) => {
    const row = stock.find((s) => s.outletId === outletId);
    const name = OUTLET_NAMES[outletId] ?? outletId;
    if (!row) return `${name} none`;
    if (row.qty === 0) return `${name} out`;
    if (row.qty <= row.reorderLevel) return `${name} ${row.qty} low`;
    return `${name} ${row.qty}`;
  });
  return `Stock: ${parts.join(', ')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface StockBadgesProps {
  stock: PartStock[];
  className?: string;
}

export function StockBadges({ stock, className }: StockBadgesProps) {
  return (
    <span
      role="group"
      aria-label={buildStockAriaLabel(stock)}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      {OUTLET_ORDER.map((outletId) => {
        const row = stock.find((s) => s.outletId === outletId);
        return (
          <ChipForOutlet key={outletId} outletId={outletId} row={row} />
        );
      })}
    </span>
  );
}

// ─── Per-outlet chip ─────────────────────────────────────────────────────────

interface ChipProps {
  outletId: string;
  row: PartStock | undefined;
}

function ChipForOutlet({ outletId, row }: ChipProps) {
  const short = OUTLET_SHORT[outletId] ?? outletId;

  // Missing outlet row → dashed outline "—" chip
  if (!row) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded',
          'text-[11px] font-mono border border-dashed border-line text-ink-muted',
        )}
      >
        {short}&nbsp;—
      </span>
    );
  }

  let dotCls: string;
  let textCls: string;
  if (row.qty === 0) {
    dotCls = 'bg-[rgb(var(--state-stale))]';
    textCls = 'text-[rgb(var(--state-stale))]';
  } else if (row.qty <= row.reorderLevel) {
    dotCls = 'bg-[rgb(var(--state-overdue))]';
    textCls = 'text-[rgb(var(--state-overdue))]';
  } else {
    dotCls = 'bg-ink-muted';
    textCls = 'text-ink-secondary';
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded',
        'text-[11px] font-mono bg-bg-subtle',
        textCls,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotCls)} />
      {short}&nbsp;{row.qty}
    </span>
  );
}
