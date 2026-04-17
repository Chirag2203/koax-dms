/**
 * Stock movement handlers — read + stock adjust/transfer actions.
 *
 * Routes:
 *   GET   /api/staff/parts/movements                    — list (filters)
 *   GET   /api/staff/parts/movements/by-part/:partCode  — movements for one part
 *   POST  /api/staff/parts/stock/adjust                 — ADJUST movement
 *   POST  /api/staff/parts/stock/transfer               — paired TRANSFER movements
 *
 * Spec reference: SPEC-PARTS-001 §2, §3.2, §11 (transfer)
 */

import { http, HttpResponse } from 'msw';
import type { StockMovement } from '@dms/types';
import { _movements, randomDelay } from './_shared';

function nextMovId(): string {
  // Timestamp alone can collide if two POSTs land in the same ms (easy in tests).
  // Random suffix mirrors the store's makeId() pattern for collision safety.
  const rand = Math.random().toString(36).slice(2, 7);
  return `mov-rt-${Date.now()}-${rand}`;
}

export const movementHandlers = [
  // ── GET list ────────────────────────────────────────────────────────────────
  http.get('/api/staff/parts/movements', async ({ request }) => {
    await randomDelay();
    const url = new URL(request.url);
    const partCode = url.searchParams.get('partCode');
    const outletId = url.searchParams.get('outletId');
    const type = url.searchParams.get('type');

    let result = [..._movements];
    if (partCode) result = result.filter((m) => m.partCode === partCode);
    if (outletId) result = result.filter((m) => m.outletId === outletId);
    if (type) result = result.filter((m) => m.type === type);

    return HttpResponse.json({ data: result, total: result.length });
  }),

  // ── GET by part ────────────────────────────────────────────────────────────
  http.get('/api/staff/parts/movements/by-part/:partCode', async ({ params }) => {
    await randomDelay();
    const { partCode } = params;
    const result = _movements.filter((m) => m.partCode === partCode);
    return HttpResponse.json({ data: result, total: result.length });
  }),

  // ── POST adjust ─────────────────────────────────────────────────────────────
  http.post('/api/staff/parts/stock/adjust', async ({ request }) => {
    await randomDelay();
    const body = (await request.json()) as {
      partCode: string;
      outletId: string;
      qty: number; // signed
      reason: string;
      actorId: string;
    };
    if (!body.partCode || !body.outletId || body.qty === 0 || !body.reason) {
      return HttpResponse.json(
        { error: 'Missing required fields: partCode, outletId, non-zero qty, reason' },
        { status: 422 },
      );
    }
    const mov: StockMovement = {
      id: nextMovId(),
      partCode: body.partCode,
      outletId: body.outletId,
      type: 'ADJUST',
      qty: body.qty,
      refType: 'ADJUST',
      refId: `adj-${Date.now()}`,
      at: new Date().toISOString(),
      actorId: body.actorId,
      reason: body.reason,
    };
    _movements.push(mov);
    return HttpResponse.json({ data: mov }, { status: 201 });
  }),

  // ── POST transfer (creates paired OUT + IN) ────────────────────────────────
  http.post('/api/staff/parts/stock/transfer', async ({ request }) => {
    await randomDelay();
    const body = (await request.json()) as {
      partCode: string;
      fromOutletId: string;
      toOutletId: string;
      qty: number; // positive
      actorId: string;
    };
    if (
      !body.partCode ||
      !body.fromOutletId ||
      !body.toOutletId ||
      !body.actorId ||
      body.qty <= 0
    ) {
      return HttpResponse.json(
        {
          error:
            'Missing required fields: partCode, fromOutletId, toOutletId, actorId, qty > 0',
        },
        { status: 422 },
      );
    }
    const xferId = `xfer-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const outMov: StockMovement = {
      id: `${xferId}-out`,
      partCode: body.partCode,
      outletId: body.fromOutletId,
      type: 'TRANSFER',
      qty: -body.qty,
      refType: 'TRANSFER',
      refId: xferId,
      at: nowIso,
      actorId: body.actorId,
      reason: `Outbound transfer to ${body.toOutletId}`,
    };
    const inMov: StockMovement = {
      id: `${xferId}-in`,
      partCode: body.partCode,
      outletId: body.toOutletId,
      type: 'TRANSFER',
      qty: body.qty,
      refType: 'TRANSFER',
      refId: xferId,
      at: nowIso,
      actorId: body.actorId,
      reason: `Inbound transfer from ${body.fromOutletId}`,
    };
    _movements.push(outMov, inMov);
    return HttpResponse.json({ data: { outMov, inMov }, xferId }, { status: 201 });
  }),
];
