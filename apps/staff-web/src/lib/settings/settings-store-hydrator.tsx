/**
 * Settings store hydrator — calls hydrateSettingsStore once at app shell.
 * Placed as a client component in the shell layout.
 */

'use client';

import { useEffect } from 'react';
import { hydrateSettingsStore } from './settings-store';

export function SettingsStoreHydrator() {
  useEffect(() => {
    hydrateSettingsStore();
  }, []);
  return null;
}
