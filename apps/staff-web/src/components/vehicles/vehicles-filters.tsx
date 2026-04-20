'use client';

import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehiclesFilter = {
  city: string;
  state: string;
  source: string;
  cpo: string;
  search: string;
};

export interface VehiclesFiltersProps {
  filters: VehiclesFilter;
  onChange: (patch: Partial<VehiclesFilter>) => void;
}

// ─── Select helper ────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-ink-muted whitespace-nowrap">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 rounded border border-line bg-bg-canvas px-2 py-0',
          'text-xs text-ink-primary focus:outline-none focus:ring-1 focus:ring-accent',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehiclesFilters({ filters, onChange }: VehiclesFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <input
        type="search"
        placeholder="Search VIN, make, model..."
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className={cn(
          'h-8 w-64 rounded border border-line bg-bg-canvas px-3',
          'text-sm text-ink-primary placeholder:text-ink-muted',
          'focus:outline-none focus:ring-1 focus:ring-accent',
        )}
        aria-label="Search vehicles"
      />

      <FilterSelect
        label="City"
        value={filters.city}
        options={[
          { value: '', label: 'All cities' },
          { value: 'BLR-01', label: 'Bangalore' },
          { value: 'MUM-01', label: 'Mumbai' },
          { value: 'CHE-01', label: 'Chennai' },
        ]}
        onChange={(v) => onChange({ city: v })}
      />

      <FilterSelect
        label="State"
        value={filters.state}
        options={[
          { value: '', label: 'All states' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'TRANSFERRED', label: 'Transferred' },
          { value: 'REVOKED', label: 'Revoked' },
          { value: 'PENDING_CLAIM', label: 'Pending Claim' },
        ]}
        onChange={(v) => onChange({ state: v })}
      />

      <FilterSelect
        label="Source"
        value={filters.source}
        options={[
          { value: '', label: 'All sources' },
          { value: 'BN_SALE', label: 'BN Sale' },
          { value: 'BN_CONSIGNMENT', label: 'Consignment' },
          { value: 'SERVICE_ONLY_WALKIN', label: 'Service Walk-in' },
          { value: 'LEGACY_IMPORT', label: 'Legacy Import' },
        ]}
        onChange={(v) => onChange({ source: v })}
      />

      <FilterSelect
        label="CPO"
        value={filters.cpo}
        options={[
          { value: '', label: 'All' },
          { value: 'yes', label: 'CPO eligible' },
          { value: 'no', label: 'Not CPO' },
        ]}
        onChange={(v) => onChange({ cpo: v })}
      />
    </div>
  );
}
