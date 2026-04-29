/**
 * Custom Builds domain types.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §3 (entities), §4 (state machine),
 *                 §7 (parts catalog), §8 (vendors)
 *
 * L1: BuildJob is NOT a JobCard — separate state machine, separate store.
 * L3: Aftermarket parts use CB- SKU prefix; separate catalog from OEM parts.
 * L15: hasRank numeric comparator — roles compared via ROLE_RANK map.
 */

import { z } from 'zod';

// ─── Build Job Stage ──────────────────────────────────────────────────────────

/**
 * §4 state machine stages.
 * DELIVERED and CANCELLED are terminal. QC_FAILED is a resting state (§4 B5).
 */
export const BuildJobStageEnum = z.enum([
  'ENQUIRY',
  'QUOTED',
  'APPROVED',
  'PARTS_ORDERING',
  'IN_PROGRESS',
  'QC',
  'QC_FAILED',
  'DELIVERED',
  'CANCELLED',
]);
export type BuildJobStage = z.infer<typeof BuildJobStageEnum>;

// ─── Aftermarket Part Category ────────────────────────────────────────────────

export const AftermarketPartCategoryEnum = z.enum([
  'aero',
  'wheels',
  'suspension',
  'exhaust',
  'paint',
  'interior',
  'ecu',
  'lighting',
]);
export type AftermarketPartCategory = z.infer<typeof AftermarketPartCategoryEnum>;

// ─── Vendor ───────────────────────────────────────────────────────────────────

export const CustomBuildVendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialties: z.array(AftermarketPartCategoryEnum),
  city: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  rating: z.number().min(1).max(5),
  paymentTerms: z.string(),
  dayRate: z.number(),
  activeJobCount: z.number(),
  lifetimeJobCount: z.number(),
  onTimePct: z.number().min(0).max(100),
  gstIn: z.string().optional(),
  active: z.boolean(),
});
export type CustomBuildVendor = z.infer<typeof CustomBuildVendorSchema>;

// ─── Aftermarket Part ─────────────────────────────────────────────────────────

export const CustomBuildPartSchema = z.object({
  sku: z.string(),
  name: z.string(),
  brand: z.string(),
  category: AftermarketPartCategoryEnum,
  listPrice: z.number(),
  bnCost: z.number(),
  vendorId: z.string(),
  compatibility: z.object({
    makes: z.array(z.string()),
    models: z.array(z.string()).optional(),
  }),
  installHours: z.number(),
  renderAssetKey: z.string(),
  description: z.string().optional(),
  techNotes: z.string().optional(),
});
export type CustomBuildPart = z.infer<typeof CustomBuildPartSchema>;

// ─── Build Job Parts Line ─────────────────────────────────────────────────────

export const BuildJobPartLineSchema = z.object({
  partSku: z.string(),
  partName: z.string(),
  brand: z.string(),
  category: AftermarketPartCategoryEnum,
  qty: z.number().int().positive(),
  unitCost: z.number(),
  installHours: z.number(),
  vendorId: z.string(),
});
export type BuildJobPartLine = z.infer<typeof BuildJobPartLineSchema>;

// ─── Visualizer Customizations (P3.3 — L63) ──────────────────────────────────

/**
 * §31 L63: Per-category customization state for the 3D Ferrari visualizer.
 * All fields optional — omitted field means stock configuration.
 * Persisted on save via existing saveVisualizerState action.
 */
export const WheelMaterialEnum = z.enum([
  'silver',
  'gunmetal',
  'gloss-black',
  'bronze',
  'brushed',
]);
export type WheelMaterial = z.infer<typeof WheelMaterialEnum>;

export const DecalSlotEnum = z.enum([
  'door-left',
  'door-right',
  'hood',
  'fender-left',
  'fender-right',
  'trunk',
]);
export type DecalSlot = z.infer<typeof DecalSlotEnum>;

export const TintColorEnum = z.enum(['smoke', 'amber', 'blue', 'green', 'mirror', 'clear']);
export type TintColor = z.infer<typeof TintColorEnum>;

