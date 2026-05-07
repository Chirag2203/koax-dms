import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ShootStatusEnum = z.enum([
  'pending',
  'scheduled',
  'in-progress',
  'completed',
]);
export type ShootStatus = z.infer<typeof ShootStatusEnum>;

// ─── v2: ShootAssetKindEnum (L_AI-6 — 14 kinds; 11 required) ─────────────────
/**
 * 14-angle slot enum for v2 photo shoots.
 *
 * REQUIRED (11): front_3q_driver, front_3q_passenger, rear_3q_driver,
 *   rear_3q_passenger, driver_profile, passenger_profile, front_straight,
 *   rear_straight, dashboard, rear_seats, odometer, video_walkaround.
 * OPTIONAL (3): engine_bay, boot (+ video_walkaround is required).
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-6
 */
export const ShootAssetKindEnum = z.enum([
  'front_3q_driver',      // REQUIRED, recommended cover
  'front_3q_passenger',   // REQUIRED
  'rear_3q_driver',       // REQUIRED
  'rear_3q_passenger',    // REQUIRED
  'driver_profile',       // REQUIRED
  'passenger_profile',    // REQUIRED
  'front_straight',       // REQUIRED
  'rear_straight',        // REQUIRED
  'dashboard',            // REQUIRED
  'rear_seats',           // REQUIRED
  'odometer',             // REQUIRED (mileage proof)
  'engine_bay',           // OPTIONAL
  'boot',                 // OPTIONAL
  'video_walkaround',     // REQUIRED
]);
export type ShootAssetKind = z.infer<typeof ShootAssetKindEnum>;

/**
 * Exterior kinds that require license-plate redaction before approval.
 * Includes video_walkaround (L_AI-5 + security review #12).
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-5
 */
export const EXTERIOR_LP_REQUIRED_KINDS: ShootAssetKind[] = [
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

// ─── v2: AI status enum (L_AI-4) ─────────────────────────────────────────────

export const ShootAssetAiStatusEnum = z.enum([
  'pending',
  'queued',
  'processing',
  'succeeded',
  'failed',
  'manual-only',
]);
export type ShootAssetAiStatus = z.infer<typeof ShootAssetAiStatusEnum>;

// ─── v2: ShootAsset schema (L_AI-1, L_AI-7, L_AI-10, L_AI-12) ──────────────

/**
 * Per-asset record tracking kind, approval state, LP-redaction, AI status,
 * and force-override audit trail.
 *
 * Spec reference: SPEC-SHOOTS-002 §5, L_AI-7, L_AI-12
 */
export const ShootAssetSchema = z.object({
  id: z.string().min(1),
  shootId: z.string().min(1),
  vin: z.string().min(17).max(17),
  kind: ShootAssetKindEnum,
  sortOrder: z.number().int().nonnegative(),
  rawUrl: z.string(),
  processedUrl: z.string().nullable(),
  approved: z.boolean(),
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  /** L_AI-5: must be true for exterior kinds before approveAsset succeeds */
  lpRedacted: z.boolean(),
  redactedAt: z.string().nullable(),
  redactedBy: z.string().nullable(),
  aiStatus: ShootAssetAiStatusEnum,
  aiRequestedAt: z.string().nullable(),
  aiCompletedAt: z.string().nullable(),
  aiErrorMessage: z.string().nullable(),
  /** L_AI-19: number of retry attempts made on this asset (incremented by retryAiProcess). */
  aiRetryCount: z.number().int().min(0).default(0),
  /** L_AI-19: ISO timestamp of the most recent AI failure on this asset. */
  aiLastFailedAt: z.string().nullable().default(null),
  /** L_AI-16: vendorJobId returned by the adapter enqueue call; null until queued. */
  vendorJobId: z.string().nullable().default(null),
  capturedAt: z.string(),
  capturedBy: z.string(),
  /** L_AI-10: additive field for P2 S3 swap-in; null in mock phase */
  s3Key: z.string().nullable().default(null),
  /**
   * B3 (security review #3): Persistent force-approval audit fields.
   * When forceApprovedWithoutRedaction === true:
   *   - asset card renders a permanent red "Force-approved without redaction" badge
   *   - customer-web selectStorefrontGalleryForVin EXCLUDES this asset (L_AI-9)
   * These fields NEVER revert on unapprove — they are a permanent audit trail.
   */
  forceApprovedWithoutRedaction: z.boolean().default(false),
  forceApprovedReason: z.string().nullable().default(null),
  forceApprovedBy: z.string().nullable().default(null),
  forceApprovedAt: z.string().nullable().default(null),
});
export type ShootAsset = z.infer<typeof ShootAssetSchema>;

// ─── Shoot (v1 — unchanged for back-compat) ──────────────────────────────────

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
  // assetCount, videoCount, assetUrls REMOVED in v2.1 (L_AI-20).
  // Use shoot.assets.length, shoot.assets.filter(a => a.kind === 'video_walkaround').length,
  // and shoot.assets.map(a => a.processedUrl ?? a.rawUrl) respectively.
  // ShootIncompleteError is retained as @deprecated export for archeological clarity.
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  notes: z.string(),
  outletId: z.enum(['BLR-01', 'MUM-01', 'CHE-01']),
  /** Denormalized from vehicles-store for list display */
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().int().positive().optional(),
  // ── v2 additions (L_AI-1) ─────────────────────────────────────────────────
  /** v2: per-asset object model. Empty array for v1 fixtures (L_AI-6 migration). */
  assets: z.array(ShootAssetSchema).default([]),
  /** v2: ID of the designated cover asset (defaults to front_3q_driver). */
  coverAssetId: z.string().nullable().default(null),
  /**
   * v2: AI vendor in use.
   * NONE in P1 stub; SPYNE_AI default for new shoots post-v2.1 (L_AI-4, L_AI-15).
   */
  aiVendor: z.enum(['NONE', 'SPYNE_AI', 'CUSTOM']).default('SPYNE_AI'),
  /**
   * v2: Per-shoot AI processing policy.
   * Extended in v2.1 with failureRate/failureSeed/maxRetries (L_AI-17, L_AI-19).
   */
  aiPolicy: z.object({
    autoQueueOnUpload: z.boolean(),
    autoApproveProcessed: z.boolean(),
    /** L_AI-17: deterministic failure rate 0–100 (default 10 = 10%). */
    failureRate: z.number().min(0).max(100).default(10),
    /** L_AI-17: seed for reproducible failure injection in tests. */
    failureSeed: z.number().default(0),
    /** L_AI-19: max retries before permanent manual-only (default 3). */
    maxRetries: z.number().int().min(0).default(3),
  }).default({
    autoQueueOnUpload: false,
    autoApproveProcessed: false,
    failureRate: 10,
    failureSeed: 0,
    maxRetries: 3,
  }),
});

