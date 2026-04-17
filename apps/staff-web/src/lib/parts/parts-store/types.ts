/**
 * Parts store — shared type definitions.
 *
 * This file is a LEAF: it MUST NOT import from any `./slices/*` — doing so
 * creates a circular dependency. Every slice imports `PartsStore` + `PartsSlice`
 * from here, but type declarations here only reference entity types from
 * `@dms/types` plus the immer + zustand middleware tag.
 *
 * Spec reference: SPEC-PARTS-001 §10 (store patterns)
 */

import type { StateCreator } from 'zustand';
import type {
  Part,
  Supplier,
  PurchaseOrder,
  PurchaseOrderStatus,
  Grn,
  GrnStatus,
  StockMovement,
} from '@dms/types';

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Actor identity stamped onto every mutation for audit. */
export interface Actor {
  id: string;
  name: string;
}

// ─── State shape ──────────────────────────────────────────────────────────────

export interface PartsState {
  parts: Part[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  grns: Grn[];
  stockMovements: StockMovement[];
}

// ─── Action slices (declared per-aggregate for clarity) ───────────────────────

export interface PartActions {
  updatePart(partCode: string, patch: Partial<Part>, actor: Actor): void;
}

export interface SupplierActions {
  createSupplier(input: Omit<Supplier, 'id'>, actor: Actor): Supplier;
  updateSupplier(id: string, patch: Partial<Supplier>, actor: Actor): void;
}

export interface PoActions {
  createPurchaseOrder(
    input: Omit<PurchaseOrder, 'id' | 'poNo' | 'createdAt' | 'status'>,
    actor: Actor,
  ): PurchaseOrder;
  updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>, actor: Actor): void;
  transitionPurchaseOrder(
    id: string,
    next: PurchaseOrderStatus,
    opts: { reason?: string; actor: Actor },
  ): boolean;
}

export interface GrnActions {
  createGrn(
    input: Omit<Grn, 'id' | 'grnNo' | 'receivedAt' | 'status'>,
    actor: Actor,
  ): Grn;
  updateGrn(id: string, patch: Partial<Grn>, actor: Actor): void;
  transitionGrn(
    id: string,
    next: GrnStatus,
    opts: { reason?: string; actor: Actor },
  ): boolean;
  /**
   * Post a GRN: writes IN StockMovements, updates Part stock + avgCost
   * (weighted average) + lastPurchasePrice, then auto-transitions the linked
   * PO (PARTIALLY_RECEIVED vs RECEIVED). Auto-reserve of Service PartsLines
   * is P6 scope — a TODO hook is left in grn-slice.
   */
  postGrn(grnId: string, actor: Actor): boolean;
}

export interface StockActions {
  adjustStock(
    partCode: string,
    outletId: string,
    deltaQty: number,
    reason: string,
    actor: Actor,
  ): void;
  transferStock(
    partCode: string,
    fromOutletId: string,
    toOutletId: string,
    qty: number,
    actor: Actor,
  ): void;
}

// ─── Combined store ───────────────────────────────────────────────────────────

export type PartsActions = PartActions &
  SupplierActions &
  PoActions &
  GrnActions &
  StockActions;

export type PartsStore = PartsState & PartsActions;

/**
 * Slice factory alias — every slice file exports a `create*Slice: PartsSlice<T>`.
 * The middleware tag `['zustand/immer', never]` instructs Zustand that `set`
 * inside the slice receives an immer draft.
 */
export type PartsSlice<T> = StateCreator<
  PartsStore,
  [['zustand/immer', never]],
  [],
  T
>;
