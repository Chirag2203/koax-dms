/**
 * Vendor invoice list selector — SPEC-FINANCE-001 §4.3
 *
 * L14: Pure selector from finance-store's own vendorInvoices map.
 * Supports period + scope + status/category filter.
 */

import type { VendorInvoice, VendorInvoiceStatus, VendorInvoiceCategory } from '@dms/types';
import type { FYPeriod } from '../math/period';
import { isInPeriod } from '../math/period';
import type { OutletScope } from './margin-reconciliation';

export interface VendorInvoiceFilter {
  status?: VendorInvoiceStatus;
  category?: VendorInvoiceCategory;
  search?: string;
}

/**
 * Filter vendor invoices by period, scope, and optional filters.
 * L14: Pure selector — receives invoices as argument (no store access here).
 */
export function getVendorInvoiceList(
  invoices: Record<string, VendorInvoice>,
  period: FYPeriod,
  scope: OutletScope,
  filters?: VendorInvoiceFilter,
): VendorInvoice[] {
  return Object.values(invoices)
    .filter((inv) => {
      // Period filter
      if (!isInPeriod(inv.raisedAt, period)) return false;
      // Scope filter — L27
      if (scope !== 'ALL' && inv.outletId !== scope) return false;
      // Status filter
      if (filters?.status && inv.status !== filters.status) return false;
      // Category filter
      if (filters?.category && inv.category !== filters.category) return false;
      // Search
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        if (
          !inv.vendorName.toLowerCase().includes(s) &&
          !inv.invoiceNumber.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => (a.raisedAt < b.raisedAt ? 1 : -1)); // most recent first
}
