'use client';

/**
 * TestDriveStatusChip — compact status badge for test-drive bookings.
 * Uses Tailwind semantic classes only (no text-[NNpx]).
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §7
 */

import type { TestDriveStatus } from '@dms/types';

const STATUS_CONFIG: Record<
  TestDriveStatus,
  { label: string; dot: string; chip: string }
> = {
  PENDING: {
    label: 'Pending',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700',
  },
  SCHEDULED: {
    label: 'Scheduled',
    dot: 'bg-blue-500',
    chip: 'bg-blue-50 text-blue-700',
  },
  EXECUTING: {
    label: 'On Drive',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700',
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  NO_SHOW: {
    label: 'No Show',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  CANCELLED: {
    label: 'Cancelled',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
};

interface Props {
  status: TestDriveStatus;
  className?: string;
}

export function TestDriveStatusChip({ status, className = '' }: Props) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5',
        'font-mono text-xs uppercase tracking-widest',
        cfg.chip,
        className,
      ].join(' ')}
      aria-label={`Status: ${cfg.label}`}
    >
      <span className={['inline-block h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot].join(' ')} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
