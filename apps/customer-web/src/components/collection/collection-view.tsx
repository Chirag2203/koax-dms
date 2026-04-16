'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';
import { VehicleCard } from '@/src/components/vehicle-card';
import { FilterBar } from './filter-bar';
import { ActiveFilters } from './active-filters';
import { ResultsToolbar } from './results-toolbar';
import { CollectionEmptyState } from './collection-empty-state';
import { EditorialQuote } from './editorial-quote';
import { Pagination } from './pagination';
import type { FilterState } from './filter-bar';

// ─── Price range boundaries (in rupees) ──────────────────────────────────────

const PRICE_RANGES: Record<string, [number, number]> = {
  under50: [0, 5_000_000],
  '50to100': [5_000_000, 10_000_000],
  '100to200': [10_000_000, 20_000_000],
  above200: [20_000_000, Infinity],
};

const PER_PAGE = 12;

// ─── Filtering + sorting helpers ─────────────────────────────────────────────

function applyFilters(filters: FilterState) {
  let result = allVehicles.filter((v) => v.status === 'published');

  if (filters.make) result = result.filter((v) => v.make === filters.make);
  if (filters.bodyType) result = result.filter((v) => v.bodyType === filters.bodyType);
  if (filters.fuel) result = result.filter((v) => v.fuel === filters.fuel);
  if (filters.transmission)
    result = result.filter((v) => v.transmission === filters.transmission);
  if (filters.city) result = result.filter((v) => v.city === filters.city);
  if (filters.certified) result = result.filter((v) => v.isCertified);
  if (filters.priceRange) {
    const range = PRICE_RANGES[filters.priceRange];
    if (range) {
      const [min, max] = range;
      result = result.filter((v) => v.price >= min && v.price < max);
    }
  }

  return result;
}

function applySort(vehicles: typeof allVehicles, sort: string) {
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

// ─── CollectionView ───────────────────────────────────────────────────────────

export function CollectionView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('collection');

  // ── Parse filters from URL ─────────────────────────────────────────────────

  const filters: FilterState = {
    make: searchParams.get('make') ?? '',
    bodyType: searchParams.get('bodyType') ?? '',
    fuel: searchParams.get('fuel') ?? '',
    transmission: searchParams.get('transmission') ?? '',
    city: searchParams.get('city') ?? '',
    certified: searchParams.get('certified') === 'true',
    priceRange: searchParams.get('priceRange') ?? '',
    sort: searchParams.get('sort') ?? 'newest',
  };

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  // ── Filter + sort + paginate ───────────────────────────────────────────────

  const filtered = applySort(applyFilters(filters), filters.sort);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Split paged results around the editorial quote
  const firstSlice = paged.slice(0, 6);
  const secondSlice = paged.slice(6);

  // ── URL helpers ────────────────────────────────────────────────────────────

  function handleFilterChange(key: string, value: string | boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === '' || value === false) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    params.set('page', '1');
    router.push(`/collection?${params.toString()}`, { scroll: false });
  }

  function handleRemoveFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.set('page', '1');
    router.push(`/collection?${params.toString()}`, { scroll: false });
  }

  function handleClearAll() {
    router.push('/collection', { scroll: false });
  }

  function handleSortChange(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    params.set('page', '1');
    router.push(`/collection?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/collection?${params.toString()}`, { scroll: true });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Sticky filter bar — outside the padded container so it spans full width */}
      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Page content */}
      <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-16">
        {/* Collection header */}
        <header className="mb-16">
          <span className="mb-4 block font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            {t('eyebrow')}
          </span>
          <h1 className="font-display text-5xl md:text-6xl tracking-tighter mb-4 italic text-ink-primary">
            {t('headline')}
          </h1>
          <p className="font-mono text-sm text-ink-muted max-w-md leading-relaxed">
            {t('subtitle')}
          </p>
        </header>

        {/* Active filter chips */}
        <ActiveFilters
          filters={filters}
          onRemove={handleRemoveFilter}
          className="mb-6"
        />

        {/* Results toolbar */}
        <ResultsToolbar
          count={paged.length}
          total={totalCount}
          sort={filters.sort}
          onSortChange={handleSortChange}
          className="mb-10 border-b border-line pb-6"
        />

        {/* Grid or empty state */}
        {totalCount === 0 ? (
          <CollectionEmptyState onClear={handleClearAll} />
        ) : (
          <>
            {/* First 6 cards */}
            {firstSlice.length > 0 && (
              <section
                aria-label="Vehicle listing"
                className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3"
              >
                {firstSlice.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.vin}
                    vehicle={vehicle}
                    variant="collection"
                  />
                ))}
              </section>
            )}

            {/* Editorial quote break — only shown when we have a full first page and remaining cards */}
            {firstSlice.length === 6 && secondSlice.length > 0 && (
              <EditorialQuote />
            )}

            {/* Remaining cards */}
            {secondSlice.length > 0 && (
              <section
                aria-label="More vehicles"
                className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3 mt-8"
              >
                {secondSlice.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.vin}
                    vehicle={vehicle}
                    variant="collection"
                  />
                ))}
              </section>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="mt-20"
            />
          </>
        )}
      </div>
    </>
  );
}
