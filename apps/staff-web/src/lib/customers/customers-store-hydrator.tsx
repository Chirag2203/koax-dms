'use client';

/**
 * CustomersStoreHydrator — seeds customer store from @dms/mocks fixtures.
 * Mount in the shell layout alongside other hydrators.
 *
 * Also seeds consent log (GAP-3) on every mount (consent hydration is idempotent
 * because hydrateConsents upserts by id).
 */

import { useEffect } from 'react';
import { vehicleModuleCustomers, mockCustomer, consentLogEntries } from '@dms/mocks/fixtures';
import { useCustomersStore } from './customers-store';

export function CustomersStoreHydrator() {
  useEffect(() => {
    const store = useCustomersStore.getState();
    if (!store.hydrated) {
      // Merge all known customers
      store.hydrateCustomers([mockCustomer, ...vehicleModuleCustomers]);
    }
    // Always seed consents (idempotent — upserts by id)
    store.hydrateConsents(consentLogEntries);
  }, []);

  return null;
}
