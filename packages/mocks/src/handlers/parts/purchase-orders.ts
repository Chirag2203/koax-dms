/**
 * Purchase Order handlers.
 *
 * Routes:
 *   GET   /api/staff/parts/purchase-orders            — list (filters)
 *   GET   /api/staff/parts/purchase-orders/:id        — single PO
 *   POST  /api/staff/parts/purchase-orders            — create PO (DRAFT)
 *   PATCH /api/staff/parts/purchase-orders/:id        — patch fields
 *   POST  /api/staff/parts/purchase-orders/:id/transition — state transition
 *
 * Transition validation is deferred to the frontend store (uses state-machine
 * helpers). Handlers accept and apply the transition idempotently.
 *
 * Spec reference: SPEC-PARTS-001 §2, §3.3, §5.1
 */

import { http, HttpResponse } from 'msw';
import type { PurchaseOrder, PurchaseOrderStatus } from '@dms/types';
import { _pos, randomDelay } from './_shared';

export const purchaseOrderHandlers = [
  // ── GET list ────────────────────────────────────────────────────────────────
  http.get('/api/staff/parts/purchase-orders', async ({ request }) => {
    await randomDelay();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as PurchaseOrderStatus | null;
    const supplierId = url.searchParams.get('supplierId');
    const outletId = url.searchParams.get('outletId');

    let result = [..._pos];
    if (status) result = result.filter((p) => p.status === status);
    if (supplierId) result = result.filter((p) => p.supplierId === supplierId);
    if (outletId) result = result.filter((p) => p.outletId === outletId);

    return HttpResponse.json({ data: result, total: result.length });
  }),

  // ── GET by id ───────────────────────────────────────────────────────────────
  http.get('/api/staff/parts/purchase-orders/:id', async ({ params }) => {
    await randomDelay();
    const { id } = params;
    const po = _pos.find((p) => p.id === id);
    if (!po) {
      return HttpResponse.json({ error: 'PO not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: po });
  }),

  // ── POST create ─────────────────────────────────────────────────────────────
  http.post('/api/staff/parts/purchase-orders', async ({ request }) => {
    await randomDelay();
    const body = (await request.json()) as Partial<PurchaseOrder>;

    if (!body.supplierId || !body.outletId || !body.lines || body.lines.length === 0) {
      return HttpResponse.json(
        { error: 'Missing required fields: supplierId, outletId, lines' },
        { status: 422 },
      );
    }

    const nextSeq = _pos.length + 1;
    const newPo: PurchaseOrder = {
      id: `po-${String(nextSeq).padStart(3, '0')}`,
      poNo: `PO-2026-${String(nextSeq).padStart(5, '0')}`,
      supplierId: body.supplierId,
      outletId: body.outletId,
      status: 'DRAFT',
      createdBy: body.createdBy ?? 'unknown',
      createdAt: new Date().toISOString(),
      lines: body.lines,
      subtotal: body.subtotal ?? 0,
      gst: body.gst ?? 0,
      total: body.total ?? 0,
      expectedDeliveryAt: body.expectedDeliveryAt ?? new Date().toISOString(),
      isImport: body.isImport ?? false,
      fxRate: body.fxRate,
      notes: body.notes,
      linkedJobCardId: body.linkedJobCardId,
    };

    _pos.push(newPo);
    return HttpResponse.json({ data: newPo }, { status: 201 });
  }),

  // ── PATCH ──────────────────────────────────────────────────────────────────
  http.patch('/api/staff/parts/purchase-orders/:id', async ({ params, request }) => {
    await randomDelay();
    const { id } = params;
    const idx = _pos.findIndex((p) => p.id === id);
    if (idx < 0) {
      return HttpResponse.json({ error: 'PO not found' }, { status: 404 });
    }
    const existing = _pos[idx];
    if (!existing) {
      return HttpResponse.json({ error: 'PO not found' }, { status: 404 });
    }
    const patch = (await request.json()) as Partial<PurchaseOrder>;
    const updated: PurchaseOrder = { ...existing, ...patch, id: existing.id };
    _pos[idx] = updated;
    return HttpResponse.json({ data: updated });
  }),

  // ── POST transition ─────────────────────────────────────────────────────────
  http.post(
    '/api/staff/parts/purchase-orders/:id/transition',
    async ({ params, request }) => {
      await randomDelay();
      const { id } = params;
      const idx = _pos.findIndex((p) => p.id === id);
      if (idx < 0) {
        return HttpResponse.json({ error: 'PO not found' }, { status: 404 });
      }
      const existing = _pos[idx];
      if (!existing) {
        return HttpResponse.json({ error: 'PO not found' }, { status: 404 });
      }

      const body = (await request.json()) as {
        next: PurchaseOrderStatus;
        actorId?: string;
        reason?: string;
      };

      const updated: PurchaseOrder = { ...existing, status: body.next };
      // Stamp side-effect fields based on target status
      const nowIso = new Date().toISOString();
      if (body.next === 'PENDING_APPROVAL') updated.submittedAt = nowIso;
      if (body.next === 'APPROVED') {
        updated.approverId = body.actorId;
        updated.approvedAt = nowIso;
      }
      if (body.next === 'REJECTED') {
        updated.rejectedReason = body.reason ?? '';
      }
      if (body.next === 'DISPATCHED') updated.dispatchedAt = nowIso;

      _pos[idx] = updated;
      return HttpResponse.json({ data: updated });
    },
  ),
];
