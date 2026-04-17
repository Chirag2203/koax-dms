/**
 * ID + timestamp helpers for runtime store mutations.
 *
 * Fixtures use deterministic IDs (`po-001`); runtime IDs use `Date.now() + rand`
 * to guarantee uniqueness across rapid actions without collisions.
 *
 * Spec reference: SPEC-PARTS-001 §10
 */

import type { PurchaseOrder, Grn } from '@dms/types';

/** `'po-1713345600000-a4f9e'` */
export function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now()}-${rand}`;
}

/** Current ISO timestamp. */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Returns the next PO number given the existing set.
 * Parses `PO-2026-NNNNN` format; new number is max+1, 5-digit zero-padded.
 */
export function nextPoNo(existing: PurchaseOrder[]): string {
  const nums = existing.map((p) => {
    const m = p.poNo.match(/PO-2026-(\d{5})/);
    return m ? parseInt(m[1] ?? '0', 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `PO-2026-${String(max + 1).padStart(5, '0')}`;
}

/** Returns the next GRN number. */
export function nextGrnNo(existing: Grn[]): string {
  const nums = existing.map((g) => {
    const m = g.grnNo.match(/GRN-2026-(\d{5})/);
    return m ? parseInt(m[1] ?? '0', 10) : 0;
  });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `GRN-2026-${String(max + 1).padStart(5, '0')}`;
}

/**
 * Returns a fresh StockMovement ID. Fixtures use sequential `mov-NNNNN`;
 * runtime uses `mov-<timestamp>-<rand>` which never collides with fixtures.
 * No `existing` argument needed because runtime IDs are non-sequential.
 */
export function newMovementId(): string {
  return makeId('mov');
}
