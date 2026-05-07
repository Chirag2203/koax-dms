/**
 * SPEC-SERVICE-INTAKE-001 — Vehicle Intake Inspection Sheet
 * L1: IntakeInspection is a first-class aggregate in its own types file.
 * JC carries intakeInspectionId? as a back-reference only.
 */

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const IntakeInspectionStateEnum = z.enum([
  'DRAFT',
  'CUSTOMER_SIGNED',
  'SHEET_UPLOADED',
  'COMPLETED',
  'AMENDED',
]);
export type IntakeInspectionState = z.infer<typeof IntakeInspectionStateEnum>;

// L5: 5-step fuel level (prefixed IntakeFuelLevel to avoid conflict with test-drive.FuelLevelEnum)
export const IntakeFuelLevelEnum = z.enum(['EMPTY', 'Q1', 'Q2', 'Q3', 'FULL']);
export type IntakeFuelLevel = z.infer<typeof IntakeFuelLevelEnum>;

// Section C: key count
export const KeyCountEnum = z.enum(['1', '2', '3+']);
export type KeyCount = z.infer<typeof KeyCountEnum>;

export const KeyTypeEnum = z.enum(['SMART_ONLY', 'SMART_PLUS_VALET', 'BOTH', 'NA']);
export type KeyType = z.infer<typeof KeyTypeEnum>;

// Section B: damage code — S=scratch, D=dent, C=chip-crack, R=rust, B=broken/missing, P=paint-fade
export const DamageCodeEnum = z.enum(['S', 'D', 'C', 'R', 'B', 'P']);
export type DamageCode = z.infer<typeof DamageCodeEnum>;

export const DamageViewEnum = z.enum(['TOP', 'FRONT', 'REAR', 'LEFT', 'RIGHT']);
export type DamageView = z.infer<typeof DamageViewEnum>;

export const DamageSeverityEnum = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type DamageSeverity = z.infer<typeof DamageSeverityEnum>;

// Section D: battery + tyre
export const BatteryConditionEnum = z.enum(['OK', 'LOW', 'DEAD', 'NOT_TESTED']);
export type BatteryCondition = z.infer<typeof BatteryConditionEnum>;

export const TyreConditionEnum = z.enum(['GOOD', 'WORN', 'DAMAGED']);
export type TyreCondition = z.infer<typeof TyreConditionEnum>;

// Section C: RC and insurance tri-state
// MV Act §130 / §145 — tri-state distinguishes "checked, absent" from "not checked"
// (Sec wave-2 #9: NOT_VERIFIED means the check was not performed, ABSENT means
// it was checked and found absent — important legal distinction)
export const PresenceEnum = z.enum(['PRESENT', 'ABSENT', 'NOT_VERIFIED']);
export type Presence = z.infer<typeof PresenceEnum>;

// L5: typed slot enum for 10 prescriptive photo positions
export const IntakePhotoSlotEnum = z.enum([
  'front_3q_driver',
  'front_3q_passenger',
  'rear_3q_driver',
  'rear_3q_passenger',
  'driver_profile',
  'passenger_profile',
  'odometer',
  'fuel_gauge',
  'interior',
  'boot',
]);
export type IntakePhotoSlot = z.infer<typeof IntakePhotoSlotEnum>;

// ─── Amendment schema ─────────────────────────────────────────────────────────

// L8 (tightened): amendment audit MUST exclude customerSignatureDataUrl,
// saSignatureDataUrl, and photo dataUrls from scalarDiffs — only scalar
// before/after values are stored (never base64 image payloads).
export const IntakeAmendmentSchema = z.object({
  at: z.string().datetime(),
  byEmployeeId: z.string(),
  byRole: z.string(), // QA #5: actorRole stored for standalone debugging
  reason: z.string().min(10), // L8: reason text required, min 10 chars
  changedFields: z.array(z.string()),
  scalarDiffs: z.record(
    z.object({
      before: z.unknown(),
      after: z.unknown(),
    }),
  ),
});
export type IntakeAmendment = z.infer<typeof IntakeAmendmentSchema>;

// ─── Damage Callout ───────────────────────────────────────────────────────────

export const IntakeDamageCalloutSchema = z.object({
  id: z.string(),
  intakeInspectionId: z.string(),
  number: z.number().int().min(1), // auto-numbered per intake
  view: DamageViewEnum,
  locationText: z.string().min(1).max(200),
  code: DamageCodeEnum, // S/D/C/R/B/P
  severity: DamageSeverityEnum, // 1/2/3
  customerInitial: z.string().optional(),
  saInitial: z.string().optional(),
  observedAt: z.string().datetime(),
});
export type IntakeDamageCallout = z.infer<typeof IntakeDamageCalloutSchema>;

// ─── Intake Photo ─────────────────────────────────────────────────────────────

