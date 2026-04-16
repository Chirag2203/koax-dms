'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import type { FilterState } from './filter-bar';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveFiltersProps {
  filters: FilterState;
  onRemove: (key: string) => void;
  className?: string;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  onRemove: () => void;
}

function Chip({ label, onRemove }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'bg-bg-subtle border border-line rounded-full',
        'px-3 py-1.5',
        'font-mono text-[11px] uppercase tracking-widest text-ink-secondary',
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

// ─── ActiveFilters ────────────────────────────────────────────────────────────

export function ActiveFilters({ filters, onRemove, className }: ActiveFiltersProps) {
  const t = useTranslations('collection');

  // Build label map for price ranges
  const priceLabel: Record<string, string> = {
    under50: t('priceUnder50'),
    '50to100': t('price50to100'),
    '100to200': t('price100to200'),
    above200: t('priceAbove200'),
  };

  const chips: { key: string; label: string }[] = [];

  if (filters.make) chips.push({ key: 'make', label: filters.make });
  if (filters.bodyType)
    chips.push({
      key: 'bodyType',
      label: filters.bodyType.charAt(0).toUpperCase() + filters.bodyType.slice(1),
    });
  if (filters.fuel)
    chips.push({
      key: 'fuel',
      label: filters.fuel.charAt(0).toUpperCase() + filters.fuel.slice(1),
    });
  if (filters.transmission)
    chips.push({
      key: 'transmission',
      label:
        filters.transmission.charAt(0).toUpperCase() + filters.transmission.slice(1),
    });
  if (filters.city)
    chips.push({
      key: 'city',
      label: filters.city.charAt(0).toUpperCase() + filters.city.slice(1),
    });
  if (filters.certified) chips.push({ key: 'certified', label: 'CPO Only' });
  if (filters.priceRange)
    chips.push({ key: 'priceRange', label: priceLabel[filters.priceRange] ?? filters.priceRange });

  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-3',
        className,
      )}
      aria-label="Active filters"
    >
      {chips.map(({ key, label }) => (
        <Chip
          key={key}
          label={label}
          onRemove={() => onRemove(key)}
        />
      ))}
    </div>
  );
}
