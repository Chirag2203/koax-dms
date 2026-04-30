/**
 * LeadStageChip — renders a stage label chip for a Lead.
 *
 * SPEC-LEADS-001 §9.1
 * Uses inline token classes — follows the same pattern as build-stage-chip.tsx.
 */

import { cn } from '@dms/ui';
import type { LeadStage } from '@dms/types';

const STAGE_CONFIG: Record<LeadStage, { label: string; classes: string }> = {
  NEW:        { label: 'New',        classes: 'bg-bg-hover text-ink-secondary' },
  CONTACTED:  { label: 'Contacted',  classes: 'bg-accent/10 text-accent' },
  QUALIFIED:  { label: 'Qualified',  classes: 'bg-state-success/10 text-state-success' },
  TEST_DRIVE: { label: 'Test Drive', classes: 'bg-state-warning/10 text-state-warning' },
  QUOTED:     { label: 'Quoted',     classes: 'bg-[rgb(var(--state-reserved)/0.12)] text-[rgb(var(--state-reserved))]' },
  SO_RAISED:  { label: 'SO Raised',  classes: 'bg-state-success/15 text-state-success' },
  DELIVERED:  { label: 'Delivered',  classes: 'bg-state-success/20 text-state-success font-semibold' },
  LOST:       { label: 'Lost',       classes: 'bg-state-error/10 text-state-error' },
};

interface LeadStageChipProps {
  stage: LeadStage;
  className?: string;
}

export function LeadStageChip({ stage, className }: LeadStageChipProps) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        cfg.classes,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
