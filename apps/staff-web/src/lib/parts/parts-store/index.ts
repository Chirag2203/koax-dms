/**
 * Parts store — composer.
 *
 * Assembles all slice factories into a single `usePartsStore` hook.
 * Fixtures are deep-cloned on initialization so mutations do not bleed
 * back into the @dms/mocks package.
 *
 * Spec reference: SPEC-PARTS-001 §10
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  parts as fixtureParts,
  suppliers as fixtureSuppliers,
  purchaseOrders as fixturePurchaseOrders,
  grns as fixtureGrns,
  stockMovements as fixtureStockMovements,
} from '@dms/mocks/fixtures';

import type { PartsStore, PartsState } from './types';
import { createPartSlice } from './slices/part-slice';
import { createSupplierSlice } from './slices/supplier-slice';
import { createPoSlice } from './slices/po-slice';
import { createGrnSlice } from './slices/grn-slice';
import { createStockSlice } from './slices/stock-slice';

/** Build the initial fixture-clone state. */
function initialState(): PartsState {
  return {
    parts: structuredClone(fixtureParts),
    suppliers: structuredClone(fixtureSuppliers),
    purchaseOrders: structuredClone(fixturePurchaseOrders),
    grns: structuredClone(fixtureGrns),
    stockMovements: structuredClone(fixtureStockMovements),
  };
}

export const usePartsStore = create<PartsStore>()(
  immer((set, get, api) => ({
    ...initialState(),
    ...createPartSlice(set, get, api),
    ...createSupplierSlice(set, get, api),
    ...createPoSlice(set, get, api),
    ...createGrnSlice(set, get, api),
    ...createStockSlice(set, get, api),
  })),
);

// ─── Public re-exports ────────────────────────────────────────────────────────

export type { Actor, PartsStore, PartsState } from './types';

/** Typed equality selector to avoid unnecessary re-renders. */
export function usePartsStoreSelector<T>(selector: (s: PartsStore) => T): T {
  return usePartsStore(selector);
}
