/**
 * useFilters — URL-driven filter state hook for the inventory page.
 *
 * All filter state is stored in URL search params so links are shareable
 * and the back button works correctly.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 L1, L2, L3
 *
 * URL param schema:
 *   priceMin, priceMax  — integer rupees (L2)
 *   yearMin, yearMax    — 4-digit year integers (L10)
 *   kmMin, kmMax        — integer kilometres (L9)
 *   fuel                — comma-separated (L3): petrol,diesel,electric,hybrid
 *   transmission        — single value: automatic | manual
 *   bodyType            — comma-separated (L3): sedan,suv,coupe,convertible,hatchback
 *   color               — comma-separated (L3): color name fragments
 *   certified           — 'true' (L6)
 *   city                — single value: bangalore | mumbai | chennai (L7)
 *   sort                — newest | priceAsc | priceDesc | kmAsc
 *   page                — integer page number
 */

'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Vehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryFilters {
  priceMin: number | null;
  priceMax: number | null;
  yearMin: number | null;
  yearMax: number | null;
  kmMin: number | null;
  kmMax: number | null;
  fuel: string[];
  transmission: string;
  bodyType: string[];
  color: string[];
  certified: boolean;
  city: string;
  sort: string;
  page: number;
}

export type FilterKey = keyof InventoryFilters;

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const PRICE_MIN_DEFAULT = 500_000;    // ₹5 Lakh
export const PRICE_MAX_DEFAULT = 20_000_000; // ₹2 Crore
export const YEAR_MIN_DEFAULT = 2015;
export const YEAR_MAX_DEFAULT = new Date().getFullYear();
export const KM_MIN_DEFAULT = 0;
export const KM_MAX_DEFAULT = 200_000;

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseIntOrNull(val: string | null): number | null {
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function parseCommaList(val: string | null): string[] {
  if (!val) return [];
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilters(basePath = '/inventory') {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse current URL into a typed filter object
  const filters: InventoryFilters = {
    priceMin: parseIntOrNull(searchParams.get('priceMin')),
    priceMax: parseIntOrNull(searchParams.get('priceMax')),
    yearMin: parseIntOrNull(searchParams.get('yearMin')),
    yearMax: parseIntOrNull(searchParams.get('yearMax')),
    kmMin: parseIntOrNull(searchParams.get('kmMin')),
    kmMax: parseIntOrNull(searchParams.get('kmMax')),
    fuel: parseCommaList(searchParams.get('fuel')),
    transmission: searchParams.get('transmission') ?? '',
    bodyType: parseCommaList(searchParams.get('bodyType')),
    color: parseCommaList(searchParams.get('color')),
    certified: searchParams.get('certified') === 'true',
    city: searchParams.get('city') ?? '',
    sort: searchParams.get('sort') ?? 'newest',
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)),
  };

  /**
   * Set a single filter. Resets page to 1 (L22 — pagination resets on filter change).
   */
  const setFilter = useCallback(
    (key: FilterKey, value: string | number | string[] | boolean | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (
        value === null ||
        value === '' ||
        value === false ||
        (Array.isArray(value) && value.length === 0)
      ) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, String(value));
      }

      // Always reset to page 1 when a filter changes (S22)
      if (key !== 'page') params.set('page', '1');

      router.push(`${basePath}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, basePath],
  );

  /**
   * Remove a single filter key from the URL.
   */
  const removeFilter = useCallback(
    (key: FilterKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      params.set('page', '1');
      router.push(`${basePath}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, basePath],
  );

  /**
   * Clear ALL filter params; keep sort if present.
   */
  const clearAll = useCallback(() => {
    const sort = filters.sort !== 'newest' ? `?sort=${filters.sort}` : '';
    router.push(`${basePath}${sort}`, { scroll: false });
  }, [filters.sort, router, basePath]);

  /**
   * Navigate to a specific page.
   */
  const setPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(page));
      router.push(`${basePath}?${params.toString()}`, { scroll: true });
    },
    [searchParams, router, basePath],
  );

  /**
   * Get current filter state as a URL query string for saved searches.
   */
  const toQueryString = useCallback((): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page'); // Don't save page number
    return params.toString();
  }, [searchParams]);

  /**
   * Count of active (non-default) filters.
   */
  const activeCount =
    (filters.priceMin !== null ? 1 : 0) +
    (filters.priceMax !== null ? 1 : 0) +
    (filters.yearMin !== null ? 1 : 0) +
    (filters.yearMax !== null ? 1 : 0) +
    (filters.kmMin !== null ? 1 : 0) +
    (filters.kmMax !== null ? 1 : 0) +
    filters.fuel.length +
    (filters.transmission ? 1 : 0) +
    filters.bodyType.length +
    filters.color.length +
    (filters.certified ? 1 : 0) +
    (filters.city ? 1 : 0);

  return {
    filters,
    setFilter,
    removeFilter,
    clearAll,
    setPage,
    toQueryString,
    activeCount,
    searchParams,
  };
}

// ─── Filter logic ─────────────────────────────────────────────────────────────

/**
 * Apply InventoryFilters to a vehicle array.
 * Pure function — safe to use in tests without React.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 S1–S21
 */
export function applyInventoryFilters(
  vehicles: Vehicle[],
  filters: InventoryFilters,
): Vehicle[] {
  return vehicles.filter((v) => {
    if (v.status !== 'published') return false;

    // Price range (L2)
    if (filters.priceMin !== null && v.price < filters.priceMin) return false;
    if (filters.priceMax !== null && v.price > filters.priceMax) return false;

    // Year range (L10)
    if (filters.yearMin !== null && v.year < filters.yearMin) return false;
    if (filters.yearMax !== null && v.year > filters.yearMax) return false;

    // Mileage range (L9)
    if (filters.kmMin !== null && v.km < filters.kmMin) return false;
    if (filters.kmMax !== null && v.km > filters.kmMax) return false;

    // Fuel multi-select (L3)
    if (filters.fuel.length > 0 && !filters.fuel.includes(v.fuel)) return false;

    // Transmission
    if (filters.transmission && v.transmission !== filters.transmission) return false;

    // Body type multi-select (L3)
    if (filters.bodyType.length > 0 && !filters.bodyType.includes(v.bodyType)) return false;

    // Color multi-select — case-insensitive partial match (L11)
    if (filters.color.length > 0) {
      const vColor = v.color.toLowerCase();
      const matched = filters.color.some((c) => vColor.includes(c.toLowerCase()));
      if (!matched) return false;
    }

    // CPO toggle (L6)
    if (filters.certified && !v.isCertified) return false;

    // City / outlet (L7)
    if (filters.city && v.city !== filters.city) return false;

    return true;
  });
}

/**
 * Sort vehicles by the given sort key.
 * Pure function — safe to use in tests.
 */
export function applySort(vehicles: Vehicle[], sort: string): Vehicle[] {
  const copy = [...vehicles];
  switch (sort) {
    case 'priceAsc':
      return copy.sort((a, b) => a.price - b.price);
    case 'priceDesc':
      return copy.sort((a, b) => b.price - a.price);
    case 'kmAsc':
      return copy.sort((a, b) => a.km - b.km);
    case 'newest':
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime(),
      );
  }
}
