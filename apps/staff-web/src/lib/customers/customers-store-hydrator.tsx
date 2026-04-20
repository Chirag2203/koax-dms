'use client';

/**
 * CustomersStoreHydrator — seeds customer store from @dms/mocks fixtures.
 * Mount in the shell layout alongside other hydrators.
 */

import { useEffect } from 'react';
import { vehicleModuleCustomers, mockCustomer } from '@dms/mocks/fixtures';
import { useCustomersStore } from './customers-store';

export function CustomersStoreHydrator() {
  useEffect(() => {
    const store = useCustomersStore.getState();
    if (store.hydrated) return;
    // Merge all known customers
    store.hydrateCustomers([mockCustomer, ...vehicleModuleCustomers]);
  }, []);

  return null;
}
