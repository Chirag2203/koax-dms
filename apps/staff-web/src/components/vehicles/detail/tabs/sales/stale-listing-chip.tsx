'use client';

/**
 * StaleListingChip — renders an amber/red badge when a vehicle has been
 * on lot too long. Suppressed while deal is 'reserved'.
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §8, L23
 * LoC budget: ≤40
 */

import { staleListingChip } from '@dms/vehicles-core';
import { cn } from '@dms/ui';

export interface StaleListingChipProps {
  listedAt?: string;
  dealStage?: string;
}

export function StaleListingChip({ listedAt, dealStage }: StaleListingChipProps) {
  if (!listedAt) return null;

  const chip = staleListingChip(listedAt, new Date().toISOString(), dealStage);

  if (!chip) return null;

  const isVeryStale = chip === 'very-stale-180d';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        isVeryStale
          ? 'bg-state-danger/15 text-state-danger border border-state-danger/25'
          : 'bg-[rgb(var(--state-warning)/0.15)] text-[rgb(var(--state-warning))] border border-[rgb(var(--state-warning)/0.25)]',
      )}
    >
      {isVeryStale ? 'On lot 180+ days' : 'On lot 90+ days'}
    </span>
  );
}
