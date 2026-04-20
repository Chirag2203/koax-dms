'use client';

import type { ReactNode } from 'react';
import { VehiclesStoreHydrator } from '@/src/lib/vehicles/vehicles-store-hydrator';

/**
 * Vehicles route tree layout.
 *
 * Mounts VehiclesStoreHydrator so the in-memory Zustand store is initialized
 * before any /vehicles component reads from it. Hydration is idempotent —
 * mounting on both /vehicles and any sibling layout is safe.
 *
 * Spec reference: SPEC-VEHICLES-001 P1 scope (hydrator mount)
 */
export default function VehiclesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <VehiclesStoreHydrator />
      {children}
    </>
  );
}
