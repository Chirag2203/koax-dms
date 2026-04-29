/**
 * Finance store hydrator — seeds vendor-invoice fixtures on mount.
 * Idempotent: only hydrates once (checks s.hydrated flag).
 *
 * SPEC-FINANCE-001 §4; convention matches vehicles + insurance hydrators.
 */

'use client';

import { useEffect } from 'react';
import { useFinanceStore } from './finance-store';
import { VENDOR_INVOICE_FIXTURES } from './__fixtures__/vendor-invoices';

export function FinanceStoreHydrator() {
  const hydrateVendorInvoices = useFinanceStore((s) => s.hydrateVendorInvoices);
  const hydrated = useFinanceStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) {
      hydrateVendorInvoices(VENDOR_INVOICE_FIXTURES);
    }
  }, [hydrated, hydrateVendorInvoices]);

  return null;
}
