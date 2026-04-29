/**
 * Staff P1 Vitest tests — SPEC-STAFF-001 §17
 *
 * Covers:
 * 1. selectStaffForViewer salary RLS (L18) — sub-R12 strips salary fields
 * 2. transitionRole audit-trail emission
 * 3. RBAC guards on role transitions
 * 4. MOCK_STAFF_PROFILES fixture shape validation (24 profiles, correct IDs)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStaffStore } from '../lib/staff/staff-store';
import { MOCK_STAFF_PROFILES } from '@dms/mocks/fixtures';
import type { StaffProfile, StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshStore() {
  // Reset store to initial state and hydrate with fixtures
  useStaffStore.getState().hydrate(MOCK_STAFF_PROFILES);
}

// ─── Test: Fixture shape ──────────────────────────────────────────────────────

describe('MOCK_STAFF_PROFILES fixture', () => {
  it('has 24+ profiles', () => {
    expect(MOCK_STAFF_PROFILES.length).toBeGreaterThanOrEqual(24);
  });

  it('each profile has required fields', () => {
    for (const p of MOCK_STAFF_PROFILES) {
      expect(p.id).toMatch(/^staff-/);
      expect(p.name).toBeTruthy();
      expect(p.email).toContain('@');
      expect(p.role).toMatch(/^R\d{2}$/);
      expect(p.schemaVersion).toBe('v1');
      expect(['ACTIVE', 'ON_LEAVE', 'EXITED', 'ONBOARDING']).toContain(p.status);
    }
  });

  it('covers all three outlets plus org-level', () => {
    const outlets = new Set(MOCK_STAFF_PROFILES.map((p) => p.outlet));
    expect(outlets).toContain('bangalore');
    expect(outlets).toContain('mumbai');
    expect(outlets).toContain('chennai');
    expect(outlets).toContain('all');
  });

  it('existing IDs from prior modules are present (backwards compat)', () => {
    const ids = new Set(MOCK_STAFF_PROFILES.map((p) => p.id));
    // IDs referenced by cost ledger, service actors, etc.
    expect(ids.has('staff-r05-001')).toBe(true); // Rahul Kumar BLR
    expect(ids.has('staff-r09-001')).toBe(true); // Priya Sharma BLR
    expect(ids.has('staff-r12-001')).toBe(true); // Vikram Singh MUM
    expect(ids.has('staff-r16-001')).toBe(true); // Anita Desai BLR
    expect(ids.has('staff-r19-001')).toBe(true); // MUM GM
    expect(ids.has('staff-r24-001')).toBe(true); // Meera Iyer CEO
  });

  it('no salary/payslip fields are set in P1 fixtures', () => {
    for (const p of MOCK_STAFF_PROFILES) {
      expect(p.salary).toBeUndefined();
      expect(p.payslips).toBeUndefined();
      expect(p.salaryHistory).toBeUndefined();
      expect(p.bankDetails).toBeUndefined();
    }
  });
});

// ─── Test: hasRank helper ─────────────────────────────────────────────────────
// Convention: higher rank number = more seniority (mirrors vehicles module).
// R24 CEO and R01 Super Admin are top authority (rank 24).
// R05 Sales Executive (rank 5) is junior; R12 Parts Manager (rank 15) is senior.

describe('hasRank (L4)', () => {
  it('R01 (Super Admin) has rank over all roles', () => {
    const roles: StaffRoleCode[] = ['R01', 'R02', 'R03', 'R12', 'R24'];
    for (const r of roles) {
      expect(hasRank('R01', r)).toBe(true);
    }
  });

  it('R24 (CEO) has rank over all roles', () => {
    const roles: StaffRoleCode[] = ['R01', 'R02', 'R03', 'R12', 'R24'];
    for (const r of roles) {
      expect(hasRank('R24', r)).toBe(true);
    }
  });

  it('R05 (Sales Exec) does NOT meet R12 (Parts Manager) authority', () => {
    expect(hasRank('R05', 'R12')).toBe(false);
  });

  it('R12 meets its own rank', () => {
    expect(hasRank('R12', 'R12')).toBe(true);
  });

  it('R16 (Finance Head) meets R12 authority', () => {
    expect(hasRank('R16', 'R12')).toBe(true);
  });

  it('R02 (Org Admin) meets R03 (Outlet Manager) authority', () => {
    expect(hasRank('R02', 'R03')).toBe(true);
  });

  it('R09 (Service Advisor) does NOT meet R12 authority', () => {
    expect(hasRank('R09', 'R12')).toBe(false);
  });

  it('R11 (Technician) does NOT meet R09 authority', () => {
    expect(hasRank('R11', 'R09')).toBe(false);
  });
});

// ─── Test: selectStaffForViewer salary RLS (L18) ─────────────────────────────
// SECURITY: This test is mandatory per spec §17 and L18.
// Sub-R12 callers MUST NOT receive salary/payslip/bankDetails fields.
// Even in P1 (no salary data), the selector contract must hold.

describe('selectStaffForViewer — salary RLS (L18)', () => {
  beforeEach(() => freshStore());

  it('sub-R12 caller (R05) gets staff without salary fields', () => {
    const result = useStaffStore.getState().selectStaffForViewer('R05');
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p).not.toHaveProperty('salary');
      expect(p).not.toHaveProperty('payslips');
      expect(p).not.toHaveProperty('salaryHistory');
      expect(p).not.toHaveProperty('bankDetails');
      expect(p).not.toHaveProperty('bankAccountMasked');
    }
  });

  it('R09 (sub-R12) also gets stripped payload', () => {
    const result = useStaffStore.getState().selectStaffForViewer('R09');
    for (const p of result) {
      expect(p).not.toHaveProperty('salary');
      expect(p).not.toHaveProperty('payslips');
    }
  });

  it('R12 caller gets payload with salary fields present (even if undefined in P1)', () => {
    // Inject a profile with salary data to simulate P2
    const profileWithSalary: StaffProfile = {
      ...MOCK_STAFF_PROFILES[0]!,
      id: 'test-salary-profile',
      salary: { basic: 50000 },
      payslips: [{ month: '2026-04' }],
    };
    useStaffStore.getState().addStaff(profileWithSalary);
    const result = useStaffStore.getState().selectStaffForViewer('R12');
    const found = result.find((p) => p.id === 'test-salary-profile');
    expect(found).toBeDefined();
    // R12 should NOT have salary stripped (hasRank('R12', 'R12') = true)
    expect(found?.salary).toEqual({ basic: 50000 });
    expect(found?.payslips).toHaveLength(1);
  });

  it('sub-R12 does NOT see the salary-injected profile salary field', () => {
    const profileWithSalary: StaffProfile = {
      ...MOCK_STAFF_PROFILES[0]!,
      id: 'test-salary-profile-2',
      salary: { basic: 60000 },
      bankAccountMasked: 'XXXX1234',
    };
    useStaffStore.getState().addStaff(profileWithSalary);
    const result = useStaffStore.getState().selectStaffForViewer('R05');
    const found = result.find((p) => p.id === 'test-salary-profile-2');
    expect(found).toBeDefined();
    expect(found).not.toHaveProperty('salary');
    expect(found).not.toHaveProperty('bankAccountMasked');
  });

  it('R16 retains all salary fields', () => {
    const profileWithSalary: StaffProfile = {
      ...MOCK_STAFF_PROFILES[0]!,
      id: 'test-salary-profile-r16',
      salary: { basic: 80000 },
      salaryHistory: [{ month: '2026-03', basic: 75000 }],
    };
    useStaffStore.getState().addStaff(profileWithSalary);
    const result = useStaffStore.getState().selectStaffForViewer('R16');
    const found = result.find((p) => p.id === 'test-salary-profile-r16');
    expect(found?.salary).toBeDefined();
    expect(found?.salaryHistory).toBeDefined();
  });
});

// ─── Test: transitionRole audit trail ────────────────────────────────────────

describe('transitionRole — audit trail', () => {
  beforeEach(() => freshStore());

  it('emits a RoleAuditEvent on successful transition', () => {
    const store = useStaffStore.getState();
    const staffId = 'staff-r05-001';
    const before = store.roleAuditLog.length;

    const result = store.transitionRole(staffId, 'R04', 'Promotion to sales manager role', {
      id: 'staff-r02-001',
      role: 'R02',
    });

    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event?.kind).toBe('ROLE_CHANGED');
    expect(result.event?.staffId).toBe(staffId);
    expect(result.event?.actorRole).toBe('R02');
    expect(result.event?.payload).toMatchObject({ fromRole: 'R05', toRole: 'R04' });
    expect(result.event?.reason).toBe('Promotion to sales manager role');

    const after = useStaffStore.getState().roleAuditLog.length;
    expect(after).toBe(before + 1);
  });

  it('updates staff role in store after transition', () => {
    const store = useStaffStore.getState();
    store.transitionRole('staff-r05-001', 'R04', 'Test promotion reason', {
      id: 'staff-r02-001',
      role: 'R02',
    });
    const updated = useStaffStore.getState().selectStaffById('staff-r05-001');
    expect(updated?.role).toBe('R04');
  });

  it('returns error for non-existent staff ID', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-nonexistent',
      'R05',
      'Test reason here',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('rejects reason shorter than 5 characters', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-r05-001',
      'R04',
      'Hi', // too short
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('5 characters');
  });

  it('audit event has schemaVersion v1', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-r05-001',
      'R04',
      'Test promotion with valid reason',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.event?.schemaVersion).toBe('v1');
  });
});

// ─── Test: RBAC guards on role transitions ────────────────────────────────────

describe('transitionRole — RBAC guards (FIXME: OQ-ROLE-1 pending Doc 14)', () => {
  beforeEach(() => freshStore());

  it('R02 (Org Admin) can promote to manager tier (R04)', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-r05-001',
      'R04',
      'R02 promoting to manager tier',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(true);
  });

  it('R03 (Outlet Manager) can make lateral change (R05 → R06)', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-r05-001',
      'R06',
      'Lateral move to marketing executive',
      { id: 'staff-r03-001', role: 'R03' },
    );
    expect(result.success).toBe(true);
  });

  it('R05 (Sales Executive) cannot change roles — insufficient authority', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-r09-001',
      'R08',
      'Unauthorized role change attempt by R05',
      { id: 'staff-r05-001', role: 'R05' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('R09 (Service Advisor) cannot promote to manager tier', () => {
    const result = useStaffStore.getState().transitionRole(
      'staff-r05-001',
      'R04',
      'R09 trying to set manager role',
      { id: 'staff-r09-001', role: 'R09' },
    );
    expect(result.success).toBe(false);
  });
});

// ─── Test: selectStaffById ────────────────────────────────────────────────────

describe('selectStaffById', () => {
  beforeEach(() => freshStore());

  it('returns correct profile by ID', () => {
    const profile = useStaffStore.getState().selectStaffById('staff-r05-001');
    expect(profile?.name).toBe('Rahul Kumar');
    expect(profile?.role).toBe('R05');
  });

  it('returns undefined for missing ID', () => {
    const profile = useStaffStore.getState().selectStaffById('staff-nonexistent');
    expect(profile).toBeUndefined();
  });
});

// ─── Test: addStaff (onboarding stub) ────────────────────────────────────────

describe('addStaff', () => {
  beforeEach(() => freshStore());

  it('adds a new staff profile and is retrievable', () => {
    const now = new Date().toISOString();
    const profile: StaffProfile = {
      id: 'staff-r05-test-new',
      name: 'Test Onboard',
      email: 'test@bnautomobiles.in',
      avatar: 'TO',
      role: 'R05',
      roleName: 'Sales Executive',
      department: 'SALES',
      outlet: 'bangalore',
      status: 'ONBOARDING',
      reportsTo: null,
      startDate: '2026-04-28',
      permissions: [],
      stateOfPosting: 'KA',
      dpdpConsentGiven: true,
      dpdpConsentAt: now,
      hrConsentGivenAt: now,
      fingerprintEnrolled: false,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };
    useStaffStore.getState().addStaff(profile);
    const found = useStaffStore.getState().selectStaffById('staff-r05-test-new');
    expect(found?.name).toBe('Test Onboard');
    expect(found?.status).toBe('ONBOARDING');
    expect(found?.dpdpConsentGiven).toBe(true);
  });
});
