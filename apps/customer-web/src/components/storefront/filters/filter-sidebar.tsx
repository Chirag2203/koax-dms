/**
 * FilterSidebar — full facet filter panel for the inventory page.
 *
 * Desktop: fixed left rail. Mobile: sheet triggered by a "Filters" button.
 * Contains all filter facets: price, year, mileage, fuel, transmission,
 * body style, colour, CPO toggle, and outlet.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L15, S1–S21
 */

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@dms/ui';
import type { InventoryFilters, FilterKey } from '@/src/lib/storefront/use-filters';
import { PRICE_MIN_DEFAULT, PRICE_MAX_DEFAULT, YEAR_MIN_DEFAULT, YEAR_MAX_DEFAULT, KM_MIN_DEFAULT, KM_MAX_DEFAULT } from '@/src/lib/storefront/use-filters';
import { PriceRangeSlider } from './price-range-slider';
import { RangeSlider } from './range-slider';
import { MultiCheckFacet } from './multi-check-facet';
import { ColorSwatchPicker, buildColorOptions } from './color-swatch-picker';
import type { Vehicle } from '@dms/types/domain';

// ─── Static options ───────────────────────────────────────────────────────────

const FUEL_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'EV' },
  { value: 'hybrid', label: 'Hybrid' },
];

const BODY_OPTIONS = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'coupe', label: 'Coupé' },
  { value: 'convertible', label: 'Convertible' },
  { value: 'hatchback', label: 'Hatchback' },
];

