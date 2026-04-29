/**
 * Customer outstanding aging — SPEC-FINANCE-001 L7
 *
 * L7: 0–30 days = green, 31–60 days = amber, 61+ days = red.
 *     Computed against invoiceIssuedAt (not dueAt).
 *     Configurable per outlet in Settings (A4 dependency, P2 backlog DEF-FIN-10).
 *     v1 hardcodes these defaults. Doc 06 §AR-aging; Doc 03 §payment-terms.
 */

import type { AgingState } from '@dms/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** L7: Amber threshold in days. */
export const AGING_AMBER_DAYS = 30;

/** L7: Red threshold in days. */
export const AGING_RED_DAYS = 60;

// ─── Aging computation ────────────────────────────────────────────────────────

/**
 * Compute age in days between an invoice date and today.
 * L7: age computed against invoiceIssuedAt. Doc 06 §AR-aging.
 */
export function computeAgeDays(issuedAt: string, referenceDate?: Date): number {
  const ref = referenceDate ?? new Date();
  const issued = new Date(issuedAt);
  const diffMs = ref.getTime() - issued.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Classify age in days into an aging state.
 *
 * L7: 0–30 = green, 31–60 = amber, 61+ = red.
 * Doc 06 §AR-aging; Doc 03 §payment-terms.
 */
export function computeAgingState(ageDays: number): AgingState {
  // L7: Doc 06 §AR-aging; Doc 03 §payment-terms
  if (ageDays > AGING_RED_DAYS) return 'red';
  if (ageDays > AGING_AMBER_DAYS) return 'amber';
  return 'green';
}

/**
 * Classify an invoice date directly.
 * L7: Doc 06 §AR-aging.
 */
export function classifyInvoiceAge(issuedAt: string, referenceDate?: Date): AgingState {
  const days = computeAgeDays(issuedAt, referenceDate);
  return computeAgingState(days);
}
