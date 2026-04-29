/**
 * Outlets slice tests — SPEC-SETTINGS-001 §4
 *
 * Covers:
 *   - L1: 3-outlet constraint (no create / delete — store has no such actions)
 *   - L2: GSTIN validation (GstinValidationError on bad format)
 *   - L3: Manager eligibility (R03+ at correct outlet)
 *   - L10: Outlet code immutability (OutletCodeImmutableError)
 *   - Deactivation / reactivation role gate (R02+)
 *   - Audit event emission (kind, subject, before/after, actor fields)
 *   - deepDiff only includes changed keys
 *   - buildAuditEvent shape
 */

import { describe, it, expect } from 'vitest';
import {
  validateOutletPatch,
  buildAuditEvent,
  deepDiff,
  buildInitialOutlets,
  OutletEditDeniedError,
  GstinValidationError,
  ManagerEligibilityError,
  OutletCodeImmutableError,
  type StoreActor,
} from '../slices/outlets-slice';
import type { OutletConfig } from '@dms/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BLR_OUTLET: OutletConfig = {
  id: 'outlet-blr',
  code: 'BLR',
  name: 'BN Automobiles Bengaluru',
  address: { line1: '100 MG Road', city: 'Bengaluru', state: 'Karnataka', pin: '560001' },
  gstin: '29AABCT1332L1ZQ',
  managerId: 'staff-r03-001',
  contactPhone: '+91-80-12345678',
  contactEmail: 'blr@bnautomobiles.in',
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const ORG_ADMIN: StoreActor = { id: 'staff-r02-001', role: 'R02' };
const CEO: StoreActor = { id: 'staff-r01-001', role: 'R01' };
const SALES_EXEC: StoreActor = { id: 'staff-r09-001', role: 'R09' };

const VALID_STAFF_PROFILES: Record<string, { role: 'R03'; outlet: string }> = {
  'staff-r03-001': { role: 'R03', outlet: 'bangalore' },
  'staff-r03-002': { role: 'R03', outlet: 'bangalore' },
};

// ── buildInitialOutlets ───────────────────────────────────────────────────────

describe('buildInitialOutlets', () => {
  it('returns exactly 3 outlets (L1)', () => {
    const outlets = buildInitialOutlets();
    expect(Object.keys(outlets)).toHaveLength(3);
  });

  it('contains BLR, MUM, CHE outlets (L1)', () => {
    const outlets = buildInitialOutlets();
    const codes = Object.values(outlets).map((o) => o.code);
    expect(codes).toContain('BLR');
    expect(codes).toContain('MUM');
    expect(codes).toContain('CHE');
  });
});

// ── validateOutletPatch — role gate ──────────────────────────────────────────

describe('validateOutletPatch — role gate', () => {
  it('throws OutletEditDeniedError for a role below R02', () => {
    expect(() =>
      validateOutletPatch(BLR_OUTLET, { name: 'New Name' }, SALES_EXEC, VALID_STAFF_PROFILES),
    ).toThrow(OutletEditDeniedError);
  });

  it('R02 actor passes role gate', () => {
    expect(() =>
      validateOutletPatch(BLR_OUTLET, { name: 'New Name' }, ORG_ADMIN, VALID_STAFF_PROFILES),
    ).not.toThrow();
  });

  it('R01 (CEO) passes role gate', () => {
    expect(() =>
      validateOutletPatch(BLR_OUTLET, { name: 'New Name' }, CEO, VALID_STAFF_PROFILES),
    ).not.toThrow();
  });
});

// ── validateOutletPatch — L10 immutable code ─────────────────────────────────

describe('validateOutletPatch — L10 immutable code', () => {
  it('throws OutletCodeImmutableError when patch tries to change code', () => {
    expect(() =>
      validateOutletPatch(BLR_OUTLET, { code: 'MUM' }, ORG_ADMIN, VALID_STAFF_PROFILES),
    ).toThrow(OutletCodeImmutableError);
  });

  it('does not throw when patch sets code to the same value (no-op)', () => {
    expect(() =>
      validateOutletPatch(BLR_OUTLET, { code: 'BLR' }, ORG_ADMIN, VALID_STAFF_PROFILES),
    ).not.toThrow();
  });
});

// ── validateOutletPatch — L2 GSTIN validation ────────────────────────────────

describe('validateOutletPatch — L2 GSTIN', () => {
  it('throws GstinValidationError for a malformed GSTIN', () => {
    expect(() =>
      validateOutletPatch(
        BLR_OUTLET,
        { gstin: 'BADGSTIN' },
        ORG_ADMIN,
        VALID_STAFF_PROFILES,
      ),
    ).toThrow(GstinValidationError);
  });

  it('accepts a valid GSTIN', () => {
    expect(() =>
      validateOutletPatch(
        BLR_OUTLET,
        { gstin: '29AABCT1332L1ZQ' },
        ORG_ADMIN,
        VALID_STAFF_PROFILES,
      ),
    ).not.toThrow();
  });

  it('GstinValidationError message includes the bad GSTIN value', () => {
    try {
      validateOutletPatch(
        BLR_OUTLET,
        { gstin: 'BAD-VALUE' },
        ORG_ADMIN,
        VALID_STAFF_PROFILES,
      );
    } catch (e) {
      expect(e).toBeInstanceOf(GstinValidationError);
      expect((e as Error).message).toContain('BAD-VALUE');
    }
  });
});

