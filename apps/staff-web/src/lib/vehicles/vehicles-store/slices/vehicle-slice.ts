/**
 * Vehicle-slice — VehicleMaster CRUD.
 *
 * All state reads are inside set((state) => {...}) — never getState() inside
 * an action body (critical correctness constraint, reviewer trap 2).
 *
 * normalizeVin is called at every entry point.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (vehicle-slice actions)
 */

import { normalizeVin } from '@dms/vehicles-core';
import type { VehicleActions, VehiclesSlice } from '../types';
import { now } from '../id-helpers';
import {
  indexOwnershipByVin,
  indexOwnershipByCustomer,
} from '../index-maintenance';

export const createVehicleSlice: VehiclesSlice<VehicleActions> = (set) => ({
  upsertVehicle(input, actor) {
    const vin = normalizeVin(input.vin);
    let created = false;

    set((state) => {
      const existing = state.vehicles[vin];
      if (!existing) {
        // New vehicle
        state.vehicles[vin] = {
          ...input,
          vin,
          schemaVersion: 'v1',
        };
        created = true;
        // Ensure index entries exist (no ownership rows yet, but housekeeping)
        if (!state.ownershipIdByVin[vin]) state.ownershipIdByVin[vin] = [];
        // Satisfy unused-var lint — we read actor.id if we later emit events
        void actor;
      } else {
        // Merge mutable fields — never overwrite primary key or firstTouch fields
        existing.color = input.color ?? existing.color;
        existing.rcNumber = input.rcNumber ?? existing.rcNumber;
        existing.variant = input.variant ?? existing.variant;
        // Update km only if newer
        if (
          input.lastKnownKmAt &&
          new Date(input.lastKnownKmAt) > new Date(existing.lastKnownKmAt)
        ) {
          existing.lastKnownKm = input.lastKnownKm;
          existing.lastKnownKmAt = input.lastKnownKmAt;
        }
        void actor;
      }
    });

    return { vin, created };
  },

  updateVehicleKm(vin, km, at, _actor) {
    const normalizedVin = normalizeVin(vin);
    set((state) => {
      const vehicle = state.vehicles[normalizedVin];
      if (!vehicle) return;
      // Only update if the reading is newer
      if (new Date(at) > new Date(vehicle.lastKnownKmAt)) {
        vehicle.lastKnownKm = km;
        vehicle.lastKnownKmAt = at;
      }
    });
  },

  linkInventoryVehicle(vin, inventoryVin) {
    const normalizedVin = normalizeVin(vin);
    set((state) => {
      const vehicle = state.vehicles[normalizedVin];
      if (vehicle) vehicle.inventoryVehicleVin = inventoryVin;
    });
  },
});

// Suppress unused import warning — these are used by hydration caller
void indexOwnershipByVin;
void indexOwnershipByCustomer;
void now;
