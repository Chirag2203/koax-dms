/**
 * ServiceStoreHydrator
 *
 * Client-only component that ensures the Zustand service store is touched
 * on first render, preventing SSR/hydration mismatches.
 *
 * Mount once inside the /service route tree (app/(shell)/service/layout.tsx).
 */

'use client';

import { useEffect } from 'react';
import { useServiceStore } from './service-store';

export function ServiceStoreHydrator() {
  useEffect(() => {
    // Touch the store state to ensure it is initialised on the client.
    // structuredClone runs in the Zustand initializer (service-store.ts),
    // this effect just guarantees it ran on the client side.
    void useServiceStore.getState().jobCards.length;
  }, []);

  return null;
}
