/**
 * Parts fixtures barrel.
 *
 * Re-exports flat named arrays so the top-level `fixtures/index.ts` contract
 * (`export { parts, suppliers, purchaseOrders, grns, stockMovements } from './parts'`)
 * is preserved.
 *
 * Spec reference: SPEC-PARTS-001 §8
 */

export { suppliers } from './suppliers';
export { parts } from './parts';
export { purchaseOrders } from './purchase-orders';
export { grns } from './grns';
export { stockMovements } from './stock-movements';
