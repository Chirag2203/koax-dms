/**
 * useSavedSearches — localStorage-backed saved search store.
 *
 * Saved searches are persisted to localStorage under key `bn-saved-searches`.
 * Each entry stores a name + the URL query string for the filters.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L5, S12–S14
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedSearch {
  /** Unique identifier — timestamp-based. */
  id: string;
  /** User-provided label for this search. */
  name: string;
  /** URL query string, e.g. "fuel=petrol&priceMax=5000000". Page param excluded. */
  queryString: string;
  /** ISO timestamp when saved. */
  savedAt: string;
}

interface SavedSearchesState {
  searches: SavedSearch[];
}

interface SavedSearchesActions {
  /** Persist a new named search. */
  save(name: string, queryString: string): void;
  /** Remove a search by id. */
  remove(id: string): void;
  /** Remove all saved searches. */
  clear(): void;
}

export type SavedSearchesStore = SavedSearchesState & SavedSearchesActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSavedSearchesStore = create<SavedSearchesStore>()(
  persist(
    (set) => ({
      searches: [],

      save(name, queryString) {
        const id = `ss-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const savedAt = new Date().toISOString();
        set((state) => ({
          searches: [
            { id, name, queryString, savedAt },
            ...state.searches,
          ],
        }));
      },

      remove(id) {
        set((state) => ({
          searches: state.searches.filter((s) => s.id !== id),
        }));
      },

      clear() {
        set({ searches: [] });
      },
    }),
    {
      name: 'bn-saved-searches',
    },
  ),
);
