/**
 * Inventory route tree layout.
 *
 * Mounts VehiclesStoreHydrator so the in-memory vehicles-store is seeded
 * before /inventory/[vin] reads `useVehiclesStore` for the runtime cost-ledger
 * merge (VehicleDetailView L40). Without this, runtime cost-ledger entries
 * written by custom-builds deliverJob never surface on the inventory tab.
 *
 * Hydration is idempotent — mounting in both /inventory and /vehicles is safe.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 L40 (merge on inventory view)
 */

import type { ReactNode } from 'react';
import { VehiclesStoreHydrator } from '@/src/lib/vehicles/vehicles-store-hydrator';

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <VehiclesStoreHydrator />
      {children}
    </>
  );
}
