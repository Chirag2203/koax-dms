/**
 * GRN handlers.
 *
 * Routes:
 *   GET   /api/staff/parts/grns                 — list (filters)
 *   GET   /api/staff/parts/grns/:id             — single GRN
 *   POST  /api/staff/parts/grns                 — create GRN (DRAFT)
 *   PATCH /api/staff/parts/grns/:id             — patch fields
 *   POST  /api/staff/parts/grns/:id/transition  — state transition
 *   POST  /api/staff/parts/grns/:id/post        — POST action → writes movements
 *
 * The POST endpoint is a convenience that combines transition to POSTED with
 * the stock-movement generation side-effect. Real state-machine enforcement
 * lives in the frontend store; the handler applies the transition blindly.
 *
 * AUTHORITY: staff-web consumes fixtures through the Zustand parts store,
 * which is the authoritative source for stock math (weighted-avg avgCost,
 * PO auto-transition). These MSW handlers implement a simplified POST path
 * that writes IN movements but does NOT recompute part stock/avgCost. If you
 * ever switch the app to fetch through MSW, promote the store's postGrn
 * logic into this handler first.
 *
 * Spec reference: SPEC-PARTS-001 §2, §3.4, §5.2
 */

import { http, HttpResponse } from 'msw';
import type { Grn, GrnStatus, StockMovement } from '@dms/types';
import { _grns, _movements, randomDelay } from './_shared';

export const grnHandlers = [
  // ── GET list ────────────────────────────────────────────────────────────────
  http.get('/api/staff/parts/grns', async ({ request }) => {
    await randomDelay();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as GrnStatus | null;
    const outletId = url.searchParams.get('outletId');
    const hasDiscrepancy = url.searchParams.get('hasDiscrepancy');

    let result = [..._grns];
    if (status) result = result.filter((g) => g.status === status);
    if (outletId) result = result.filter((g) => g.outletId === outletId);
    if (hasDiscrepancy === 'true') {
      result = result.filter((g) => g.threeWayMatchStatus === 'DISCREPANCY');
    }

    return HttpResponse.json({ data: result, total: result.length });
  }),

  // ── GET by id ───────────────────────────────────────────────────────────────
  http.get('/api/staff/parts/grns/:id', async ({ params }) => {
    await randomDelay();
    const { id } = params;
    const grn = _grns.find((g) => g.id === id);
    if (!grn) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: grn });
  }),

  // ── POST create ─────────────────────────────────────────────────────────────
  http.post('/api/staff/parts/grns', async ({ request }) => {
    await randomDelay();
    const body = (await request.json()) as Partial<Grn>;
    if (!body.supplierId || !body.outletId || !body.lines) {
      return HttpResponse.json(
        { error: 'Missing required fields: supplierId, outletId, lines' },
        { status: 422 },
      );
    }
    const nextSeq = _grns.length + 1;
    const newGrn: Grn = {
      id: `grn-${String(nextSeq).padStart(3, '0')}`,
      grnNo: `GRN-2026-${String(nextSeq).padStart(5, '0')}`,
      poId: body.poId,
      supplierId: body.supplierId,
      outletId: body.outletId,
      status: 'DRAFT',
      receivedBy: body.receivedBy ?? 'unknown',
      receivedAt: new Date().toISOString(),
      lines: body.lines,
      landedCostAdders: body.landedCostAdders,
    };
    _grns.push(newGrn);
    return HttpResponse.json({ data: newGrn }, { status: 201 });
  }),

  // ── PATCH ──────────────────────────────────────────────────────────────────
  http.patch('/api/staff/parts/grns/:id', async ({ params, request }) => {
    await randomDelay();
    const { id } = params;
    const idx = _grns.findIndex((g) => g.id === id);
    if (idx < 0) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    const existing = _grns[idx];
    if (!existing) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    const patch = (await request.json()) as Partial<Grn>;
    const updated: Grn = { ...existing, ...patch, id: existing.id };
    _grns[idx] = updated;
    return HttpResponse.json({ data: updated });
  }),

  // ── POST transition ────────────────────────────────────────────────────────
  http.post('/api/staff/parts/grns/:id/transition', async ({ params, request }) => {
    await randomDelay();
    const { id } = params;
    const idx = _grns.findIndex((g) => g.id === id);
    if (idx < 0) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    const existing = _grns[idx];
    if (!existing) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    const body = (await request.json()) as {
      next: GrnStatus;
      actorId?: string;
      reason?: string;
    };
    const nowIso = new Date().toISOString();
    const updated: Grn = { ...existing, status: body.next };
    if (body.next === 'MATCHED') {
      updated.qcBy = body.actorId;
      updated.qcAt = nowIso;
    }
    if (body.next === 'REJECTED') {
      updated.rejectedReason = body.reason ?? '';
    }
    _grns[idx] = updated;
    return HttpResponse.json({ data: updated });
  }),

  // ── POST /post — writes IN movements + sets status=POSTED ──────────────────
  http.post('/api/staff/parts/grns/:id/post', async ({ params, request }) => {
    await randomDelay();
    const { id } = params;
    const idx = _grns.findIndex((g) => g.id === id);
    if (idx < 0) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    const existing = _grns[idx];
    if (!existing) {
      return HttpResponse.json({ error: 'GRN not found' }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { actorId?: string };
    const nowIso = new Date().toISOString();

    const newMovements: StockMovement[] = existing.lines
      .filter((l) => l.receivedQty > 0 && l.condition === 'OK')
      .map((l, i) => ({
        id: `mov-post-${existing.id}-L${i + 1}`,
        partCode: l.partCode,
        outletId: existing.outletId,
        type: 'IN' as const,
        qty: l.receivedQty,
        refType: 'GRN' as const,
        refId: existing.id,
        at: nowIso,
        actorId: body.actorId ?? existing.receivedBy,
      }));

    _movements.push(...newMovements);
    const updated: Grn = { ...existing, status: 'POSTED', postedAt: nowIso };
    _grns[idx] = updated;

    return HttpResponse.json({
      data: updated,
      movements: newMovements,
      count: newMovements.length,
    });
  }),
];
