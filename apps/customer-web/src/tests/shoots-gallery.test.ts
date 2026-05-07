/**
 * Customer-web VDP gallery test — SPEC-SHOOTS-002 T12 (customer-web scenarios)
 *
 * Verifies the customer-web gallery selector (L_AI-9, Seam 51) across all three
 * status values: ready / pending / unavailable.
 *
 * Test placement: cross-module integration → apps/customer-web/src/tests/ (CLAUDE.md §10 #9)
 *
 * Spec reference: SPEC-SHOOTS-002 SC-13, SC-14, SC-15, AC-10, L_AI-9, L_AI-12 (B2)
 *
 * CROSS-PROCESS LIMITATION (per spec §19.2 + PLAN-SHOOTS-AI-001 §1.10):
 *   In mock phase, customer-web runs a separate Zustand store instance from staff-web.
 *   These tests seed the customer-web store directly, simulating what the backend
 *   API would deliver to the customer surface in production.
 *   The selectStorefrontGalleryForVin interface is production-identical so the
 *   migration is a pure I/O swap when the real backend ships.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCustomerShootsStore,
} from '../lib/shoots/customer-shoots-store';
import type {
  CustomerShoot,
  CustomerShootAsset,
} from '../lib/shoots/customer-shoots-store';

// ─── Mock data ────────────────────────────────────────────────────────────────

const PROCESSED_URL_1 = 'data:image/jpeg;base64,/9j/cover==';
const PROCESSED_URL_2 = 'data:image/jpeg;base64,/9j/front==';
const PROCESSED_URL_3 = 'data:image/jpeg;base64,/9j/rear1==';
const PROCESSED_URL_4 = 'data:image/jpeg;base64,/9j/rear2==';
const PROCESSED_URL_5 = 'data:image/jpeg;base64,/9j/profil=';

/**
 * Build a minimal CustomerShootAsset.
 */
function makeAsset(overrides: Partial<CustomerShootAsset> & { id: string; kind: CustomerShootAsset['kind']; vin: string; shootId: string }): CustomerShootAsset {
  return {
    sortOrder: 1,
    processedUrl: PROCESSED_URL_1,
    approved: true,
    forceApprovedWithoutRedaction: false,
    ...overrides,
  };
}

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useCustomerShootsStore.setState({
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
  });
});

// ─── SC-13: Gallery ready when shoot has cover + ≥4 approved exterior kinds ──

describe('SC-13: gallery status ready', () => {
  it('SC-13-1: returns status=ready with cover URL and gallery array', () => {
    const vin = 'GALLERY13VIN000001';
    const shootId = 'shoot-sc13-01';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: PROCESSED_URL_5 }),
    ];

    const shoot: CustomerShoot = {
      id: shootId,
      vin,
      coverAssetId: 'a1',
      assets,
    };

    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    expect(result.status).toBe('ready');
    expect(result.coverUrl).toBe(PROCESSED_URL_1);
    expect(result.gallery).toHaveLength(5);
  });

  it('SC-13-2: gallery items are sorted by sortOrder ascending', () => {
    const vin = 'GALLERY13VIN000002';
    const shootId = 'shoot-sc13-02';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a2', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a3', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: PROCESSED_URL_5 }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: 'a2', assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    expect(result.status).toBe('ready');
    const sortOrders = result.gallery.map((g) => g.sortOrder);
    expect(sortOrders).toEqual([1, 2, 3, 4, 5]);
  });

  it('SC-13-3: falls back to first approved exterior as cover if coverAssetId not set', () => {
    const vin = 'GALLERY13VIN000003';
    const shootId = 'shoot-sc13-03';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: PROCESSED_URL_5 }),
    ];

    // No coverAssetId set
    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: null, assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    // Should still be ready with fallback cover
    expect(result.status).toBe('ready');
    expect(result.coverUrl).toBe(PROCESSED_URL_1); // first exterior by sortOrder
  });
});

// ─── SC-14: Gallery pending when shoot exists but threshold not met ───────────

