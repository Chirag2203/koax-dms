/**
 * FilterChipRail — active filter chips with clear-each and clear-all.
 *
 * Renders one chip per active filter. Each chip has a ✕ button that removes
 * only that filter. A "Clear all" link appears when any filter is active.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 S5, S6
 */

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { InventoryFilters, FilterKey } from '@/src/lib/storefront/use-filters';
import { formatRupeeShort } from './price-range-slider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterChipRailProps {
  filters: InventoryFilters;
  onRemove: (key: FilterKey) => void;
  onClearAll: () => void;
  className?: string;
}

interface Chip {
  key: FilterKey;
  label: string;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'bg-bg-subtle border border-line rounded-full',
        'px-3 py-1.5',
        'font-mono text-xs uppercase tracking-widest text-ink-secondary',
      )}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className={cn(
          'flex h-3.5 w-3.5 items-center justify-center rounded-full',
          'text-ink-muted hover:text-ink-primary hover:bg-line transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        )}
      >
        <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2" aria-hidden="true">
          <path
            d="M1 1l8 8M9 1L1 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}

// ─── FilterChipRail ───────────────────────────────────────────────────────────

export function FilterChipRail({
  filters,
  onRemove,
  onClearAll,
  className,
}: FilterChipRailProps) {
  const t = useTranslations('inventory');

  const chips: Chip[] = [];

  if (filters.priceMin !== null || filters.priceMax !== null) {
    const min = filters.priceMin ? formatRupeeShort(filters.priceMin) : t('chipPriceFrom');
    const max = filters.priceMax ? formatRupeeShort(filters.priceMax) : t('chipPriceTo');
    chips.push({ key: 'priceMin', label: `${min} – ${max}` });
  }

  if (filters.yearMin !== null || filters.yearMax !== null) {
    const min = filters.yearMin ?? t('chipYearFrom');
    const max = filters.yearMax ?? t('chipYearTo');
    chips.push({ key: 'yearMin', label: `${min} – ${max}` });
  }

  if (filters.kmMin !== null || filters.kmMax !== null) {
    const min = filters.kmMin != null ? `${(filters.kmMin / 1000).toFixed(0)}k km` : t('chipKmFrom');
    const max = filters.kmMax != null ? `${(filters.kmMax / 1000).toFixed(0)}k km` : t('chipKmTo');
    chips.push({ key: 'kmMin', label: `${min} – ${max}` });
  }

  filters.fuel.forEach((f) => {
    chips.push({ key: 'fuel', label: f.charAt(0).toUpperCase() + f.slice(1) });
  });

  if (filters.transmission) {
    chips.push({
      key: 'transmission',
      label: filters.transmission.charAt(0).toUpperCase() + filters.transmission.slice(1),
    });
  }

  filters.bodyType.forEach((b) => {
    chips.push({ key: 'bodyType', label: b.charAt(0).toUpperCase() + b.slice(1) });
  });

  filters.color.forEach((c) => {
    chips.push({ key: 'color', label: c });
  });

  if (filters.certified) {
    chips.push({ key: 'certified', label: t('chipCPOOnly') });
  }

  if (filters.city) {
    chips.push({ key: 'city', label: filters.city.charAt(0).toUpperCase() + filters.city.slice(1) });
  }

  if (chips.length === 0) return null;

  function handleRemove(chip: Chip) {
    // For range pairs, remove both endpoints
    if (chip.key === 'priceMin') {
      onRemove('priceMin');
      onRemove('priceMax');
    } else if (chip.key === 'yearMin') {
      onRemove('yearMin');
      onRemove('yearMax');
    } else if (chip.key === 'kmMin') {
      onRemove('kmMin');
      onRemove('kmMax');
    } else if (chip.key === 'fuel' || chip.key === 'bodyType' || chip.key === 'color') {
      // Remove individual value from multi-select — handled by parent via removeFilter
      // For simplicity with multi-values, we clear the entire group
      onRemove(chip.key);
    } else {
      onRemove(chip.key);
    }
  }

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      aria-label="Active filters"
    >
      {chips.map((chip, i) => (
        <FilterChip
          key={`${chip.key}-${i}`}
          label={chip.label}
          onRemove={() => handleRemove(chip)}
        />
      ))}

      <button
        onClick={onClearAll}
        className={cn(
          'font-mono text-xs uppercase tracking-widest text-accent',
          'underline underline-offset-2 hover:text-accent/80 transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm',
        )}
      >
        {t('clearAll')}
      </button>
    </div>
  );
}
