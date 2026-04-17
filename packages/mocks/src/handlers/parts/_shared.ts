/**
 * Shared helpers + mutable in-memory stores for parts handlers.
 *
 * Handlers are split across several files (`parts-catalog.ts`, `purchase-orders.ts`,
 * `grns.ts`, `movements.ts`) but MUST share the same mutable store instance —
 * otherwise each file would get its own copy and writes would not be visible
 * across routes. Keep all `let _*` declarations in this module.
 *
 * NOTE: staff-web consumes fixtures directly via the Zustand store; these
 * handlers exist for backend parity so future wiring has a canonical contract.
 *
 * Spec reference: SPEC-PARTS-001 §2 (routes) + §4 (entities)
 */

import {
  parts,
  suppliers,
  purchaseOrders,
  grns,
  stockMovements,
} from '../../fixtures/parts/index';
import type {
  Part,
  Supplier,
  PurchaseOrder,
  Grn,
  StockMovement,
} from '@dms/types';

// ─── Mutable stores (deep-cloned on module load) ──────────────────────────────
//
// structuredClone deep-copies nested arrays/objects so PATCH/POST handlers
// can mutate rows (and their nested `stock[]` / `lines[]`) without bleeding
// back into the @dms/mocks fixture module or contaminating parallel tests.

export let _parts: Part[] = structuredClone(parts);
export let _suppliers: Supplier[] = structuredClone(suppliers);
export let _pos: PurchaseOrder[] = structuredClone(purchaseOrders);
export let _grns: Grn[] = structuredClone(grns);
export let _movements: StockMovement[] = structuredClone(stockMovements);

// ─── Delay helpers (match service.ts shape) ───────────────────────────────────

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(): Promise<void> {
  return delay(150 + Math.random() * 250);
}
