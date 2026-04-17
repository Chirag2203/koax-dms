/**
 * Parts catalog handlers — Part master + Supplier master.
 *
 * Routes:
 *   GET   /api/staff/parts                    — list parts (filters)
 *   GET   /api/staff/parts/:partCode          — single part
 *   PATCH /api/staff/parts/:partCode          — update part master
 *   GET   /api/staff/parts/suppliers          — list suppliers
 *   GET   /api/staff/parts/suppliers/:id      — single supplier
 *
 * Spec reference: SPEC-PARTS-001 §2, §3.1, §3.5
 */

import { http, HttpResponse } from 'msw';
import type { Part } from '@dms/types';
import { _parts, _suppliers, randomDelay } from './_shared';

export const partsCatalogHandlers = [
  // ── GET /api/staff/parts — list parts ──────────────────────────────────────
  http.get('/api/staff/parts', async ({ request }) => {
    await randomDelay();

    const url = new URL(request.url);
    const outletId = url.searchParams.get('outletId');
    const category = url.searchParams.get('category');
    const criticality = url.searchParams.get('criticality');
    const brand = url.searchParams.get('brand');
    const search = url.searchParams.get('search');

    let result: Part[] = [..._parts];

    if (outletId) {
      result = result.filter((p) => p.stock.some((s) => s.outletId === outletId));
    }
    if (category) {
      result = result.filter((p) => p.category === category);
    }
    if (criticality) {
      result = result.filter((p) => p.criticality === criticality);
    }
    if (brand) {
      result = result.filter((p) => p.brand === brand);
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.partCode.toLowerCase().includes(lower) ||
          p.name.toLowerCase().includes(lower),
      );
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  // ── GET /api/staff/parts/suppliers — list suppliers ────────────────────────
  //   Must precede GET /api/staff/parts/:partCode to avoid MSW matching
  //   'suppliers' as a partCode literal.
  http.get('/api/staff/parts/suppliers', async () => {
    await randomDelay();
    return HttpResponse.json({ data: _suppliers, total: _suppliers.length });
  }),

  // ── GET /api/staff/parts/suppliers/:id ─────────────────────────────────────
  http.get('/api/staff/parts/suppliers/:id', async ({ params }) => {
    await randomDelay();
    const { id } = params;
    const supplier = _suppliers.find((s) => s.id === id);
    if (!supplier) {
      return HttpResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: supplier });
  }),

  // ── GET /api/staff/parts/:partCode — single part ───────────────────────────
  http.get('/api/staff/parts/:partCode', async ({ params }) => {
    await randomDelay();
    const { partCode } = params;
    const part = _parts.find((p) => p.partCode === partCode);
    if (!part) {
      return HttpResponse.json({ error: 'Part not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: part });
  }),

  // ── PATCH /api/staff/parts/:partCode — update part master ──────────────────
  http.patch('/api/staff/parts/:partCode', async ({ params, request }) => {
    await randomDelay();
    const { partCode } = params;
    const idx = _parts.findIndex((p) => p.partCode === partCode);
    if (idx < 0) {
      return HttpResponse.json({ error: 'Part not found' }, { status: 404 });
    }
    const patch = (await request.json()) as Partial<Part>;
    const existing = _parts[idx];
    if (!existing) {
      return HttpResponse.json({ error: 'Part not found' }, { status: 404 });
    }
    const updated: Part = { ...existing, ...patch, partCode: existing.partCode };
    _parts[idx] = updated;
    return HttpResponse.json({ data: updated });
  }),
];
