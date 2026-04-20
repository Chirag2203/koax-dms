/**
 * useCpoEligibility — memoized CPO badge hook for customer-web (portal).
 *
 * Parallel to staff-web's hook. Uses the portal vehicles-client-store
 * (standalone Zustand instance) + fixtures for job cards.
 *
 * Note: The portal's OwnedVehicleView already pre-computes CPO via
 * buildOwnedVehicleView in portal-vehicle-adapter. This hook is for
 * components that need the CPO result outside of the full view context.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.5
 */

'use client';

import { useMemo } from 'react';
import { usePortalVehiclesStore } from './vehicles-client-store';
import { isCpoEligible } from '@dms/vehicles-core';
import type { CpoResult } from '@dms/vehicles-core';
import { jobCards, warrantyClaims } from '@dms/mocks/fixtures';

const NOT_FOUND_RESULT: CpoResult = {
  badge: 'NOT_ELIGIBLE',
  eligible: false,
  reasons: [{ code: 'VEHICLE_NOT_FOUND', message: 'Vehicle not found in registry' }],
};

/** Cache keyed by `${vin}::${lastJcId}` */
const cpoCache = new Map<string, CpoResult>();

export function useCpoEligibility(vin: string): CpoResult {
  const vehicle = usePortalVehiclesStore((s) => s.vehicles[vin]);

  return useMemo(() => {
    if (!vehicle) return NOT_FOUND_RESULT;

    const vinJcs = jobCards.filter((j) => j.vin === vin);
    const lastJcId = vinJcs.reduce((max, j) => (j.id > max ? j.id : max), '');
    const cacheKey = `${vin}::${lastJcId}`;

    const cached = cpoCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date().toISOString();
    const vinWarranties = warrantyClaims.filter((w) => w.vin === vin);
    const result = isCpoEligible(vin, vinJcs, vinWarranties, vehicle, now);

    cpoCache.set(cacheKey, result);
    return result;
  }, [vehicle, vin]);
}