export type Shoot = z.infer<typeof ShootSchema>;

// ─── Error classes ────────────────────────────────────────────────────────────

/**
 * Thrown when a LISTED transition is attempted but the Shoot for the VIN
 * does not meet the ≥10 photos + ≥1 video threshold.
 *
 * Spec reference: SPEC-SHOOTS-001 L2
 *
 * @deprecated — superseded by ShootSlotIncompleteError (v2 flag-gated LISTED transitions).
 * The v1 count-only LISTED guard is removed in v2.1 (L_AI-20). No live throw site exists
 * after v2.1; retained as an export for archeological clarity and v1 test back-compat.
 * See SPEC-SHOOTS-001 §10 (L2 supersession by L_AI-6).
 */
export class ShootIncompleteError extends Error {
  readonly vin: string;
  /** @deprecated v1 field — use shoot.assets.length instead */
  readonly assetCount: number;
  /** @deprecated v1 field — use shoot.assets.filter(a => a.kind === 'video_walkaround').length */
  readonly videoCount: number;
  readonly requiredPhotos: number;
  readonly requiredVideos: number;

  constructor(
    vin: string,
    assetCount = 0,
    videoCount = 0,
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

/**
 * Thrown when an exterior asset's license plate has not been redacted but
 * approval is attempted.
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-5, SC-5
 */
export class LpRedactionRequiredError extends Error {
  readonly vin: string;
  readonly assetId: string;
  readonly kind: ShootAssetKind;

  constructor(vin: string, assetId: string, kind: ShootAssetKind) {
    super(
      `License plate redaction required for ${kind} asset ${assetId} on VIN ${vin}`,
    );
    this.name = 'LpRedactionRequiredError';
    this.vin = vin;
    this.assetId = assetId;
    this.kind = kind;
  }
}

/**
 * Thrown when an asset approval precondition fails (role insufficient,
 * AI failed, cover precondition, R09 forbidden action, etc.).
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-7, SC-7, SC-10, SC-23, SC-24
 */
export class AssetApprovalPreconditionError extends Error {
  readonly vin: string;
  readonly assetId: string;
  readonly reason: string;

  constructor(vin: string, assetId: string, reason: string) {
    super(`Asset ${assetId} (VIN ${vin}) cannot be approved: ${reason}`);
    this.name = 'AssetApprovalPreconditionError';
    this.vin = vin;
    this.assetId = assetId;
    this.reason = reason;
  }
}

/**
 * Thrown when a LISTED transition fails because one or more REQUIRED slot
 * kinds lack an approved asset.
 *
 * Supersedes ShootIncompleteError for v2 flag-gated LISTED transitions.
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-6, SC-12, SC-25
 */
export class ShootSlotIncompleteError extends Error {
  readonly vin: string;
  readonly missingKinds: ShootAssetKind[];

  constructor(vin: string, missingKinds: ShootAssetKind[]) {
    super(
      `Shoot for VIN ${vin} missing required approved kinds: ${missingKinds.join(', ')}`,
    );
    this.name = 'ShootSlotIncompleteError';
    this.vin = vin;
    this.missingKinds = missingKinds;
  }
}
