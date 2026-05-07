/**
 * Shoots store — SPEC-SHOOTS-001 §3 + SPEC-SHOOTS-002 §5
 *
 * Manages the lifecycle of photo/video shoot tasks linked to VINs.
 *
 * v1 guards (unchanged):
 *   L3: R11+ required for photographer assignment and shoot operations
 *   L5: Status progression — pending → scheduled → in-progress → completed
 *   L6: One active (non-completed) shoot per VIN — createShoot is idempotent
 *   L8: Shoot ID format — shoot-{vin}-{timestamp}
 *   L11: completedAt stamped on completion; assetCount/videoCount threshold enforced
 *
 * v2 additions (SPEC-SHOOTS-002):
 *   L_AI-1: assets[] model; deprecated assetUrls getter
 *   L_AI-4: requestAiProcess P1 stub — sets manual-only
 *   L_AI-5: LP redaction mandatory for exterior kinds
 *   L_AI-6: 11-slot LISTED guard upgrade
 *   L_AI-7: 4-state approval; R11+ approve; R12+ force-override
 *   L_AI-8: RBAC matrix enforced in store
 *   L_AI-9: selectStorefrontGalleryForVin selector
 *   L_AI-10: 2 MB cap per asset
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Shoot,
  ShootAsset,
  ShootAssetKind,
  ShootStatus,
} from '@dms/types';
import {
  ShootIncompleteError,
  ShootNotFoundError,
  LpRedactionRequiredError,
  AssetApprovalPreconditionError,
  ShootSlotIncompleteError,
  EXTERIOR_LP_REQUIRED_KINDS,
} from '@dms/types';
import { getRequiredKindSet, requiresLpRedaction } from './asset-slot-definitions';

// ─── LISTED threshold constants (L2: hardcoded for v1, outlet-configurable in v1.5) ────

export const SHOOT_REQUIRED_PHOTOS = 10;
export const SHOOT_REQUIRED_VIDEOS = 1;

// ─── v2 RBAC constants ────────────────────────────────────────────────────────

/**
 * Role-rank map. Mirrors ROLE_RANK in vehicles/state-machine.ts.
 * R11 = rank 5 (Marketing Manager); R12+ = rank ≥ 6.
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-8 RBAC matrix
 */
const ROLE_RANK: Record<string, number> = {
  R01: 1, R02: 2, R03: 3, R05: 4, R07: 5,
  R09: 6, R10: 7, R11: 8,
  R12: 9, R13: 10, R14: 11, R15: 12, R16: 13, R17: 14, R18: 15,
  R19: 16, R20: 17, R21: 18, R22: 19, R23: 20, R24: 21,
};

function rankOf(role: string): number {
  return ROLE_RANK[role] ?? 0;
}

function hasMinRank(role: string, minRole: string): boolean {
  return rankOf(role) >= rankOf(minRole);
}

/** Roles permitted to approve/unapprove assets (R11+). L_AI-7. */
function canApproveAsset(role: string): boolean {
  return hasMinRank(role, 'R11');
}

/** Roles permitted to force-approve without redaction (R12+). L_AI-7. */
const ALLOWED_FORCE_OVERRIDE_ROLES = new Set(['R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']);
function canForceOverride(role: string): boolean {
  return ALLOWED_FORCE_OVERRIDE_ROLES.has(role);
}

/**
 * Roles permitted to perform Marketing-Manager-tier writes — addRawAsset,
 * redactLicensePlate, requestAiProcess. L_AI-8.
 *
 * R11 (Marketing Manager) is the primary surface; R12+ (GM tier including
 * R19 GM, R22 CFO, R24 CEO) outrank Marketing and can also drive these
 * actions — e.g. a CEO requesting AI enhancement on inventory shoots, or a
 * GM uploading a re-shoot when Marketing is unavailable. Aligns with the
 * existing `canApproveAsset` (R11+) gate; R09 SA stays excluded.
 */
function canAddRawAsset(role: string): boolean {
  return hasMinRank(role, 'R11');
}

function canRedactLicensePlate(role: string): boolean {
  return hasMinRank(role, 'R11');
}

/** R11+ required for photographer assignment */
const PHOTOGRAPHER_ROLES = new Set(['R11', 'R13', 'R19', 'R22', 'R24']);
function canOperateShoot(role: string): boolean {
  return PHOTOGRAPHER_ROLES.has(role);
}

// ─── v2: 2 MB asset cap (L_AI-10) ────────────────────────────────────────────