export const ExhaustTipStyleEnum = z.enum([
  'stock-chrome',
  'twin-polished',
  'quad-black',
  'carbon-tipped',
]);
export type ExhaustTipStyle = z.infer<typeof ExhaustTipStyleEnum>;

export const VisualizationCustomizationsSchema = z.object({
  wheelMaterial: WheelMaterialEnum.optional(),
  decals: z
    .array(
      z.object({
        slot: DecalSlotEnum,
        decalId: z.string(),
        rotation: z.enum(['0', '90', '180', '270']),
      }),
    )
    .default([]),
  tint: z
    .object({
      level: z.number().min(0).max(100),
      color: TintColorEnum,
    })
    .optional(),
  exhaust: z
    .object({
      tipStyle: ExhaustTipStyleEnum,
      mufflerDeleted: z.boolean(),
    })
    .optional(),
  suspension: z
    .object({
      loweringMm: z.number().min(0).max(50),
    })
    .optional(),
  // P3.3.6 — priced catalog selection IDs (L78)
  wheelOptionId: z.string().optional(),
  tintOptionId: z.string().optional(),
  exhaustOptionId: z.string().optional(),
  suspensionOptionId: z.string().optional(),
  hoodOptionId: z.string().optional(),
  wingOptionId: z.string().optional(),
  // Aero group for hood + wing (L79)
  aero: z
    .object({
      hood: z.string().optional(),
      wing: z.string().optional(),
    })
    .optional(),
});
export type VisualizerCustomizations = z.infer<typeof VisualizationCustomizationsSchema>;

// ─── Visualizer State ─────────────────────────────────────────────────────────

export const VisualizerLayerSchema = z.object({
  category: z.string(),
  variantSlug: z.string(),
  visible: z.boolean(),
});

/** L48: Fine-control slider values persisted alongside the visualizer state. */
export const VisualizerFineControlsSchema = z.object({
  /** 0–100: window tint overlay opacity */
  windowTintIntensity: z.number().min(0).max(100),
  /** 0–100: paint metallic brightness/saturation modifier */
  paintMetallicIntensity: z.number().min(0).max(100),
  /** 18–22 inches, discrete */
  wheelSize: z.number().min(18).max(22).int(),
});
export type VisualizerFineControls = z.infer<typeof VisualizerFineControlsSchema>;

export const VisualizerStateSchema = z.object({
  modelSlug: z.string(),
  layers: z.array(VisualizerLayerSchema),
  savedAt: z.string(),
  savedBy: z.string(),
  /** L48 (locked): fine-control values persisted on save */
  fineControls: VisualizerFineControlsSchema.optional(),
  /** L63 (P3.3): 3D customization state — wheels, tint, exhaust, suspension, decals */
  customizations: VisualizationCustomizationsSchema.optional(),
});
export type VisualizerState = z.infer<typeof VisualizerStateSchema>;

// ─── Activity Event ───────────────────────────────────────────────────────────

export const BuildActivityEventTypeEnum = z.enum([
  'job_created',
  'stage_advanced',
  'quote_saved',
  'finance_approved',
  'qc_failed',
  'vendor_confirmed',
  'note_added',
  'job_cancelled',
  'job_delivered',
]);
export type BuildActivityEventType = z.infer<typeof BuildActivityEventTypeEnum>;

export const BuildActivityEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  actorRole: z.string(),
  type: BuildActivityEventTypeEnum,
  note: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type BuildActivityEvent = z.infer<typeof BuildActivityEventSchema>;

// ─── Build Job ────────────────────────────────────────────────────────────────