const OUTLET_OPTIONS = [
  { value: '', label: 'Pan-India' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'chennai', label: 'Chennai' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterSidebarProps {
  filters: InventoryFilters;
  allVehicles: Vehicle[];
  onFilterChange: <K extends FilterKey>(key: K, value: InventoryFilters[K]) => void;
  onClearAll: () => void;
  activeCount: number;
  className?: string;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
      {children}
    </h3>
  );
}

function Divider() {
  return <hr className="border-line my-5" />;
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({
  filters,
  allVehicles,
  onFilterChange,
  onClearAll,
  activeCount,
}: Omit<FilterSidebarProps, 'className'>) {
  const t = useTranslations('inventory');

  const colorOptions = React.useMemo(
    () => buildColorOptions(allVehicles.map((v) => v.color)),
    [allVehicles],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-5">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-primary">
          {t('filtersLabel')}
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="font-mono text-xs text-accent underline underline-offset-2 hover:text-accent/80 transition-colors"
          >
            {t('clearAll')}
          </button>
        )}
      </div>

      {/* Scrollable facets */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-0">

        {/* Price */}
        <SectionLabel>{t('facetPrice')}</SectionLabel>
        <PriceRangeSlider
          valueMin={filters.priceMin}
          valueMax={filters.priceMax}
          onChange={(min, max) => {
            // Use type assertion since FilterKey union doesn't support null directly here
            onFilterChange('priceMin', (min ?? null) as InventoryFilters['priceMin']);
            onFilterChange('priceMax', (max ?? null) as InventoryFilters['priceMax']);
          }}
        />

        <Divider />

        {/* Year */}
        <SectionLabel>{t('facetYear')}</SectionLabel>
        <RangeSlider
          min={YEAR_MIN_DEFAULT}
          max={YEAR_MAX_DEFAULT}
          step={1}
          valueMin={filters.yearMin ?? YEAR_MIN_DEFAULT}
          valueMax={filters.yearMax ?? YEAR_MAX_DEFAULT}
          onChange={(min, max) => {
            onFilterChange('yearMin', min === YEAR_MIN_DEFAULT ? null : min);
            onFilterChange('yearMax', max === YEAR_MAX_DEFAULT ? null : max);
          }}
          label="Year"
        />

        <Divider />

        {/* Mileage */}
        <SectionLabel>{t('facetMileage')}</SectionLabel>
        <RangeSlider
          min={KM_MIN_DEFAULT}
          max={KM_MAX_DEFAULT}
          step={5000}
          valueMin={filters.kmMin ?? KM_MIN_DEFAULT}
          valueMax={filters.kmMax ?? KM_MAX_DEFAULT}
          onChange={(min, max) => {
            onFilterChange('kmMin', min === KM_MIN_DEFAULT ? null : min);
            onFilterChange('kmMax', max === KM_MAX_DEFAULT ? null : max);
          }}
          formatValue={(n) => `${(n / 1000).toFixed(0)}k`}
          label="Mileage"
        />

        <Divider />

        {/* Fuel */}
        <SectionLabel>{t('facetFuel')}</SectionLabel>
        <MultiCheckFacet
          options={FUEL_OPTIONS}
          selected={filters.fuel}
          onChange={(val) => onFilterChange('fuel', val)}
        />

        <Divider />

        {/* Transmission */}
        <SectionLabel>{t('facetTransmission')}</SectionLabel>
        <div className="flex gap-2">
          {(['automatic', 'manual'] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() =>
                onFilterChange(
                  'transmission',
                  filters.transmission === val ? '' : val,
                )
              }
              className={cn(
                'flex-1 rounded-sm border py-2',
                'font-mono text-xs uppercase tracking-widest transition-colors',
                filters.transmission === val
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-ink-secondary hover:border-accent',
              )}
            >
              {val.charAt(0).toUpperCase() + val.slice(1)}
            </button>
          ))}
        </div>

        <Divider />

        {/* Body style */}
        <SectionLabel>{t('facetBodyStyle')}</SectionLabel>
        <MultiCheckFacet
          options={BODY_OPTIONS}
          selected={filters.bodyType}
          onChange={(val) => onFilterChange('bodyType', val)}
        />

        <Divider />

        {/* Colour */}
        <SectionLabel>{t('facetColour')}</SectionLabel>
        <ColorSwatchPicker
          options={colorOptions}
          selected={filters.color}
          onChange={(val) => onFilterChange('color', val)}
        />

        <Divider />

        {/* CPO */}
        <label className="flex cursor-pointer items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-secondary">
            {t('facetCPOOnly')}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors',
              filters.certified ? 'border-accent bg-accent' : 'border-line bg-bg-subtle',
            )}
          >
            <span
              className={cn(
                'absolute inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                filters.certified ? 'translate-x-4' : 'translate-x-0.5',
              )}
            />
          </span>
          <input
            type="checkbox"
            className="sr-only"
            checked={filters.certified}
            onChange={(e) => onFilterChange('certified', e.target.checked)}
          />
        </label>

        <Divider />

        {/* Outlet */}
        <SectionLabel>{t('facetOutlet')}</SectionLabel>
        <div className="space-y-1.5">
          {OUTLET_OPTIONS.map(({ value, label }) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => onFilterChange('city', value)}
              className={cn(
                'block w-full rounded-sm border px-3 py-2 text-left',
                'font-mono text-xs uppercase tracking-widest transition-colors',
                filters.city === value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-ink-secondary hover:border-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FilterSidebar (desktop + mobile) ────────────────────────────────────────

export function FilterSidebar({
  filters,
  allVehicles,
  onFilterChange,
  onClearAll,
  activeCount,
  className,
}: FilterSidebarProps) {
  const t = useTranslations('inventory');
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const contentProps = { filters, allVehicles, onFilterChange, onClearAll, activeCount };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 shrink-0',
          'sticky top-[calc(var(--header-height,64px)+1rem)] self-start',
          'max-h-[calc(100vh-var(--header-height,64px)-4rem)] overflow-y-auto',
          className,
        )}
        aria-label="Filter options"
      >
        <SidebarContent {...contentProps} />
      </aside>

      {/* Mobile trigger button */}
      <div className="flex lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={cn(
            'flex items-center gap-2 rounded-sm border px-4 py-2.5',
            'font-mono text-xs uppercase tracking-widest transition-colors',
            activeCount > 0
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line text-ink-secondary hover:border-accent',
          )}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          {t('filtersLabel')}
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent font-mono text-xs text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('filtersLabel')}
            className={cn(
              'fixed inset-y-0 right-0 z-50 w-80 bg-bg-paper shadow-2xl lg:hidden',
              'flex flex-col p-6',
              'motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300',
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="font-mono text-xs uppercase tracking-widest text-ink-primary">
                {t('filtersLabel')}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
                className="text-ink-muted hover:text-ink-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent {...contentProps} />
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-4 w-full rounded-full bg-ink-primary py-3 font-mono text-xs uppercase tracking-widest text-bg-paper"
            >
              {t('applyFilters')} ({activeCount > 0 ? activeCount : t('all')})
            </button>
          </div>
        </>
      )}
    </>
  );
}
