/**
 * Part-master slice.
 *
 * Mutations stamp the actor but do NOT emit stock movements (master-data
 * edits don't move stock). A tangible stock adjust uses the stock-slice.
 *
 * Spec reference: SPEC-PARTS-001 §4
 */

import type { PartsSlice, PartActions } from '../types';

export const createPartSlice: PartsSlice<PartActions> = (set) => ({
  updatePart(partCode, patch, _actor) {
    set((state) => {
      const part = state.parts.find((p) => p.partCode === partCode);
      if (!part) return;
      // Never allow changing the primary key
      const { partCode: _ignored, ...safe } = patch;
      Object.assign(part, safe);
    });
  },
});
