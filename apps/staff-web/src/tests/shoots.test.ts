/**
 * Shoots module tests — SPEC-SHOOTS-001 §7 (Scenarios)
 *
 * Covers:
 *   - SC-01: Auto-create shoot on ACQUIRED (Seam 39)
 *   - SC-02: LISTED guard blocked when shoot incomplete (Seam 40)
 *   - SC-03: LISTED guard passes when shoot complete
 *   - SC-04: Photographer assignment gated to R11+
 *   - SC-05: Photographer assignment succeeds for R11
 *   - SC-06: Shoot completion blocked with insufficient assets
 *   - SC-07: Shoot completion succeeds with ≥10 photos + ≥1 video
 *   - SC-08: Idempotent auto-create — second createShoot skips
 *   - SC-09: Mock asset add increments counters and appends URL
 *   - SC-10: No shoot for VIN — LISTED guard is skipped
 *   - SC-11: selectByStatus filters correctly
 *   - SC-12: getShootByVin returns correct shoot
 *   - SC-13: scheduleShoot advances status to scheduled
 *   - SC-14: startShoot advances status to in-progress
 *
 * Spec reference: SPEC-SHOOTS-001 §7 (Scenarios)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useShootsStore, SHOOT_REQUIRED_PHOTOS, SHOOT_REQUIRED_VIDEOS, InsufficientRoleError } from '@/src/lib/shoots/shoots-store';
import { assertShootComplete } from '@/src/lib/shoots/shoots-listed-guard';
import { ShootIncompleteError, ShootNotFoundError } from '@dms/types';
import type { Shoot } from '@dms/types';

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
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Shoots store — SPEC-SHOOTS-001', () => {
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
    expect(shoot.assetCount).toBe(0);
    expect(shoot.videoCount).toBe(0);
    expect(shoot.assetUrls).toHaveLength(0);
    expect(shoot.photographerId).toBeNull();
    expect(shoot.vehicleMake).toBe('BMW');
    expect(shoot.vehicleModel).toBe('M3');
    expect(shoot.vehicleYear).toBe(2022);
    expect(shoot.createdBy).toBe(actorR10.id);
  });

  // SC-02: LISTED guard blocked when shoot incomplete (Seam 40)
  it('SC-02: assertShootComplete throws ShootIncompleteError when assets insufficient', () => {
    const store = useShootsStore.getState();

    // Create shoot with 5 photos and 0 videos
    const shoot = store.createShoot('WBA1234567890DEFG', 'BLR-01', actorR10);
    // Seed 5 photos manually
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assetCount = 5;
        s.assetUrls = Array.from({ length: 5 }, (_, i) => `https://cdn.bn.example/shoots/WBA1234567890DEFG/${i + 1}.jpg`);
      }
    });

    expect(() => assertShootComplete('WBA1234567890DEFG')).toThrow(ShootIncompleteError);
  });

  // SC-03: LISTED guard passes when shoot complete
  it('SC-03: assertShootComplete does NOT throw when shoot has ≥10 photos + ≥1 video', () => {
    const store = useShootsStore.getState();

    const shoot = store.createShoot('WP01234567890ABCD', 'MUM-01', actorR10);
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assetCount = 12;
        s.videoCount = 1;
        s.assetUrls = Array.from({ length: 12 }, (_, i) => `https://cdn.bn.example/shoots/WP01234567890ABCD/${i + 1}.jpg`);
        s.assetUrls.push('https://cdn.bn.example/shoots/WP01234567890ABCD/video-1.mp4');
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

  // SC-06: Shoot completion blocked with insufficient assets
  it('SC-06: completeShoot throws ShootIncompleteError when assetCount < 10 or videoCount < 1', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WP0ABCDEF12345678', 'BLR-01', actorR10);

    // 8 photos, 0 videos
    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assetCount = 8;
        s.status = 'in-progress';
      }
    });

    expect(() => store.completeShoot(shoot.id, actorR11)).toThrow(ShootIncompleteError);
  });

  // SC-07: Shoot completion succeeds with ≥10 photos + ≥1 video
  it('SC-07: completeShoot succeeds with ≥10 photos and ≥1 video', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WBSABCDEF12345678', 'MUM-01', actorR10);

    useShootsStore.setState((state) => {
      const s = state.shoots[shoot.id];
      if (s) {
        s.assetCount = SHOOT_REQUIRED_PHOTOS;
        s.videoCount = SHOOT_REQUIRED_VIDEOS;
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

  // SC-09: Mock asset add increments counters and appends URL
  it('SC-09: addMockAsset increments assetCount and appends L4 CDN URL', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WBA0000000000ABCD', 'BLR-01', actorR10);

    store.addMockAsset(shoot.id, 'photo', actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.assetCount).toBe(1);
    expect(updated?.assetUrls).toHaveLength(1);
    expect(updated?.assetUrls[0]).toMatch(/^https:\/\/cdn\.bn\.example\/shoots\/WBA0000000000ABCD\/\d+\.jpg$/);
    expect(updated?.status).toBe('in-progress'); // auto-advance
  });

  // SC-09b: Video asset
  it('SC-09b: addMockAsset for video increments videoCount and appends video URL', () => {
    const store = useShootsStore.getState();
    const shoot = store.createShoot('WDC0000000000ABCD', 'MUM-01', actorR10);

    store.addMockAsset(shoot.id, 'video', actorR11);

    const updated = useShootsStore.getState().shoots[shoot.id];
    expect(updated?.videoCount).toBe(1);
    expect(updated?.assetUrls[0]).toContain('video-');
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
        s.assetCount = 10;
        s.videoCount = 1;
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

  // Additional: ShootIncompleteError has correct fields
  it('ShootIncompleteError exposes vin/assetCount/videoCount', () => {
    const err = new ShootIncompleteError('TESTVIN000000001A', 5, 0);
    expect(err.vin).toBe('TESTVIN000000001A');
    expect(err.assetCount).toBe(5);
    expect(err.videoCount).toBe(0);
    expect(err.requiredPhotos).toBe(SHOOT_REQUIRED_PHOTOS);
    expect(err.requiredVideos).toBe(SHOOT_REQUIRED_VIDEOS);
    expect(err.message).toContain('TESTVIN000000001A');
  });

  // Additional: ShootNotFoundError
  it('ShootNotFoundError is thrown for unknown shoot ID', () => {
    const store = useShootsStore.getState();

    expect(() => store.assignPhotographer('nonexistent-id', 'staff-r11-001', actorR11)).toThrow(
      ShootNotFoundError,
    );
  });

  // Additional: _seed hydrates shoots
  it('_seed hydrates shoots and marks store as hydrated', () => {
    const store = useShootsStore.getState();

    const fixtureShoot: Shoot = {
      id: 'shoot-fixture-001',
      vin: 'WBAFIXTURE0000001',
      photographerId: null,
      scheduledAt: null,
      completedAt: null,
      status: 'pending',
      assetCount: 0,
      videoCount: 0,
      assetUrls: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      createdBy: 'staff-r10-001',
      notes: '',
      outletId: 'BLR-01',
      // v2 migration fields (L_AI-1 — SPEC-SHOOTS-002)
      assets: [],
      coverAssetId: null,
      aiVendor: 'NONE',
      aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false },
    };

    store._seed([fixtureShoot]);

    expect(useShootsStore.getState().hydrated).toBe(true);
    expect(useShootsStore.getState().shoots['shoot-fixture-001']).toBeDefined();
    expect(useShootsStore.getState().shootIdByVin['WBAFIXTURE0000001']).toBe('shoot-fixture-001');
  });
});
