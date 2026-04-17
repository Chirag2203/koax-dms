/**
 * PartsStoreHydrator
 *
 * Client-only component that ensures the Zustand parts store is touched
 * on first render, preventing SSR/hydration mismatches. Mirrors the
 * ServiceStoreHydrator pattern exactly.
 *
 * Mount once inside the /parts route tree (app/(shell)/parts/layout.tsx).
 */

'use client';

import { useEffect } from 'react';
import { usePartsStore } from './parts-store';

export function PartsStoreHydrator() {
  useEffect(() => {
    // Touch the store state to ensure structuredClone ran on the client.
    void usePartsStore.getState().parts.length;
  }, []);

  return null;
}
