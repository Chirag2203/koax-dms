'use client';

/**
 * Portal vehicles store hydrator.
 *
 * Seeds the portal-local Zustand store from @dms/mocks fixtures on first mount.
 * Mount once in the portal layout.
 *
 * Spec reference: SPEC-PORTAL-VEHICLES-001 §3
 */

import { useEffect } from 'react';
import { usePortalVehiclesStore } from './vehicles-client-store';

export function PortalVehiclesStoreHydrator() {
  useEffect(() => {
    usePortalVehiclesStore.getState().hydrate();
  }, []);
  return null;
}