const ASSET_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Rough estimate of dataUrl byte size (base64 overhead ≈ 4/3 ratio). */
function estimateDataUrlBytes(dataUrl: string): number {
  return Math.ceil(dataUrl.length * 0.75);
}

// ─── InsufficientRoleError ────────────────────────────────────────────────────

export class InsufficientRoleError extends Error {
  readonly required: string;
  readonly actual: string;

  constructor(required: string, actual: string) {
    super(
      `InsufficientRoleError: Role ${actual} cannot perform this action — requires ${required}+.`,
    );
    this.name = 'InsufficientRoleError';
    this.required = required;
    this.actual = actual;
  }
}

// ─── Actor ────────────────────────────────────────────────────────────────────

export interface ShootActor {
  id: string;
  name: string;
  role: string;
}

// ─── Storefront gallery selector return type (L_AI-9) ────────────────────────

export interface StorefrontGalleryItem {
  url: string;
  sortOrder: number;
  kind: ShootAssetKind;
  alt: string;
}

export interface StorefrontGallery {
  coverUrl: string | null;
  gallery: StorefrontGalleryItem[];
  status: 'ready' | 'pending' | 'unavailable';
}

// ─── Audit event type (lightweight — no PII text) ────────────────────────────

export interface ShootAuditEvent {
  eventKind: string;
  shootId: string;
  assetId?: string;
  vin: string;
  actorId: string;
  actorRole: string;
  at: string;
  /** Extra payload fields — ids + counts only, no PII text */
  extra?: Record<string, string | number | boolean>;
}

// ─── EMPTY fallbacks (CLAUDE.md §17.1 zustand selector rule) ─────────────────

const EMPTY_ASSETS: ShootAsset[] = [];
const EMPTY_GALLERY_ITEMS: StorefrontGalleryItem[] = [];

// ─── State shape ──────────────────────────────────────────────────────────────

