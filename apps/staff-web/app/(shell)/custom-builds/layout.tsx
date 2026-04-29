/**
 * Custom Builds route tree layout.
 *
 * Mounts:
 *   - CustomBuildsStoreHydrator — seeds the custom-builds Zustand store from
 *     fixtures before any /custom-builds component reads from it.
 *   - VehiclesStoreHydrator — the Cost Ledger tab (CostLedgerTab) reads
 *     useVehiclesStore to surface runtime entries written by deliverJob (L39/L40).
 *     Without this hydrator, costLedger[vin] is always {} and LedgerTable never
 *     renders for delivered jobs (falls through to LedgerPreview every time).
 *
 * Both hydrations are idempotent — mounting here and in /vehicles is safe.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §19 P1, L39/L40
 */

import type { ReactNode } from 'react';
import { CustomBuildsStoreHydrator } from '@/src/lib/custom-builds/custom-builds-store-hydrator';
import { VehiclesStoreHydrator } from '@/src/lib/vehicles/vehicles-store-hydrator';

export default function CustomBuildsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CustomBuildsStoreHydrator />
      <VehiclesStoreHydrator />
      {children}
    </>
  );
}
