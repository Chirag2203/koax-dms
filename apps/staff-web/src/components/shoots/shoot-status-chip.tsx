/**
 * ShootStatusChip — status chip for shoot lifecycle states.
 *
 * SPEC-SHOOTS-001 L5: pending → scheduled → in-progress → completed
 * Uses canonical state-chip color tokens per SPEC-ARCH-UI-001.
 */

import type { ShootStatus } from '@dms/types';
import { cn } from '@dms/ui';

const STATUS_CONFIG: Record<
  ShootStatus,
  { label: string; dot: string; chip: string }
> = {
  pending: {
    label: 'Pending',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  scheduled: {
    label: 'Scheduled',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'in-progress': {
    label: 'In Progress',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
};

interface ShootStatusChipProps {
  status: ShootStatus;
  className?: string;
}

export function ShootStatusChip({ status, className }: ShootStatusChipProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5',
        'font-mono text-xs uppercase tracking-widest',
        config.chip,
        className,
      )}
      aria-label={`Shoot status: ${config.label}`}
    >
      <span
        className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', config.dot)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
