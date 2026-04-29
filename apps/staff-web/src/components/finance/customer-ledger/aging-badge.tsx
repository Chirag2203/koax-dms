/**
 * Aging badge — SPEC-FINANCE-001 L7
 *
 * L7: 0–30d = green, 31–60d = amber, 61+d = red. Against invoiceIssuedAt.
 * SPEC-ARCH-UI-001 §StateChip pattern.
 */

'use client';

import type { AgingState } from '@dms/types';

interface AgingBadgeProps {
  state: AgingState;
  ageDays: number;
}

const AGING_CONFIG: Record<AgingState, { chip: string; dot: string }> = {
  green: {
    chip: 'bg-[rgb(var(--state-listed)/0.08)] text-[rgb(var(--state-listed))]',
    dot: 'bg-[rgb(var(--state-listed))]',
  },
  amber: {
    chip: 'bg-[rgb(var(--state-pending)/0.08)] text-[rgb(var(--state-pending))]',
    dot: 'bg-[rgb(var(--state-pending))]',
  },
  red: {
    chip: 'bg-[rgb(var(--state-overdue)/0.08)] text-[rgb(var(--state-overdue))]',
    dot: 'bg-[rgb(var(--state-overdue))]',
  },
};

export function AgingBadge({ state, ageDays }: AgingBadgeProps) {
  const cfg = AGING_CONFIG[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${cfg.chip}`}
      title={`${ageDays} days outstanding`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {ageDays}d
    </span>
  );
}
