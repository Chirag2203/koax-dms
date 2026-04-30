import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ShootStatusEnum = z.enum([
  'pending',
  'scheduled',
  'in-progress',
  'completed',
]);
export type ShootStatus = z.infer<typeof ShootStatusEnum>;

// ─── Shoot ────────────────────────────────────────────────────────────────────

/**
 * A photo/video shoot task linked to one VIN.
 *
 * Spec reference: SPEC-SHOOTS-001 §2
 * L4: Asset URLs are mocked S3 paths (https://cdn.bn.example/shoots/{vin}/...)
 * L5: Status progression — pending → scheduled → in-progress → completed
 * L6: One active (non-completed) shoot per VIN
 */
export const ShootSchema = z.object({
  id: z.string().min(1),
  vin: z.string().min(17).max(17),
  photographerId: z.string().nullable(),
  scheduledAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  status: ShootStatusEnum,
  /** Number of photo assets uploaded (mock) — LISTED guard requires ≥10 (L2) */
  assetCount: z.number().int().nonnegative(),
  /** Number of video assets uploaded (mock) — LISTED guard requires ≥1 (L2) */
  videoCount: z.number().int().nonnegative(),
  /**
   * L4: Mocked S3 asset URLs.
   * Pattern: https://cdn.bn.example/shoots/{vin}/{n}.jpg or /video-{n}.mp4
   */
  assetUrls: z.array(z.string()),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  notes: z.string(),
  outletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
  /** Denormalized from vehicles-store for list display */
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().int().positive().optional(),
});

export type Shoot = z.infer<typeof ShootSchema>;

// ─── Error classes ────────────────────────────────────────────────────────────

/**
 * Thrown when a LISTED transition is attempted but the Shoot for the VIN
 * does not meet the ≥10 photos + ≥1 video threshold.
 *
 * Spec reference: SPEC-SHOOTS-001 L2
 */
export class ShootIncompleteError extends Error {
  readonly vin: string;
  readonly assetCount: number;
  readonly videoCount: number;
  readonly requiredPhotos: number;
  readonly requiredVideos: number;

  constructor(
    vin: string,
    assetCount: number,
    videoCount: number,
    requiredPhotos = 10,
    requiredVideos = 1,
  ) {
    super(
      `ShootIncompleteError: VIN ${vin} cannot be listed — shoot requires ` +
        `≥${requiredPhotos} photos (has ${assetCount}) and ≥${requiredVideos} video ` +
        `(has ${videoCount}). Complete the photo shoot before listing.`,
    );
    this.name = 'ShootIncompleteError';
    this.vin = vin;
    this.assetCount = assetCount;
    this.videoCount = videoCount;
    this.requiredPhotos = requiredPhotos;
    this.requiredVideos = requiredVideos;
  }
}

/**
 * Thrown when a shoot action references a shoot ID that does not exist.
 *
 * Spec reference: SPEC-SHOOTS-001 §3
 */
export class ShootNotFoundError extends Error {
  readonly shootId: string;

  constructor(shootId: string) {
    super(`ShootNotFoundError: Shoot '${shootId}' does not exist.`);
    this.name = 'ShootNotFoundError';
    this.shootId = shootId;
  }
}
