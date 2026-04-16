import { http, HttpResponse } from 'msw';
import { vehicles } from '../fixtures/vehicles';
import type { Vehicle } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleFilters = {
  city?: string;
  make?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  priceMin?: string;
  priceMax?: string;
  kmMax?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyFilters(list: Vehicle[], params: VehicleFilters): Vehicle[] {
  let result = [...list];

  if (params.city) {
    result = result.filter((v) => v.city === params.city);
  }
  if (params.make) {
    result = result.filter((v) => v.make.toLowerCase() === params.make!.toLowerCase());
  }
  if (params.bodyType) {
    result = result.filter((v) => v.bodyType === params.bodyType);
  }
  if (params.fuelType) {
    result = result.filter((v) => v.fuel === params.fuelType);
  }
  if (params.transmission) {
    result = result.filter((v) => v.transmission === params.transmission);
  }
  if (params.priceMin) {
    const min = Number(params.priceMin);
    if (!Number.isNaN(min)) result = result.filter((v) => v.price >= min);
  }
  if (params.priceMax) {
    const max = Number(params.priceMax);
    if (!Number.isNaN(max)) result = result.filter((v) => v.price <= max);
  }
  if (params.kmMax) {
    const km = Number(params.kmMax);
    if (!Number.isNaN(km)) result = result.filter((v) => v.km <= km);
  }

  return result;
}

function applySorting(list: Vehicle[], sort?: string): Vehicle[] {
  const sorted = [...list];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'km_asc':
      return sorted.sort((a, b) => a.km - b.km);
    case 'km_desc':
      return sorted.sort((a, b) => b.km - a.km);
    case 'year_desc':
      return sorted.sort((a, b) => b.year - a.year);
    case 'year_asc':
      return sorted.sort((a, b) => a.year - b.year);
    case 'listed_desc':
    default:
      return sorted.sort(
        (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime(),
      );
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const vehicleHandlers = [
  /**
   * GET /api/vehicles/featured
   * Returns 3 featured vehicles. Optionally filtered by city query param.
   */
  http.get('/api/vehicles/featured', ({ request }) => {
    const url = new URL(request.url);
    const city = url.searchParams.get('city') ?? undefined;

    let pool = vehicles.filter((v) => v.status === 'published');

    if (city) {
      const cityFiltered = pool.filter((v) => v.city === city);
      // Fall back to full pool if city has fewer than 3 published vehicles
      pool = cityFiltered.length >= 3 ? cityFiltered : pool;
    }

    const featured = pool.slice(0, 3);

    return HttpResponse.json({ data: featured });
  }),

  /**
   * GET /api/vehicles
   * Paginated list with optional filters and sorting.
   * Query params: city, make, bodyType, fuelType, transmission,
   *               priceMin, priceMax, kmMax, sort, page, pageSize
   */
  http.get('/api/vehicles', ({ request }) => {
    const url = new URL(request.url);
    const params: VehicleFilters = {
      city: url.searchParams.get('city') ?? undefined,
      make: url.searchParams.get('make') ?? undefined,
      bodyType: url.searchParams.get('bodyType') ?? undefined,
      fuelType: url.searchParams.get('fuelType') ?? undefined,
      transmission: url.searchParams.get('transmission') ?? undefined,
      priceMin: url.searchParams.get('priceMin') ?? undefined,
      priceMax: url.searchParams.get('priceMax') ?? undefined,
      kmMax: url.searchParams.get('kmMax') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
      page: url.searchParams.get('page') ?? '1',
      pageSize: url.searchParams.get('pageSize') ?? '12',
    };

    const page = Math.max(1, Number(params.page ?? '1'));
    const pageSize = Math.min(50, Math.max(1, Number(params.pageSize ?? '12')));

    const filtered = applyFilters(vehicles, params);
    const sorted = applySorting(filtered, params.sort);

    const total = sorted.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = sorted.slice(start, start + pageSize);

    return HttpResponse.json({
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  }),

  /**
   * GET /api/vehicles/:vin
   * Returns a single vehicle by VIN (case-insensitive).
   */
  http.get('/api/vehicles/:vin', ({ params }) => {
    const { vin } = params as { vin: string };
    const vehicle = vehicles.find(
      (v) => v.vin.toLowerCase() === vin.toLowerCase(),
    );

    if (!vehicle) {
      return HttpResponse.json(
        { error: 'Vehicle not found', code: 'VEHICLE_NOT_FOUND' },
        { status: 404 },
      );
    }

    return HttpResponse.json({ data: vehicle });
  }),
];
