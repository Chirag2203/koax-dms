'use client';

import type { ReactNode } from 'react';
import { InsuranceStoreHydrator } from '@/src/lib/insurance/insurance-store-hydrator';

/**
 * Insurance route tree layout.
 * Mounts the InsuranceStoreHydrator to seed the Zustand store.
 *
 * Spec reference: SPEC-INSURANCE-001 §2
 */
export default function InsuranceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <InsuranceStoreHydrator />
      {children}
    </>
  );
}
