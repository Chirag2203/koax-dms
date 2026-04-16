import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StateChipStatus =
  | 'listed'
  | 'reserved'
  | 'in-refurb'
  | 'stale'
  | 'sold'
  | 'draft'
  | 'overdue'
  | 'cpo'
  | 'pending';

export interface StateChipProps {
  status: StateChipStatus;
  /** Override label; defaults to formatted status name */
  label?: string;
  className?: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StateChipStatus,
  { label: string; dot: string; chip: string }
> = {
  listed: {
    label: 'Listed',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  reserved: {
    label: 'Reserved',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  'in-refurb': {
    label: 'In Refurb',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  stale: {
    label: 'Stale',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
  sold: {
    label: 'Sold',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  draft: {
    label: 'Draft',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  overdue: {
    label: 'Overdue',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  cpo: {
    label: 'CPO',
    dot: 'bg-[rgb(var(--state-cpo))]',
    chip: 'bg-[rgb(var(--state-cpo)/0.1)] text-[rgb(var(--state-cpo))]',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StateChip({ status, label, className }: StateChipProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-widest',
        config.chip,
        className,
      )}
      aria-label={`Status: ${displayLabel}`}
    >
      <span
        className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', config.dot)}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}
