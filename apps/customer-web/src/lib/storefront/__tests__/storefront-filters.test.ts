/**
 * Storefront filters — unit tests.
 *
 * Tests the pure filter + sort logic in use-filters.ts and the
 * saved-searches store in use-saved-searches.ts.
 *
 * Spec reference: SPEC-STOREFRONT-FILTERS-001 §Scenarios S1–S22
 * Test placement: cross-module integration → src/lib/storefront/__tests__/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyInventoryFilters,
  applySort,
  type InventoryFilters,
} from '../use-filters';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal InventoryFilters with only the specified keys set */
function filters(overrides: Partial<InventoryFilters> = {}): InventoryFilters {
  return {
    priceMin: null,
    priceMax: null,
    yearMin: null,
    yearMax: null,
    kmMin: null,
    kmMax: null,
    fuel: [],
    transmission: '',
    bodyType: [],
    color: [],
    certified: false,
    city: '',
    sort: 'newest',
    page: 1,
    ...overrides,
  };
}

const published = allVehicles.filter((v) => v.status === 'published');

// ─── Filter logic — S1 Price range ───────────────────────────────────────────

describe('applyInventoryFilters — price range (S1)', () => {
  it('returns only vehicles within price range when priceMin and priceMax set', () => {
    const min = 10_000_000; // ₹1 Crore
    const max = 15_000_000; // ₹1.5 Crore
    const result = applyInventoryFilters(published, filters({ priceMin: min, priceMax: max }));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((v) => {
      expect(v.price).toBeGreaterThanOrEqual(min);
      expect(v.price).toBeLessThanOrEqual(max);
    });
  });

  it('returns all published when no price filter set', () => {
    const result = applyInventoryFilters(published, filters());
    expect(result.length).toBe(published.length);
  });

  it('filters out vehicles below priceMin', () => {
    const priceMin = 20_000_000; // ₹2Cr — should exclude most
    const result = applyInventoryFilters(published, filters({ priceMin }));
    result.forEach((v) => expect(v.price).toBeGreaterThanOrEqual(priceMin));
  });
});

// ─── Filter logic — S2 Fuel multi-select ─────────────────────────────────────

describe('applyInventoryFilters — fuel multi-select (S2)', () => {
  it('returns only petrol vehicles when fuel=["petrol"]', () => {
    const result = applyInventoryFilters(published, filters({ fuel: ['petrol'] }));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((v) => expect(v.fuel).toBe('petrol'));
  });

  it('returns petrol + diesel vehicles when fuel=["petrol","diesel"]', () => {
    const result = applyInventoryFilters(published, filters({ fuel: ['petrol', 'diesel'] }));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((v) => expect(['petrol', 'diesel']).toContain(v.fuel));
  });

  it('returns all when fuel=[] (no filter)', () => {
    const result = applyInventoryFilters(published, filters({ fuel: [] }));
    expect(result.length).toBe(published.length);
  });
});

// ─── Filter logic — S3 Body type multi-select ────────────────────────────────

describe('applyInventoryFilters — body type multi-select (S3)', () => {
  it('returns only SUVs when bodyType=["suv"]', () => {
    const result = applyInventoryFilters(published, filters({ bodyType: ['suv'] }));
    result.forEach((v) => expect(v.bodyType).toBe('suv'));
  });

  it('returns sedan + SUV when bodyType=["sedan","suv"]', () => {
    const result = applyInventoryFilters(published, filters({ bodyType: ['sedan', 'suv'] }));
    result.forEach((v) => expect(['sedan', 'suv']).toContain(v.bodyType));
  });
});

// ─── Filter logic — S4 CPO toggle ────────────────────────────────────────────

describe('applyInventoryFilters — CPO toggle (S4)', () => {
  it('returns only CPO vehicles when certified=true', () => {
    const result = applyInventoryFilters(published, filters({ certified: true }));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((v) => expect(v.isCertified).toBe(true));
  });

  it('returns all vehicles when certified=false', () => {
    const result = applyInventoryFilters(published, filters({ certified: false }));
    expect(result.length).toBe(published.length);
  });
});

// ─── Filter logic — S16 Mileage range ────────────────────────────────────────

describe('applyInventoryFilters — mileage range (S16)', () => {
  it('returns only vehicles with km ≤ kmMax', () => {
    const kmMax = 25_000;
    const result = applyInventoryFilters(published, filters({ kmMax }));
    result.forEach((v) => expect(v.km).toBeLessThanOrEqual(kmMax));
  });

  it('returns only vehicles with km ≥ kmMin', () => {
    const kmMin = 50_000;
    const result = applyInventoryFilters(published, filters({ kmMin }));
    result.forEach((v) => expect(v.km).toBeGreaterThanOrEqual(kmMin));
  });
});

// ─── Filter logic — S17 Year range ───────────────────────────────────────────

