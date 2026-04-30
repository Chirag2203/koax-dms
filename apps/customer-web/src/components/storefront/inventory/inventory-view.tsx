/**
 * InventoryView — filterable inventory page main view.
 *
 * Client component that:
 * 1. Reads filter state from URL via useFilters hook
 * 2. Applies filters + sort to the vehicle fixture list
 * 3. Renders filter sidebar, active chip rail, results grid, compare bar
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 §InventoryView
 */

'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';
import { useFilters, applyInventoryFilters, applySort } from '@/src/lib/storefront/use-filters';
import { FilterSidebar } from '../filters/filter-sidebar';
import { FilterChipRail } from '../filters/filter-chip-rail';
import { SavedSearchButton } from '../filters/saved-search-button';
import { CompareBar } from '../compare/compare-bar';
import { InventoryCard } from './inventory-card';
import { CollectionEmptyState } from '@/src/components/collection/collection-empty-state';
import { Pagination } from '@/src/components/collection/pagination';
import { ResultsToolbar } from '@/src/components/collection/results-toolbar';
import type { FilterKey } from '@/src/lib/storefront/use-filters';

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 12;
const MAX_COMPARE = 3; // L4

// ─── Published vehicles ───────────────────────────────────────────────────────

const publishedVehicles = allVehicles.filter((v) => v.status === 'published');

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryView() {
  const t = useTranslations('inventory');
  const { filters, setFilter, removeFilter, clearAll, setPage, toQueryString, activeCount } =
    useFilters('/inventory');

  // ── Compare state (L12 — local, not URL) ──────────────────────────────────

  const [compareVins, setCompareVins] = React.useState<string[]>([]);

  function toggleCompare(vin: string) {
    setCompareVins((prev) => {
      if (prev.includes(vin)) {
        return prev.filter((v) => v !== vin);
      }
      if (prev.length >= MAX_COMPARE) {
        // FIFO — drop oldest, add newest (S9)
        return [...prev.slice(1), vin];
      }
      return [...prev, vin];
    });
  }

  function clearCompare() {
    setCompareVins([]);
  }

  // ── Filter + sort + paginate ───────────────────────────────────────────────

  const filtered = React.useMemo(
    () => applySort(applyInventoryFilters(publishedVehicles, filters), filters.sort),
    [filters],
  );

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const safePage = Math.min(filters.page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // ── URL helpers typed via FilterKey ───────────────────────────────────────

  function handleFilterChange(key: FilterKey, value: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFilter(key, value as any);
  }

  function handleRemoveFilter(key: FilterKey) {
    removeFilter(key);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mx-auto max-w-[1440px] px-6 md:px-12 lg:px-24 py-16">
        {/* Page header */}
        <header className="mb-12">
          <span className="mb-3 block font-mono text-xs uppercase tracking-widest text-accent">
            {t('eyebrow')}
          </span>
          <h1 className="font-display text-5xl md:text-6xl italic tracking-tighter mb-4 text-ink-primary">
            {t('headline')}
          </h1>
          <p className="font-mono text-sm text-ink-muted max-w-md leading-relaxed">
            {t('subtitle')}
          </p>
        </header>

        {/* Two-column layout: sidebar + content */}
        <div className="flex gap-10">
          {/* Filter sidebar */}
          <FilterSidebar
            filters={filters}
            allVehicles={publishedVehicles}
            onFilterChange={handleFilterChange}
            onClearAll={clearAll}
            activeCount={activeCount}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Active filter chips */}
            {activeCount > 0 && (
              <FilterChipRail
                filters={filters}
                onRemove={handleRemoveFilter}
                onClearAll={clearAll}
                className="mb-4"
              />
            )}

            {/* Toolbar: results count + sort + saved search */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b border-line">
              <ResultsToolbar
                count={paged.length}
                total={totalCount}
                sort={filters.sort}
                onSortChange={(sort) => setFilter('sort', sort)}
              />

              {/* Saved search button — visible when any filter active */}
              {activeCount > 0 && (
                <SavedSearchButton queryString={toQueryString()} />
              )}
            </div>

            {/* Grid or empty state */}
            {totalCount === 0 ? (
              <CollectionEmptyState onClear={clearAll} />
            ) : (
              <>
                <section
                  aria-label={t('gridLabel')}
                  className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 xl:grid-cols-3"
                >
                  {paged.map((vehicle) => (
                    <InventoryCard
                      key={vehicle.vin}
                      vehicle={vehicle}
                      isCompareSelected={compareVins.includes(vehicle.vin)}
                      isCompareDisabled={compareVins.length >= MAX_COMPARE}
                      onCompareToggle={toggleCompare}
                    />
                  ))}
                </section>

                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  className={compareVins.length > 0 ? 'mt-20 mb-32' : 'mt-20'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sticky compare bar (L12) */}
      <CompareBar
        selectedVins={compareVins}
        vehicles={publishedVehicles}
        onRemove={(vin) => setCompareVins((prev) => prev.filter((v) => v !== vin))}
        onClear={clearCompare}
      />
    </>
  );
}
