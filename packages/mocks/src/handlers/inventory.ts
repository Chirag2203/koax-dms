import { http, HttpResponse } from 'msw';
import { vehicles } from '../fixtures/vehicles';
import {
  costLedgerEntries,
  appraisals,
  vehicleTimelineEvents,
  vehicleDocuments,
} from '../fixtures/inventory';
import type { CostLedgerEntry } from '@dms/types';

// ─── Inventory Handlers ───────────────────────────────────────────────────────

export const inventoryHandlers = [
  /**
   * GET /api/staff/inventory/vehicles
   * Returns the full vehicle list with optional filtering.
   *
   * Supported query params:
   *   make        — exact match (case-insensitive)
   *   bodyType    — exact match
   *   outlet      — city: bangalore | mumbai | chennai
   *   status      — published | reserved | sold
   *   priceMin    — minimum price (onRoadPrice)
   *   priceMax    — maximum price (onRoadPrice)
   *   kmMax       — maximum odometer reading
   *   certified   — "true" | "false"
   *   sort        — newest | price_asc | price_desc | km_asc
   *   page        — 1-based page number (default: 1)
   *   limit       — page size (default: 20)
   */
  http.get('/api/staff/inventory/vehicles', ({ request }) => {
    const url = new URL(request.url);
    const make = url.searchParams.get('make');
    const bodyType = url.searchParams.get('bodyType');
    const outlet = url.searchParams.get('outlet');
    const status = url.searchParams.get('status');
    const priceMin = url.searchParams.get('priceMin');
    const priceMax = url.searchParams.get('priceMax');
    const kmMax = url.searchParams.get('kmMax');
    const certified = url.searchParams.get('certified');
    const sort = url.searchParams.get('sort') ?? 'newest';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));

    let result = [...vehicles];

    if (make) {
      result = result.filter((v) => v.make.toLowerCase() === make.toLowerCase());
    }
    if (bodyType) {
      result = result.filter((v) => v.bodyType === bodyType);
    }
    if (outlet) {
      result = result.filter((v) => v.city === outlet);
    }
    if (status) {
      result = result.filter((v) => v.status === status);
    }
    if (priceMin) {
      const min = Number(priceMin);
      if (!Number.isNaN(min)) result = result.filter((v) => v.price >= min);
    }
    if (priceMax) {
      const max = Number(priceMax);
      if (!Number.isNaN(max)) result = result.filter((v) => v.price <= max);
    }
    if (kmMax) {
      const km = Number(kmMax);
      if (!Number.isNaN(km)) result = result.filter((v) => v.km <= km);
    }
    if (certified !== null) {
      const isCertified = certified === 'true';
      result = result.filter((v) => v.isCertified === isCertified);
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'km_asc':
        result.sort((a, b) => a.km - b.km);
        break;
      case 'newest':
      default:
        result.sort(
          (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime(),
        );
        break;
    }

    const total = result.length;
    const offset = (page - 1) * limit;
    const paginated = result.slice(offset, offset + limit);

    return HttpResponse.json({
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }),

  /**
   * GET /api/staff/inventory/vehicles/:vin
   * Returns a single vehicle by VIN.
   */
  http.get('/api/staff/inventory/vehicles/:vin', ({ params }) => {
    const { vin } = params as { vin: string };
    const vehicle = vehicles.find((v) => v.vin === vin);

    if (!vehicle) {
      return HttpResponse.json(
        { error: 'Vehicle not found', vin },
        { status: 404 },
      );
    }

    return HttpResponse.json({ data: vehicle });
  }),

  /**
   * GET /api/staff/inventory/vehicles/:vin/cost-ledger
   * Returns all cost ledger entries for a vehicle.
   * Includes a computed total.
   */
  http.get('/api/staff/inventory/vehicles/:vin/cost-ledger', ({ params }) => {
    const { vin } = params as { vin: string };
    const entries = costLedgerEntries.filter((e) => e.vin === vin);
    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    return HttpResponse.json({
      data: entries,
      meta: { total, count: entries.length },
    });
  }),

  /**
   * GET /api/staff/inventory/vehicles/:vin/appraisal
   * Returns the appraisal record for a vehicle.
   */
  http.get('/api/staff/inventory/vehicles/:vin/appraisal', ({ params }) => {
    const { vin } = params as { vin: string };
    const appraisal = appraisals.find((a) => a.vin === vin);

    if (!appraisal) {
      return HttpResponse.json(
        { error: 'Appraisal not found for this VIN', vin },
        { status: 404 },
      );
    }

    return HttpResponse.json({ data: appraisal });
  }),

  /**
   * GET /api/staff/inventory/vehicles/:vin/timeline
   * Returns timeline events for a vehicle, chronologically ascending.
   */
  http.get('/api/staff/inventory/vehicles/:vin/timeline', ({ params }) => {
    const { vin } = params as { vin: string };
    const events = vehicleTimelineEvents
      .filter((e) => e.vin === vin)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return HttpResponse.json({
      data: events,
      meta: { count: events.length },
    });
  }),

  /**
   * GET /api/staff/inventory/vehicles/:vin/documents
   * Returns all uploaded documents for a vehicle.
   */
  http.get('/api/staff/inventory/vehicles/:vin/documents', ({ params }) => {
    const { vin } = params as { vin: string };
    const docs = vehicleDocuments.filter((d) => d.vin === vin);

    return HttpResponse.json({
      data: docs,
      meta: { count: docs.length },
    });
  }),

  /**
   * POST /api/staff/inventory/vehicles/:vin/cost-ledger
   * Adds a new cost ledger entry (mock — echoes back with generated id).
   */
  http.post('/api/staff/inventory/vehicles/:vin/cost-ledger', async ({ params, request }) => {
    const { vin } = params as { vin: string };
    const body = (await request.json()) as Omit<CostLedgerEntry, 'id' | 'vin' | 'addedAt'>;

    const newEntry: CostLedgerEntry = {
      id: `CLE-${vin.slice(-6)}-${Date.now()}`,
      vin,
      ...body,
      addedAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: newEntry }, { status: 201 });
  }),

  /**
   * POST /api/staff/inventory/vehicles/:vin/publish
   * Publishes a vehicle (mock — echoes success).
   */
  http.post('/api/staff/inventory/vehicles/:vin/publish', ({ params }) => {
    const { vin } = params as { vin: string };

    return HttpResponse.json({
      data: { vin, status: 'published', publishedAt: new Date().toISOString() },
    });
  }),

  /**
   * POST /api/staff/inventory/vehicles/:vin/unpublish
   * Unpublishes a vehicle (mock — echoes success).
   */
  http.post('/api/staff/inventory/vehicles/:vin/unpublish', ({ params }) => {
    const { vin } = params as { vin: string };

    return HttpResponse.json({
      data: { vin, status: 'unpublished', unpublishedAt: new Date().toISOString() },
    });
  }),

  /**
   * POST /api/staff/inventory/vehicles/:vin/transitions
   * Applies a status transition to a vehicle (mock — echoes the requested transition).
   * Body: { transition: VehicleTimelineEventType; note?: string }
   */
  http.post('/api/staff/inventory/vehicles/:vin/transitions', async ({ params, request }) => {
    const { vin } = params as { vin: string };
    const body = (await request.json()) as { transition: string; note?: string };

    return HttpResponse.json({
      data: {
        vin,
        transition: body.transition,
        note: body.note ?? null,
        appliedAt: new Date().toISOString(),
        appliedBy: 'R10-arjun-mehta',
      },
    });
  }),
];
