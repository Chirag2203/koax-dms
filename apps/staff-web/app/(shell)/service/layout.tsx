'use client';

import type { ReactNode } from 'react';
import { ServiceStoreHydrator } from '@/src/lib/service/service-store-hydrator';

/**
 * Service route tree layout.
 *
 * Mounts ServiceStoreHydrator once so the in-memory Zustand store is
 * initialised before any service component reads from it.
 * All /service/* routes share the same store instance.
 */
export default function ServiceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ServiceStoreHydrator />
      {children}
    </>
  );
}
