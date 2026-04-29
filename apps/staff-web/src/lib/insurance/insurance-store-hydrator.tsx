/**
 * InsuranceStoreHydrator
 *
 * Client-only component that ensures the Zustand insurance store is
 * initialized on first render, preventing SSR/hydration mismatches.
 * Mirrors the PartsStoreHydrator pattern exactly.
 *
 * Mount once inside the /insurance route tree (app/(shell)/insurance/layout.tsx).
 */

'use client';

import { useEffect } from 'react';
import { useInsuranceStore } from './insurance-store';

export function InsuranceStoreHydrator() {
  useEffect(() => {
    void useInsuranceStore.getState().leads.length;
  }, []);

  return null;
}
