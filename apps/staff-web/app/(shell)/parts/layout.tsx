'use client';

import type { ReactNode } from 'react';
import { PartsStoreHydrator } from '@/src/lib/parts/parts-store-hydrator';
import { ServiceStoreHydrator } from '@/src/lib/service/service-store-hydrator';

/**
 * Parts route tree layout.
 *
 * Mounts BOTH the Parts and Service store hydrators so the in-memory
 * Zustand stores are initialised before any /parts component reads from them.
 *
 * - PartsStoreHydrator (P1) — seeds parts/suppliers/POs/GRNs/movements
 * - ServiceStoreHydrator (added in P3) — the Part Detail page's Linked Service
 *   Job Cards section reads from the service store. Both hydrators are
 *   idempotent (the underlying Zustand `create()` initialises exactly once
 *   per module import — mounting on both /parts and /service is safe).
 *
 * Spec reference: PLAN-PARTS-003 §1, §6
 */
export default function PartsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PartsStoreHydrator />
      <ServiceStoreHydrator />
      {children}
    </>
  );
}
