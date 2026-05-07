/**
 * Shoots module tests — SPEC-SHOOTS-001 §7 (Scenarios)
 *
 * Migrated to v2.1: assetCount/videoCount/assetUrls removed (L_AI-20).
 * Tests now use assets[] for coverage checks (v2 11-slot guard).
 *
 * Covers:
 *   - SC-01: Auto-create shoot on ACQUIRED (Seam 39)
 *   - SC-02: LISTED guard blocked when shoot incomplete (v2 slot guard)
 *   - SC-03: LISTED guard passes when shoot has all required approved slots
 *   - SC-04: Photographer assignment gated to R11+
 *   - SC-05: Photographer assignment succeeds for R11
 *   - SC-06: Shoot completion blocked with insufficient approved slots
 *   - SC-07: Shoot completion succeeds with all required approved slots
 *   - SC-08: Idempotent auto-create — second createShoot skips
 *   - SC-09: addMockAsset (deprecated v1 API) still advances status to in-progress
 *   - SC-10: No shoot for VIN — LISTED guard is skipped
 *   - SC-11: selectByStatus filters correctly
 *   - SC-12: getShootByVin returns correct shoot
 *   - SC-13: scheduleShoot advances status to scheduled
 *   - SC-14: startShoot advances status to in-progress
 *
 * Spec reference: SPEC-SHOOTS-001 §7 + SPEC-SHOOTS-002 L_AI-20
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useShootsStore, InsufficientRoleError } from '@/src/lib/shoots/shoots-store';
import { assertShootComplete } from '@/src/lib/shoots/shoots-listed-guard';
import {
  ShootIncompleteError,
  ShootNotFoundError,
  ShootSlotIncompleteError,
} from '@dms/types';
import type { Shoot, ShootAsset } from '@dms/types';
import { getRequiredSlots } from '@/src/lib/shoots/asset-slot-definitions';

// ─── Test actor helpers ───────────────────────────────────────────────────────

const actorR09 = { id: 'staff-r09-001', name: 'Sales Exec', role: 'R09' };
const actorR11 = { id: 'staff-r11-001', name: 'Marketing Mgr', role: 'R11' };
const actorR10 = { id: 'staff-r10-001', name: 'Sales Mgr', role: 'R10' };
const actorR19 = { id: 'staff-r19-001', name: 'GM', role: 'R19' };

// ─── Store reset helper ───────────────────────────────────────────────────────

function resetStore() {
  useShootsStore.setState({
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
    auditEvents: [],
  });
}

// ─── Minimal approved asset factory ──────────────────────────────────────────

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function makeApprovedAsset(
  shootId: string,
  vin: string,
  kind: ShootAsset['kind'],
  idx: number,
  lpRedacted = false,
): ShootAsset {
  return {
    id: `${shootId}-asset-${kind}`,
    shootId,
    vin,
    kind,
    sortOrder: idx,
    rawUrl: TINY_PNG,
    processedUrl: TINY_PNG,
    approved: true,
    approvedAt: '2026-04-15T10:00:00.000Z',
    approvedBy: 'staff-r11-001',
    lpRedacted,
    redactedAt: lpRedacted ? '2026-04-15T09:30:00.000Z' : null,
    redactedBy: lpRedacted ? 'staff-r11-001' : null,
    aiStatus: 'manual-only',
    aiRequestedAt: null,
    aiCompletedAt: null,
    aiErrorMessage: null,
    aiRetryCount: 0,
    aiLastFailedAt: null,
    vendorJobId: null,
    capturedAt: '2026-04-15T08:00:00.000Z',
    capturedBy: 'staff-r11-001',
    s3Key: null,
    forceApprovedWithoutRedaction: false,
    forceApprovedReason: null,
    forceApprovedBy: null,
    forceApprovedAt: null,
  };
}

/** Build all 11 required approved assets for a shoot. */
function buildAllRequiredApprovedAssets(shootId: string, vin: string): ShootAsset[] {
  const required = getRequiredSlots().map((s) => s.kind);
  const exteriorKinds = new Set([
    'front_3q_driver', 'front_3q_passenger', 'rear_3q_driver', 'rear_3q_passenger',
    'driver_profile', 'passenger_profile', 'front_straight', 'rear_straight', 'video_walkaround',
  ]);
  return required.map((kind, idx) =>
    makeApprovedAsset(shootId, vin, kind, idx, exteriorKinds.has(kind)),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Shoots store — SPEC-SHOOTS-001 + L_AI-20 migration', () => {
  beforeEach(() => {
    resetStore();
  });

  // SC-01: Auto-create shoot on ACQUIRED (Seam 39)
  it('SC-01: createShoot auto-creates a pending shoot for a VIN', () => {
    const store = useShootsStore.getState();

    const shoot = store.createShoot('VIN1234567890ABCDE', 'BLR-01', actorR10, {
      vehicleMake: 'BMW',
      vehicleModel: 'M3',
      vehicleYear: 2022,
    });

    expect(shoot.vin).toBe('VIN1234567890ABCDE');
    expect(shoot.status).toBe('pending');
    // L_AI-20: deprecated fields are no longer present
    expect((shoot as unknown as Record<string, unknown>).assetCount).toBeUndefined();
    expect((shoot as unknown as Record<string, unknown>).videoCount).toBeUndefined();
    expect((shoot as unknown as Record<string, unknown>).assetUrls).toBeUndefined();
    expect(shoot.assets).toHaveLength(0);
    expect(shoot.photographerId).toBeNull();
    expect(shoot.vehicleMake).toBe('BMW');
    expect(shoot.vehicleModel).toBe('M3');
    expect(shoot.vehicleYear).toBe(2022);
    expect(shoot.createdBy).toBe(actorR10.id);
  });

  // SC-02: LISTED guard blocked when shoot incomplete (v2 11-slot guard)
  it('SC-02: assertShootComplete throws ShootSlotIncompleteError when slots missing', () => {
    const store = useShootsStore.getState();

    // Create shoot — no approved assets yet
    const shoot = store.createShoot('WBA1234567890DEFG', 'BLR-01', actorR10);

    // Seed partial approved assets (missing many required kinds)
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assets = [
          makeApprovedAsset(shoot.id, 'WBA1234567890DEFG', 'front_3q_driver', 0, true),
          makeApprovedAsset(shoot.id, 'WBA1234567890DEFG', 'front_3q_passenger', 1, true),
        ];
      }
    });

    // Guard throws ShootSlotIncompleteError (v2.1 — not ShootIncompleteError)
    expect(() => assertShootComplete('WBA1234567890DEFG')).toThrow(ShootSlotIncompleteError);
  });

  // SC-02 (v1 back-compat): ShootIncompleteError still instantiable as @deprecated
  it('SC-02b: ShootIncompleteError is still instantiable (deprecated back-compat)', () => {
    const err = new ShootIncompleteError('TESTVIN000000001A', 5, 0);
    expect(err.vin).toBe('TESTVIN000000001A');
    expect(err.assetCount).toBe(5);
    expect(err.videoCount).toBe(0);
    expect(err.message).toContain('TESTVIN000000001A');
  });

  // SC-03: LISTED guard passes when all required approved slots present
  it('SC-03: assertShootComplete does NOT throw when all required slots have approved assets', () => {
    const store = useShootsStore.getState();

    const shoot = store.createShoot('WP01234567890ABCD', 'MUM-01', actorR10);
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assets = buildAllRequiredApprovedAssets(shoot.id, 'WP01234567890ABCD');
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
      }
    });

    // Should NOT throw
    expect(() => assertShootComplete('WP01234567890ABCD')).not.toThrow();
  });

  // SC-04: Photographer assignment gated to R11
  it('SC-04: assignPhotographer throws InsufficientRoleError for non-R11 actors', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WDD1234567890ABCD', 'BLR-01', actorR10);

    expect(() => store.assignPhotographer(shoot.id, 'staff-r11-001', actorR09)).toThrow(
      InsufficientRoleError,
    );
  });

  // SC-05: Photographer assignment succeeds for R11
  it('SC-05: assignPhotographer succeeds for R11 actor', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WDC1234567890EFGH', 'CHE-01', actorR10);

    store.assignPhotographer(shoot.id, 'staff-r11-001', actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.photographerId).toBe('staff-r11-001');
  });

  // SC-05 (extended): R19 can also assign photographer
  it('SC-05b: assignPhotographer succeeds for R19 (GM) actor', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WBA5678901234ABCD', 'BLR-01', actorR10);

    store.assignPhotographer(shoot.id, 'staff-r11-001', actorR19);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.photographerId).toBe('staff-r11-001');
  });

  // SC-06: Shoot completion blocked with insufficient approved slots
  it('SC-06: completeShoot throws ShootSlotIncompleteError when required kinds missing', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WP0ABCDEF12345678', 'BLR-01', actorR10);

    // Set status to in-progress but no approved assets
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.status = 'in-progress';
      }
    });

    // completeShoot now uses assertShootComplete v2 — throws ShootSlotIncompleteError
    expect(() => store.completeShoot(shoot.id, actorR11)).toThrow(ShootSlotIncompleteError);
  });

  // SC-07: Shoot completion succeeds with all required approved slots
  it('SC-07: completeShoot succeeds when all required slots have approved assets', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WBSABCDEF12345678', 'MUM-01', actorR10);

    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assets = buildAllRequiredApprovedAssets(shoot.id, 'WBSABCDEF12345678');
        s.status = 'in-progress';
      }
    });

    store.completeShoot(shoot.id, actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.status).toBe('completed');
    expect(updated?.completedAt).toBeTruthy();
  });

  // SC-08: Idempotent auto-create
  it('SC-08: createShoot is idempotent — second call returns existing non-completed shoot', () => {
    const store = useShootsStore.getState();

    const first = store.createShoot('WDD9876543210ABCD', 'BLR-01', actorR10);
    const second = store.createShoot('WDD9876543210ABCD', 'BLR-01', actorR10);

    expect(second.id).toBe(first.id);
    expect(
      Object.values(useShootsStore.getState().shoots).filter(
        (s) => s.vin === 'WDD9876543210ABCD',
      ).length,
    ).toBe(1);
  });

  // SC-09: addMockAsset (deprecated v1 API) — advances status but no longer updates removed fields
  it('SC-09: addMockAsset (deprecated) advances status to in-progress', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WBA0000000000ABCD', 'BLR-01', actorR10);

    store.addMockAsset(shoot.id, 'photo', actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.status).toBe('in-progress'); // still advances status
    // L_AI-20: deprecated fields no longer exist in the schema
    expect((updated as unknown as Record<string, unknown>).assetCount).toBeUndefined();
    expect((updated as unknown as Record<string, unknown>).assetUrls).toBeUndefined();
  });

  // SC-09b: Video asset variant
  it('SC-09b: addMockAsset for video (deprecated) advances status to in-progress', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WDC0000000000ABCD', 'MUM-01', actorR10);

    store.addMockAsset(shoot.id, 'video', actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.status).toBe('in-progress');
    expect((updated as unknown as Record<string, unknown>).videoCount).toBeUndefined();
  });

  // SC-10: No shoot for VIN — LISTED guard skipped
  it('SC-10: assertShootComplete is silent (no throw) when no shoot exists for the VIN', () => {
    // No shoot created for this VIN
    expect(() => assertShootComplete('NOSHOT1234567890A')).not.toThrow();
  });

  // SC-11: selectByStatus
  it('SC-11: selectByStatus returns only shoots with the given status', () => {
    const store = useShootsStore.getState();

    store.createShoot('VINPENDING00000001', 'BLR-01', actorR10);
    store.createShoot('VINPENDING00000002', 'MUM-01', actorR10);

    const completedShoot = store.createShoot('VINCOMPLETE0000001', 'CHE-01', actorR10);
    useShootsStore.setState((state) => {
      const s = state.shoots[completedShoot.id];
      if (s) {
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
      }
    });

    const pending = useShootsStore.getState().selectByStatus('pending');
    const completed = useShootsStore.getState().selectByStatus('completed');

    expect(pending.length).toBeGreaterThanOrEqual(2);
    expect(completed.length).toBeGreaterThanOrEqual(1);

    const pendingVins = pending.map((s) => s.vin);
    expect(pendingVins).toContain('VINPENDING00000001');
    expect(pendingVins).toContain('VINPENDING00000002');
    expect(pendingVins).not.toContain('VINCOMPLETE0000001');
  });

  // SC-12: getShootByVin
  it('SC-12: getShootByVin returns the shoot for a VIN', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WBAGETBYVIN000001', 'BLR-01', actorR10);

    const found = useShootsStore.getState().getShootByVin('WBAGETBYVIN000001');
    expect(found?.id).toBe(shoot.id);
    expect(found?.vin).toBe('WBAGETBYVIN000001');
  });

  // SC-13: scheduleShoot
  it('SC-13: scheduleShoot sets scheduledAt and advances status to scheduled', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WDCSCHEDULE000001', 'CHE-01', actorR10);

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    store.scheduleShoot(shoot.id, futureDate, actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.scheduledAt).toBe(futureDate);
    expect(updated?.status).toBe('scheduled');
  });

  // SC-14: startShoot
  it('SC-14: startShoot advances status to in-progress from pending', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WP0STARTSHOOT0001', 'BLR-01', actorR10);

    store.startShoot(shoot.id, actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.status).toBe('in-progress');
  });

  // Additional: ShootNotFoundError
  it('ShootNotFoundError is thrown for unknown shoot ID', () => {
    const store = useShootsStore.getState();

    expect(() => store.assignPhotographer('nonexistent-id', 'staff-r11-001', actorR11)).toThrow(
      ShootNotFoundError,
    );
  });

  // Additional: _seed hydrates shoots and strips deprecated fields
  it('_seed hydrates shoots and strips deprecated fields (L_AI-20)', () => {
    const store = useShootsStore.getState();

    // Simulate a v1 fixture that still has deprecated keys
    const v1Fixture = {
      id: 'shoot-fixture-001',
      vin: 'WBAFIXTURE0000001',
      photographerId: null,
      scheduledAt: null,
      completedAt: null,
      status: 'pending' as const,
      // Deprecated v1 fields — _seed should strip these
      assetCount: 5,
      videoCount: 0,
      assetUrls: ['https://cdn.bn.example/shoots/VIN/1.jpg'],
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'staff-r10-001',
      notes: '',
      outletId: 'BLR-01' as const,
      assets: [],
      coverAssetId: null,
      aiVendor: 'NONE' as const,
      aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
    };

    store._seed([v1Fixture as unknown as Shoot]);

    expect(useShootsStore.getState().hydrated).toBe(true);
    const seeded = useShootsStore.getState().shoots['shoot-fixture-001'];
    expect(seeded).toBeDefined();
    expect(useShootsStore.getState().shootIdByVin['WBAFIXTURE0000001']).toBe('shoot-fixture-001');
    // Deprecated fields should be stripped
    const serialized = JSON.stringify(seeded);
    expect(serialized).not.toContain('assetCount');
    expect(serialized).not.toContain('videoCount');
    expect(serialized).not.toContain('assetUrls');
  });
});