describe('SC-14: gallery status pending', () => {
  it('SC-14-1: returns status=pending when shoot has fewer than 4 approved exterior kinds', () => {
    const vin = 'GALLERY14VIN000001';
    const shootId = 'shoot-sc14-01';

    // Only 3 approved exterior assets (below the ≥4 threshold)
    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: 'a1', assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    expect(result.status).toBe('pending');
  });

  it('SC-14-2: returns status=pending when shoot exists but has no approved assets', () => {
    const vin = 'GALLERY14VIN000002';
    const shootId = 'shoot-sc14-02';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1, approved: false }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2, approved: false }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: null, assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    expect(result.status).toBe('pending');
    expect(result.coverUrl).toBeNull();
    expect(result.gallery).toHaveLength(0);
  });

  it('SC-14-3: returns status=pending when ≥4 exteriors but no cover set and no exterior fallback found', () => {
    // Edge: 4 approved interior-only assets → exterior count = 0 → pending
    const vin = 'GALLERY14VIN000003';
    const shootId = 'shoot-sc14-03';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'dashboard', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'rear_seats', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'odometer', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'engine_bay', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
    ];

    // coverAssetId is null, no exterior kinds
    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: null, assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    // 4 approved assets, but 0 exterior kinds → not ready (threshold requires exterior)
    expect(result.status).toBe('pending');
  });
});

// ─── SC-15: Gallery unavailable when no shoot exists for VIN ─────────────────

describe('SC-15: gallery status unavailable', () => {
  it('SC-15-1: returns status=unavailable when no shoot seeded for VIN', () => {
    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin('NOTSEEDEDVIN');

    expect(result.status).toBe('unavailable');
    expect(result.coverUrl).toBeNull();
    expect(result.gallery).toHaveLength(0);
  });

  it('SC-15-2: returns same EMPTY_GALLERY_ITEMS reference on repeated unavailable calls (stable ref)', () => {
    const r1 = useCustomerShootsStore.getState().selectStorefrontGalleryForVin('VIN-A');
    const r2 = useCustomerShootsStore.getState().selectStorefrontGalleryForVin('VIN-B');

    // Both should return empty arrays — confirm they are the same stable reference (CLAUDE.md §17.1)
    expect(r1.gallery).toBe(r2.gallery);
  });
});

// ─── AC-10: B2 security — rawUrl never exposed; force-approved excluded ────────