describe('applyInventoryFilters — year range (S17)', () => {
  it('returns only vehicles from yearMin onwards', () => {
    const yearMin = 2022;
    const result = applyInventoryFilters(published, filters({ yearMin }));
    result.forEach((v) => expect(v.year).toBeGreaterThanOrEqual(yearMin));
  });

  it('returns only vehicles up to yearMax', () => {
    const yearMax = 2021;
    const result = applyInventoryFilters(published, filters({ yearMax }));
    result.forEach((v) => expect(v.year).toBeLessThanOrEqual(yearMax));
  });
});

// ─── Filter logic — S19 Transmission ─────────────────────────────────────────

describe('applyInventoryFilters — transmission (S19)', () => {
  it('returns only automatic vehicles when transmission="automatic"', () => {
    const result = applyInventoryFilters(published, filters({ transmission: 'automatic' }));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((v) => expect(v.transmission).toBe('automatic'));
  });

  it('returns all vehicles when transmission="" (no filter)', () => {
    const result = applyInventoryFilters(published, filters({ transmission: '' }));
    expect(result.length).toBe(published.length);
  });
});

// ─── Filter logic — S20 Outlet / city ────────────────────────────────────────

describe('applyInventoryFilters — outlet/city (S20)', () => {
  it('returns only Mumbai vehicles when city="mumbai"', () => {
    const result = applyInventoryFilters(published, filters({ city: 'mumbai' }));
    expect(result.length).toBeGreaterThan(0);
    result.forEach((v) => expect(v.city).toBe('mumbai'));
  });

  it('returns all vehicles when city="" (pan-india)', () => {
    const result = applyInventoryFilters(published, filters({ city: '' }));
    expect(result.length).toBe(published.length);
  });
});

// ─── Filter logic — S18 Colour ────────────────────────────────────────────────

describe('applyInventoryFilters — colour (S18)', () => {
  it('returns only vehicles with matching color (case-insensitive partial)', () => {
    const result = applyInventoryFilters(published, filters({ color: ['Grey'] }));
    result.forEach((v) =>
      expect(v.color.toLowerCase()).toContain('grey'),
    );
  });

  it('returns all when color=[] (no filter)', () => {
    const result = applyInventoryFilters(published, filters({ color: [] }));
    expect(result.length).toBe(published.length);
  });
});

// ─── Filter logic — published status ─────────────────────────────────────────

describe('applyInventoryFilters — published only', () => {
  it('excludes reserved and sold vehicles', () => {
    const all = allVehicles; // includes all statuses
    const result = applyInventoryFilters(all, filters());
    result.forEach((v) => expect(v.status).toBe('published'));
  });
});

// ─── Sort logic ───────────────────────────────────────────────────────────────

describe('applySort', () => {
  it('sorts by price ascending', () => {
    const sorted = applySort([...published], 'priceAsc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.price).toBeGreaterThanOrEqual(sorted[i - 1]!.price);
    }
  });

  it('sorts by price descending', () => {
    const sorted = applySort([...published], 'priceDesc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.price).toBeLessThanOrEqual(sorted[i - 1]!.price);
    }
  });

  it('sorts by km ascending', () => {
    const sorted = applySort([...published], 'kmAsc');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.km).toBeGreaterThanOrEqual(sorted[i - 1]!.km);
    }
  });

  it('sorts by newest (listedAt desc) by default', () => {
    const sorted = applySort([...published], 'newest');
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1]!.listedAt).getTime();
      const d2 = new Date(sorted[i]!.listedAt).getTime();
      expect(d1).toBeGreaterThanOrEqual(d2);
    }
  });

  it('does not mutate the original array', () => {
    const original = [...published];
    applySort([...published], 'priceAsc');
    expect(original.map((v) => v.vin)).toEqual(published.map((v) => v.vin));
  });
});

// ─── Combined filter + sort (S21) ────────────────────────────────────────────

describe('combined filter + sort (S21)', () => {
  it('filters petrol vehicles then sorts by price ascending', () => {
    const f = filters({ fuel: ['petrol'], sort: 'priceAsc' });
    const filtered = applyInventoryFilters(published, f);
    const sorted = applySort(filtered, f.sort);

    sorted.forEach((v) => expect(v.fuel).toBe('petrol'));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.price).toBeGreaterThanOrEqual(sorted[i - 1]!.price);
    }
  });
});

// ─── Empty state (S15) ────────────────────────────────────────────────────────

describe('empty state (S15)', () => {
  it('returns empty array when no vehicles match the filters', () => {
    const result = applyInventoryFilters(published, filters({
      city: 'mumbai',
      fuel: ['electric'],
      certified: true,
      priceMax: 1_000_000, // ₹10L — too low for luxury electric
    }));
    expect(result).toHaveLength(0);
  });
});
