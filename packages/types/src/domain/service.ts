import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const JobCardStatusEnum = z.enum([
  'AWAITING_CONFIRMATION', // portal-originated bookings only — pre-RECEIVED
  'RECEIVED',
  'DIAGNOSED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'ADDITIONAL_WORK_APPROVAL',
  'QC',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REOPENED',
]);

export const BayStatusEnum = z.enum([
  'FREE',
  'OCCUPIED',
  'RESERVED',
  'MAINTENANCE',
]);

export const BayTypeEnum = z.enum([
  'GENERAL',
  'DETAILING',
  'PAINT',
  'MECHANICAL',
  'DIAGNOSTIC',
]);

export const AppointmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'CANCELLED',
  'NO_SHOW',
]);

export const WarrantyClaimStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PAID',
]);

export const WarrantyClaimTypeEnum = z.enum([
  'MANUFACTURER',
  'EXTENDED',
  'CPO',
  'GOODWILL',
]);

export const InspectionOutcomeEnum = z.enum([
  'PASS',
  'FAIL',
  'ADVISE',
  'NA',
]);

export const LabourLineStatusEnum = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'DONE',
  'SKIPPED',
]);

export const PartsLineStatusEnum = z.enum([
  'REQUESTED',
  'RESERVED',
  'ISSUED',
  'FITTED',
  'RETURNED',
]);

export const JobCardPriorityEnum = z.enum([
  'LOW',
  'NORMAL',
  'HIGH',
  'VIP',
]);

// ─── Inferred enum types ──────────────────────────────────────────────────────

export type JobCardStatus = z.infer<typeof JobCardStatusEnum>;
export type BayStatus = z.infer<typeof BayStatusEnum>;
export type BayType = z.infer<typeof BayTypeEnum>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;
export type WarrantyClaimStatus = z.infer<typeof WarrantyClaimStatusEnum>;
export type WarrantyClaimType = z.infer<typeof WarrantyClaimTypeEnum>;
export type InspectionOutcome = z.infer<typeof InspectionOutcomeEnum>;
export type LabourLineStatus = z.infer<typeof LabourLineStatusEnum>;
export type PartsLineStatus = z.infer<typeof PartsLineStatusEnum>;
export type JobCardPriority = z.infer<typeof JobCardPriorityEnum>;

// ─── Bay ──────────────────────────────────────────────────────────────────────

export const BaySchema = z.object({
  id: z.string(),
  code: z.string(), // e.g. 'BAY-01'
  type: BayTypeEnum,
  status: BayStatusEnum,
  outletId: z.string(),
  currentJobCardId: z.string().optional(),
  advisorId: z.string().optional(),
});

export type Bay = z.infer<typeof BaySchema>;

// ─── Labour Line ──────────────────────────────────────────────────────────────

export const LabourLineSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  flatRateHours: z.number(),
  actualHours: z.number().optional(),
  rate: z.number(), // ₹ per hour
  technicianId: z.string(),
  status: LabourLineStatusEnum,
});

export type LabourLine = z.infer<typeof LabourLineSchema>;

// ─── Parts Line ───────────────────────────────────────────────────────────────

export const PartsLineSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  warrantyCovered: z.boolean(),
  status: PartsLineStatusEnum,
  supplierId: z.string().optional(),
});

export type PartsLine = z.infer<typeof PartsLineSchema>;

// ─── Job Card ─────────────────────────────────────────────────────────────────

