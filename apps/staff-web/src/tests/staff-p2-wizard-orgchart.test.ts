/**
 * Staff P2 Vitest tests — SPEC-STAFF-001
 *
 * Covers:
 * 1. Profile audit trail (L25) — append-only, R09+ readable, self always readable
 * 2. updateStaffProfile — PII guard (R12+ for phone/email)
 * 3. updateReportsTo — R02+ guard, cycle detection (L26)
 * 4. Org chart cycle detection utility (buildTree-equivalent)
 * 5. Onboarding wizard addStaff emits 'onboarded' to profileAuditLog
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStaffStore } from '../lib/staff/staff-store';
import { MOCK_STAFF_PROFILES } from '@dms/mocks/fixtures';
import type { StaffProfile } from '@dms/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshStore() {
  useStaffStore.getState().hydrate(MOCK_STAFF_PROFILES);
}

const BASE_PROFILE: StaffProfile = {
  ...MOCK_STAFF_PROFILES[0]!,
  id: 'test-audit-001',
  name: 'Audit Test',
  email: 'audit@bnautomobiles.in',
  phone: '+91 99999-00000',
  reportsTo: null,
};

// ─── Test: profileAuditLog (L25) ─────────────────────────────────────────────

describe('profileAuditLog — L25', () => {
  beforeEach(() => freshStore());

  it('addStaff emits onboarded event to profileAuditLog', () => {
    const store = useStaffStore.getState();
    const before = store.profileAuditLog.length;
    store.addStaff(BASE_PROFILE);
    const after = useStaffStore.getState().profileAuditLog.length;
    expect(after).toBe(before + 1);
    const event = useStaffStore.getState().profileAuditLog.at(-1)!;
    expect(event.kind).toBe('onboarded');
    expect(event.staffId).toBe(BASE_PROFILE.id);
    expect(event.schemaVersion).toBe('v1');
  });

  it('transitionRole emits role-transition event to profileAuditLog', () => {
    const store = useStaffStore.getState();
    const before = store.profileAuditLog.length;
    store.transitionRole('staff-r05-001', 'R06', 'Lateral to marketing team', {
      id: 'staff-r02-001',
      role: 'R02',
    });
    const after = useStaffStore.getState().profileAuditLog.length;
    expect(after).toBe(before + 1);
    const event = useStaffStore.getState().profileAuditLog.at(-1)!;
    expect(event.kind).toBe('role-transition');
    expect(event.before).toMatchObject({ role: 'R05' });
    expect(event.after).toMatchObject({ role: 'R06' });
  });

  it('selectProfileAuditLog returns events for R09+ viewer', () => {
    useStaffStore.getState().addStaff(BASE_PROFILE);
    const log = useStaffStore
      .getState()
      .selectProfileAuditLog(BASE_PROFILE.id, 'R09', false);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]!.staffId).toBe(BASE_PROFILE.id);
  });

  it('selectProfileAuditLog returns empty for sub-R09 non-self viewer', () => {
    useStaffStore.getState().addStaff(BASE_PROFILE);
    const log = useStaffStore
      .getState()
      .selectProfileAuditLog(BASE_PROFILE.id, 'R05', false);
    expect(log).toHaveLength(0);
  });

  it('selectProfileAuditLog returns events for self regardless of role', () => {
    useStaffStore.getState().addStaff(BASE_PROFILE);
    const log = useStaffStore
      .getState()
      .selectProfileAuditLog(BASE_PROFILE.id, 'R05', true);
    expect(log.length).toBeGreaterThan(0);
  });
});

// ─── Test: updateStaffProfile ─────────────────────────────────────────────────

describe('updateStaffProfile', () => {
  beforeEach(() => freshStore());

  it('allows self to update their own name', () => {
    const result = useStaffStore.getState().updateStaffProfile(
      'staff-r05-001',
      { name: 'Rahul Kumar Updated' },
      { id: 'staff-r05-001', role: 'R05' }, // self
    );
    expect(result.success).toBe(true);
    const updated = useStaffStore.getState().selectStaffById('staff-r05-001');
    expect(updated?.name).toBe('Rahul Kumar Updated');
  });

  it('allows R12+ to update phone (PII field)', () => {
    const result = useStaffStore.getState().updateStaffProfile(
      'staff-r05-001',
      { phone: '+91 88888-00001' },
      { id: 'staff-r12-001', role: 'R12' },
    );
    expect(result.success).toBe(true);
  });

  it('blocks sub-R12 non-self from updating phone (PII field)', () => {
    const result = useStaffStore.getState().updateStaffProfile(
      'staff-r05-001',
      { phone: '+91 77777-00001' },
      { id: 'staff-r09-001', role: 'R09' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('R12+');
  });

  it('emits profile-updated event to profileAuditLog', () => {
    const before = useStaffStore.getState().profileAuditLog.length;
    useStaffStore.getState().updateStaffProfile(
      'staff-r05-001',
      { name: 'New Name' },
      { id: 'staff-r03-001', role: 'R03' },
    );
    const after = useStaffStore.getState().profileAuditLog.length;
    expect(after).toBe(before + 1);
    const event = useStaffStore.getState().profileAuditLog.at(-1)!;
    expect(event.kind).toBe('profile-updated');
    expect(event.before).toMatchObject({ name: 'Rahul Kumar' });
    expect(event.after).toMatchObject({ name: 'New Name' });
  });

  it('returns error for unknown staffId', () => {
    const result = useStaffStore.getState().updateStaffProfile(
      'staff-nonexistent',
      { name: 'X' },
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(false);
  });
});

// ─── Test: updateReportsTo (org chart re-org, L13, L26) ──────────────────────

describe('updateReportsTo — L13/L26', () => {
  beforeEach(() => freshStore());

  it('R02 can change reportsTo for any staff', () => {
    const result = useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r03-001',
      'Reassigning to outlet manager',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(true);
    const updated = useStaffStore.getState().selectStaffById('staff-r05-001');
    expect(updated?.reportsTo).toBe('staff-r03-001');
  });

  it('blocks sub-R02 from re-org', () => {
    const result = useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r04-001',
      'Unauthorized re-org attempt',
      { id: 'staff-r03-001', role: 'R03' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('R02');
  });

  it('blocks reason shorter than 5 chars', () => {
    const result = useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r03-001',
      'Hi',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('5 characters');
  });

  it('emits REPORTS_TO_CHANGED to roleAuditLog', () => {
    const before = useStaffStore.getState().roleAuditLog.length;
    useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r03-001',
      'New org structure for outlet',
      { id: 'staff-r02-001', role: 'R02' },
    );
    const after = useStaffStore.getState().roleAuditLog.length;
    expect(after).toBe(before + 1);
    const event = useStaffStore.getState().roleAuditLog.at(-1)!;
    expect(event.kind).toBe('REPORTS_TO_CHANGED');
    expect(event.payload).toMatchObject({ newManagerId: 'staff-r03-001' });
  });

  it('emits profile-updated to profileAuditLog', () => {
    const before = useStaffStore.getState().profileAuditLog.length;
    useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r03-001',
      'Org restructure Q2 2026',
      { id: 'staff-r02-001', role: 'R02' },
    );
    const after = useStaffStore.getState().profileAuditLog.length;
    expect(after).toBe(before + 1);
  });

  it('allows setting reportsTo to null (root)', () => {
    // First set to a manager
    useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r03-001',
      'Adding manager assignment',
      { id: 'staff-r02-001', role: 'R02' },
    );
    // Then clear it
    const result = useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      null,
      'Moving to org root temporarily',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(true);
    const updated = useStaffStore.getState().selectStaffById('staff-r05-001');
    expect(updated?.reportsTo).toBeNull();
  });
});

// ─── Test: cycle detection (L26) ─────────────────────────────────────────────
// We test via the store action (updateReportsTo): if A reports to B and we try
// to make B report to A, it should fail.

describe('org chart cycle detection — L26', () => {
  beforeEach(() => freshStore());

  it('prevents direct cycle: A → B and B → A', () => {
    const store = useStaffStore.getState();
    const staffA = 'staff-r05-001';
    const staffB = 'staff-r09-001';

    // Set A to report to B
    const r1 = store.updateReportsTo(staffA, staffB, 'Setting initial chain', {
      id: 'staff-r02-001', role: 'R02',
    });
    expect(r1.success).toBe(true);

    // Now try to set B to report to A — should fail (cycle)
    const r2 = useStaffStore.getState().updateReportsTo(staffB, staffA, 'Creating cycle', {
      id: 'staff-r02-001', role: 'R02',
    });
    expect(r2.success).toBe(false);
    expect(r2.error).toContain('cycle');
  });

  it('prevents self-reporting cycle: A reports to A', () => {
    const result = useStaffStore.getState().updateReportsTo(
      'staff-r05-001',
      'staff-r05-001',
      'Self as manager — invalid',
      { id: 'staff-r02-001', role: 'R02' },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('cycle');
  });
});
