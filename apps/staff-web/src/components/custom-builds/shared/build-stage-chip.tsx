/**
 * BuildStageChip — renders a coloured stage badge for a BuildJob.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §5.1 (card stage chip)
 */

import { cn } from '@dms/ui';
import type { BuildJobStage } from '@dms/types';

const STAGE_CONFIG: Record<
  BuildJobStage,
  { label: string; dot: string; chip: string }
> = {
  ENQUIRY: {
    label: 'Enquiry',
    dot: 'bg-[rgb(var(--state-draft))]',
    chip: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
  },
  QUOTED: {
    label: 'Quoted',
    dot: 'bg-[rgb(var(--state-reserved))]',
    chip: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  },
  APPROVED: {
    label: 'Approved',
    dot: 'bg-[rgb(var(--state-listed))]',
    chip: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  },
  PARTS_ORDERING: {
    label: 'Parts Ordering',
    dot: 'bg-[rgb(var(--state-pending))]',
    chip: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    dot: 'bg-[rgb(var(--state-in-refurb))]',
    chip: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  },
  QC: {
    label: 'QC',
    dot: 'bg-[rgb(var(--state-cpo))]',
    chip: 'bg-[rgb(var(--state-cpo)/0.1)] text-[rgb(var(--state-cpo))]',
  },
  QC_FAILED: {
    label: 'QC Failed',
    dot: 'bg-[rgb(var(--state-overdue))]',
    chip: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  },
  DELIVERED: {
    label: 'Delivered',
    dot: 'bg-[rgb(var(--state-sold))]',
    chip: 'bg-[rgb(var(--state-sold)/0.1)] text-[rgb(var(--state-sold))]',
  },
  CANCELLED: {
    label: 'Cancelled',
    dot: 'bg-[rgb(var(--state-stale))]',
    chip: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  },
};

interface BuildStageChipProps {
  stage: BuildJobStage;
  className?: string;
}

export function BuildStageChip({ stage, className }: BuildStageChipProps) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5',
        'font-mono text-[10px] uppercase tracking-widest',
        cfg.chip,
        className,
      )}
      aria-label={`Stage: ${cfg.label}`}
    >
      <span
        className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', cfg.dot)}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
