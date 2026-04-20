'use client';

import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomersFilter = {
  search: string;
  city: string;
};

export interface CustomersFiltersProps {
  filters: CustomersFilter;
  onChange: (patch: Partial<CustomersFilter>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomersFilters({ filters, onChange }: CustomersFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="search"
        placeholder="Search name, email, phone..."
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className={cn(
          'h-8 w-72 rounded border border-line bg-bg-canvas px-3',
          'text-sm text-ink-primary placeholder:text-ink-muted',
          'focus:outline-none focus:ring-1 focus:ring-accent',
        )}
        aria-label="Search customers"
      />
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-ink-muted whitespace-nowrap">City</label>
        <select
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className={cn(
            'h-8 rounded border border-line bg-bg-canvas px-2',
            'text-xs text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
          )}
        >
          <option value="">All cities</option>
          <option value="bangalore">Bangalore</option>
          <option value="mumbai">Mumbai</option>
          <option value="chennai">Chennai</option>
        </select>
      </div>
    </div>
  );
}
