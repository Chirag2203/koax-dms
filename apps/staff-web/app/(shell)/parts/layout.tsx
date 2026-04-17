'use client';

import type { ReactNode } from 'react';
import { PartsStoreHydrator } from '@/src/lib/parts/parts-store-hydrator';

/**
 * Parts route tree layout.
 *
 * Mounts PartsStoreHydrator once so the in-memory Zustand store is
 * initialised before any parts component reads from it.
 * All /parts/* routes share the same store instance.
 */
export default function PartsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PartsStoreHydrator />
      {children}
    </>
  );
}