export const BuildJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  stage: BuildJobStageEnum,

  // Single-source-of-truth references (L2)
  customerId: z.string(),
  vin: z.string(),

  // Assignment
  advisorId: z.string().optional(),
  technicianId: z.string().optional(),
  outletId: z.string(),

  // Vendor
  vendorId: z.string().optional(),
  vendorNotes: z.string().optional(),
  vendorConfirmationStatus: z.enum(['pending', 'confirmed', 'revised']).optional(),

  // Schedule
  estimatedStartDate: z.string().optional(),
  estimatedCompletionDate: z.string().optional(),

  // Parts
  parts: z.array(BuildJobPartLineSchema),

  // Quote
  quoteTotal: z.number().optional(),
  marginPct: z.number().default(15),
  quoteToken: z.string().optional(),
  quoteCreatedAt: z.string().optional(),
  quoteExpiresAt: z.string().optional(),

  // Finance gate (L10)
  financeApprovalAt: z.string().optional(),
  financeApprovedBy: z.string().optional(),

  // Cancellation
  cancelReason: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancelledBy: z.string().optional(),

  // Visualizer (P3 — stored but not rendered in P1)
  visualizerState: VisualizerStateSchema.optional(),

  // Share token (P2)
  shareToken: z.string().optional(),
  shareExpiresAt: z.string().optional(),

  // Enquiry notes
  enquiryNotes: z.string().optional(),

  // Activity log
  activityLog: z.array(BuildActivityEventSchema),

  // P4 — Cost-ledger write audit ref (L39). Written once on deliverJob success.
  // Makes writes idempotent: second deliverJob call is a no-op when ref exists.
  costLedgerWriteRef: z.object({
    writtenAt: z.string(),
    entryIds: z.array(z.string()),
  }).optional(),

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),
  deliveredAt: z.string().optional(),
});
export type BuildJob = z.infer<typeof BuildJobSchema>;

// ─── State machine transition table ──────────────────────────────────────────

/**
 * §4 allowed transitions. Terminal states have empty arrays.
 * QC_FAILED → IN_PROGRESS is the rework path (B5).
 */
export const BUILD_JOB_TRANSITIONS: Record<BuildJobStage, BuildJobStage[]> = {
  ENQUIRY: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'ENQUIRY', 'CANCELLED'],
  APPROVED: ['PARTS_ORDERING', 'CANCELLED'],
  PARTS_ORDERING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['QC', 'CANCELLED'],
  QC: ['QC_FAILED', 'DELIVERED'],
  QC_FAILED: ['IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Minimum role required to perform each transition (§4 transition table).
 * Keyed as `FROM→TO`.
 */
export const BUILD_TRANSITION_ROLE: Record<string, string> = {
  'ENQUIRY→QUOTED': 'R09',
  'ENQUIRY→CANCELLED': 'R19',
  'QUOTED→APPROVED': 'R10',
  'QUOTED→ENQUIRY': 'R09',
  'QUOTED→CANCELLED': 'R19',
  'APPROVED→PARTS_ORDERING': 'R10',
  'APPROVED→CANCELLED': 'R19',
  'PARTS_ORDERING→IN_PROGRESS': 'R09',
  'PARTS_ORDERING→CANCELLED': 'R19',
  'IN_PROGRESS→QC': 'R11',
  'IN_PROGRESS→CANCELLED': 'R19',
  'QC→QC_FAILED': 'R10',
  'QC→DELIVERED': 'R10',
  'QC_FAILED→IN_PROGRESS': 'R10',
};

// ─── Custom errors ────────────────────────────────────────────────────────────

export class FinanceApprovalRequiredError extends Error {
  constructor(jobId: string) {
    super(`Finance approval required for job ${jobId} (quoteTotal > ₹2,00,000)`);
    this.name = 'FinanceApprovalRequiredError';
  }
}

export class InvalidStageTransitionError extends Error {
  constructor(from: BuildJobStage, to: BuildJobStage) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = 'InvalidStageTransitionError';
  }
}

export class InsufficientRoleError extends Error {
  constructor(required: string, actual: string) {
    super(`Requires ${required} or above; actor has ${actual}`);
    this.name = 'InsufficientRoleError';
  }
}

export class JobDeliveredImmutableError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} is DELIVERED — no further mutations allowed`);
    this.name = 'JobDeliveredImmutableError';
  }
}

export class JobAlreadyDeliveredError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} is already DELIVERED`);
    this.name = 'JobAlreadyDeliveredError';
  }
}
