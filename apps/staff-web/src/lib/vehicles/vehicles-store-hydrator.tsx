/**
 * VehiclesStoreHydrator
 *
 * Client-only component that seeds the Zustand vehicles store from fixtures
 * on first client mount, preventing SSR/hydration mismatches.
 *
 * Mount once in the staff-web shell layout alongside PartsStoreHydrator and
 * ServiceStoreHydrator.
 *
 * Spec reference: SPEC-VEHICLES-001 P1 scope (hydrator mount)
 */

'use client';

import { useEffect } from 'react';
import {
  vehicleMasters,
  ownershipRows,
  ownershipEvents,
  ownershipClaims,
} from '@dms/mocks/fixtures';
import { useVehiclesStore } from './vehicles-store';
import { rebuildIndices } from './vehicles-store/index-maintenance';

export function VehiclesStoreHydrator() {
  useEffect(() => {
    const store = useVehiclesStore.getState();

    // Only hydrate once — idempotent guard
    if (store.hydrated) return;

    useVehiclesStore.setState((state) => {
      // Deep-clone fixtures to isolate store mutations from @dms/mocks
      const vehicles: typeof state.vehicles = {};
      for (const v of vehicleMasters) {
        vehicles[v.vin] = structuredClone(v);
      }

      const ownerships: typeof state.ownerships = {};
      for (const row of ownershipRows) {
        ownerships[row.id] = structuredClone(row);
      }

      const claims: typeof state.claims = {};
      for (const claim of ownershipClaims) {
        claims[claim.id] = structuredClone(claim);
      }

      state.vehicles = vehicles;
      state.ownerships = ownerships;
      state.claims = claims;
      state.events = structuredClone(ownershipEvents);
      state.hydrated = true;

      // Rebuild indices from loaded data
      rebuildIndices(state);
    });
  }, []);

  return null;
}
