/**
 * Part-master slice.
 *
 * Mutations stamp the actor but do NOT emit stock movements (master-data
 * edits don't move stock). A tangible stock adjust uses the stock-slice.
 *
 * Spec reference: SPEC-PARTS-001 §4; PLAN-PARTS-005 §2.1 for createPart
 */

import type { Part } from '@dms/types';
import { PartSchema } from '@dms/types';
import type { PartsSlice, PartActions } from '../types';

export const createPartSlice: PartsSlice<PartActions> = (set, get) => ({
  updatePart(partCode, patch, _actor) {
    set((state) => {
      const part = state.parts.find((p) => p.partCode === partCode);
      if (!part) return;
      // Never allow changing the primary key
      const { partCode: _ignored, ...safe } = patch;
      Object.assign(part, safe);
    });
  },

  /**
   * Create a new Part. Throws `Error('PART_CODE_EXISTS')` on duplicate partCode
   * so the caller (form) can surface an inline error. Full-shape validation
   * via `PartSchema.parse` — defence-in-depth net against incomplete payloads.
   *
   * No timeline event (Parts domain has no timeline shape).
   */
  createPart(input: Part, _actor): Part {
    // Uniqueness check (read live state via get — outside the set() block so
    // the throw is synchronous to the caller and not swallowed by immer)
    if (get().parts.some((p) => p.partCode === input.partCode)) {
      throw new Error('PART_CODE_EXISTS');
    }
    const parsed = PartSchema.parse(input);
    set((state) => {
      state.parts.push(parsed);
    });
    return parsed;
  },
});