export const JobCardSchema = z.object({
  id: z.string(),
  jobNo: z.string(), // e.g. 'JC-2026-00123'
  vin: z.string(),
  customerId: z.string(),
  outletId: z.string(),
  advisorId: z.string(),
  technicianIds: z.array(z.string()),
  bayId: z.string().optional(),
  status: JobCardStatusEnum,
  priority: JobCardPriorityEnum,
  promisedAt: z.string(), // ISO
  receivedAt: z.string(), // ISO
  completedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  customerComplaint: z.string(),
  diagnosticNotes: z.string().optional(),
  odometerIn: z.number(),
  odometerOut: z.number().optional(),
  estimatedTotal: z.number(),
  finalTotal: z.number().optional(),
  labourLines: z.array(LabourLineSchema),
  partsLines: z.array(PartsLineSchema),
  inspectionId: z.string().optional(),
  warrantyClaimId: z.string().optional(),
  attachments: z.array(z.string()),
  // Portal booking fields (SPEC-CUSTOMER-PORTAL-002 §5.2)
  source: z.enum(['STAFF', 'CUSTOMER_PORTAL']).optional(),   // default: STAFF
  serviceTypeId: z.string().optional(),                       // references service-types fixture id
  scheduledDate: z.string().optional(),                       // YYYY-MM-DD
  scheduledSlot: z.enum(['MORNING', 'AFTERNOON']).optional(),
  pickupMode: z.enum(['WORKSHOP_DROP', 'HOME_PICKUP']).optional(),
  pickupAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    pinCode: z.string(),
  }).optional(),
  concerns: z.string().optional(),
  declineReason: z.string().optional(),
  // SPEC-SERVICE-INTAKE-001 L1: back-reference to the intake inspection aggregate (id-only)
  // These are optional so existing fixtures do not break — intake is captured post-JC-creation
  intakeInspectionId: z.string().optional(),
  intakeInspectionCompletedAt: z.string().optional(), // ISO datetime; set when intake reaches COMPLETED
});

export type JobCard = z.infer<typeof JobCardSchema>;

// ─── Inspection Item ──────────────────────────────────────────────────────────

export const InspectionItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  outcome: InspectionOutcomeEnum,
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type InspectionItem = z.infer<typeof InspectionItemSchema>;

// ─── Inspection ───────────────────────────────────────────────────────────────

export const InspectionSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  type: z.enum(['VHC_210', 'PRE_DELIVERY', 'POST_SERVICE']),
  items: z.array(InspectionItemSchema),
  completedByTechnicianId: z.string(),
  completedAt: z.string(), // ISO
  summary: z.object({
    pass: z.number(),
    fail: z.number(),
    advise: z.number(),
    na: z.number(),
  }),
});

export type Inspection = z.infer<typeof InspectionSchema>;

// ─── Appointment ──────────────────────────────────────────────────────────────

export const AppointmentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  vin: z.string().optional(),
  outletId: z.string(),
  serviceTypeId: z.string(),
  scheduledAt: z.string(), // ISO
  estimatedDurationMins: z.number(),
  advisorId: z.string().optional(),
  bayId: z.string().optional(),
  status: AppointmentStatusEnum,
  notes: z.string().optional(),
  createdAt: z.string(), // ISO
});

export type Appointment = z.infer<typeof AppointmentSchema>;

// ─── Warranty Claim ───────────────────────────────────────────────────────────

export const WarrantyClaimSchema = z.object({
  id: z.string(),
  claimNo: z.string(), // e.g. 'CLM-2026-0001'
  vin: z.string(),
  jobCardId: z.string().optional(),
  type: WarrantyClaimTypeEnum,
  status: WarrantyClaimStatusEnum,
  submittedAt: z.string().optional(),
  amount: z.number(),
  reason: z.string(),
  partsIds: z.array(z.string()),
  labourIds: z.array(z.string()),
  approvedAt: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

export type WarrantyClaim = z.infer<typeof WarrantyClaimSchema>;

// ─── Job Card Timeline Event ──────────────────────────────────────────────────

export const JobCardTimelineEventTypeEnum = z.enum([
  'received',
  'diagnosed',
  'estimate_approved',
  'labour_started',
  'part_reserved',
  'part_fitted',
  'inspection_complete',
  'qc_passed',
  'ready_for_delivery',
  'delivered',
  'note',
  'photo_uploaded',
  'status_changed',
  'cancelled',
  'reopened',
  'labour_complete',
  'advisor_reassigned',
  'bay_changed',
  'bay_assigned',
  'bay_freed',
  'appointment_checkin',
  'cloned',
]);

export type JobCardTimelineEventType = z.infer<typeof JobCardTimelineEventTypeEnum>;

export const JobCardTimelineEventSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  at: z.string(), // ISO
  actorId: z.string(),
  actorName: z.string(),
  type: JobCardTimelineEventTypeEnum,
  description: z.string(),
  metadata: z.record(z.unknown()),
});

export type JobCardTimelineEvent = z.infer<typeof JobCardTimelineEventSchema>;

// ─── Advisor Note ─────────────────────────────────────────────────────────────

export const AdvisorNoteSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  authorId: z.string(),
  at: z.string(), // ISO
  text: z.string(),
  pinned: z.boolean().optional(),
});

export type AdvisorNote = z.infer<typeof AdvisorNoteSchema>;
