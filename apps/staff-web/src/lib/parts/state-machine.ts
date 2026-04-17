/**
 * Parts module state machines — PO and GRN.
 *
 * Single source of truth for allowed transitions and approval thresholds.
 * All mutation paths MUST use canTransitionPo/canTransitionGrn — no ad-hoc
 * if/switch in components.
 *
 * Spec reference: SPEC-PARTS-001 §5 (state machines) + §6 (approval thresholds)
 */

import type { PurchaseOrderStatus, GrnStatus } from '@dms/types';

// ─── PO transition table ──────────────────────────────────────────────────────

/**
 * Maps each PO status to the list of statuses it can transition to.
 * CANCELLED, REJECTED, and CLOSED are terminal — no outgoing transitions.
 *
 * Spec §5.1:
 *   DRAFT → PENDING_APPROVAL | CANCELLED
 *   PENDING_APPROVAL → APPROVED | REJECTED
 *   APPROVED → DISPATCHED | CANCELLED
 *   DISPATCHED → PARTIALLY_RECEIVED | RECEIVED
 *   PARTIALLY_RECEIVED → RECEIVED
 *   RECEIVED → CLOSED
 *   REJECTED, CANCELLED, CLOSED → (terminal)
 */
export const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['PARTIALLY_RECEIVED', 'RECEIVED'],
  PARTIALLY_RECEIVED: ['RECEIVED'],
  RECEIVED: ['CLOSED'],
  REJECTED: [],
  CANCELLED: [],
  CLOSED: [],
};

/**
 * Returns the list of PO statuses reachable from `from`.
 */
export function allowedNextPo(from: PurchaseOrderStatus): PurchaseOrderStatus[] {
  return PO_TRANSITIONS[from];
}

/**
 * Returns true if a PO transition from → to is permitted by the state machine.
 */
export function canTransitionPo(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean {
  return PO_TRANSITIONS[from].includes(to);
}

// ─── GRN transition table ─────────────────────────────────────────────────────

/**
 * Maps each GRN status to the list of statuses it can transition to.
 * REJECTED and POSTED are terminal.
 *
 * Spec §5.2:
 *   DRAFT → PENDING_QC
 *   PENDING_QC → MATCHED | REJECTED
 *   MATCHED → POSTED
 *   REJECTED, POSTED → (terminal)
 */
export const GRN_TRANSITIONS: Record<GrnStatus, GrnStatus[]> = {
  DRAFT: ['PENDING_QC'],
  PENDING_QC: ['MATCHED', 'REJECTED'],
  MATCHED: ['POSTED'],
  REJECTED: [],
  POSTED: [],
};

/**
 * Returns the list of GRN statuses reachable from `from`.
 */
export function allowedNextGrn(from: GrnStatus): GrnStatus[] {
  return GRN_TRANSITIONS[from];
}

/**
 * Returns true if a GRN transition from → to is permitted.
 */
export function canTransitionGrn(from: GrnStatus, to: GrnStatus): boolean {
  return GRN_TRANSITIONS[from].includes(to);
}

// ─── Approval thresholds ──────────────────────────────────────────────────────

/**
 * Approval thresholds — LOCKED 2026-04-17 per spec §6.
 *
 *   ≤ ₹10,000         R13 Parts Counter
 *   ₹10,001–₹50,000   R12 Parts Manager
 *   ₹50,001–₹2,00,000 R03 Outlet Manager
 *   > ₹2,00,000        R19 General Manager (or R22/R24)
 */
export const APPROVAL_THRESHOLDS: ReadonlyArray<{
  readonly max: number;
  readonly minRole: string;
}> = [
  { max: 10_000, minRole: 'R13' },
  { max: 50_000, minRole: 'R12' },
  { max: 200_000, minRole: 'R03' },
  { max: Infinity, minRole: 'R19' },
] as const;

/**
 * Returns the minimum role code required to approve a PO with the given total.
 */
export function requiredApproverRole(total: number): string {
  for (const threshold of APPROVAL_THRESHOLDS) {
    if (total <= threshold.max) {
      return threshold.minRole;
    }
  }
  // Fallback — should never be reached given Infinity bucket
  return 'R19';
}

// ─── Role rank for approval comparison ───────────────────────────────────────

/**
 * Role rank map — higher number = more senior.
 * Only the roles that appear in the approval chain are ranked here.
 * R13 (Parts Counter) = 1, R12 (Parts Manager) = 2, R03 (Outlet Manager) = 3,
 * R19 (GM) = 4, R22 (CFO) = 5, R24 (CEO) = 6.
 */
const ROLE_RANK: Record<string, number> = {
  R13: 1,
  R12: 2,
  R03: 3,
  R19: 4,
  R22: 5,
  R24: 6,
};

/**
 * Returns true if the given role meets or exceeds the minimum required role
 * for approving a PO of the given total value.
 */
export function canApprove(role: string, total: number): boolean {
  const required = requiredApproverRole(total);
  const actorRank = ROLE_RANK[role] ?? 0;
  const requiredRank = ROLE_RANK[required] ?? 999;
  return actorRank >= requiredRank;
}
