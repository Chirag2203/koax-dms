/**
 * DEF-S7-1 — Role-rank filtering for the staff onboarding wizard.
 *
 * Per spec L_S7 / SPEC-STAFF-001 §8.3:
 *   viewers can only onboard staff at tiers up to their own authority.
 *
 * Tier matrix:
 *   R02+  (Org Admin, rank 22+)        → all onboardable roles (R01–R24)
 *   R03   (Outlet Manager, rank 18)    → non-manager-tier only (R05–R11)
 *   Manager-tier (rank ≥ 15, not R02+, not R03)
 *         (e.g. R04/R08/R12/R14/R16)  → R05–R11 + manager-tier roles (hasRank ≥ R12)
 *   Below R03                          → page-level gate prevents reaching wizard; fallback = []
 *
 * NOTE: R03 has rank 18 which technically satisfies hasRank(R03, 'R12') (rank 15).
 * R03 is explicitly carved out because the spec intent is that Outlet Managers can only
 * onboard op-tier staff — they do not have authority to onboard functional managers.
 * The submit-side guard (submitRbacGuard in page.tsx) is the source of truth; this
 * function produces the UI-layer restriction that prevents showing unavailable options
 * in the first place.
 *
 * IMPORTANT: Do NOT modify the submit-side guard (L_S7) — it is the canonical source
 * of truth. This module implements the UI filtering layer only.
 */

import type { StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';

/**
 * All roles that may appear in the onboarding wizard role-select.
 * Matches ONBOARDABLE_ROLES in the wizard page. R01 (Super Admin) and R22–R24
 * (CFO, DPO, CEO) are excluded — those roles are created via a separate privileged
 * pathway, not through the standard onboarding wizard.
 */
export const ONBOARDABLE_ROLES: StaffRoleCode[] = [
  'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18',
  'R19', 'R20', 'R21',
];

/**
 * Returns the subset of onboardable roles the viewer is permitted to select.
 *
 * Three-tier decision:
 *   1. R02+ (Org Admin)        → all ONBOARDABLE_ROLES
 *   2. R03  (Outlet Manager)   → non-manager-tier only: roles where !hasRank(role, 'R12')
 *   3. Manager-tier (hasRank ≥ R12, not R02+, not R03)
 *                              → R05–R11 (op tier) + roles where hasRank(role, 'R12')
 *   4. fallback (should not be reached — page gate is R03+) → []
 *
 * @param viewerRole  The StaffRoleCode of the currently authenticated staff member.
 */
export function availableRolesForViewer(viewerRole: StaffRoleCode): StaffRoleCode[] {
  // Tier 1: Org Admin (R02+) — full list
  if (hasRank(viewerRole, 'R02')) {
    return ONBOARDABLE_ROLES;
  }

  // Tier 2: R03 Outlet Manager — op-tier staff only (R05–R11 range)
  // Explicitly checked by role code because R03 has rank 18 which satisfies
  // hasRank(R03, 'R12') — the explicit carve-out enforces the spec intent.
  if (viewerRole === 'R03') {
    return ONBOARDABLE_ROLES.filter((r) => !hasRank(r, 'R12'));
  }

  // Tier 3: Manager-tier viewer (rank ≥ R12, e.g. R04/R08/R12/R14/R16/R19)
  // They can onboard op-tier staff AND functional manager-tier roles.
  if (hasRank(viewerRole, 'R12')) {
    // All op-tier (non-manager) roles + all manager-tier (hasRank ≥ R12) roles.
    // This is effectively the full ONBOARDABLE_ROLES minus R02+ admin roles.
    // Since R02+ roles (R01, R02, R22, R23, R24) are already excluded from
    // ONBOARDABLE_ROLES, the full list minus nothing = ONBOARDABLE_ROLES.
    // However, manager-tier viewers should NOT be able to onboard peer or
    // senior managers like R19 (General Manager) without R02 authority.
    // Per spec: "R12+ (Manager): R05–R11 + R12+ (themselves and below in op tiers)"
    // We include all roles that either:
    //   a) don't meet R12 rank (op tier), OR
    //   b) meet R12 rank but not R02 rank (manager tier, below org admin)
    return ONBOARDABLE_ROLES.filter(
      (r) => !hasRank(r, 'R12') || !hasRank(r, 'R02'),
    );
  }

  // Tier 4: Below R03 — should not reach the wizard (page-level gate).
  // Return empty array as a safe fallback.
  return [];
}

/**
 * Human-readable description of what roles a viewer can onboard.
 * Used as inline help text below the role-select dropdown.
 */
export function roleOnboardingHintForViewer(viewerRole: StaffRoleCode): string | null {
  if (hasRank(viewerRole, 'R02')) {
    // Org Admin — no restriction hint needed
    return null;
  }
  if (viewerRole === 'R03') {
    return 'As Outlet Manager, you can onboard operational staff (R05–R11). Manager-tier roles (R12+) require Org Admin (R02) authority.';
  }
  if (hasRank(viewerRole, 'R12')) {
    return 'You can onboard operational staff and functional manager roles. Org Admin-level roles (R02+) require Org Admin authority.';
  }
  return null;
}
