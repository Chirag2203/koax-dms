/**
 * v1 → v2.1 schema migration tests — SPEC-SHOOTS-002 L_AI-20
 *
 * Verifies that:
 *   - _seed strips deprecated fields (assetCount, videoCount, assetUrls) from v1 fixtures
 *   - v2 fields (assets, coverAssetId, aiVendor, aiPolicy) are populated with defaults
 *   - aiPolicy in v2.0 fixtures gets v2.1 fields (failureRate, failureSeed, maxRetries)
 *   - ShootAsset v2.1 fields (aiRetryCount, aiLastFailedAt, vendorJobId) default correctly
 *
 * Test placement: pure-logic → co-located under __tests__ (CLAUDE.md §10 #9)
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-20, §5 (schema), §14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useShootsStore } from '../shoots-store';

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useShootsStore.setState({
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
    auditEvents: [],
  });
});

// ─── v1 fixture migration ─────────────────────────────────────────────────────

const v1Fixture = {
  id: 'shoot-v1-migration-001',
  vin: 'MIGR1VIN000000001',
  photographerId: null,
  scheduledAt: null,
  completedAt: null,
  status: 'completed' as const,
  assetCount: 14,
  videoCount: 1,
  assetUrls: ['url1', 'url2', 'url3'],
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'staff-r10-001',
  notes: '',
  outletId: 'BLR-01' as const,
  // NO v2 fields
};

describe('L_AI-20 — _seed strips deprecated v1 fields', () => {
  it('assetUrls is removed after _seed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((seeded as any)?.assetUrls).toBeUndefined();
  });

  it('assetCount is removed after _seed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((seeded as any)?.assetCount).toBeUndefined();
  });

  it('videoCount is removed after _seed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((seeded as any)?.videoCount).toBeUndefined();
  });
});

describe('L_AI-20 — _seed populates v2 defaults for v1 fixtures', () => {
  it('assets defaults to []', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    expect(seeded?.assets).toEqual([]);
  });

  it('coverAssetId defaults to null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    expect(seeded?.coverAssetId).toBeNull();
  });

  it('aiVendor defaults to NONE for v1 fixtures', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    expect(seeded?.aiVendor).toBe('NONE');
  });

  it('aiPolicy is populated with all required fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v1Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v1Fixture.id];
    expect(seeded?.aiPolicy).toBeDefined();
    expect(typeof seeded?.aiPolicy.autoQueueOnUpload).toBe('boolean');
    expect(typeof seeded?.aiPolicy.autoApproveProcessed).toBe('boolean');
    expect(seeded?.aiPolicy.failureRate).toBeDefined();
    expect(seeded?.aiPolicy.failureSeed).toBeDefined();
    expect(seeded?.aiPolicy.maxRetries).toBeDefined();
  });
});

describe('L_AI-20 — v2.0 fixture gets v2.1 aiPolicy fields', () => {
  const v20Fixture = {
    id: 'shoot-v20-migration-001',
    vin: 'MIGR20VIN000000020',
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending' as const,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE' as const,
    aiPolicy: {
      // v2.0 shape — missing v2.1 fields
      autoQueueOnUpload: false,
      autoApproveProcessed: false,
    },
    createdAt: '2026-02-01T00:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'BLR-01' as const,
    vehicleMake: 'BMW',
    vehicleModel: 'X5',
    vehicleYear: 2023,
  };

  it('failureRate defaults to 10 when missing from aiPolicy', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v20Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v20Fixture.id];
    expect(seeded?.aiPolicy.failureRate).toBe(10);
  });

  it('failureSeed defaults to 0 when missing from aiPolicy', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v20Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v20Fixture.id];
    expect(seeded?.aiPolicy.failureSeed).toBe(0);
  });

  it('maxRetries defaults to 3 when missing from aiPolicy', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useShootsStore.getState()._seed([v20Fixture as any]);
    const seeded = useShootsStore.getState().shoots[v20Fixture.id];
    expect(seeded?.aiPolicy.maxRetries).toBe(3);
  });
});

describe('L_AI-20 — addRawAsset creates v2.1 asset fields', () => {
  const r11 = { id: 'user-r11', name: 'Marketing Manager', role: 'R11' as const };

  const TINY_PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  it('new asset has aiRetryCount=0', () => {
    const shoot = useShootsStore.getState().createShoot('WP0MIGR000000001', 'BLR-01', r11);
    const asset = useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'dashboard', r11);
    expect(asset.aiRetryCount).toBe(0);
  });

  it('new asset has aiLastFailedAt=null', () => {
    const shoot = useShootsStore.getState().createShoot('WP0MIGR000000002', 'BLR-01', r11);
    const asset = useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'rear_seats', r11);
    expect(asset.aiLastFailedAt).toBeNull();
  });

  it('new asset has vendorJobId=null', () => {
    const shoot = useShootsStore.getState().createShoot('WP0MIGR000000003', 'BLR-01', r11);
    const asset = useShootsStore.getState().addRawAsset(shoot.id, TINY_PNG, 'odometer', r11);
    expect(asset.vendorJobId).toBeNull();
  });
});
