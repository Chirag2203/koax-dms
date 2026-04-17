/**
 * Shared filter bar used by the Stock List and Low Stock tabs.
 *
 * Outlet / Brand / Category / Criticality / Search. Lives inside a card
 * (p-3) above the DataTable. Inputs h-10, labels uppercase text-[11px].
 *
 * Spec reference: PLAN-PARTS-002 §6.1, §17.5
 */

'use client';

import { Search } from 'lucide-react';
import { cn } from '@dms/ui';
import type { PartCategory, PartCriticality } from '@dms/types';
import { OUTLET_NAMES, OUTLET_ORDER } from './helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartsFilters {
  outletId: 'ALL' | string;
  brand: 'ALL' | string;
  category: 'ALL' | PartCategory;
  criticality: 'ALL' | PartCriticality;
  search: string;
}

export const DEFAULT_PARTS_FILTERS: PartsFilters = {
  outletId: 'ALL',
  brand: 'ALL',
  category: 'ALL',
  criticality: 'ALL',
  search: '',
};

export function isPartsFiltersDefault(f: PartsFilters): boolean {
  return (
    f.outletId === 'ALL' &&
    f.brand === 'ALL' &&
    f.category === 'ALL' &&
    f.criticality === 'ALL' &&
    f.search === ''
  );
}

const CATEGORIES: PartCategory[] = ['MECHANICAL', 'ELECTRICAL', 'TRIM', 'CONSUMABLE'];
const CRITICALITIES: PartCriticality[] = ['ROUTINE', 'COMMON', 'CRITICAL', 'SAFETY'];

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PartsFilterBarProps {
  filters: PartsFilters;
  onChange: (next: PartsFilters) => void;
  brands: string[];
}

export function PartsFilterBar({ filters, onChange, brands }: PartsFilterBarProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-line bg-bg-surface p-3',
        'flex flex-wrap items-end gap-3',
      )}
    >
      <Field label="Outlet">
        <select
          aria-label="Filter by outlet"
          value={filters.outletId}
          onChange={(e) => onChange({ ...filters, outletId: e.target.value })}
          className={selectCls('w-40')}
        >
          <option value="ALL">All outlets</option>
          {OUTLET_ORDER.map((id) => (
            <option key={id} value={id}>
              {OUTLET_NAMES[id] ?? id}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Brand">
        <select
          aria-label="Filter by brand"
          value={filters.brand}
          onChange={(e) => onChange({ ...filters, brand: e.target.value })}
          className={selectCls('w-40')}
        >
          <option value="ALL">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Category">
        <select
          aria-label="Filter by category"
          value={filters.category}
          onChange={(e) =>
            onChange({ ...filters, category: e.target.value as PartsFilters['category'] })
          }
          className={selectCls('w-44')}
        >
          <option value="ALL">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Criticality">
        <select
          aria-label="Filter by criticality"
          value={filters.criticality}
          onChange={(e) =>
            onChange({
              ...filters,
              criticality: e.target.value as PartsFilters['criticality'],
            })
          }
          className={selectCls('w-40')}
        >
          <option value="ALL">All levels</option>
          {CRITICALITIES.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Search" className="flex-1 min-w-[240px]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
          />
          <input
            type="search"
            aria-label="Search parts by code or name"
            placeholder="Part code or name"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className={cn(
              'h-10 w-full rounded-md bg-bg-subtle border border-line pl-10 pr-3',
              'text-sm text-ink-primary placeholder:text-ink-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
            )}
          />
        </div>
      </Field>
    </div>
  );
}

// ─── Small helpers (local) ────────────────────────────────────────────────────

function selectCls(width: string): string {
  return cn(
    'h-10 rounded-md bg-bg-subtle border border-line px-3',
    'text-sm text-ink-primary',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
    width,
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

// ─── Predicate (pure — exported for tab use) ──────────────────────────────────

import type { Part } from '@dms/types';

/**
 * Apply the shared parts filter predicate to a `Part`.
 * Used by both Stock List and Low Stock tabs (spec §6.1).
 */
export function matchesPartsFilters(part: Part, f: PartsFilters): boolean {
  if (f.outletId !== 'ALL' && !part.stock.some((s) => s.outletId === f.outletId)) {
    return false;
  }
  if (f.brand !== 'ALL' && part.brand !== f.brand) return false;
  if (f.category !== 'ALL' && part.category !== f.category) return false;
  if (f.criticality !== 'ALL' && part.criticality !== f.criticality) return false;
  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    if (
      !part.partCode.toLowerCase().includes(q) &&
      !part.name.toLowerCase().includes(q)
    ) {
      return false;
    }
  }
  return true;
}
