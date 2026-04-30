'use client';

/**
 * StaleListingChip — renders an amber/red badge when a vehicle has been
 * on lot too long. Suppressed while deal is 'reserved'.
 *
 * SPEC-INVENTORY-AGING-001: ≥90d vehicles also show a "View in Aging Report"
 * deep-link to `/inventory-aging/[vin]`.
 *
 * Spec reference: PLAN-VEHICLES-003 P2 §8, L23
 *                 SPEC-INVENTORY-AGING-001 §7 (Sales tab enhancement)
 * LoC budget: ≤60
 */

import Link from 'next/link';
import { TrendingDown } from 'lucide-react';
import { staleListingChip } from '@dms/vehicles-core';
import { cn } from '@dms/ui';

export interface StaleListingChipProps {
  listedAt?: string;
  dealStage?: string;
  /** VIN — required for the "View in Aging Report" deep-link (SPEC-INVENTORY-AGING-001) */
  vin?: string;
}

export function StaleListingChip({ listedAt, dealStage, vin }: StaleListingChipProps) {
  if (!listedAt) return null;

  const chip = staleListingChip(listedAt, new Date().toISOString(), dealStage);

  if (!chip) return null;

  const isVeryStale = chip === 'very-stale-180d';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Aging band chip (amber or red) */}
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          isVeryStale
            ? 'bg-state-danger/15 text-state-danger border border-state-danger/25'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
        )}
      >
        {isVeryStale ? 'On lot 180+ days' : 'On lot 90+ days'}
      </span>

      {/* Deep-link to Aging Report — SPEC-INVENTORY-AGING-001 §7 */}
      {vin && (
        <Link
          href={`/inventory-aging/${vin}`}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            isVeryStale
              ? 'text-state-danger hover:underline'
              : 'text-amber-600 dark:text-amber-400 hover:underline',
          )}
          title="View this vehicle in the Inventory Aging report"
        >
          <TrendingDown className="h-3 w-3" aria-hidden="true" />
          View in Aging Report
        </Link>
      )}
    </div>
  );
}
