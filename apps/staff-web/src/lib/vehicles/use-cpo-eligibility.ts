/**
 * useCpoEligibility — memoized CPO badge hook for staff-web.
 *
 * Memoization key: `(vin, lastJcId)` where `lastJcId` = lexicographic max
 * of job card IDs for the given VIN. The result is only recomputed when a
 * new JC is added for that VIN — stable between unrelated store mutations.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.5
 */

'use client';

import { useMemo } from 'react';
import { useVehiclesStore } from './vehicles-store';
import { useServiceStore } from '@/src/lib/service/service-store';
import { isCpoEligible } from '@dms/vehicles-core';
import type { CpoResult } from '@dms/vehicles-core';

const NOT_FOUND_RESULT: CpoResult = {
  badge: 'NOT_ELIGIBLE',
  eligible: false,
  reasons: [{ code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found in registry' }],
};

/** Cache keyed by `${vin}::${lastJcId}` — survives re-renders, resets on JC change. */
const cpoCache = new Map<string, CpoResult>();

export function useCpoEligibility(vin: string): CpoResult {
  const vehicle = useVehiclesStore((s) => s.vehicles[vin]);
  const jobCards = useServiceStore((s) => s.jobCards);
  const warrantyClaims = useServiceStore((s) => s.warrantyClaims);

  return useMemo(() => {
    if (!vehicle) return NOT_FOUND_RESULT;

    // Build memoization key — only recompute when the last JC for this VIN changes
    const vinJcs = jobCards.filter((j) => j.vin === vin);
    const lastJcId = vinJcs.reduce((max, j) => (j.id > max ? j.id : max), '');
    const cacheKey = `${vin}::${lastJcId}`;

    const cached = cpoCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date().toISOString();
    const result = isCpoEligible(
      vin,
      vinJcs,
      warrantyClaims.filter((w) => w.vin === vin),
      vehicle,
      now,
    );

    cpoCache.set(cacheKey, result);
    return result;
  }, [vehicle, jobCards, warrantyClaims, vin]);
}
