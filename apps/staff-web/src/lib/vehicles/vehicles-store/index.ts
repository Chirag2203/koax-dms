/**
 * Vehicles store — composer.
 *
 * Assembles all 5 slice factories into a single `useVehiclesStore` hook.
 * Fixtures are deep-cloned on initialization so mutations do not bleed
 * back into the @dms/mocks package.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.1 + §3.2
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { VehiclesStore, VehiclesState } from './types';
import { createVehicleSlice } from './slices/vehicle-slice';
import { createOwnershipSlice } from './slices/ownership-slice';
import { createOwnershipPiiSlice } from './slices/ownership-pii-slice';
import { createClaimSlice } from './slices/claim-slice';
import { createEventSlice } from './slices/event-slice';
import { createQuerySlice } from './slices/query-slice';

/** Build empty initial state — fixtures are loaded by VehiclesStoreHydrator. */
function initialState(): VehiclesState {
  return {
    vehicles: {},
    ownerships: {},
    claims: {},
    events: [],
    ownershipIdByVin: {},
    claimIdByVin: {},
    ownershipIdByCustomer: {},
    hydrated: false,
  };
}

export const useVehiclesStore = create<VehiclesStore>()(
  immer((set, get, api) => ({
    ...initialState(),
    ...createVehicleSlice(set, get, api),
    ...createOwnershipSlice(set, get, api),
    ...createOwnershipPiiSlice(set, get, api),
    ...createClaimSlice(set, get, api),
    ...createEventSlice(set, get, api),
    ...createQuerySlice(set, get, api),
  })),
);

// ─── Public re-exports ────────────────────────────────────────────────────────

export type { Actor, VehiclesStore, VehiclesState } from './types';

/** Typed equality selector to avoid unnecessary re-renders. */
export function useVehiclesStoreSelector<T>(selector: (s: VehiclesStore) => T): T {
  return useVehiclesStore(selector);
}