describe('AC-10: B2 storefront security exclusions', () => {
  it('AC-10-1: force-approved assets are excluded from gallery (B2)', () => {
    const vin = 'AC10VIN00000000001';
    const shootId = 'shoot-ac10-01';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      // This one is force-approved — must be excluded (B2)
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: PROCESSED_URL_5, forceApprovedWithoutRedaction: true }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: 'a1', assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    // Force-approved asset (a5) excluded
    const urls = result.gallery.map((g) => g.url);
    expect(urls).not.toContain(PROCESSED_URL_5);
    // Only 4 assets in gallery (a5 excluded)
    expect(result.gallery).toHaveLength(4);
  });

  it('AC-10-2: assets with null processedUrl are excluded (rawUrl never exposed)', () => {
    const vin = 'AC10VIN00000000002';
    const shootId = 'shoot-ac10-02';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      // This one has no processedUrl — must be excluded even though approved
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: null }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: 'a1', assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    // a5 excluded — null processedUrl never exposed (L_AI-12)
    expect(result.gallery).toHaveLength(4);
    const hasNull = result.gallery.some((g) => g.url === null || g.url === undefined);
    expect(hasNull).toBe(false);
  });

  it('AC-10-3: video_walkaround excluded from gallery[] (cover-eligible only per L_AI-9)', () => {
    const vin = 'AC10VIN00000000003';
    const shootId = 'shoot-ac10-03';

    const assets: CustomerShootAsset[] = [
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: PROCESSED_URL_5 }),
      // video_walkaround: excluded from gallery per L_AI-9
      makeAsset({ id: 'a6', kind: 'video_walkaround', vin, shootId, sortOrder: 6, processedUrl: 'data:video/mp4;base64,===' }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: 'a1', assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    // video_walkaround excluded from gallery (L_AI-9)
    const videoItem = result.gallery.find((g) => g.kind === 'video_walkaround');
    expect(videoItem).toBeUndefined();
    // Only 5 items (a6 excluded)
    expect(result.gallery).toHaveLength(5);
  });

  it('AC-10-4: all B2 exclusions combined — gallery returns only clean eligible assets', () => {
    const vin = 'AC10VIN00000000004';
    const shootId = 'shoot-ac10-04';

    const assets: CustomerShootAsset[] = [
      // Valid assets
      makeAsset({ id: 'a1', kind: 'front_3q_driver', vin, shootId, sortOrder: 1, processedUrl: PROCESSED_URL_1 }),
      makeAsset({ id: 'a2', kind: 'front_3q_passenger', vin, shootId, sortOrder: 2, processedUrl: PROCESSED_URL_2 }),
      makeAsset({ id: 'a3', kind: 'rear_3q_driver', vin, shootId, sortOrder: 3, processedUrl: PROCESSED_URL_3 }),
      makeAsset({ id: 'a4', kind: 'rear_3q_passenger', vin, shootId, sortOrder: 4, processedUrl: PROCESSED_URL_4 }),
      // Force-approved (excluded)
      makeAsset({ id: 'a5', kind: 'driver_profile', vin, shootId, sortOrder: 5, processedUrl: PROCESSED_URL_5, forceApprovedWithoutRedaction: true }),
      // Null processedUrl (excluded)
      makeAsset({ id: 'a6', kind: 'passenger_profile', vin, shootId, sortOrder: 6, processedUrl: null }),
      // video_walkaround (excluded)
      makeAsset({ id: 'a7', kind: 'video_walkaround', vin, shootId, sortOrder: 7, processedUrl: 'data:video/mp4;base64,===' }),
      // Not approved (excluded)
      makeAsset({ id: 'a8', kind: 'front_straight', vin, shootId, sortOrder: 8, processedUrl: PROCESSED_URL_1, approved: false }),
    ];

    const shoot: CustomerShoot = { id: shootId, vin, coverAssetId: 'a1', assets };
    useCustomerShootsStore.getState()._seed([shoot]);

    const result = useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vin);

    // Only a1–a4 pass all B2 filters
    expect(result.gallery).toHaveLength(4);
    const ids = result.gallery.map((g) => g.url);
    expect(ids).toContain(PROCESSED_URL_1);
    expect(ids).toContain(PROCESSED_URL_2);
    expect(ids).toContain(PROCESSED_URL_3);
    expect(ids).toContain(PROCESSED_URL_4);
  });
});

// ─── Seam 51: read-only contract ─────────────────────────────────────────────

describe('Seam 51: customer-web store is READ-ONLY (no write actions)', () => {
  it('Seam51-1: store has no addRawAsset action', () => {
    const store = useCustomerShootsStore.getState();
    // @ts-expect-error — verifying that addRawAsset is absent from the store
    expect(store.addRawAsset).toBeUndefined();
  });

  it('Seam51-2: store has no approveAsset action', () => {
    const store = useCustomerShootsStore.getState();
    // @ts-expect-error — verifying that approveAsset is absent from the store
    expect(store.approveAsset).toBeUndefined();
  });

  it('Seam51-3: store has no redactLicensePlate action', () => {
    const store = useCustomerShootsStore.getState();
    // @ts-expect-error — verifying that redactLicensePlate is absent from the store
    expect(store.redactLicensePlate).toBeUndefined();
  });

  it('Seam51-4: _seed is available for hydration but no user-facing write actions', () => {
    const store = useCustomerShootsStore.getState();
    // _seed is the only write — for MSW/SSR hydration
    expect(typeof store._seed).toBe('function');
    expect(typeof store.selectStorefrontGalleryForVin).toBe('function');
    expect(typeof store.getShootByVin).toBe('function');
  });
});
