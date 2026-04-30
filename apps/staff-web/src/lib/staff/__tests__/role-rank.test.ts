/**
 * DEF-S7-1 — Unit tests for availableRolesForViewer.
 *
 * Validates:
 *   T1  R03 viewer  → returns R05–R11 only (non-manager-tier)
 *   T2  R12 viewer  → returns R05–R11 + manager-tier roles (hasRank ≥ R12, not R02+)
 *   T3  R02 viewer  → returns all ONBOARDABLE_ROLES (full list)
 *   T4  R01 viewer  → returns all ONBOARDABLE_ROLES (R01 treated as max authority)
 *   T5  R04 viewer  → same as R12-tier: op + manager-tier roles
 *   T6  R08 viewer  → same as R12-tier: op + manager-tier roles
 *   T7  output is a superset-restriction of the submit-side guard:
 *         every role in availableRolesForViewer(R03) passes the R03 submit guard
 *   T8  R03 cannot see R12 (would be blocked at submit) — role absent from output
 *   T9  R19 (GM, rank 20) viewer → same as manager-tier (not R02, but rank ≥ R12)
 *   T10 R05 viewer  → fallback [], page gate prevents this but function is safe
 */

import { describe, it, expect } from 'vitest';
import { hasRank } from '@dms/types';
import { availableRolesForViewer, ONBOARDABLE_ROLES } from '../role-rank';
import type { StaffRoleCode } from '@dms/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mirror of the submit-side guard in page.tsx (L_S7). */
function submitGuardPasses(selectedRole: StaffRoleCode, actorRole: StaffRoleCode): boolean {
  // From submitRbacGuard: reject if selected role meets R12 rank AND actor is not R02+
  if (hasRank(selectedRole, 'R12') && !hasRank(actorRole, 'R02')) {
    return false;
  }
  return true;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('availableRolesForViewer', () => {

  // T1 — R03 (Outlet Manager) sees only op-tier staff (R05–R11)
  it('T1: R03 viewer returns only non-manager-tier roles (R05–R11)', () => {
    const result = availableRolesForViewer('R03');

    // Must include op-tier roles
    expect(result).toContain('R05');
    expect(result).toContain('R06');
    expect(result).toContain('R07');
    expect(result).toContain('R09');
    expect(result).toContain('R10');
    expect(result).toContain('R11');

    // Must NOT include any manager-tier role (hasRank ≥ R12)
    const managerTierInResult = result.filter((r) => hasRank(r, 'R12'));
    expect(managerTierInResult).toEqual([]);
  });

  // T2 — R12 viewer (Parts Manager) sees R05–R11 + manager-tier roles (not R02+)
  it('T2: R12 viewer returns op-tier + manager-tier roles (excluding R02-level)', () => {
    const result = availableRolesForViewer('R12');

    // Must include op-tier roles
    expect(result).toContain('R05');
    expect(result).toContain('R09');
    expect(result).toContain('R11');

    // Must include manager-tier roles (below R02 authority)
    expect(result).toContain('R12');  // themselves
    expect(result).toContain('R04');  // Sales Manager
    expect(result).toContain('R08');  // Workshop Manager

    // Must NOT contain roles that would violate submit guard (result is safe for R12 actor)
    // R02+ roles are excluded from ONBOARDABLE_ROLES entirely, so nothing to assert here
    expect(result.length).toBeGreaterThan(0);

    // No R02 in result (R02 is not in ONBOARDABLE_ROLES to begin with — but guard check)
    expect(result).not.toContain('R02');
    expect(result).not.toContain('R01');
  });

  // T3 — R02 viewer (Org Admin) sees all onboardable roles
  it('T3: R02 viewer returns all ONBOARDABLE_ROLES', () => {
    const result = availableRolesForViewer('R02');
    expect(result).toEqual(ONBOARDABLE_ROLES);
    expect(result.length).toBe(ONBOARDABLE_ROLES.length);
  });

  // T4 — R01 (Super Admin, rank 24) sees all onboardable roles
  it('T4: R01 viewer returns all ONBOARDABLE_ROLES (rank 24 satisfies R02 check)', () => {
    const result = availableRolesForViewer('R01');
    // R01 rank=24 >= R02 rank=22, so hasRank(R01, 'R02') is true
    expect(result).toEqual(ONBOARDABLE_ROLES);
  });

  // T5 — R04 (Sales Manager, rank 16) is manager-tier, not R02, not R03
  it('T5: R04 viewer (Sales Manager) returns op-tier + manager-tier roles', () => {
    const result = availableRolesForViewer('R04');
    expect(result).toContain('R05');  // op tier
    expect(result).toContain('R12');  // manager tier
    expect(result).not.toContain('R02');
  });

  // T6 — R08 (Workshop Manager, rank 16) same as R12-tier
  it('T6: R08 viewer (Workshop Manager) returns op-tier + manager-tier roles', () => {
    const result = availableRolesForViewer('R08');
    expect(result).toContain('R09');  // Service Advisor — op tier
    expect(result).toContain('R04');  // Sales Manager — manager tier
    expect(result).not.toContain('R02');
  });

  // T7 — All roles returned for R03 viewer pass the submit-side guard
  it('T7: every role available to R03 also passes the submit-side guard for R03', () => {
    const available = availableRolesForViewer('R03');
    for (const role of available) {
      expect(
        submitGuardPasses(role, 'R03'),
        `submit guard should allow R03 to onboard ${role}`,
      ).toBe(true);
    }
  });

  // T8 — R12 is absent from R03 viewer's options
  it('T8: R03 viewer cannot see R12 (manager-tier — blocked by submit guard)', () => {
    const result = availableRolesForViewer('R03');
    expect(result).not.toContain('R12');
    expect(result).not.toContain('R14');
    expect(result).not.toContain('R16');
    expect(result).not.toContain('R19');
  });

  // T9 — R19 (General Manager, rank 20) is below R02 so same as manager-tier
  it('T9: R19 viewer (GM, rank 20) sees op + manager-tier roles but not R02+', () => {
    const result = availableRolesForViewer('R19');
    expect(result).toContain('R05');  // op tier
    expect(result).toContain('R12');  // manager tier
    expect(result).not.toContain('R01');
    expect(result).not.toContain('R02');
  });

  // T10 — Below-R03 viewer gets empty array (page gate prevents this, but safe)
  it('T10: R05 viewer (below R03 page gate) returns empty array as safe fallback', () => {
    const result = availableRolesForViewer('R05');
    expect(result).toEqual([]);
  });

  // Consistency check — R03 output is a strict subset of R12 output
  it('R03 output is a strict subset of R12 output (more restricted)', () => {
    const r03 = new Set(availableRolesForViewer('R03'));
    const r12 = new Set(availableRolesForViewer('R12'));
    for (const role of r03) {
      expect(r12.has(role)).toBe(true);
    }
    // R12 has more roles than R03
    expect(r12.size).toBeGreaterThan(r03.size);
  });

  // Consistency check — R12 output is a strict subset of R02 output
  it('R12 output is a strict subset of R02 output (more restricted)', () => {
    const r12 = new Set(availableRolesForViewer('R12'));
    const r02 = new Set(availableRolesForViewer('R02'));
    for (const role of r12) {
      expect(r02.has(role)).toBe(true);
    }
    expect(r02.size).toBeGreaterThanOrEqual(r12.size);
  });
});
