/**
 * CustomBuildsPartsPage — aftermarket parts catalog.
 *
 * Grid view with search + category filter.
 * R09+ gate (all roles that can view custom-builds).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §7
 */

'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { AftermarketPartCategory } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { AftermarketPartCard } from './aftermarket-part-card';

const CATEGORIES: { value: AftermarketPartCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'aero', label: 'Aero' },
  { value: 'wheels', label: 'Wheels' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'paint', label: 'Paint & Protection' },
  { value: 'interior', label: 'Interior' },
  { value: 'ecu', label: 'ECU' },
  { value: 'lighting', label: 'Lighting' },
];

export function CustomBuildsPartsPage() {
  const parts = useCustomBuildsStore((s) => s.parts);
  const hydrated = useCustomBuildsStore((s) => s.hydrated);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AftermarketPartCategory | 'all'>('all');

  const filtered = useMemo(() => {
    let result = parts;
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q),
      );
    }
    return result;
  }, [parts, category, search]);

  if (!hydrated) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 bg-bg-subtle rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-line">
        <h1 className="text-[18px] font-semibold text-ink-primary">Parts Catalog</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">{parts.length} aftermarket parts</p>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-line flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or SKU..."
            className="w-full h-9 pl-8 pr-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            aria-label="Search parts by name or SKU"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value as AftermarketPartCategory | 'all')}
              className={[
                'h-8 px-3 rounded text-[12px] font-medium transition-colors',
                category === c.value
                  ? 'bg-accent text-white'
                  : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
              ].join(' ')}
              aria-pressed={category === c.value}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[15px] font-medium text-ink-primary">
              No parts match your filters
            </p>
            <button
              type="button"
              onClick={() => { setSearch(''); setCategory('all'); }}
              className="mt-3 text-[13px] text-accent hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((part) => (
              <AftermarketPartCard key={part.sku} part={part} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
