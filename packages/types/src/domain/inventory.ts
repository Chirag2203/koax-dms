import { z } from 'zod';

// ─── Cost Ledger ──────────────────────────────────────────────────────────────

export const CostLedgerCategoryEnum = z.enum([
  'acquisition',
  'refurb-mechanical',
  'refurb-cosmetic',
  'refurb-detailing',
  'transport',
  'registration-tax',
  'insurance',
  'floor-plan-interest',
  'overhead',
  'photography',
  'misc',
  // P4 — Custom Builds write-back (SPEC-CUSTOM-BUILDS-001 L9 / L17)
  'custom-build-parts',
  'custom-build-labour',
  'custom-build-vendor-fee',
  // §38 L95 — visualizer customization aggregate (paint + wheels + tint + exhaust + suspension + hood + wing + decals)
  'custom-build-customizations',
]);
export type CostLedgerCategory = z.infer<typeof CostLedgerCategoryEnum>;

export const CostLedgerEntrySchema = z.object({
  id: z.string(),
  vin: z.string(),
  category: CostLedgerCategoryEnum,
  date: z.string(),
  amount: z.number(),
  note: z.string().optional(),
  addedBy: z.string(),
  addedAt: z.string(),
});
export type CostLedgerEntry = z.infer<typeof CostLedgerEntrySchema>;

// ─── Appraisal ────────────────────────────────────────────────────────────────

export const AppraisalGradeEnum = z.enum(['A', 'A-', 'B+', 'B', 'B-', 'C']);
export type AppraisalGrade = z.infer<typeof AppraisalGradeEnum>;

export const AppraisalSchema = z.object({
  id: z.string(),
  vin: z.string(),
  grade: AppraisalGradeEnum,
  pointsCompleted: z.number(),
  pointsTotal: z.number(),
  inspectorName: z.string(),
  inspectionDate: z.string(),
  notes: z.string().optional(),
});
export type Appraisal = z.infer<typeof AppraisalSchema>;

// ─── Vehicle Timeline ─────────────────────────────────────────────────────────

export const VehicleTimelineEventTypeEnum = z.enum([
  'created',
  'submitted',
  'approved',
  'rejected',
  'published',
  'unpublished',
  'reserved',
  'sold',
  'archived',
  'cost-added',
  'price-changed',
  'refurb-started',
  'refurb-complete',
]);
export type VehicleTimelineEventType = z.infer<typeof VehicleTimelineEventTypeEnum>;

export const VehicleTimelineEventSchema = z.object({
  id: z.string(),
  vin: z.string(),
  type: VehicleTimelineEventTypeEnum,
  actorId: z.string(),
  actorName: z.string(),
  timestamp: z.string(),
  note: z.string().optional(),
});
export type VehicleTimelineEvent = z.infer<typeof VehicleTimelineEventSchema>;

// ─── Vehicle Document ─────────────────────────────────────────────────────────

export const VehicleDocumentTypeEnum = z.enum([
  'rc',
  'insurance',
  'appraisal',
  'inspection',
  'tally-export',
  'invoice',
  'transfer-deed',
  'other',
]);
export type VehicleDocumentType = z.infer<typeof VehicleDocumentTypeEnum>;

export const VehicleDocumentSchema = z.object({
  id: z.string(),
  vin: z.string(),
  type: VehicleDocumentTypeEnum,
  name: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  fileSize: z.string(),
  fileUrl: z.string(),
});
export type VehicleDocument = z.infer<typeof VehicleDocumentSchema>;
