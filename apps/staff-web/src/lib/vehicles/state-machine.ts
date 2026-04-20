/**
 * Vehicles module state machines — ownership and claim transitions.
 *
 * Single source of truth for allowed transitions. All mutation paths MUST
 * use canTransitionOwnership/canTransitionClaim — no ad-hoc if/switch
 * in components or slices.
 *
 * Mirrors the parts state-machine.ts pattern exactly.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.3 (state transitions)
 */

import type { OwnershipState, ClaimState } from '@dms/types';

// ─── Ownership transition table ───────────────────────────────────────────────

/**
 * Allowed ownership state transitions.
 *
 * PENDING_CLAIM → ACTIVE (via claim approval / auto-match)
 * ACTIVE → TRANSFERRED (BN sale/consignment transfer)
 * ACTIVE → REVOKED (manual, self, force)
 * REVOKED → ACTIVE (restore — D6: any time)
 * TRANSFERRED, REJECTED → (terminal — no outgoing transitions)
 */
export const OWNERSHIP_TRANSITIONS: Record<OwnershipState, OwnershipState[]> = {
  PENDING_CLAIM: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['TRANSFERRED', 'REVOKED'],
  REVOKED: ['ACTIVE'], // restore allowed any time (D6)
  TRANSFERRED: [],
  REJECTED: [],
};

export function allowedNextOwnership(from: OwnershipState): OwnershipState[] {
  return OWNERSHIP_TRANSITIONS[from];
}

export function canTransitionOwnership(
  from: OwnershipState,
  to: OwnershipState,
): boolean {
  return OWNERSHIP_TRANSITIONS[from].includes(to);
}

// ─── Claim transition table ───────────────────────────────────────────────────

/**
 * Allowed claim state transitions.
 *
 * PENDING → AUTO_APPROVED (auto-match)
 * PENDING → APPROVED (staff approval)
 * PENDING → REJECTED (staff rejection)
 * AUTO_APPROVED, APPROVED, REJECTED → (terminal)
 */
export const CLAIM_TRANSITIONS: Record<ClaimState, ClaimState[]> = {
  PENDING: ['AUTO_APPROVED', 'APPROVED', 'REJECTED'],
  AUTO_APPROVED: [],
  APPROVED: [],
  REJECTED: [],
};

export function allowedNextClaim(from: ClaimState): ClaimState[] {
  return CLAIM_TRANSITIONS[from];
}

export function canTransitionClaim(from: ClaimState, to: ClaimState): boolean {
  return CLAIM_TRANSITIONS[from].includes(to);
}

// ─── Role rank for RBAC comparison ───────────────────────────────────────────

/**
 * Role rank map — higher number = more senior.
 * Mirrors parts state-machine.ts ROLE_RANK pattern exactly.
 * Doc 14 §2.3 roles relevant to vehicles module.
 */
export const ROLE_RANK: Record<string, number> = {
  R05: 1, // Service Receptionist / Front Desk
  R07: 2, // Service Advisor
  R09: 3, // Service Manager / Branch Manager
  R12: 4, // Accounts Manager
  R13: 5, // Parts Counter
  R19: 6, // General Manager
  R22: 7, // CFO
  R24: 8, // CEO / System Admin
};

/**
 * Returns true if the given role meets or exceeds the minimum required role
 * for the specified action.
 */
export function meetsMinRole(actorRole: string, minRole: string): boolean {
  const actorRank = ROLE_RANK[actorRole] ?? 0;
  const minRank = ROLE_RANK[minRole] ?? 999;
  return actorRank >= minRank;
}
