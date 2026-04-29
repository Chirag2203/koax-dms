/**
 * TCS threshold chip — SPEC-FINANCE-001 L21
 *
 * L21: 4-state threshold progression:
 *      safe (<₹6L) = no chip,
 *      approaching (₹6L–₹8L) = neutral,
 *      near (₹8L–₹10L) = amber,
 *      breached (≥₹10L) = red.
 *
 * IT Act §206C(1F); Doc 06 §TCS.
 * SPEC-ARCH-UI-001 §StateChip pattern — rounded, text-[10px].
 */

'use client';

import type { TcsThresholdState } from '@dms/types';
import { formatINRCompact } from '@/src/lib/finance/math/rounding';
import {
  TCS_THRESHOLD_PAISE,
  TCS_APPROACHING_LOWER_PAISE,
  TCS_NEAR_LOWER_PAISE,
} from '@/src/lib/finance/math/tcs';

interface TcsThresholdChipProps {
  state: TcsThresholdState;
  cumulativePaise: number;
  tcsApplicablePaise: number;
  waivedSalesCount: number;
}

const STATE_CONFIG: Record<TcsThresholdState, {
  chip: string;
  dot: string;
  label: string;
} | null> = {
  safe: null, // L21: no chip for safe state
  approaching: {
    chip: 'bg-bg-subtle border border-line text-ink-secondary',
    dot: 'bg-ink-muted',
    label: 'Approaching',
  },
  near: {
    // amber per L21 — ≥ 80% of ₹10L threshold
    chip: 'bg-[rgb(var(--state-pending)/0.08)] text-[rgb(var(--state-pending))]',
    dot: 'bg-[rgb(var(--state-pending))]',
    label: '≥ 80% threshold',
  },
  breached: {
    // red per L21 — ≥ ₹10L
    chip: 'bg-[rgb(var(--state-overdue)/0.08)] text-[rgb(var(--state-overdue))]',
    dot: 'bg-[rgb(var(--state-overdue))]',
    label: 'Threshold breached',
  },
};

/**
 * TCS threshold chip.
 * L21: IT Act §206C(1F); Doc 06 §TCS.
 */
export function TcsThresholdChip({
  state,
  cumulativePaise,
  tcsApplicablePaise,
  waivedSalesCount,
}: TcsThresholdChipProps) {
  const config = STATE_CONFIG[state];

  if (!config) return null; // safe state — no chip

  // Tooltip for S-F-17 edge case (waived amounts affect threshold calc)
  const hasWaived = waivedSalesCount > 0;
  const tooltipText = hasWaived
    ? `${formatINRCompact(cumulativePaise)} total · ${formatINRCompact(cumulativePaise - tcsApplicablePaise)} waived · ${formatINRCompact(tcsApplicablePaise)} TCS-applicable`
    : `Cumulative: ${formatINRCompact(cumulativePaise)} of ${formatINRCompact(TCS_THRESHOLD_PAISE)} threshold`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${config.chip}`}
      title={tooltipText}
      aria-label={`TCS status: ${config.label}. ${tooltipText}`}
    >
      {/* L21: dot indicator */}
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
