'use client';

/**
 * Test-drive store hydrator — SPEC-TEST-DRIVE-001
 *
 * Seeds the test-drive store with fixture data on first render.
 * Pattern matches notifications-store-hydrator / custom-builds-store-hydrator.
 */

import { useEffect, useRef } from 'react';
import { testDriveBookings } from '@dms/mocks/fixtures';
import { useTestDriveStore } from './test-drive-store';

export function TestDriveStoreHydrator({ children }: { children?: React.ReactNode }) {
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    useTestDriveStore.getState()._seed(testDriveBookings);
  }, []);

  return <>{children}</>;
}
