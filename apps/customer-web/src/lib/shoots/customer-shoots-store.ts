'use client';

/**
 * Customer-web shoots store — SPEC-SHOOTS-002 T10 (Seam 51)
 *
 * v1 mock-phase: per-process Zustand.
 *
 * CROSS-PROCESS LIMITATION (documented per spec §19.2 + PLAN-SHOOTS-AI-001 §1.10):
 *   In this mock phase, customer-web and staff-web are SEPARATE Next.js processes
 *   with separate Zustand store instances. A staff-side cover change in browser tab A
 *   is NOT visible to customer-web in browser tab B until manual page reload.
 *
 *   Production swap: staff and customer surfaces will call the same backend API
 *   which serves the selectStorefrontGalleryForVin contract from a shared database.
 *   The interface of this store is intentionally identical to the staff-web
 *   selectStorefrontGalleryForVin selector so the migration is a pure I/O swap.
 *   Reference: PLAN-SHOOTS-AI-001 §1.10 (L_AI-9); portal-consent-bridge commit c22fbd0.
 *
 * Seam 51: READ-ONLY from this surface. No write actions. (L_AI-11)
 *
 * B2 (security review #2): The storefront selector excludes:
 *   - assets where forceApprovedWithoutRedaction === true
 *   - assets where processedUrl is null (rawUrl is NEVER exposed)
 *   - video_walkaround from gallery[] (cover-eligible only)
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-9, L_AI-11, T10, §19.2
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ShootAssetKind } from '@dms/types';

// ─── Types (mirrors staff-web StorefrontGallery) ──────────────────────────────

export interface CustomerStorefrontGalleryItem {
  url: string;
  sortOrder: number;
  kind: ShootAssetKind;
  alt: string;
}

export interface CustomerStorefrontGallery {
  coverUrl: string | null;
  gallery: CustomerStorefrontGalleryItem[];
  status: 'ready' | 'pending' | 'unavailable';
}

// ─── Shoot asset shape (minimal — only fields needed for gallery rendering) ───

export interface CustomerShootAsset {
  id: string;
  shootId: string;
  vin: string;
  kind: ShootAssetKind;
  sortOrder: number;
  processedUrl: string | null; // NEVER expose rawUrl (L_AI-9, L_AI-12)
  approved: boolean;
  forceApprovedWithoutRedaction: boolean;
}

export interface CustomerShoot {
  id: string;
  vin: string;
  coverAssetId: string | null;
  assets: CustomerShootAsset[];
}

// ─── EXTERIOR_LP_REQUIRED_KINDS (mirrors @dms/types constant) ────────────────

const EXTERIOR_LP_REQUIRED_KINDS: CustomerShootAsset['kind'][] = [
  'front_3q_driver',
  'front_3q_passenger',
  'rear_3q_driver',
  'rear_3q_passenger',
  'driver_profile',
  'passenger_profile',
  'front_straight',
  'rear_straight',
  'video_walkaround',
];

// ─── EMPTY fallbacks (CLAUDE.md §17.1 zustand rule) ──────────────────────────

const EMPTY_GALLERY_ITEMS: CustomerStorefrontGalleryItem[] = [];

// ─── State + Actions ──────────────────────────────────────────────────────────

interface CustomerShootsState {
  /** Keyed by shoot id */
  shoots: Record<string, CustomerShoot>;
  /** Latest shoot id per VIN */
  shootIdByVin: Record<string, string>;
  hydrated: boolean;
}

interface CustomerShootsActions {
  /** Seed from MSW handler / SSR hydration */
  _seed(shoots: CustomerShoot[]): void;

  /**
   * Storefront gallery selector (L_AI-9, Seam 51).
   *
   * Returns { coverUrl, gallery[], status } for the VDP.
   * - 'ready': shoot has coverAssetId + ≥4 approved exterior kinds.
   * - 'pending': shoot exists but threshold not met → "Gallery being prepared".
   * - 'unavailable': no shoot for VIN → hide gallery entirely.
   *
   * B2: reads processedUrl ONLY; excludes forceApprovedWithoutRedaction assets;
   * excludes video_walkaround from gallery (cover-eligible only).
   */
  selectStorefrontGalleryForVin(vin: string): CustomerStorefrontGallery;

  /** Get the shoot for a VIN, or null */
  getShootByVin(vin: string): CustomerShoot | null;
}

export type CustomerShootsStore = CustomerShootsState & CustomerShootsActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCustomerShootsStore = create<CustomerShootsStore>()(
  immer((set, get) => ({
    shoots: {},
    shootIdByVin: {},
    hydrated: false,

    _seed(shootsList) {
      set((state) => {
        for (const shoot of shootsList) {
          state.shoots[shoot.id] = shoot;
          // Track latest per VIN
          const existing = state.shootIdByVin[shoot.vin];
          if (!existing) {
            state.shootIdByVin[shoot.vin] = shoot.id;
          }
        }
        state.hydrated = true;
      });
    },

    getShootByVin(vin) {
      const id = get().shootIdByVin[vin];
      if (!id) return null;
      return get().shoots[id] ?? null;
    },

    selectStorefrontGalleryForVin(vin) {
      const shoot = get().getShootByVin(vin);
      if (!shoot) {
        return { coverUrl: null, gallery: EMPTY_GALLERY_ITEMS, status: 'unavailable' };
      }

      // B2 (security review #2): processedUrl ONLY; exclude force-approved-unredacted
      // Exclude video_walkaround from gallery[] (cover-eligible only per L_AI-9)
      const eligibleAssets = shoot.assets.filter(
        (a) =>
          a.approved &&
          a.forceApprovedWithoutRedaction === false &&
          a.processedUrl !== null &&
          a.kind !== 'video_walkaround',
      );

      // Cover URL
      let coverUrl: string | null = null;
      if (shoot.coverAssetId) {
        const coverAsset = shoot.assets.find(
          (a) =>
            a.id === shoot.coverAssetId &&
            a.approved &&
            a.forceApprovedWithoutRedaction === false &&
            a.processedUrl !== null,
        );
        coverUrl = coverAsset?.processedUrl ?? null;
      }
      // Fallback: first approved exterior asset if no explicit cover
      if (!coverUrl) {
        const fallback = eligibleAssets
          .filter((a) => (EXTERIOR_LP_REQUIRED_KINDS as string[]).includes(a.kind))
          .sort((a, b) => a.sortOrder - b.sortOrder)[0];
        coverUrl = fallback?.processedUrl ?? null;
      }

      // Gallery: all eligible, sorted by sortOrder
      const gallery: CustomerStorefrontGalleryItem[] = eligibleAssets
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((a) => ({
          url: a.processedUrl!,
          sortOrder: a.sortOrder,
          kind: a.kind,
          alt: `${a.kind.replace(/_/g, ' ')} view`,
        }));

      // Status: ready requires cover + ≥4 approved exterior kinds (L_AI-9)
      const approvedExteriorCount = eligibleAssets.filter(
        (a) => (EXTERIOR_LP_REQUIRED_KINDS as string[]).includes(a.kind),
      ).length;

      const isReady = coverUrl !== null && approvedExteriorCount >= 4;
      const status = isReady ? 'ready' : 'pending';

      return { coverUrl, gallery, status };
    },
  })),
);
