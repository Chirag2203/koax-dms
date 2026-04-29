/**
 * Hydrate slice — seeds the store from fixtures.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14
 */

import type { PartsActions, CustomBuildsSlice } from '../types';

export const createHydrateSlice: CustomBuildsSlice<PartsActions> = (set) => ({
  hydrate(jobs, parts, vendors) {
    set((state) => {
      if (state.hydrated) return;
      state.jobs = structuredClone(jobs);
      state.parts = structuredClone(parts);
      state.vendors = structuredClone(vendors);
      state.hydrated = true;
    });
  },
});
