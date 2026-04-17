/**
 * Stock slice — adjust + transfer actions.
 *
 * Each action mutates part.stock quantities AND appends the matching
 * StockMovement rows. Transfers emit a paired (OUT, IN) under a shared
 * refId so UI can show them as one logical event.
 *
 * Spec reference: SPEC-PARTS-001 §11 (stretch — transfer), §10
 */

import type { PartsSlice, StockActions } from '../types';
import { makeId, now } from '../id-helpers';

export const createStockSlice: PartsSlice<StockActions> = (set) => ({
  adjustStock(partCode, outletId, deltaQty, reason, actor) {
    if (deltaQty === 0) return;
    set((state) => {
      const part = state.parts.find((p) => p.partCode === partCode);
      if (!part) return;
      const stockRow = part.stock.find((s) => s.outletId === outletId);
      if (!stockRow) return;

      // Prevent going below zero — defensive; UI should also guard.
      const newQty = stockRow.qty + deltaQty;
      if (newQty < 0) return;
      stockRow.qty = newQty;

      const nowIso = now();
      const refId = `adj-${Date.now()}`;
      state.stockMovements.push({
        id: makeId('mov'),
        partCode,
        outletId,
        type: 'ADJUST',
        qty: deltaQty,
        refType: 'ADJUST',
        refId,
        at: nowIso,
        actorId: actor.id,
        reason,
      });
    });
  },

  transferStock(partCode, fromOutletId, toOutletId, qty, actor) {
    if (qty <= 0) return;
    if (fromOutletId === toOutletId) return;
    set((state) => {
      const part = state.parts.find((p) => p.partCode === partCode);
      if (!part) return;
      const fromRow = part.stock.find((s) => s.outletId === fromOutletId);
      const toRow = part.stock.find((s) => s.outletId === toOutletId);
      if (!fromRow) return;
      if (fromRow.qty < qty) return; // insufficient stock

      fromRow.qty -= qty;
      if (toRow) {
        toRow.qty += qty;
      } else {
        // Create destination row if the part has no prior stock at that outlet
        part.stock.push({
          outletId: toOutletId,
          qty,
          reorderLevel: 0,
          location: 'UNALLOCATED',
        });
      }

      const nowIso = now();
      const xferId = `xfer-${Date.now()}`;
      state.stockMovements.push(
        {
          id: makeId('mov'),
          partCode,
          outletId: fromOutletId,
          type: 'TRANSFER',
          qty: -qty,
          refType: 'TRANSFER',
          refId: xferId,
          at: nowIso,
          actorId: actor.id,
          reason: `Outbound transfer to ${toOutletId}`,
        },
        {
          id: makeId('mov'),
          partCode,
          outletId: toOutletId,
          type: 'TRANSFER',
          qty,
          refType: 'TRANSFER',
          refId: xferId,
          at: nowIso,
          actorId: actor.id,
          reason: `Inbound transfer from ${fromOutletId}`,
        },
      );
    });
  },
});
