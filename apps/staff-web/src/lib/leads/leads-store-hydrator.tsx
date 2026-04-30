/**
 * LeadsStoreHydrator
 *
 * Client-only component that seeds the Zustand leads store from
 * fixtures on first client mount.
 *
 * Mounted inside AppShell per CLAUDE.md AppShell hydrator pattern.
 * Idempotent — the store checks the hydrated flag.
 *
 * Spec reference: SPEC-LEADS-001 §20
 */

'use client';

import { useEffect } from 'react';
import { leads, leadActivities } from '@dms/mocks/fixtures';
import { useLeadsStore } from './leads-store';

export function LeadsStoreHydrator() {
  useEffect(() => {
    const store = useLeadsStore.getState();
    if (store.hydrated) return;
    store.hydrate(leads, leadActivities);
  }, []);

  return null;
}
