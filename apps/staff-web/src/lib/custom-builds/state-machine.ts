/**
 * Custom Builds state machine — role ranks and transition guards.
 *
 * L15: hasRank numeric comparator — `ROLE_RANK[role] >= ROLE_RANK[minRole]`.
 *      No inline string comparisons anywhere in this module.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §4 (state machine), §12 (RBAC)
 */

import type { BuildJobStage } from '@dms/types';
import { BUILD_JOB_TRANSITIONS, BUILD_TRANSITION_ROLE } from '@dms/types';

// ─── Role rank table (L15) ────────────────────────────────────────────────────
//
// All 24 roles; only custom-builds-relevant roles need ranks.
// R05 (Sales Associate) is the lowest rank here; R09–R19 are the key gates.

export const ROLE_RANK: Record<string, number> = {
  R05: 1,
  R09: 2,
  R10: 3,
  R11: 4,
  R12: 5,
  R13: 6,
  R16: 7,
  R19: 8,
  R22: 9,
  R24: 10,
};

/**
 * Returns true if `actorRole` meets or exceeds `minRole`.
 * L15 — always use this function; never compare role strings directly.
 */
export function hasRank(actorRole: string, minRole: string): boolean {
  const actorRank = ROLE_RANK[actorRole] ?? 0;
  const requiredRank = ROLE_RANK[minRole] ?? 999;
  return actorRank >= requiredRank;
}

/**
 * Returns true if the transition from → to is valid per the state machine.
 */
export function canTransitionBuildJob(
  from: BuildJobStage,
  to: BuildJobStage,
): boolean {
  const allowed = BUILD_JOB_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * Returns the minimum role required for a given transition.
 * Returns undefined if the transition is unknown.
 */
export function requiredRoleForTransition(
  from: BuildJobStage,
  to: BuildJobStage,
): string | undefined {
  return BUILD_TRANSITION_ROLE[`${from}→${to}`];
}

/**
 * Returns true if the actor has sufficient rank for the given transition.
 */
export function canActorTransition(
  actorRole: string,
  from: BuildJobStage,
  to: BuildJobStage,
): boolean {
  const required = requiredRoleForTransition(from, to);
  if (!required) return false;
  return hasRank(actorRole, required);
}
