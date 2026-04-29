/**
 * Cost-ledger slice — runtime entries written by custom-builds-store on deliverJob.
 *
 * SPEC-CUSTOM-BUILDS-001 L9/L39/L40:
 * - Vehicles-store is the single owner of the per-VIN cost ledger.
 * - custom-builds-store calls `useVehiclesStore.getState().addCostLedgerEntries`
 *   directly (no subscription, no event bus — UI-layer cross-store call per
 *   PLAN-VEHICLES-003 L8 pattern).
 * - Idempotent: duplicate entry ids are silently skipped (no double-write).
 * - UI merges fixture + runtime entries, dedupes by id (L40).
 */

import type { CostLedgerEntry } from '@dms/types';
import type { VehiclesSlice } from '../types';
import type { CostLedgerActions } from '../types';

export const createCostLedgerSlice: VehiclesSlice<CostLedgerActions> = (set, get) => ({
  addCostLedgerEntries(vin, entries) {
    if (!entries.length) return;

    set((state) => {
      const existing = state.costLedger[vin] ?? [];
      const existingIds = new Set(existing.map((e) => e.id));

      const newEntries = entries.filter((e) => !existingIds.has(e.id));
      if (!newEntries.length) return; // idempotent — all entries already present

      state.costLedger[vin] = [...existing, ...newEntries];
    });
  },

  selectCostLedgerEntries(vin) {
    return get().costLedger[vin] ?? [];
  },
});
