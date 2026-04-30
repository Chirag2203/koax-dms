/**
 * Shoots store — SPEC-SHOOTS-001 §3
 *
 * Manages the lifecycle of photo/video shoot tasks linked to VINs.
 *
 * Guards:
 *   L3: R11+ required for photographer assignment and shoot operations
 *   L5: Status progression — pending → scheduled → in-progress → completed
 *   L6: One active (non-completed) shoot per VIN — createShoot is idempotent
 *   L8: Shoot ID format — shoot-{vin}-{timestamp}
 *   L11: completedAt stamped on completion; assetCount/videoCount threshold enforced
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Shoot, ShootStatus } from '@dms/types';
import { ShootIncompleteError, ShootNotFoundError } from '@dms/types';

// ─── LISTED threshold constants (L2: hardcoded for v1, outlet-configurable in v1.5) ────

export const SHOOT_REQUIRED_PHOTOS = 10;
export const SHOOT_REQUIRED_VIDEOS = 1;

// ─── Role rank helpers ────────────────────────────────────────────────────────

// R11 is rank 4.5 — Marketing Manager (Doc 14). We accept R11, R13, R19, R22, R24.
// For simplicity, store the allowed roles for photo shoot ops per Doc 14.
const PHOTOGRAPHER_ROLES = new Set(['R11', 'R13', 'R19', 'R22', 'R24']);

function canOperateShoot(role: string): boolean {
  return PHOTOGRAPHER_ROLES.has(role);
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

// ─── State shape ──────────────────────────────────────────────────────────────

export interface ShootsState {
  shoots: Record<string, Shoot>; // key: id
  /** L6: latest non-completed shoot id per VIN for idempotency check */
  shootIdByVin: Record<string, string>;
  hydrated: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export interface ShootsActions {
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

  /**
   * Assign a photographer to a shoot.
   * L3: actor.role must be R11+.
   * Side-effect: if scheduledAt already set, status transitions to 'scheduled'.
   */
  assignPhotographer(
    shootId: string,
    photographerId: string,
    actor: ShootActor,
  ): void;

  /**
   * Set the scheduled date for a shoot.
   * Status advances to 'scheduled'.
   */
  scheduleShoot(
    shootId: string,
    scheduledAt: string,
    actor: ShootActor,
  ): void;

  /**
   * Mark shoot as in-progress.
   * L3: actor.role must be R11+.
   */
  startShoot(shootId: string, actor: ShootActor): void;

  /**
   * Add a mocked asset (photo or video).
   * L4: appends mocked CDN URL; increments assetCount or videoCount.
   * L10: No real upload in v1.
   */
  addMockAsset(
    shootId: string,
    type: 'photo' | 'video',
    actor: ShootActor,
  ): void;

  /**
   * Mark shoot as completed.
   * L11: assetCount ≥ 10 AND videoCount ≥ 1 required (ShootIncompleteError thrown).
   * Stamps completedAt.
   */
  completeShoot(shootId: string, actor: ShootActor): void;

  /**
   * Seed fixture data. Called by ShootsStoreHydrator.
   */
  _seed(shoots: Shoot[]): void;

  // ── Selectors ─────────────────────────────────────────────────────────────

  /** Return the latest shoot for a VIN (any status), or null. L9: LISTED guard. */
  getShootByVin(vin: string): Shoot | null;

  /** Return all shoots filtered by status. */
  selectByStatus(status: ShootStatus): Shoot[];
}

export type ShootsStore = ShootsState & ShootsActions;

// ─── ID helpers ───────────────────────────────────────────────────────────────

function makeShootId(vin: string): string {
  // L8: shoot-{vin}-{timestamp}
  return `shoot-${vin}-${Date.now()}`;
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

// ─── Initial state ────────────────────────────────────────────────────────────

function initialState(): ShootsState {
  return {
    shoots: {},
    shootIdByVin: {},
    hydrated: false,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useShootsStore = create<ShootsStore>()(
  immer((set, get) => ({
    ...initialState(),

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
        // Advance to scheduled if scheduledAt already set
        if (shoot.scheduledAt && shoot.status === 'pending') {
          shoot.status = 'scheduled';
        }
      });
    },

    scheduleShoot(shootId, scheduledAt, actor) {
      // L3: R11+ required
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
      // L3: R11+ required
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
      // L3: R11+ required
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      set((state) => {
        const shoot = state.shoots[shootId];
        if (!shoot) throw new ShootNotFoundError(shootId);

        if (type === 'photo') {
          // L4: mocked S3 URL
          const idx = shoot.assetCount + 1;
          shoot.assetUrls.push(makePhotoUrl(shoot.vin, idx));
          shoot.assetCount += 1;
        } else {
          const idx = shoot.videoCount + 1;
          shoot.assetUrls.push(makeVideoUrl(shoot.vin, idx));
          shoot.videoCount += 1;
        }

        // Auto-advance to in-progress if not there yet
        if (shoot.status === 'pending' || shoot.status === 'scheduled') {
          shoot.status = 'in-progress';
        }
      });
    },

    completeShoot(shootId, actor) {
      // L3: R11+ required
      if (!canOperateShoot(actor.role)) {
        throw new InsufficientRoleError('R11', actor.role);
      }

      const shoot = get().shoots[shootId];
      if (!shoot) throw new ShootNotFoundError(shootId);

      // L11: threshold guard — assetCount ≥ 10 AND videoCount ≥ 1
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
          state.shoots[shoot.id] = structuredClone(shoot);
          // L6: track latest shoot per VIN (prefer non-completed; overwrite with latest)
          const existing = state.shootIdByVin[shoot.vin];
          if (!existing) {
            state.shootIdByVin[shoot.vin] = shoot.id;
          } else {
            // Prefer non-completed over completed
            const existingShoot = state.shoots[existing];
            if (existingShoot?.status === 'completed' && shoot.status !== 'completed') {
              state.shootIdByVin[shoot.vin] = shoot.id;
            } else if (shoot.status !== 'completed') {
              // Latest non-completed wins (latest createdAt)
              if (!existingShoot || shoot.createdAt > existingShoot.createdAt) {
                state.shootIdByVin[shoot.vin] = shoot.id;
              }
            }
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

    selectByStatus(status) {
      return Object.values(get().shoots).filter((s) => s.status === status);
    },
  })),
);
