'use client';

/**
 * TimelineEntryChips — renders the chip row for a timeline entry.
 *
 * Receives pre-resolved chip data from TimelineEntryView.
 * Token-only styling using --state-* CSS vars.
 *
 * Spec reference: PLAN-VEHICLES-003 §5, deliverable #7
 * LoC budget: ≤80
 */

import { cn } from '@dms/ui';
import type { TimelineChip } from '@dms/vehicles-core';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TimelineEntryChipsProps {
  chips: TimelineChip[];
  /** Resolved chip labels (caller resolves i18n) */
  labels: Record<string, string>;
}

// ─── Chip style map ───────────────────────────────────────────────────────────

const CHIP_STYLES: Record<TimelineChip['kind'], string> = {
  info:    'bg-[rgb(var(--state-draft)/0.12)] text-[rgb(var(--state-draft))] border-[rgb(var(--state-draft)/0.25)]',
  success: 'bg-[rgb(var(--state-listed)/0.12)] text-[rgb(var(--state-listed))] border-[rgb(var(--state-listed)/0.25)]',
  warning: 'bg-[rgb(var(--state-stale)/0.12)] text-[rgb(var(--state-stale))] border-[rgb(var(--state-stale)/0.25)]',
  danger:  'bg-[rgb(var(--state-overdue)/0.12)] text-[rgb(var(--state-overdue))] border-[rgb(var(--state-overdue)/0.25)]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TimelineEntryChips({ chips, labels }: TimelineEntryChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((chip, i) => {
        const label = labels[chip.labelKey] ?? chip.labelKey;
        return (
          <span
            key={`${chip.labelKey}-${i}`}
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
              CHIP_STYLES[chip.kind],
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
