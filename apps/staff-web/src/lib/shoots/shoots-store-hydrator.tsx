/**
 * ShootsStoreHydrator
 *
 * Seeds the shoots store from fixtures on first client mount.
 *
 * Also registers Seam 39: auto-creates a Shoot for every inventory vehicle
 * with an ACQUIRED SalesEvent that doesn't already have a shoot in fixtures.
 * This mirrors how the live path works: UI layer reacts to ACQUIRED emission
 * and calls createShoot (per cross-module-wiring.md Seam 39).
 *
 * Spec reference: SPEC-SHOOTS-001 L1 (auto-create on ACQUIRED), L6 (idempotent)
 */

'use client';

import { useEffect, useRef } from 'react';
import { shoots as shootFixtures } from '@dms/mocks/fixtures';
import { vehicles as inventoryVehicles } from '@dms/mocks/fixtures';
import { useShootsStore } from './shoots-store';

// City → outlet mapping (mirrors vehicles-store-hydrator)
const CITY_TO_OUTLET: Record<string, 'BLR-01' | 'MUM-01' | 'CHE-01'> = {
  bangalore: 'BLR-01',
  mumbai: 'MUM-01',
  chennai: 'CHE-01',
};

// Synthetic actor for auto-creation (Sales Manager R10 — the acquiring actor)
const AUTO_ACTOR = { id: 'staff-r10-001', name: 'Sales Manager', role: 'R10' };

export function ShootsStoreHydrator({
  children,
}: {
  children?: React.ReactNode;
}) {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    const store = useShootsStore.getState();

    // Phase 1: Seed fixture data
    store._seed(shootFixtures);

    // Phase 2: Seam 39 — auto-create shoots for inventory vehicles that
    //   have an ACQUIRED event but no shoot in the fixture set.
    //   L6: createShoot is idempotent — skips if shoot already exists for VIN.
    for (const inv of inventoryVehicles) {
      const vin = inv.vin.trim().toUpperCase();
      const outletId = CITY_TO_OUTLET[inv.city] ?? 'BLR-01';

      store.createShoot(vin, outletId, AUTO_ACTOR, {
        vehicleMake: inv.make,
        vehicleModel: inv.model,
        vehicleYear: inv.year,
      });
    }
  }, []);

  return <>{children}</>;
}
