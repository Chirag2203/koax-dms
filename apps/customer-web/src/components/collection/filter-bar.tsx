'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  make: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  city: string;
  certified: boolean;
  priceRange: string;
  sort: string;
}

export interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (key: string, value: string | boolean) => void;
  className?: string;
}

// ─── Static options ───────────────────────────────────────────────────────────

const MAKES = [
  'Porsche',
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Land Rover',
  'Jaguar',
  'Volvo',
];

const BODY_TYPES = ['sedan', 'suv', 'coupe', 'convertible', 'hatchback', 'wagon', 'van'];
const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid'];
const TRANSMISSIONS = ['automatic', 'manual'];
const CITIES = ['bangalore', 'mumbai', 'chennai'];
const PRICE_RANGES = ['under50', '50to100', '100to200', 'above200'];

// ─── Select styles ────────────────────────────────────────────────────────────

function filterSelectClass(active: boolean) {
  return cn(
    'appearance-none border rounded-sm px-4 py-2.5',
    'font-mono text-[11px] uppercase tracking-widest',
    'transition-colors cursor-pointer outline-none',
    'bg-bg-paper pr-8',
    active
      ? 'bg-accent/10 border-accent text-accent'
      : 'border-line text-ink-secondary hover:border-accent',
  );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

export function FilterBar({ filters, onFilterChange, className }: FilterBarProps) {
  const t = useTranslations('collection');
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const hasActiveFilters =
    filters.make ||
    filters.bodyType ||
    filters.fuel ||
    filters.transmission ||
    filters.city ||
    filters.certified ||
    filters.priceRange;

  function clearAll() {
    onFilterChange('make', '');
    onFilterChange('bodyType', '');
    onFilterChange('fuel', '');
    onFilterChange('transmission', '');
    onFilterChange('city', '');
    onFilterChange('certified', false);
    onFilterChange('priceRange', '');
  }

  const filterSelects = (
    <>
      {/* Make */}
      <div className="relative">
        <select
          value={filters.make}
          onChange={(e) => onFilterChange('make', e.target.value)}
          aria-label={t('filterMake')}
          className={filterSelectClass(!!filters.make)}
        >
          <option value="">{t('allMakes')}</option>
          {MAKES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted">
          ▾
        </span>
      </div>

      {/* Body Type */}
      <div className="relative">
        <select
          value={filters.bodyType}
          onChange={(e) => onFilterChange('bodyType', e.target.value)}
          aria-label={t('filterBody')}
          className={filterSelectClass(!!filters.bodyType)}
        >
          <option value="">{t('allTypes')}</option>
          {BODY_TYPES.map((b) => (
            <option key={b} value={b}>
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted">
          ▾
        </span>
      </div>

      {/* Fuel */}
      <div className="relative">
        <select
          value={filters.fuel}
          onChange={(e) => onFilterChange('fuel', e.target.value)}
          aria-label={t('filterFuel')}
          className={filterSelectClass(!!filters.fuel)}
        >
          <option value="">{t('allFuels')}</option>
          {FUEL_TYPES.map((f) => (
            <option key={f} value={f}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted">
          ▾
        </span>
      </div>

      {/* Transmission */}
      <div className="relative">
        <select
          value={filters.transmission}
          onChange={(e) => onFilterChange('transmission', e.target.value)}
          aria-label={t('filterTransmission')}
          className={filterSelectClass(!!filters.transmission)}
        >
          <option value="">{t('allTransmissions')}</option>
          {TRANSMISSIONS.map((tr) => (
            <option key={tr} value={tr}>
              {tr.charAt(0).toUpperCase() + tr.slice(1)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted">
          ▾
        </span>
      </div>

      {/* City */}
      <div className="relative">
        <select
          value={filters.city}
          onChange={(e) => onFilterChange('city', e.target.value)}
          aria-label={t('filterCity')}
          className={filterSelectClass(!!filters.city)}
        >
          <option value="">{t('allCities')}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted">
          ▾
        </span>
      </div>

      {/* Price Range */}
      <div className="relative">
        <select
          value={filters.priceRange}
          onChange={(e) => onFilterChange('priceRange', e.target.value)}
          aria-label={t('filterPrice')}
          className={filterSelectClass(!!filters.priceRange)}
        >
          <option value="">{t('allPrices')}</option>
          {PRICE_RANGES.map((p) => {
            const labelKey = p === 'under50'
              ? 'priceUnder50'
              : p === '50to100'
              ? 'price50to100'
              : p === '100to200'
              ? 'price100to200'
              : 'priceAbove200';
            return (
              <option key={p} value={p}>
                {t(labelKey)}
              </option>
            );
          })}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-muted">
          ▾
        </span>
      </div>

      {/* Certified toggle */}
      <label
        className={cn(
          'inline-flex items-center gap-2 cursor-pointer select-none',
          'border rounded-sm px-4 py-2.5',
          'font-mono text-[11px] uppercase tracking-widest',
          'transition-colors',
          filters.certified
            ? 'bg-accent/10 border-accent text-accent'
            : 'border-line text-ink-secondary hover:border-accent',
        )}
      >
        <input
          type="checkbox"
          checked={filters.certified}
          onChange={(e) => onFilterChange('certified', e.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border',
            filters.certified ? 'border-accent bg-accent' : 'border-current',
          )}
        >
          {filters.certified && (
            <svg
              viewBox="0 0 10 8"
              fill="none"
              className="h-2 w-2"
              aria-hidden="true"
            >
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        {t('filterCertified')}
      </label>
    </>
  );

  return (
    <div
      className={cn(
        'sticky top-[var(--header-height,64px)] z-30 w-full border-b border-line bg-bg-paper/95 backdrop-blur-sm',
        className,
      )}
    >
      {/* Desktop: horizontal scroll row */}
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="hidden md:flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
          {filterSelects}

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-accent underline underline-offset-2 hover:text-accent/80 transition-colors ml-2"
            >
              {t('clearAll')}
            </button>
          )}
        </div>

        {/* Mobile: toggle button */}
        <div className="flex md:hidden items-center justify-between py-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              'flex items-center gap-2 border rounded-sm px-4 py-2.5',
              'font-mono text-[11px] uppercase tracking-widest transition-colors',
              hasActiveFilters
                ? 'bg-accent/10 border-accent text-accent'
                : 'border-line text-ink-secondary',
            )}
            aria-expanded={mobileOpen}
            aria-controls="mobile-filter-sheet"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M2 4h12M4 8h8M6 12h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent font-mono text-[9px] text-white">
                {[
                  filters.make,
                  filters.bodyType,
                  filters.fuel,
                  filters.transmission,
                  filters.city,
                  filters.certified ? 'y' : '',
                  filters.priceRange,
                ].filter(Boolean).length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="font-mono text-[11px] uppercase tracking-widest text-accent underline underline-offset-2"
            >
              {t('clearAll')}
            </button>
          )}
        </div>
      </div>

      {/* Mobile slide-up sheet */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-filter-sheet"
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 rounded-t-xl bg-bg-paper p-6 pb-8 shadow-xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Filter options"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                Filters
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
                className="font-mono text-xs text-ink-secondary hover:text-ink-primary"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {filterSelects}
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-2 w-full rounded-full bg-ink-primary py-3 font-mono text-[11px] uppercase tracking-widest text-bg-paper"
            >
              Apply Filters
            </button>
          </div>
        </>
      )}
    </div>
  );
}