// L5: photos in their own typed-slot collection; NOT co-mingled with JC photos[]
// L14: pii_sensitivity: medium — slot 7 (odometer) and slot 9 (interior) can
// capture personal effects; access mirrors L11.
export const IntakeInspectionPhotoSchema = z.object({
  id: z.string(),
  intakeInspectionId: z.string(),
  jobCardId: z.string(),
  dataUrl: z.string(), // base64; v1.5 backend adds s3Key?
  slot: IntakePhotoSlotEnum, // typed slot (L5)
  capturedAt: z.string().datetime(),
  uploadedBy: z.string(), // employeeId
  s3Key: z.string().optional(), // L5: forward-compat; backend swap-in adds this without schema breaks
});
export type IntakeInspectionPhoto = z.infer<typeof IntakeInspectionPhotoSchema>;

// ─── Intake Inspection (main aggregate) ──────────────────────────────────────

export const IntakeInspectionSchema = z.object({
  id: z.string(),
  jobCardId: z.string(), // FK to JobCard — L1: JC carries intakeInspectionId?, intake carries jobCardId
  outletId: z.string(), // L8: inherited from JC at create; immutable thereafter (§8 row 4)
  inspectionAt: z.string().datetime(),

  // — Section A: Vehicle ident —
  // NOTE: VIN, make, model, year, exteriorColor are NOT stored on IntakeInspection.
  // They are resolved at render time via Seam 46 (vehicles-store) per §8.
  // Only intake-time snapshot fields are stored here.
  regNumber: z.string(), // Indian registration number (lenient validation)
  odometerKm: z.number().int().min(0).max(9_999_999), // §8: SoT for intake-time odometer
  fuelLevel: IntakeFuelLevelEnum,

  // — Section D: Functional —
  battery12VCondition: BatteryConditionEnum.default('NOT_TESTED'),
  tyreCondition: z.object({
    FL: TyreConditionEnum,
    FR: TyreConditionEnum,
    RL: TyreConditionEnum,
    RR: TyreConditionEnum,
  }),
  acFunctional: z.boolean(),
  wipersFunctional: z.boolean(),
  lightsFunctional: z.boolean(),
  infotainmentFunctional: z.boolean().optional(),
  dashboardWarningLightsNote: z.string().max(200).default(''),
  // DMS-only tyre tread (mm per wheel) — never on customer copy; VHC owns tread measurement
  tyreTreadMmFL: z.number().optional(),
  tyreTreadMmFR: z.number().optional(),
  tyreTreadMmRL: z.number().optional(),
  tyreTreadMmRR: z.number().optional(),

  // — Section C: Inventory —
  spareTyrePresent: z.boolean(),
  toolKitPresent: z.boolean(),
  keyCount: KeyCountEnum,
  keyType: KeyTypeEnum.optional(),
  serviceBookPresent: z.boolean(),
  // MV Act §130 — tri-state distinguishes "checked, absent" from "not checked"
  rcInVehicle: PresenceEnum.default('NOT_VERIFIED'),
  // MV Act §145 — same tri-state rationale
  insuranceCertInVehicle: PresenceEnum.default('NOT_VERIFIED'),
  cabinAccessoriesNote: z.string().max(200).default(''),

  // — Section B: Body damage —
  damageCalloutIds: z.array(z.string()), // FKs to IntakeDamageCallout
  damageDiagramAnnotations: z.string().optional(), // P2 SVG path JSON; forward-compat

  // — Section E: Signatures (PII) —
  // L11: customerSignatureDataUrl is pii_sensitivity: medium; redacted for R11
  customerSignatureDataUrl: z.string().optional(), // base64 PNG
  customerSignedAt: z.string().datetime().optional(),
  saName: z.string(),
  saEmployeeId: z.string(),
  saSignatureDataUrl: z.string(),
  saSignedAt: z.string().datetime(),

  // — DMS-only fields — never on customer copy —
  nextActionNoteForWorkshop: z.string().max(500).default(''), // never on customer copy
  priorVisitDamageHistorySummary: z.string().optional(), // P1 stub-empty; P2 populated
  signedSheetAttachmentId: z.string().optional(), // reverse-link to uploaded signed sheet
  signedSheetUploadedAt: z.string().datetime().optional(),

  // L7: 5-year retention; v1 records date only; v1.5 wires automated purge (DEF-INTAKE-1)
  retainUntil: z.string().date(), // ISO date — createdAt + 5y
  retentionPolicy: z.literal('INTAKE_INSPECTION_5Y'),

  // L8: version + amendment audit trail
  version: z.number().int().min(1).default(1),
  // L8 (tightened): amendments[] MUST EXCLUDE customerSignatureDataUrl/saSignatureDataUrl/photo
  // dataUrls — only scalar field names + before/after values are stored (never base64 blobs)
  amendments: z.array(IntakeAmendmentSchema).default([]),

  // State machine per §6
  state: IntakeInspectionStateEnum,
});

export type IntakeInspection = z.infer<typeof IntakeInspectionSchema>;
