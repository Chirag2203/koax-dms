/**
 * LeadScoreChip — renders a Cold/Warm/Hot chip.
 *
 * SPEC-LEADS-001 L14:
 *   Cold = state-neutral (muted)
 *   Warm = state-warning (amber)
 *   Hot  = state-error (red)
 *
 * Uses Tailwind state token classes — never arbitrary colors.
 * No redefinition of StateChip — uses inline tokens per the same pattern
 * as custom-builds new-flow wizard components.
 */

import { cn } from '@dms/ui';
import type { LeadScore } from '@dms/types';
import { scoreLabel } from '@/src/lib/leads/lead-score';

interface LeadScoreChipProps {
  score: LeadScore;
  className?: string;
}

export function LeadScoreChip({ score, className }: LeadScoreChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
        score === 'HOT' && 'bg-state-error/10 text-state-error',
        score === 'WARM' && 'bg-state-warning/10 text-state-warning',
        score === 'COLD' && 'bg-bg-hover text-ink-muted',
        className,
      )}
      aria-label={`Lead score: ${scoreLabel(score)}`}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          score === 'HOT' && 'bg-state-error',
          score === 'WARM' && 'bg-state-warning',
          score === 'COLD' && 'bg-ink-muted',
        )}
        aria-hidden="true"
      />
      {scoreLabel(score)}
    </span>
  );
}
