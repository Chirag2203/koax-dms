/**
 * Settings store integration tests — SPEC-SETTINGS-001 §4
 *
 * Covers:
 *   - hydrate() seeds all slices correctly
 *   - updateOutlet emits audit event (L7)
 *   - deactivateOutlet / reactivateOutlet state transitions
 *   - toggleFlag cross-slice audit emission (L6 + L7)
 *   - getAuditLog with filters (kind, actorId)
 *   - logRbacViewed / logRbacExported add audit entries
 *   - disconnectIntegration updates credential status + audit
 *   - testConnection async flow updates credential + audit
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSettingsStore } from '../settings-store';
import type { StoreActor } from '../settings-store';

// ── Actors ───────────────────────────────────────────────────────────────────

const ORG_ADMIN: StoreActor = { id: 'staff-r02-001', role: 'R02' };
const CEO: StoreActor = { id: 'staff-r01-001', role: 'R01' };
const CFO: StoreActor = { id: 'staff-r22-001', role: 'R22' };
const SALES_EXEC: StoreActor = { id: 'staff-r09-001', role: 'R09' };

// ── Store reset helper ────────────────────────────────────────────────────────

function resetStore() {
  // Reset to pristine initial state before each test
  useSettingsStore.setState({
    outlets: {},
    credentials: {} as never,
    flags: {},
    auditLog: [],
    hydrated: false,
  });
  useSettingsStore.getState().hydrate();
}

const VALID_STAFF_PROFILES: Record<string, { role: 'R03'; outlet: string }> = {
  'staff-r03-001': { role: 'R03', outlet: 'bangalore' },
};

// ── hydrate ───────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  beforeEach(resetStore);

  it('sets hydrated to true', () => {
    expect(useSettingsStore.getState().hydrated).toBe(true);
  });

  it('seeds exactly 3 outlets (L1)', () => {
    const { outlets } = useSettingsStore.getState();
    expect(Object.keys(outlets)).toHaveLength(3);
  });

  it('seeds all 6 integration credentials', () => {
    const { credentials } = useSettingsStore.getState();
    expect(Object.keys(credentials)).toHaveLength(6);
  });

  it('seeds feature flags from registry', () => {
    const { flags } = useSettingsStore.getState();
    expect(Object.keys(flags).length).toBeGreaterThanOrEqual(24);
  });
});

// ── updateOutlet — audit emission (L7) ───────────────────────────────────────

describe('updateOutlet — L7 audit', () => {
  beforeEach(resetStore);

  it('emits an outlet-edit audit event when outlet is updated', () => {
    const store = useSettingsStore.getState();
    const id = 'outlet-blr';

    const auditLengthBefore = store.auditLog.length;
    store.updateOutlet(id, { name: 'BN Automobiles Bengaluru Updated' }, ORG_ADMIN, VALID_STAFF_PROFILES);

    const { auditLog } = useSettingsStore.getState();
    expect(auditLog.length).toBe(auditLengthBefore + 1);

    const lastEvent = auditLog[auditLog.length - 1]!;
    expect(lastEvent.kind).toBe('outlet-edit');
    expect(lastEvent.subject).toBe(id);
    expect(lastEvent.actorId).toBe(ORG_ADMIN.id);
    expect(lastEvent.actorRole).toBe('R02');
  });

  it('audit event captures changed fields in before/after diff', () => {
    const store = useSettingsStore.getState();
    store.updateOutlet(
      'outlet-blr',
      { name: 'New Name' },
      ORG_ADMIN,
      VALID_STAFF_PROFILES,
    );

    const { auditLog } = useSettingsStore.getState();
    const event = auditLog[auditLog.length - 1]!;
    expect(event.after).toHaveProperty('name', 'New Name');
  });

  it('throws when outlet id is not found', () => {
    expect(() =>
      useSettingsStore
        .getState()
        .updateOutlet('outlet-xyz', { name: 'X' }, ORG_ADMIN, VALID_STAFF_PROFILES),
    ).toThrow('not found');
  });
});

// ── deactivateOutlet / reactivateOutlet ───────────────────────────────────────

describe('deactivateOutlet / reactivateOutlet', () => {
  beforeEach(resetStore);

  it('sets outlet active to false (L9)', () => {
    useSettingsStore.getState().deactivateOutlet('outlet-mum', ORG_ADMIN);
    expect(useSettingsStore.getState().outlets['outlet-mum']?.active).toBe(false);
  });

  it('emits outlet-deactivated audit event (L7)', () => {
    const before = useSettingsStore.getState().auditLog.length;
    useSettingsStore.getState().deactivateOutlet('outlet-mum', ORG_ADMIN);
    const after = useSettingsStore.getState().auditLog.length;
    expect(after).toBe(before + 1);
    expect(useSettingsStore.getState().auditLog[after - 1]?.kind).toBe('outlet-deactivated');
  });

  it('reactivateOutlet sets outlet active back to true', () => {
    useSettingsStore.getState().deactivateOutlet('outlet-mum', ORG_ADMIN);
    useSettingsStore.getState().reactivateOutlet('outlet-mum', CEO);
    expect(useSettingsStore.getState().outlets['outlet-mum']?.active).toBe(true);
  });

  it('deactivateOutlet throws for actor below R02', () => {
    expect(() =>
      useSettingsStore.getState().deactivateOutlet('outlet-blr', SALES_EXEC),
    ).toThrow();
  });
});

// ── toggleFlag — cross-slice audit (L6 + L7) ─────────────────────────────────

describe('toggleFlag', () => {
  beforeEach(resetStore);

  it('toggles flag value in store', () => {
    const key = 'settings-module';
    const initialValue = useSettingsStore.getState().flags[key]?.value;
    useSettingsStore.getState().toggleFlag(key, !initialValue, ORG_ADMIN);
    expect(useSettingsStore.getState().flags[key]?.value).toBe(!initialValue);
  });

  it('emits feature-flag-toggled audit event (L7)', () => {
    const before = useSettingsStore.getState().auditLog.length;
    useSettingsStore.getState().toggleFlag('settings-module', false, ORG_ADMIN);
    const { auditLog } = useSettingsStore.getState();
    expect(auditLog.length).toBe(before + 1);
    expect(auditLog[auditLog.length - 1]?.kind).toBe('feature-flag-toggled');
  });

  it('updates updatedBy with actor id', () => {
    useSettingsStore.getState().toggleFlag('settings-module', false, ORG_ADMIN);
    expect(useSettingsStore.getState().flags['settings-module']?.updatedBy).toBe(ORG_ADMIN.id);
  });

  it('throws for an unknown flag key', () => {
    expect(() =>
      useSettingsStore.getState().toggleFlag('no-such-flag', true, ORG_ADMIN),
    ).toThrow('not found');
  });
});

// ── getAuditLog with filters ──────────────────────────────────────────────────

describe('getAuditLog filters', () => {
  beforeEach(() => {
    resetStore();
    // Produce two different event kinds
    useSettingsStore.getState().deactivateOutlet('outlet-blr', ORG_ADMIN);
    useSettingsStore.getState().toggleFlag('settings-module', false, CEO);
    useSettingsStore.getState().logRbacViewed(CFO);
  });

  it('returns all events when no filter applied', () => {
    const log = useSettingsStore.getState().getAuditLog();
    expect(log.length).toBeGreaterThanOrEqual(3);
  });

  it('filters by kind — only outlet-deactivated events', () => {
    const log = useSettingsStore.getState().getAuditLog({ kind: 'outlet-deactivated' });
    expect(log.every((e) => e.kind === 'outlet-deactivated')).toBe(true);
    expect(log.length).toBeGreaterThan(0);
  });

  it('filters by actorId — only CEO events', () => {
    const log = useSettingsStore.getState().getAuditLog({ actorId: CEO.id });
    expect(log.every((e) => e.actorId === CEO.id)).toBe(true);
    expect(log.length).toBeGreaterThan(0);
  });

  it('returns empty array when filter matches nothing', () => {
    const log = useSettingsStore.getState().getAuditLog({ actorId: 'no-such-actor' });
    expect(log).toHaveLength(0);
  });
});

// ── logRbacViewed / logRbacExported ──────────────────────────────────────────

describe('logRbacViewed / logRbacExported', () => {
  beforeEach(resetStore);

  it('logRbacViewed emits rbac-matrix-viewed event (L7)', () => {
    const before = useSettingsStore.getState().auditLog.length;
    useSettingsStore.getState().logRbacViewed(CFO);
    const after = useSettingsStore.getState().auditLog.length;
    expect(after).toBe(before + 1);
    expect(useSettingsStore.getState().auditLog[after - 1]?.kind).toBe('rbac-matrix-viewed');
  });

  it('logRbacExported emits rbac-matrix-exported event (L7)', () => {
    const before = useSettingsStore.getState().auditLog.length;
    useSettingsStore.getState().logRbacExported(ORG_ADMIN);
    const after = useSettingsStore.getState().auditLog.length;
    expect(after).toBe(before + 1);
    expect(useSettingsStore.getState().auditLog[after - 1]?.kind).toBe('rbac-matrix-exported');
  });
});

// ── disconnectIntegration ────────────────────────────────────────────────────

describe('disconnectIntegration', () => {
  beforeEach(resetStore);

  it('sets credential status to disconnected', () => {
    useSettingsStore.getState().disconnectIntegration('razorpay', ORG_ADMIN);
    expect(useSettingsStore.getState().credentials['razorpay']?.status).toBe('disconnected');
  });

  it('emits integration-disconnected audit event (L7)', () => {
    const before = useSettingsStore.getState().auditLog.length;
    useSettingsStore.getState().disconnectIntegration('razorpay', ORG_ADMIN);
    const after = useSettingsStore.getState().auditLog.length;
    expect(after).toBe(before + 1);
    expect(useSettingsStore.getState().auditLog[after - 1]?.kind).toBe('integration-disconnected');
  });

  it('throws for actor without R02 or R22 (L16)', () => {
    expect(() =>
      useSettingsStore.getState().disconnectIntegration('razorpay', SALES_EXEC),
    ).toThrow();
  });
});

// ── testConnection (async) ───────────────────────────────────────────────────

describe('testConnection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with ok: true after 800ms (L11)', async () => {
    const promise = useSettingsStore.getState().testConnection('whatsapp_bsp', CFO);
    vi.advanceTimersByTime(800);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('updates credential connectionTestedAt after test', async () => {
    const promise = useSettingsStore.getState().testConnection('whatsapp_bsp', ORG_ADMIN);
    vi.advanceTimersByTime(800);
    await promise;
    expect(
      useSettingsStore.getState().credentials['whatsapp_bsp']?.connectionTestedAt,
    ).toBeTruthy();
  });

  it('emits integration-test audit event (L7)', async () => {
    const before = useSettingsStore.getState().auditLog.length;
    const promise = useSettingsStore.getState().testConnection('whatsapp_bsp', ORG_ADMIN);
    vi.advanceTimersByTime(800);
    await promise;
    const after = useSettingsStore.getState().auditLog.length;
    expect(after).toBe(before + 1);
    expect(useSettingsStore.getState().auditLog[after - 1]?.kind).toBe('integration-test');
  });
});
