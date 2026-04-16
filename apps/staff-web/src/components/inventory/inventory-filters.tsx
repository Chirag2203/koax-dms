'use client';

import { useState, useCallback } from 'react';
import { SlideInPanel } from '@/src/components/primitives';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryFilterValues {
  makes: string[];
  bodyTypes: string[];
  outlets: string[];
  statuses: string[];
  priceMin: string;
  priceMax: string;
  kmMin: string;
  kmMax: string;
  ageMin: string;
  ageMax: string;
  certifiedOnly: boolean;
  fuelTypes: string[];
  transmissions: string[];
}

export const EMPTY_FILTERS: InventoryFilterValues = {
  makes: [],
  bodyTypes: [],
  outlets: [],
  statuses: [],
  priceMin: '',
  priceMax: '',
  kmMin: '',
  kmMax: '',
  ageMin: '',
  ageMax: '',
  certifiedOnly: false,
  fuelTypes: [],
  transmissions: [],
};

export interface InventoryFiltersProps {
  open: boolean;
  onClose: () => void;
  values: InventoryFilterValues;
  onApply: (filters: InventoryFilterValues) => void;
  onClear: () => void;
}

// ─── Static options ───────────────────────────────────────────────────────────

const MAKE_OPTIONS = ['Porsche', 'BMW', 'Mercedes-Benz', 'Audi', 'Range Rover', 'Bentley', 'Ferrari', 'Lamborghini', 'Rolls-Royce', 'McLaren'];
const BODY_TYPE_OPTIONS = ['Sedan', 'SUV', 'Coupe', 'Convertible', 'Hatchback', 'Wagon'];
const OUTLET_OPTIONS = [
  { value: 'bangalore', label: 'Bangalore (BLR)' },
  { value: 'mumbai', label: 'Mumbai (MUM)' },
  { value: 'chennai', label: 'Chennai (CHE)' },
];
const STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'in-refurb', label: 'In Refurb' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'stale', label: 'Stale' },
  { value: 'sold', label: 'Sold' },
  { value: 'archived', label: 'Archived' },
];
const FUEL_OPTIONS = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const TRANSMISSION_OPTIONS = ['Automatic', 'Manual'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
      {children}
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[] | { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const isChecked = selected.includes(value);
        return (
          <label
            key={value}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1',
              'text-xs font-medium transition-colors border',
              isChecked
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-bg-subtle text-ink-secondary hover:border-accent/50 hover:text-ink-primary',
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={isChecked}
              onChange={() => toggle(value)}
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function RangeInputs({
  labelMin,
  labelMax,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  prefix,
}: {
  labelMin: string;
  labelMax: string;
  valueMin: string;
  valueMax: string;
  onChangeMin: (v: string) => void;
  onChangeMax: (v: string) => void;
  prefix?: string;
}) {
  const inputClass = cn(
    'w-full rounded-md border border-line bg-bg-subtle px-3 py-1.5',
    'text-sm text-ink-primary placeholder:text-ink-muted',
    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
  );
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          type="number"
          placeholder={labelMin}
          value={valueMin}
          onChange={(e) => onChangeMin(e.target.value)}
          className={cn(inputClass, prefix && 'pl-6')}
          aria-label={labelMin}
        />
      </div>
      <span className="text-ink-muted text-sm shrink-0">–</span>
      <div className="flex-1 relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          type="number"
          placeholder={labelMax}
          value={valueMax}
          onChange={(e) => onChangeMax(e.target.value)}
          className={cn(inputClass, prefix && 'pl-6')}
          aria-label={labelMax}
        />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryFilters({ open, onClose, values, onApply, onClear }: InventoryFiltersProps) {
  // Local draft state — only committed on Apply
  const [draft, setDraft] = useState<InventoryFilterValues>(values);

  const update = useCallback(<K extends keyof InventoryFilterValues>(key: K, value: InventoryFilterValues[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS);
    onClear();
    onClose();
  }

  // Sync draft when panel opens with current values
  const handleOpen = useCallback(() => {
    setDraft(values);
  }, [values]);

  return (
    <SlideInPanel
      open={open}
      onClose={onClose}
      width="40%"
      title="Filter Inventory"
    >
      {/* Trigger sync when panel content mounts */}
      <div className="flex flex-col h-full" onFocus={handleOpen} suppressHydrationWarning>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          <FilterSection title="Make">
            <CheckboxGroup
              options={MAKE_OPTIONS}
              selected={draft.makes}
              onChange={(v) => update('makes', v)}
            />
          </FilterSection>

          <FilterSection title="Body Type">
            <CheckboxGroup
              options={BODY_TYPE_OPTIONS}
              selected={draft.bodyTypes}
              onChange={(v) => update('bodyTypes', v)}
            />
          </FilterSection>

          <FilterSection title="Outlet">
            <CheckboxGroup
              options={OUTLET_OPTIONS}
              selected={draft.outlets}
              onChange={(v) => update('outlets', v)}
            />
          </FilterSection>

          <FilterSection title="Status">
            <CheckboxGroup
              options={STATUS_OPTIONS}
              selected={draft.statuses}
              onChange={(v) => update('statuses', v)}
            />
          </FilterSection>

          <FilterSection title="Ask Price (₹)">
            <RangeInputs
              labelMin="Min"
              labelMax="Max"
              valueMin={draft.priceMin}
              valueMax={draft.priceMax}
              onChangeMin={(v) => update('priceMin', v)}
              onChangeMax={(v) => update('priceMax', v)}
              prefix="₹"
            />
          </FilterSection>

          <FilterSection title="Odometer (km)">
            <RangeInputs
              labelMin="Min km"
              labelMax="Max km"
              valueMin={draft.kmMin}
              valueMax={draft.kmMax}
              onChangeMin={(v) => update('kmMin', v)}
              onChangeMax={(v) => update('kmMax', v)}
            />
          </FilterSection>

          <FilterSection title="Days on Lot">
            <RangeInputs
              labelMin="Min days"
              labelMax="Max days"
              valueMin={draft.ageMin}
              valueMax={draft.ageMax}
              onChangeMin={(v) => update('ageMin', v)}
              onChangeMax={(v) => update('ageMax', v)}
            />
          </FilterSection>

          <FilterSection title="Fuel Type">
            <CheckboxGroup
              options={FUEL_OPTIONS}
              selected={draft.fuelTypes}
              onChange={(v) => update('fuelTypes', v)}
            />
          </FilterSection>

          <FilterSection title="Transmission">
            <CheckboxGroup
              options={TRANSMISSION_OPTIONS}
              selected={draft.transmissions}
              onChange={(v) => update('transmissions', v)}
            />
          </FilterSection>

          <FilterSection title="Certification">
            <label className="inline-flex cursor-pointer items-center gap-2.5">
              <div
                role="switch"
                aria-checked={draft.certifiedOnly}
                onClick={() => update('certifiedOnly', !draft.certifiedOnly)}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  draft.certifiedOnly ? 'bg-accent' : 'bg-bg-subtle border border-line',
                )}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? update('certifiedOnly', !draft.certifiedOnly) : undefined}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    draft.certifiedOnly ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </div>
              <span className="text-sm text-ink-primary">CPO Certified Only</span>
            </label>
          </FilterSection>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-line px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium text-ink-secondary',
              'hover:text-ink-primary hover:bg-bg-subtle transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={cn(
              'px-5 py-2 rounded-md text-sm font-semibold text-white',
              'bg-accent hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            )}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </SlideInPanel>
  );
}
