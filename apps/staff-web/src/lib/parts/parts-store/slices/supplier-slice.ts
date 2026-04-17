/**
 * Supplier slice — create + update.
 *
 * Supplier detail UI deferred to v1.1 per spec §3.5; the store API is shipped
 * in P1 so list/detail views can land without round-tripping a schema later.
 *
 * Spec reference: SPEC-PARTS-001 §3.5
 */

import type { Supplier } from '@dms/types';
import type { PartsSlice, SupplierActions } from '../types';
import { makeId } from '../id-helpers';

export const createSupplierSlice: PartsSlice<SupplierActions> = (set) => ({
  createSupplier(input, _actor) {
    let created!: Supplier;
    set((state) => {
      const supplier: Supplier = {
        ...input,
        id: makeId('sup'),
      };
      state.suppliers.push(supplier);
      created = supplier;
    });
    return created;
  },

  updateSupplier(id, patch, _actor) {
    set((state) => {
      const supplier = state.suppliers.find((s) => s.id === id);
      if (!supplier) return;
      const { id: _ignored, ...safe } = patch;
      Object.assign(supplier, safe);
    });
  },
});
