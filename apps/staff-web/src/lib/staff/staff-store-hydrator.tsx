'use client';

/**
 * StaffStoreHydrator — seeds the Zustand staff store from MOCK_STAFF_PROFILES.
 * Mount once inside AppShell. Safe to call multiple times (idempotent after hydrated).
 */
import { useEffect } from 'react';
import { hydrateStaffStore } from './staff-store';

export function StaffStoreHydrator() {
  useEffect(() => {
    hydrateStaffStore();
  }, []);
  return null;
}
