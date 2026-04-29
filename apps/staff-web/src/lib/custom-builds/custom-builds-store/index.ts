/**
 * Custom Builds store — composer.
 *
 * Assembles all slices into a single `useCustomBuildsStore` hook.
 * Pattern: Zustand + Immer, identical to vehicles-store and parts-store.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { CustomBuildsStore, CustomBuildsState } from './types';
import { createJobSlice } from './slices/job-slice';
import { createQuerySlice } from './slices/query-slice';
import { createVendorSlice } from './slices/vendor-slice';
import { createHydrateSlice } from './slices/hydrate-slice';

function initialState(): CustomBuildsState {
  return {
    jobs: [],
    parts: [],
    vendors: [],
    hydrated: false,
  };
}

export const useCustomBuildsStore = create<CustomBuildsStore>()(
  immer((set, get, api) => ({
    ...initialState(),
    ...createJobSlice(set, get, api),
    ...createQuerySlice(set, get, api),
    ...createVendorSlice(set, get, api),
    ...createHydrateSlice(set, get, api),
  })),
);

// ─── Public re-exports ────────────────────────────────────────────────────────

export type { Actor, CustomBuildsStore, CustomBuildsState } from './types';

export function useCustomBuildsStoreSelector<T>(
  selector: (s: CustomBuildsStore) => T,
): T {
  return useCustomBuildsStore(selector);
}