export interface ShootsState {
  shoots: Record<string, Shoot>; // key: id
  /** L6: latest non-completed shoot id per VIN for idempotency check */
  shootIdByVin: Record<string, string>;
  hydrated: boolean;
  /** v2: append-only audit event log (no PII text per L_AI-21) */
  auditEvents: ShootAuditEvent[];
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export interface ShootsActions {
  // ── v1 actions (unchanged) ──────────────────────────────────────────────

  /**
   * Auto-create a shoot on ACQUIRED SalesEvent (Seam 39 — UI layer).
   * L6: Idempotent — returns existing shoot if VIN already has a non-completed shoot.
   * L8: ID = shoot-{vin}-{timestamp}
   */
  createShoot(
    vin: string,
    outletId: 'BLR-01' | 'MUM-01' | 'CHE-01',
    actor: ShootActor,
    meta?: { vehicleMake?: string; vehicleModel?: string; vehicleYear?: number },
  ): Shoot;

  /** Assign photographer. L3: R11+. */
  assignPhotographer(shootId: string, photographerId: string, actor: ShootActor): void;

  /** Set scheduled date; advances status to 'scheduled'. */
  scheduleShoot(shootId: string, scheduledAt: string, actor: ShootActor): void;

  /** Mark shoot as in-progress. L3: R11+. */
  startShoot(shootId: string, actor: ShootActor): void;

  /**
   * Add a mocked v1 asset (photo or video).
   * @deprecated — use addRawAsset(v2) instead; retained for v1 back-compat.
   */
  addMockAsset(shootId: string, type: 'photo' | 'video', actor: ShootActor): void;

  /** Mark shoot as completed with v1 threshold guard. L11. */
  completeShoot(shootId: string, actor: ShootActor): void;

  /** Seed fixture data. Called by ShootsStoreHydrator. */
  _seed(shoots: Shoot[]): void;

  // ── v2 actions (SPEC-SHOOTS-002) ────────────────────────────────────────

  /**
   * Add a raw (unprocessed) asset to a shoot slot.
   *
   * Preconditions (L_AI-8, L_AI-10):
   *   - actor.role === 'R11' (Marketing Manager only — addRawAsset is R11-exclusive)
   *   - Slot uniqueness: no existing asset of the same kind in this shoot
   *   - dataUrl size ≤ 2 MB (L_AI-10)
   *
   * Creates asset with aiStatus='pending', approved=false, lpRedacted=false.
   * Emits shoot_asset_uploaded.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-1, SC-7, SC-21, AC-2, AC-13, AC-15
   */
  addRawAsset(
    shootId: string,
    dataUrl: string,
    kind: ShootAssetKind,
    actor: ShootActor,
  ): ShootAsset;

  /**
   * Set the designated cover asset for a shoot.
   *
   * Preconditions (L_AI-7 cover precondition, security review #5):
   *   - asset.approved === true
   *   - asset.kind ∈ EXTERIOR_LP_REQUIRED_KINDS \ {video_walkaround}
   *   - asset.forceApprovedWithoutRedaction === false
   *
   * Emits shoot_cover_set.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-9, AC-31
   */
  setCoverAsset(shootId: string, assetId: string, actor: ShootActor): void;

  /**
   * Reorder the gallery by providing asset IDs in the desired order.
   * Updates sortOrder on each affected asset.
   * Emits shoot_gallery_reordered.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-8
   */
  reorderGallery(shootId: string, assetIdsInOrder: string[], actor: ShootActor): void;

  /**
   * Approve an asset after LP redaction (if required) and AI processing.
   *
   * Preconditions (L_AI-7):
   *   1. actor.rank ≥ R11
   *   2. aiStatus !== 'failed'
   *   3. lpRedacted === true if kind ∈ EXTERIOR_LP_REQUIRED_KINDS
   *   4. processedUrl (or rawUrl if manual-only) non-empty
   *   5. Special: video_walkaround requires R12+ AND reason ≥10 chars
   *
   * Emits shoot_asset_approved.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-4, SC-5, SC-24, AC-4, AC-25, AC-30
   */
  approveAsset(assetId: string, actor: ShootActor, walkaroundReason?: string): void;

  /**
   * Unapprove an approved asset with a mandatory reason.
   *
   * Preconditions (L_AI-7):
   *   - actor.rank ≥ R11
   *   - reason ≥ 5 chars
   *
   * NOTE: Does NOT clear forceApprovedWithoutRedaction fields — those are
   * permanent audit trail (B3 — security review #3).
   *
   * Emits shoot_asset_unapproved with reasonLength (no PII text).
   *
   * Spec reference: SPEC-SHOOTS-002 L_AI-7, AC-2
   */
  unapproveAsset(assetId: string, reason: string, actor: ShootActor): void;

  /**
   * Set lpRedacted=true and update processedUrl with the rasterised result.
   *
   * Preconditions: actor.role === 'R11' (L_AI-8 redactLicensePlate is R11-only).
   * Emits shoot_asset_redacted.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-3, L_AI-12
   */
  redactLicensePlate(assetId: string, redactedDataUrl: string, actor: ShootActor): void;

  /**
   * P1 stub: request AI processing for all assets in a shoot.
   * Sets aiStatus='manual-only' for all assets (L_AI-4 P1 scaffold).
   * Emits shoot_ai_requested with stub note.
   * UI should surface "AI processing — Coming in v2.1" toast (DoD §10 #15).
   *
   * Spec reference: SPEC-SHOOTS-002 SC-2, AC-3, L_AI-4
   */
  requestAiProcess(shootId: string, actor: ShootActor): void;

  /**
   * Force-approve an asset without LP redaction.
   * Requires R12+. Reason ≥ 10 chars.
   * Sets approved=true AND forceApprovedWithoutRedaction=true (permanent).
   * Emits shoot_force_approved + audit:force_approved_lp_unredacted.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-6, SC-23, AC-5, AC-24, L_AI-7
   */
  forceApproveOverride(assetId: string, reason: string, actor: ShootActor): void;

  /**
   * Request a reshoot for a VIN.
   * Creates a new Shoot in 'pending' status.
   * Idempotency: rejects if an open (non-completed) shoot exists for VIN.
   * Existing completed shoots are retained as historical records.
   * Emits shoot_reshoot_requested.
   *
   * Spec reference: SPEC-SHOOTS-002 SC-19, AC-2
   */
  requestReshoot(vin: string, reason: string, actor: ShootActor): Shoot;

  // ── Selectors ─────────────────────────────────────────────────────────────

  /** Return the latest shoot for a VIN (any status), or null. L9: LISTED guard. */
  getShootByVin(vin: string): Shoot | null;

  /** Return all shoots filtered by status. */
  selectByStatus(status: ShootStatus): Shoot[];

  /**
   * Return the assets array for a shoot (base ref — no fresh array literal).
   * Callers should filter/sort in useMemo (CLAUDE.md §17.1 zustand rule).
   *
   * Spec reference: SPEC-SHOOTS-002 L_AI-2
   */
  selectAssetsForShoot(shootId: string): ShootAsset[];

  /**
   * Return an asset by id, or undefined.
   * O(1) lookup via flattened asset record.
   */
  selectAssetById(assetId: string): ShootAsset | undefined;

  /**
   * Storefront gallery selector (L_AI-9).
   *
   * Returns { coverUrl, gallery[], status } for the customer-web VDP.
   * - 'ready': shoot has coverAssetId + ≥4 approved exterior kinds.
   * - 'pending': shoot exists but threshold not met.
   * - 'unavailable': no shoot for VIN.
   *
   * Security tightening (B2): reads processedUrl ONLY (never rawUrl fallback);
   * excludes assets where forceApprovedWithoutRedaction===true.
   * Excludes video_walkaround from gallery[] (only cover-eligible).
   * Sorts by sortOrder ascending.
   *
   * Spec reference: SPEC-SHOOTS-002 L_AI-9, SC-13, SC-14, SC-15
   */
  selectStorefrontGalleryForVin(vin: string): StorefrontGallery;
}

export type ShootsStore = ShootsState & ShootsActions;

// ─── ID helpers ───────────────────────────────────────────────────────────────

function makeShootId(vin: string): string {
  // L8: shoot-{vin}-{timestamp}
  return `shoot-${vin}-${Date.now()}`;
}

function makeAssetId(shootId: string, kind: ShootAssetKind): string {
  return `asset-${shootId}-${kind}-${Date.now()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ─── Mock asset URL builders (L4) ────────────────────────────────────────────

function makePhotoUrl(vin: string, index: number): string {
  return `https://cdn.bn.example/shoots/${vin}/${index}.jpg`;
}

function makeVideoUrl(vin: string, index: number): string {
  return `https://cdn.bn.example/shoots/${vin}/video-${index}.mp4`;
}

// ─── Flatten asset lookup helper ─────────────────────────────────────────────

function findAssetAcrossShoots(
  shoots: Record<string, Shoot>,
  assetId: string,
): { shoot: Shoot; asset: ShootAsset } | undefined {
  for (const shoot of Object.values(shoots)) {
    const asset = shoot.assets.find((a) => a.id === assetId);
    if (asset) return { shoot, asset };
  }
  return undefined;
}

// ─── Initial state ────────────────────────────────────────────────────────────

function initialState(): ShootsState {
  return {
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
    auditEvents: [],
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useShootsStore = create<ShootsStore>()(
  immer((set, get) => ({
    ...initialState(),

    // ── v1 actions ────────────────────────────────────────────────────────

    createShoot(vin, outletId, actor, meta) {
      // L6: Idempotency — return existing if a non-completed shoot exists for this VIN
      const existingId = get().shootIdByVin[vin];
      if (existingId) {
        const existing = get().shoots[existingId];
        if (existing && existing.status !== 'completed') {
          return existing;
        }
      }

      const id = makeShootId(vin);
      const shoot: Shoot = {
        id,
        vin,
        photographerId: null,
        scheduledAt: null,
        completedAt: null,
        status: 'pending',
        assetCount: 0,
        videoCount: 0,
        assetUrls: [],
        createdAt: nowIso(),
        createdBy: actor.id,
        notes: '',
        outletId,
        vehicleMake: meta?.vehicleMake,
        vehicleModel: meta?.vehicleModel,
        vehicleYear: meta?.vehicleYear,
        // v2 defaults
        assets: [],
        coverAssetId: null,
        aiVendor: 'NONE',
        aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false },
      };

      set((state) => {
        state.shoots[id] = shoot;
        state.shootIdByVin[vin] = id;
      });

      return shoot;
    },

    assignPhotographer(shootId, photographerId, actor) {
      // L3: R11+ required
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      set((state) => {
        const shoot = state.shoots[shootId];
        if (!shoot) throw new ShootNotFoundError(shootId);

        shoot.photographerId = photographerId;
        if (shoot.scheduledAt && shoot.status === 'pending') {
          shoot.status = 'scheduled';
        }
      });
    },

    scheduleShoot(shootId, scheduledAt, actor) {
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      set((state) => {
        const shoot = state.shoots[shootId];
        if (!shoot) throw new ShootNotFoundError(shootId);

        shoot.scheduledAt = scheduledAt;
        if (shoot.status === 'pending' || shoot.status === 'scheduled') {
          shoot.status = 'scheduled';
        }
      });
    },

    startShoot(shootId, actor) {
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      set((state) => {
        const shoot = state.shoots[shootId];
        if (!shoot) throw new ShootNotFoundError(shootId);

        if (shoot.status === 'pending' || shoot.status === 'scheduled') {
          shoot.status = 'in-progress';
        }
      });
    },

    addMockAsset(shootId, type, actor) {
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      set((state) => {
        const shoot = state.shoots[shootId];
        if (!shoot) throw new ShootNotFoundError(shootId);

        if (type === 'photo') {
          const idx = shoot.assetCount + 1;
          shoot.assetUrls.push(makePhotoUrl(shoot.vin, idx));
          shoot.assetCount += 1;
        } else {
          const idx = shoot.videoCount + 1;
          shoot.assetUrls.push(makeVideoUrl(shoot.vin, idx));
          shoot.videoCount += 1;
        }

        if (shoot.status === 'pending' || shoot.status === 'scheduled') {
          shoot.status = 'in-progress';
        }
      });
    },

    completeShoot(shootId, actor) {
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      const shoot = get().shoots[shootId];
      if (!shoot) throw new ShootNotFoundError(shootId);

      // L11: v1 threshold guard
      if (
        shoot.assetCount < SHOOT_REQUIRED_PHOTOS ||
        shoot.videoCount < SHOOT_REQUIRED_VIDEOS
      ) {
        throw new ShootIncompleteError(
          shoot.vin,
          shoot.assetCount,
          shoot.videoCount,
          SHOOT_REQUIRED_PHOTOS,
          SHOOT_REQUIRED_VIDEOS,
        );
      }

      set((state) => {
        const s = state.shoots[shootId];
        if (!s) return;
        s.status = 'completed';
        s.completedAt = nowIso();
      });
    },

    _seed(shootsList) {
      set((state) => {
        for (const shoot of shootsList) {
          // Ensure v2 fields have defaults on v1 fixtures (L_AI-1 migration)
          const cloned = structuredClone(shoot);
          const normalized: Shoot = {
            ...cloned,
            // v2 defaults — only apply if not already present (migration path)
            assets: cloned.assets ?? [],
            coverAssetId: cloned.coverAssetId ?? null,
            aiVendor: cloned.aiVendor ?? 'NONE',
            aiPolicy: cloned.aiPolicy ?? { autoQueueOnUpload: false, autoApproveProcessed: false },
          };
          state.shoots[normalized.id] = normalized;
          // L6: track latest shoot per VIN
          const existing = state.shootIdByVin[normalized.vin];
          if (!existing) {
            state.shootIdByVin[normalized.vin] = normalized.id;
          } else {
            const existingShoot = state.shoots[existing];
            if (existingShoot?.status === 'completed' && normalized.status !== 'completed') {
              state.shootIdByVin[normalized.vin] = normalized.id;
            } else if (normalized.status !== 'completed') {
              if (!existingShoot || normalized.createdAt > existingShoot.createdAt) {
                state.shootIdByVin[normalized.vin] = normalized.id;
              }
            }
          }
        }
        state.hydrated = true;
      });
    },

    // ── v2 actions ────────────────────────────────────────────────────────

    addRawAsset(shootId, dataUrl, kind, actor) {
      // L_AI-8: addRawAsset is R11 only
      if (!canAddRawAsset(actor.role)) {
        const vin = get().shoots[shootId]?.vin ?? 'unknown';
        throw new AssetApprovalPreconditionError(
          vin,
          'new',
          `forbidden: ${actor.role} cannot addRawAsset — requires R11+`,
        );
      }

      const shoot = get().shoots[shootId];
      if (!shoot) throw new ShootNotFoundError(shootId);

      // L_AI-10: 2 MB cap
      const sizeBytes = estimateDataUrlBytes(dataUrl);
      if (sizeBytes > ASSET_MAX_BYTES) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          'new',
          `Asset exceeds 2 MB limit (estimated ${Math.round(sizeBytes / 1024)} KB)`,
        );
      }

      // Slot uniqueness: first-write wins
      const existingSlot = shoot.assets.find((a) => a.kind === kind);
      if (existingSlot) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          existingSlot.id,
          `slot ${kind} already has an asset — use replaceAsset to overwrite`,
        );
      }

      const assetId = makeAssetId(shootId, kind);
      const now = nowIso();
      const asset: ShootAsset = {
        id: assetId,
        shootId,
        vin: shoot.vin,
        kind,
        sortOrder: shoot.assets.length,
        rawUrl: dataUrl,
        processedUrl: null,
        approved: false,
        approvedAt: null,
        approvedBy: null,
        lpRedacted: false,
        redactedAt: null,
        redactedBy: null,
        aiStatus: 'pending',
        aiRequestedAt: null,
        aiCompletedAt: null,
        aiErrorMessage: null,
        capturedAt: now,
        capturedBy: actor.id,
        s3Key: null,
        forceApprovedWithoutRedaction: false,
        forceApprovedReason: null,
        forceApprovedBy: null,
        forceApprovedAt: null,
      };

      set((state) => {
        state.shoots[shootId]!.assets.push(asset);
        state.auditEvents.push({
          eventKind: 'shoot_asset_uploaded',
          shootId,
          assetId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: { kind, sizeBytes },
        });
      });

      return asset;
    },

    setCoverAsset(shootId, assetId, actor) {
      const shoot = get().shoots[shootId];
      if (!shoot) throw new ShootNotFoundError(shootId);

      const asset = shoot.assets.find((a) => a.id === assetId);
      if (!asset) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'asset not found in shoot',
        );
      }