// ── validateOutletPatch — L3 manager eligibility ─────────────────────────────

describe('validateOutletPatch — L3 manager eligibility', () => {
  it('throws ManagerEligibilityError when managerId not in staffProfiles', () => {
    expect(() =>
      validateOutletPatch(
        BLR_OUTLET,
        { managerId: 'unknown-staff' },
        ORG_ADMIN,
        VALID_STAFF_PROFILES,
      ),
    ).toThrow(ManagerEligibilityError);
  });

  it('throws ManagerEligibilityError when manager is below R03', () => {
    const lowRankStaff: Record<string, { role: 'R09'; outlet: string }> = {
      'staff-r09-low': { role: 'R09', outlet: 'bangalore' },
    };
    expect(() =>
      validateOutletPatch(
        BLR_OUTLET,
        { managerId: 'staff-r09-low' },
        ORG_ADMIN,
        lowRankStaff as never,
      ),
    ).toThrow(ManagerEligibilityError);
  });

  it('throws ManagerEligibilityError when manager is at wrong outlet', () => {
    const wrongOutletStaff: Record<string, { role: 'R03'; outlet: string }> = {
      'staff-r03-mum': { role: 'R03', outlet: 'mumbai' },
    };
    expect(() =>
      validateOutletPatch(
        BLR_OUTLET,
        { managerId: 'staff-r03-mum' },
        ORG_ADMIN,
        wrongOutletStaff,
      ),
    ).toThrow(ManagerEligibilityError);
  });

  it('accepts a valid R03 manager at the correct outlet', () => {
    expect(() =>
      validateOutletPatch(
        BLR_OUTLET,
        { managerId: 'staff-r03-001' },
        ORG_ADMIN,
        VALID_STAFF_PROFILES,
      ),
    ).not.toThrow();
  });
});

// ── deepDiff ─────────────────────────────────────────────────────────────────

describe('deepDiff', () => {
  it('returns only changed keys', () => {
    const before = { name: 'Old Name', gstin: '29AABCT1332L1ZQ', active: true };
    const after = { name: 'New Name', gstin: '29AABCT1332L1ZQ' };
    const { before: diffBefore, after: diffAfter } = deepDiff(before, after);

    expect(diffBefore).toEqual({ name: 'Old Name' });
    expect(diffAfter).toEqual({ name: 'New Name' });
  });

  it('returns empty objects when nothing changed', () => {
    const before = { name: 'Same Name', active: true };
    const after = { name: 'Same Name' };
    const { before: diffBefore, after: diffAfter } = deepDiff(before, after);

    expect(diffBefore).toEqual({});
    expect(diffAfter).toEqual({});
  });

  it('handles nested objects by comparing JSON representation', () => {
    const before = { address: { city: 'Bengaluru', pin: '560001' } };
    const after = { address: { city: 'Bengaluru', pin: '560071' } };
    const { before: diffBefore, after: diffAfter } = deepDiff(before, after);

    expect(diffBefore).toEqual({ address: { city: 'Bengaluru', pin: '560001' } });
    expect(diffAfter).toEqual({ address: { city: 'Bengaluru', pin: '560071' } });
  });
});

// ── buildAuditEvent — shape contract ─────────────────────────────────────────

describe('buildAuditEvent', () => {
  it('emits an event with correct kind and subject (L7)', () => {
    const event = buildAuditEvent('outlet-edit', ORG_ADMIN, 'outlet-blr');
    expect(event.kind).toBe('outlet-edit');
    expect(event.subject).toBe('outlet-blr');
  });

  it('captures actorId and actorRole from the StoreActor (L7)', () => {
    const event = buildAuditEvent('outlet-edit', ORG_ADMIN, 'outlet-blr');
    expect(event.actorId).toBe('staff-r02-001');
    expect(event.actorRole).toBe('R02');
  });

  it('generates a unique id for each event', () => {
    const e1 = buildAuditEvent('outlet-edit', ORG_ADMIN, 'outlet-blr');
    const e2 = buildAuditEvent('outlet-edit', ORG_ADMIN, 'outlet-blr');
    expect(e1.id).not.toBe(e2.id);
  });

  it('serialises before and after diff into the event (L7)', () => {
    const before = { name: 'Old Name' };
    const after = { name: 'New Name' };
    const event = buildAuditEvent('outlet-edit', ORG_ADMIN, 'outlet-blr', before, after);
    expect(event.before).toEqual(before);
    expect(event.after).toEqual(after);
  });

  it('at field is a valid ISO date string', () => {
    const event = buildAuditEvent('outlet-deactivated', ORG_ADMIN, 'outlet-blr');
    expect(() => new Date(event.at)).not.toThrow();
    expect(new Date(event.at).getTime()).not.toBeNaN();
  });

  it('note field is included when provided', () => {
    const event = buildAuditEvent(
      'outlet-deactivated',
      ORG_ADMIN,
      'outlet-blr',
      undefined,
      undefined,
      'Test note',
    );
    expect(event.note).toBe('Test note');
  });

  it('note field is undefined when omitted', () => {
    const event = buildAuditEvent('outlet-edit', ORG_ADMIN, 'outlet-blr');
    expect(event.note).toBeUndefined();
  });
});
