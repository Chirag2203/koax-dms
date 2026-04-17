import { http, HttpResponse } from 'msw';
import { deals, interactions, kycStatuses } from '../fixtures/sales';
import type { Deal, DealStage } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return delay(300 + Math.random() * 200);
}

// ─── Sales Handlers ───────────────────────────────────────────────────────────

export const salesHandlers = [
  /**
   * GET /api/staff/sales/deals
   * Supported filters: stage, assignedTo, outlet, source, dateFrom, dateTo
   */
  http.get('/api/staff/sales/deals', async ({ request }) => {
    await randomDelay();

    const url = new URL(request.url);
    const stage = url.searchParams.get('stage') as DealStage | null;
    const assignedTo = url.searchParams.get('assignedTo');
    const outlet = url.searchParams.get('outlet');
    const source = url.searchParams.get('source');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    let result = [...deals];

    if (stage) {
      result = result.filter((d) => d.stage === stage);
    }
    if (assignedTo) {
      result = result.filter((d) => d.assignedTo === assignedTo);
    }
    if (outlet) {
      result = result.filter((d) => d.outlet === outlet);
    }
    if (source) {
      result = result.filter((d) => d.source === source);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((d) => new Date(d.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      result = result.filter((d) => new Date(d.createdAt).getTime() <= to);
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  /**
   * GET /api/staff/sales/deals/:id
   */
  http.get('/api/staff/sales/deals/:id', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const deal = deals.find((d) => d.id === id);

    if (!deal) {
      return HttpResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: deal });
  }),

  /**
   * POST /api/staff/sales/leads
   * Creates a new lead. Echoes back {id: `deal-${Date.now()}`, ...body}
   */
  http.post('/api/staff/sales/leads', async ({ request }) => {
    await randomDelay();

    const body = (await request.json()) as Partial<Deal>;
    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      customerName: body.customerName ?? 'Unknown',
      customerPhone: body.customerPhone ?? '',
      customerEmail: body.customerEmail,
      vehicleVin: body.vehicleVin,
      vehicleName: body.vehicleName,
      vehicleImage: body.vehicleImage,
      amount: body.amount ?? 0,
      stage: 'new-lead',
      source: body.source ?? 'walk-in',
      priority: body.priority ?? 'medium',
      city: body.city ?? 'bangalore',
      outlet: body.outlet ?? 'BLR-01',
      assignedTo: body.assignedTo,
      assignedToName: body.assignedToName,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      daysInStage: 0,
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
      notes: body.notes,
    };

    return HttpResponse.json({ data: newDeal }, { status: 201 });
  }),

  /**
   * PATCH /api/staff/sales/deals/:id
   * Updates writable lead fields. Echoes back merged deal.
   */
  http.patch('/api/staff/sales/deals/:id', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const deal = deals.find((d) => d.id === id);

    if (!deal) {
      return HttpResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<Deal>;
    const updatedDeal: Deal = {
      ...deal,
      ...body,
      id: deal.id, // prevent id override
      lastActivityAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: updatedDeal });
  }),

  /**
   * POST /api/staff/sales/deals/:id/move
   * Body: { toStage: DealStage }
   */
  http.post('/api/staff/sales/deals/:id/move', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const deal = deals.find((d) => d.id === id);

    if (!deal) {
      return HttpResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const body = (await request.json()) as { toStage: DealStage };
    const updatedDeal: Deal = {
      ...deal,
      stage: body.toStage,
      daysInStage: 0,
      lastActivityAt: new Date().toISOString(),
    };

    return HttpResponse.json({ data: updatedDeal });
  }),

  /**
   * GET /api/staff/sales/deals/:id/interactions
   */
  http.get('/api/staff/sales/deals/:id/interactions', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const dealInteractions = interactions.filter((i) => i.dealId === id);

    return HttpResponse.json({
      data: dealInteractions,
      total: dealInteractions.length,
    });
  }),

  /**
   * POST /api/staff/sales/deals/:id/interactions
   * Echoes back {id: `int-${Date.now()}`, ...body}
   */
  http.post('/api/staff/sales/deals/:id/interactions', async ({ params, request }) => {
    await randomDelay();

    const { id } = params;
    const body = (await request.json()) as Record<string, unknown>;

    const newInteraction = {
      id: `int-${Date.now()}`,
      dealId: id,
      createdAt: new Date().toISOString(),
      addedByName: 'Staff User',
      ...body,
    };

    return HttpResponse.json({ data: newInteraction }, { status: 201 });
  }),

  /**
   * GET /api/staff/sales/deals/:id/kyc
   */
  http.get('/api/staff/sales/deals/:id/kyc', async ({ params }) => {
    await randomDelay();

    const { id } = params;
    const kyc = kycStatuses.find((k) => k.dealId === id);

    if (!kyc) {
      return HttpResponse.json({ error: 'KYC record not found' }, { status: 404 });
    }

    return HttpResponse.json({ data: kyc });
  }),
];