      // Cover precondition (L_AI-7 security review #5):
      //   1. must be approved
      //   2. must be exterior kind (in EXTERIOR_LP_REQUIRED_KINDS) but NOT video_walkaround
      //   3. forceApprovedWithoutRedaction must be false
      if (!asset.approved) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'cover must be approved exterior with redaction',
        );
      }
      const isEligibleExterior =
        (EXTERIOR_LP_REQUIRED_KINDS as string[]).includes(asset.kind) &&
        asset.kind !== 'video_walkaround';
      if (!isEligibleExterior) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'cover must be an approved exterior asset (not video)',
        );
      }
      if (asset.forceApprovedWithoutRedaction) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'force-approved assets cannot be set as cover (DPDP L_AI-9 B2)',
        );
      }

      const now = nowIso();
      set((state) => {
        state.shoots[shootId]!.coverAssetId = assetId;
        state.auditEvents.push({
          eventKind: 'shoot_cover_set',
          shootId,
          assetId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
        });
      });
    },

    reorderGallery(shootId, assetIdsInOrder, actor) {
      const shoot = get().shoots[shootId];
      if (!shoot) throw new ShootNotFoundError(shootId);

      const now = nowIso();
      set((state) => {
        const s = state.shoots[shootId]!;
        assetIdsInOrder.forEach((id, idx) => {
          const asset = s.assets.find((a) => a.id === id);
          if (asset) asset.sortOrder = idx;
        });
        state.auditEvents.push({
          eventKind: 'shoot_gallery_reordered',
          shootId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: { count: assetIdsInOrder.length },
        });
      });
    },

    approveAsset(assetId, actor, walkaroundReason) {
      const found = findAssetAcrossShoots(get().shoots, assetId);
      if (!found) {
        throw new AssetApprovalPreconditionError('unknown', assetId, 'asset not found');
      }
      const { shoot, asset } = found;

      // Precondition 1: actor.rank ≥ R11 (L_AI-7)
      if (!canApproveAsset(actor.role)) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          `rank < R11 — approval forbidden for ${actor.role}`,
        );
      }

      // Precondition 2: aiStatus !== 'failed' (SC-24, AC-25)
      if (asset.aiStatus === 'failed') {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'ai failed — cannot approve',
        );
      }

      // Precondition 3: LP redaction for exterior kinds (L_AI-5, SC-5)
      if (requiresLpRedaction(asset.kind) && !asset.lpRedacted) {
        throw new LpRedactionRequiredError(shoot.vin, assetId, asset.kind);
      }

      // Special: video_walkaround requires R12+ + typed reason ≥10 chars (L_AI-5 escalated, §6.3)
      if (asset.kind === 'video_walkaround') {
        if (!hasMinRank(actor.role, 'R12')) {
          throw new AssetApprovalPreconditionError(
            shoot.vin,
            assetId,
            'walkaround approval requires R12+',
          );
        }
        if (!walkaroundReason || walkaroundReason.trim().length < 10) {
          throw new AssetApprovalPreconditionError(
            shoot.vin,
            assetId,
            'walkaround approval requires typed reason ≥10 chars',
          );
        }
      }

      // Precondition 4: processedUrl (or rawUrl if manual-only) non-empty
      const hasProcessed =
        asset.aiStatus === 'manual-only'
          ? Boolean(asset.rawUrl)
          : Boolean(asset.processedUrl);
      if (!hasProcessed) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'no processed image available',
        );
      }

      const now = nowIso();
      set((state) => {
        const s = state.shoots[asset.shootId]!;
        const a = s.assets.find((x) => x.id === assetId)!;
        a.approved = true;
        a.approvedAt = now;
        a.approvedBy = actor.id;

        state.auditEvents.push({
          eventKind: 'shoot_asset_approved',
          shootId: asset.shootId,
          assetId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: { kind: asset.kind },
        });

        // Walkaround audit event (L_AI-5 + §6.3)
        if (asset.kind === 'video_walkaround' && walkaroundReason) {
          state.auditEvents.push({
            eventKind: 'audit:walkaround_lp_confirmed',
            shootId: asset.shootId,
            assetId,
            vin: shoot.vin,
            actorId: actor.id,
            actorRole: actor.role,
            at: now,
            extra: { reasonLength: walkaroundReason.trim().length },
          });
        }
      });
    },

    unapproveAsset(assetId, reason, actor) {
      const found = findAssetAcrossShoots(get().shoots, assetId);
      if (!found) {
        throw new AssetApprovalPreconditionError('unknown', assetId, 'asset not found');
      }
      const { shoot, asset } = found;

      // R11+ required
      if (!canApproveAsset(actor.role)) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          `rank < R11 — unapprove forbidden for ${actor.role}`,
        );
      }

      // Reason ≥ 5 chars
      if (reason.trim().length < 5) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'unapprove reason must be ≥5 characters',
        );
      }

      const now = nowIso();
      set((state) => {
        const s = state.shoots[asset.shootId]!;
        const a = s.assets.find((x) => x.id === assetId)!;
        a.approved = false;
        a.approvedAt = null;
        a.approvedBy = null;
        // NOTE: forceApprovedWithoutRedaction fields are NOT cleared — permanent audit (B3)

        state.auditEvents.push({
          eventKind: 'shoot_asset_unapproved',
          shootId: asset.shootId,
          assetId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: { reasonLength: reason.trim().length },
        });
      });
    },

    redactLicensePlate(assetId, redactedDataUrl, actor) {
      const found = findAssetAcrossShoots(get().shoots, assetId);
      if (!found) {
        throw new AssetApprovalPreconditionError('unknown', assetId, 'asset not found');
      }
      const { shoot, asset } = found;

      // R11 only (L_AI-8)
      if (!canRedactLicensePlate(actor.role)) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          `forbidden: ${actor.role} cannot redactLicensePlate — requires R11+`,
        );
      }

      const now = nowIso();
      set((state) => {
        const s = state.shoots[asset.shootId]!;
        const a = s.assets.find((x) => x.id === assetId)!;
        a.lpRedacted = true;
        a.redactedAt = now;
        a.redactedBy = actor.id;
        a.processedUrl = redactedDataUrl;

        state.auditEvents.push({
          eventKind: 'shoot_asset_redacted',
          shootId: asset.shootId,
          assetId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: { kind: asset.kind },
        });
      });
    },

    requestAiProcess(shootId, actor) {
      // L_AI-8: requestAiProcess available to R11 (Marketing primary) and
      // R12+ (GM / CFO / CEO) — see canAddRawAsset for the rationale.
      if (!canAddRawAsset(actor.role)) {
        const vin = get().shoots[shootId]?.vin ?? 'unknown';
        throw new AssetApprovalPreconditionError(
          vin,
          'shoot',
          `forbidden: ${actor.role} cannot requestAiProcess — requires R11+`,
        );
      }

      const shoot = get().shoots[shootId];
      if (!shoot) throw new ShootNotFoundError(shootId);

      const now = nowIso();
      set((state) => {
        const s = state.shoots[shootId]!;
        // P1 stub (L_AI-4): set all assets to manual-only + processedUrl=rawUrl
        for (const asset of s.assets) {
          if (asset.aiStatus === 'pending') {
            asset.aiStatus = 'manual-only';
            asset.processedUrl = asset.processedUrl ?? asset.rawUrl;
            asset.aiRequestedAt = now;
          }
        }
        state.auditEvents.push({
          eventKind: 'shoot_asset_ai_requested',
          shootId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: {
            aiVendor: 'NONE',
            stub: true,
            note: 'AI processing arrives in v2.1 — set manual-only',
          },
        });
      });
    },

    forceApproveOverride(assetId, reason, actor) {
      const found = findAssetAcrossShoots(get().shoots, assetId);
      if (!found) {
        throw new AssetApprovalPreconditionError('unknown', assetId, 'asset not found');
      }
      const { shoot, asset } = found;

      // R12+ only (L_AI-7 + SC-23, AC-24)
      if (!canForceOverride(actor.role)) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'rank < R12 — force-override forbidden',
        );
      }

      // Reason ≥ 10 chars
      if (reason.trim().length < 10) {
        throw new AssetApprovalPreconditionError(
          shoot.vin,
          assetId,
          'force-override reason must be ≥10 characters',
        );
      }

      const now = nowIso();
      set((state) => {
        const s = state.shoots[asset.shootId]!;
        const a = s.assets.find((x) => x.id === assetId)!;
        a.approved = true;
        a.approvedAt = now;
        a.approvedBy = actor.id;
        a.forceApprovedWithoutRedaction = true;
        a.forceApprovedReason = reason;
        a.forceApprovedBy = actor.id;
        a.forceApprovedAt = now;

        const payload: ShootAuditEvent = {
          eventKind: 'shoot_force_approved',
          shootId: asset.shootId,
          assetId,
          vin: shoot.vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: { kind: asset.kind, reasonLength: reason.trim().length },
        };
        state.auditEvents.push(payload);

        // Audit-namespace overlay (L_AI-5 + spec §14)
        state.auditEvents.push({
          ...payload,
          eventKind: 'audit:force_approved_lp_unredacted',
          extra: { ...payload.extra, lpUnredacted: true },
        });
      });
    },

    requestReshoot(vin, reason, actor) {
      // Idempotency: reject if open (non-completed) shoot exists for VIN (SC-19)
      const existingId = get().shootIdByVin[vin];
      if (existingId) {
        const existing = get().shoots[existingId];
        if (existing && existing.status !== 'completed') {
          throw new AssetApprovalPreconditionError(
            vin,
            existing.id,
            'reshootAlreadyOpen: an open shoot already exists for this VIN',
          );
        }
      }

      const priorShootId = existingId ?? 'none';
      const outletId = get().shoots[existingId ?? '']?.outletId ?? 'BLR-01';
      const meta = {
        vehicleMake: get().shoots[existingId ?? '']?.vehicleMake,
        vehicleModel: get().shoots[existingId ?? '']?.vehicleModel,
        vehicleYear: get().shoots[existingId ?? '']?.vehicleYear,
      };

      // createShoot handles the idempotency index update
      const newShoot = get().createShoot(vin, outletId, actor, meta);

      const now = nowIso();
      set((state) => {
        state.auditEvents.push({
          eventKind: 'shoot_reshoot_requested',
          shootId: newShoot.id,
          vin,
          actorId: actor.id,
          actorRole: actor.role,
          at: now,
          extra: {
            priorShootId,
            newShootId: newShoot.id,
            reasonLength: reason.trim().length,
          },
        });
      });

      return newShoot;
    },

    // ── Selectors ────────────────────────────────────────────────────────

    getShootByVin(vin) {
      const id = get().shootIdByVin[vin];
      if (!id) return null;
      return get().shoots[id] ?? null;
    },

    selectByStatus(status) {
      return Object.values(get().shoots).filter((s) => s.status === status);
    },

    selectAssetsForShoot(shootId) {
      // Return base ref — callers filter/sort in useMemo (CLAUDE.md §17.1)
      return get().shoots[shootId]?.assets ?? EMPTY_ASSETS;
    },

    selectAssetById(assetId) {
      for (const shoot of Object.values(get().shoots)) {
        const asset = shoot.assets.find((a) => a.id === assetId);
        if (asset) return asset;
      }
      return undefined;
    },

    selectStorefrontGalleryForVin(vin) {
      const shoot = get().getShootByVin(vin);
      if (!shoot) {
        return { coverUrl: null, gallery: EMPTY_GALLERY_ITEMS, status: 'unavailable' };
      }

      // B2 (security review #2): read processedUrl ONLY; exclude force-approved-unredacted
      // Exclude video_walkaround from gallery (cover-eligible only)
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

      // Gallery: all eligible assets sorted by sortOrder
      const gallery: StorefrontGalleryItem[] = eligibleAssets
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((a) => ({
          url: a.processedUrl!,
          sortOrder: a.sortOrder,
          kind: a.kind,
          alt: `${a.kind.replace(/_/g, ' ')} view`,
        }));

      // Status: 'ready' requires cover + ≥4 approved exterior kinds (L_AI-9)
      const approvedExteriorCount = eligibleAssets.filter(
        (a) => (EXTERIOR_LP_REQUIRED_KINDS as string[]).includes(a.kind),
      ).length;

      const isReady = coverUrl !== null && approvedExteriorCount >= 4;
      const status = isReady ? 'ready' : 'pending';

      return { coverUrl, gallery, status };
    },
  })),
);
