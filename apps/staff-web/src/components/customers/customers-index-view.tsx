'use client';

import { useState, useMemo } from 'react';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { CustomersFilters } from './customers-filters';
import type { CustomersFilter } from './customers-filters';
import { CustomersTable } from './customers-table';

// ─── Default filter state ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: CustomersFilter = { search: '', city: '' };

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomersIndexView() {
  const [filters, setFilters] = useState<CustomersFilter>(DEFAULT_FILTERS);

  const customers = useCustomersStore((s) => s.customers);
  const ownershipIdByCustomer = useVehiclesStore((s) => s.ownershipIdByCustomer);

  const vehicleCountByCustomer = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [custId, ids] of Object.entries(ownershipIdByCustomer)) {
      out[custId] = ids.length;
    }
    return out;
  }, [ownershipIdByCustomer]);

  const allCustomers = useMemo(() => Object.values(customers), [customers]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      if (c.id.startsWith('cust-bn')) return false; // hide dealer stock sentinel
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.city && c.preferredCity !== filters.city) return false;
      return true;
    });
  }, [allCustomers, filters]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
        <div>
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            Customers
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted leading-[1.5]">
            360° profiles, vehicles, interactions, and consents
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-line shrink-0">
        <CustomersFilters
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        />
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <CustomersTable
          customers={filteredCustomers}
          vehicleCountByCustomer={vehicleCountByCustomer}
        />
      </div>
    </div>
  );
}
