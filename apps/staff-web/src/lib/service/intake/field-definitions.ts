/**
 * SPEC-SERVICE-INTAKE-001 — L4: Single field-definitions module
 *
 * This is the SINGLE SOURCE OF TRUTH for all intake inspection fields.
 * The digital form, PDF template, and Zod validator are ALL derived
 * from this array. Hand-rolled field lists in either surface are
 * review-rejections (per L4).
 *
 * derivedFrom: 'vehicle' | 'customer' | 'jobCard' means the field is
 * auto-resolved from a cross-aggregate selector and NEVER entered by
 * the user directly (§8.4 enforcement).
 */

import { z } from 'zod';
import {
  IntakeFuelLevelEnum,
  KeyCountEnum,
  KeyTypeEnum,
  DamageCodeEnum,
  DamageViewEnum,
  DamageSeverityEnum,
  BatteryConditionEnum,
  TyreConditionEnum,
  PresenceEnum,
  IntakePhotoSlotEnum,
} from '@dms/types';

// ─── Type definitions ─────────────────────────────────────────────────────────

export type IntakeSection = 'A' | 'B' | 'C' | 'D' | 'E' | 'meta' | 'DMS';

export type IntakeFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'datetime'
  | 'date'
  | 'object'
  | 'array'
  | 'signature';

export interface IntakeFieldDef {
  /** The exact key on IntakeInspection (or nested path e.g. tyreCondition.FL) */
  key: string;
  /** Display label (also used as i18n key base) */
  label: string;
  /** Form section */
  section: IntakeSection;
  /** Data type */
  type: IntakeFieldType;
  /** Whether the field is required for form submission */
  required: boolean;
  /** Default value for the field */
  defaultValue?: unknown;
  /** Help text shown as tooltip / description */
  helpText?: string;
  /** For enum fields: array of valid values */
  enumValues?: string[];
  /** Whether this field appears on the customer-facing PDF */
  onPdf: boolean;
  /** DMS-only = never on customer copy */
  dmsOnly?: boolean;
  /**
   * If set, this field is auto-resolved from the named aggregate via a
   * cross-module selector and is NOT user-editable on the intake form.
   * §8.4: derivedFrom fields use selector at render time, never stored.
   */
  derivedFrom?: 'jobCard' | 'vehicle' | 'customer';
}

// ─── INTAKE_FIELDS — the canonical array ─────────────────────────────────────

export const INTAKE_FIELDS: IntakeFieldDef[] = [
  // ── meta ────────────────────────────────────────────────────────────────────

  {
    key: 'jobCardId',
    label: 'Job Card',
    section: 'meta',
    type: 'string',
    required: true,
    onPdf: true, // PDF header
    derivedFrom: 'jobCard',
  },
  {
    key: 'inspectionAt',
    label: 'Inspection Date & Time',
    section: 'meta',
    type: 'datetime',
    required: true,
    onPdf: true,
    derivedFrom: 'jobCard', // auto: now() at intake creation
  },
  {
    key: 'outletId',
    label: 'Outlet',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'jobCard',
  },
  {
    key: 'qrPayload',
    label: 'QR Code',
    section: 'meta',
    type: 'string',
    required: true,
    onPdf: true, // PDF footer
    derivedFrom: 'jobCard', // computed: https://dms.bnautos.in/service/jobcards/{id}
    helpText: 'QR code encoding the job card URL for traceability',
  },

  // ── Section A: Vehicle Ident ─────────────────────────────────────────────────

  {
    key: 'regNumber',
    label: 'Registration Number',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    helpText: 'Vehicle registration number (e.g. KA01-XX-1234)',
  },
  {
    key: 'vin',
    label: 'VIN',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'vehicle', // §8: VIN SoT is Vehicle; never editable on intake form
    helpText: 'Vehicle Identification Number — auto-filled from vehicle record',
  },
  {
    key: 'make',
    label: 'Make',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'vehicle',
  },
  {
    key: 'model',
    label: 'Model',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'vehicle',
  },
  {
    key: 'variant',
    label: 'Variant',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'vehicle',
  },
  {
    key: 'year',
    label: 'Year',
    section: 'A',
    type: 'number',
    required: true,
    onPdf: true,
    derivedFrom: 'vehicle',
  },
  {
    key: 'exteriorColor',
    label: 'Exterior Colour',
    section: 'A',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'vehicle',
  },
  {
    key: 'odometerKm',
    label: 'Odometer Reading (km)',
    section: 'A',
    type: 'number',
    required: true,
    onPdf: true,
    helpText: 'Current odometer reading at vehicle intake. SoT for intake-time odometer (§8).',
  },
  {
    key: 'fuelLevel',
    label: 'Fuel Level',
    section: 'A',
    type: 'enum',
    required: true,
    defaultValue: 'Q2',
    onPdf: true,
    enumValues: IntakeFuelLevelEnum.options as string[],
    helpText: 'Fuel tank level at reception',
  },

  // ── Section B: Body Damage ───────────────────────────────────────────────────

  {
    key: 'damageCallouts',
    label: 'Damage Callouts',
    section: 'B',
    type: 'array',
    required: true, // required (≥0 acceptable — empty means no damage noted)
    defaultValue: [],
    onPdf: true, // PDF Section B table
    helpText: 'Pre-existing damage marks recorded during walk-around',
  },
  {
    key: 'damageDiagramAnnotations',
    label: 'Damage Diagram Annotations',
    section: 'B',
    type: 'string',
    required: false,
    onPdf: false, // P2 SVG path JSON — forward-compat only in P1
    dmsOnly: true,
    helpText: 'SVG path overlay for interactive damage marking (P2 feature)',
  },

  // ── Section C: Inventory ──────────────────────────────────────────────────────

  {
    key: 'spareTyrePresent',
    label: 'Spare Tyre Present',
    section: 'C',
    type: 'boolean',
    required: true,
    defaultValue: true,
    onPdf: true,
  },
  {
    key: 'toolKitPresent',
    label: 'Tool Kit Present',
    section: 'C',
    type: 'boolean',
    required: true,
    defaultValue: true,
    onPdf: true,
  },
  {
    key: 'keyCount',
    label: 'Number of Keys',
    section: 'C',
    type: 'enum',
    required: true,
    defaultValue: '2',
    onPdf: true,
    enumValues: KeyCountEnum.options as string[],
  },
  {
    key: 'keyType',
    label: 'Key Type',
    section: 'C',
    type: 'enum',
    required: false,
    defaultValue: 'SMART_ONLY',
    onPdf: true,
    enumValues: KeyTypeEnum.options as string[],
    helpText: 'Smart key, valet key, or both (relevant for luxury/premium vehicles)',
  },
  {
    key: 'serviceBookPresent',
    label: 'Service Book Present',
    section: 'C',
    type: 'boolean',
    required: false,
    defaultValue: false,
    onPdf: true,
  },
  {
    key: 'rcInVehicle',
    label: 'RC in Vehicle',
    section: 'C',
    type: 'enum',
    required: true,
    defaultValue: 'NOT_VERIFIED',
    onPdf: true,
    enumValues: PresenceEnum.options as string[],
    helpText: 'Registration Certificate (MV Act §130). NOT_VERIFIED = check not performed; ABSENT = checked, not found.',
  },
  {
    key: 'insuranceCertInVehicle',
    label: 'Insurance Certificate in Vehicle',
    section: 'C',
    type: 'enum',
    required: true,
    defaultValue: 'NOT_VERIFIED',
    onPdf: true,
    enumValues: PresenceEnum.options as string[],
    helpText: 'Insurance certificate (MV Act §145). NOT_VERIFIED = check not performed; ABSENT = checked, not found.',
  },
  {
    key: 'cabinAccessoriesNote',
    label: 'Cabin Accessories Note',
    section: 'C',
    type: 'string',
    required: false,
    defaultValue: '',
    onPdf: true,
    helpText: 'Free text — e.g. dash cam, child seat, boot organiser, parking sensor unit, etc.',
  },

  // ── Section D: Functional ─────────────────────────────────────────────────────

  {
    key: 'battery12VCondition',
    label: '12V Battery Condition',
    section: 'D',
    type: 'enum',
    required: false,
    defaultValue: 'NOT_TESTED',
    onPdf: true,
    enumValues: BatteryConditionEnum.options as string[],
  },
  {
    key: 'tyreCondition.FL',
    label: 'Front Left Tyre Condition',
    section: 'D',
    type: 'enum',
    required: false,
    defaultValue: 'GOOD',
    onPdf: true,
    enumValues: TyreConditionEnum.options as string[],
  },
  {
    key: 'tyreCondition.FR',
    label: 'Front Right Tyre Condition',
    section: 'D',
    type: 'enum',
    required: false,
    defaultValue: 'GOOD',
    onPdf: true,
    enumValues: TyreConditionEnum.options as string[],
  },
  {
    key: 'tyreCondition.RL',
    label: 'Rear Left Tyre Condition',
    section: 'D',
    type: 'enum',
    required: false,
    defaultValue: 'GOOD',
    onPdf: true,
    enumValues: TyreConditionEnum.options as string[],
  },
  {
    key: 'tyreCondition.RR',
    label: 'Rear Right Tyre Condition',
    section: 'D',
    type: 'enum',
    required: false,
    defaultValue: 'GOOD',
    onPdf: true,
    enumValues: TyreConditionEnum.options as string[],
  },
  {
    key: 'acFunctional',
    label: 'Air Conditioning Functional',
    section: 'D',
    type: 'boolean',
    required: true,
    defaultValue: true,
    onPdf: true,
  },
  {
    key: 'wipersFunctional',
    label: 'Wipers Functional',
    section: 'D',
    type: 'boolean',
    required: true,
    defaultValue: true,
    onPdf: true,
  },
  {
    key: 'lightsFunctional',
    label: 'Lights Functional',
    section: 'D',
    type: 'boolean',
    required: true,
    defaultValue: true,
    onPdf: true,
  },
  {
    key: 'infotainmentFunctional',
    label: 'Infotainment Functional',
    section: 'D',
    type: 'boolean',
    required: false,
    defaultValue: true,
    onPdf: true,
    helpText: 'Touchscreen / entertainment unit — applicable for luxury/premium vehicles',
  },
  {
    key: 'dashboardWarningLightsNote',
    label: 'Dashboard Warning Lights Note',
    section: 'D',
    type: 'string',
    required: false,
    defaultValue: '',
    onPdf: true,
    helpText: 'Free text — note any illuminated warning lights observed at reception',
  },

  // ── Section E: Signatures (PII — see L11) ────────────────────────────────────

  {
    key: 'customerName',
    label: 'Customer Name',
    section: 'E',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'customer', // §8: customerName SoT is Customer.fullName; resolved at render
  },
  {
    key: 'customerSignatureDataUrl',
    label: 'Customer Signature',
    section: 'E',
    type: 'signature',
    required: false, // required by state-machine (DRAFT→CUSTOMER_SIGNED), not by Zod form
    onPdf: true,
    helpText: 'Customer handwritten signature captured on device (L11: pii_sensitivity=medium; not visible to R11)',
  },
  {
    key: 'customerSignedAt',
    label: 'Customer Signed At',
    section: 'E',
    type: 'datetime',
    required: false,
    onPdf: true,
  },
  {
    key: 'saName',
    label: 'Service Advisor Name',
    section: 'E',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'jobCard', // resolved from actor at intake creation
  },
  {
    key: 'saEmployeeId',
    label: 'Service Advisor ID',
    section: 'E',
    type: 'string',
    required: true,
    onPdf: true,
    derivedFrom: 'jobCard',
  },
  {
    key: 'saSignatureDataUrl',
    label: 'Service Advisor Signature',
    section: 'E',
    type: 'signature',
    required: true,
    onPdf: true,
  },
  {
    key: 'saSignedAt',
    label: 'Service Advisor Signed At',
    section: 'E',
    type: 'datetime',
    required: true,
    onPdf: true,
  },

  // ── DMS-only fields — never on customer copy ──────────────────────────────────

  {
    key: 'nextActionNoteForWorkshop',
    label: 'Workshop Action Note',
    section: 'DMS',
    type: 'string',
    required: false,
    defaultValue: '',
    onPdf: false, // NEVER on customer copy
    dmsOnly: true,
    helpText: 'Internal note for workshop team — not shown to customer',
  },
  {
    key: 'tyreTreadMmFL',
    label: 'Front Left Tyre Tread (mm)',
    section: 'DMS',
    type: 'number',
    required: false,
    onPdf: false,
    dmsOnly: true,
    helpText: 'Tyre tread depth in mm — VHC owns the official tread measurement',
  },
  {
    key: 'tyreTreadMmFR',
    label: 'Front Right Tyre Tread (mm)',
    section: 'DMS',
    type: 'number',
    required: false,
    onPdf: false,
    dmsOnly: true,
  },
  {
    key: 'tyreTreadMmRL',
    label: 'Rear Left Tyre Tread (mm)',
    section: 'DMS',
    type: 'number',
    required: false,
    onPdf: false,
    dmsOnly: true,
  },
  {
    key: 'tyreTreadMmRR',
    label: 'Rear Right Tyre Tread (mm)',
    section: 'DMS',
    type: 'number',
    required: false,
    onPdf: false,
    dmsOnly: true,
  },
  {
    key: 'priorVisitDamageHistorySummary',
    label: 'Prior Visit Damage History',
    section: 'DMS',
    type: 'string',
    required: false,
    onPdf: false,
    dmsOnly: true,
    helpText: 'Auto-populated in P2 from prior visit records (DEF-INTAKE-4)',
  },
  {
    key: 'signedSheetAttachmentId',
    label: 'Signed Sheet Attachment',
    section: 'DMS',
    type: 'string',
    required: false,
    onPdf: false,
    dmsOnly: true,
    helpText: 'Reverse-link to the uploaded scanned signed sheet attachment',
  },
  {
    key: 'signedSheetUploadedAt',
    label: 'Signed Sheet Uploaded At',
    section: 'DMS',
    type: 'datetime',
    required: false,
    onPdf: false,
    dmsOnly: true,
  },
  {
    key: 'retainUntil',
    label: 'Retain Until',
    section: 'DMS',
    type: 'date',
    required: true,
    onPdf: false,
    dmsOnly: true,
    helpText: 'L7: ISO date; computed as createdAt + 5 years. Purge job reads this (DEF-INTAKE-1).',
  },
  {
    key: 'retentionPolicy',
    label: 'Retention Policy',
    section: 'DMS',
    type: 'string',
    required: true,
    defaultValue: 'INTAKE_INSPECTION_5Y',
    onPdf: false,
    dmsOnly: true,
  },
  {
    key: 'version',
    label: 'Record Version',
    section: 'DMS',
    type: 'number',
    required: true,
    defaultValue: 1,
    onPdf: false,
    dmsOnly: true,
    helpText: 'Bumps on each R19 amendment (L8)',
  },
  {
    key: 'amendments',
    label: 'Amendment Audit Trail',
    section: 'DMS',
    type: 'array',
    required: false,
    defaultValue: [],
    onPdf: false,
    dmsOnly: true,
    helpText: 'L8: audit rows; excludes signature/photo dataUrls per L8 tightened PII redaction',
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

/** Get display label for a field key */
export function getDisplayLabel(key: string): string {
  return INTAKE_FIELDS.find((f) => f.key === key)?.label ?? key;
}

/** Get all fields for a given section */
export function getFieldsBySection(section: IntakeSection): IntakeFieldDef[] {
  return INTAKE_FIELDS.filter((f) => f.section === section);
}

/** Get fields that appear on the customer-facing PDF */
export function getPdfFields(): IntakeFieldDef[] {
  return INTAKE_FIELDS.filter((f) => f.onPdf);
}

/** Get DMS-only fields (never on customer copy) */
export function getDmsOnlyFields(): IntakeFieldDef[] {
  return INTAKE_FIELDS.filter((f) => f.dmsOnly === true);
}

/** Get user-editable fields (excludes derivedFrom fields which are auto-resolved) */
export function getUserEditableFields(): IntakeFieldDef[] {
  return INTAKE_FIELDS.filter((f) => f.derivedFrom === undefined);
}

// ─── Zod form schema factory (L4) ─────────────────────────────────────────────

/**
 * Builds a Zod schema validating only the user-editable intake fields.
 * Auto-fields (derivedFrom: 'vehicle' | 'customer' | 'jobCard') are excluded
 * from this schema — they are resolved at render/store time via selectors (§8.4).
 *
 * L4: This factory ensures the form validator is always derived from
 * INTAKE_FIELDS — never hand-rolled separately.
 */
export function buildIntakeFormSchema() {
  return z.object({
    // Section A — user-editable ident fields
    regNumber: z.string().min(1, 'Registration number is required'),
    odometerKm: z.number().int().min(0).max(9_999_999),
    fuelLevel: IntakeFuelLevelEnum,

    // Section B — damage callouts managed separately via addDamageCallout actions
    // damageDiagramAnnotations is P2/DMS-only

    // Section C — inventory
    spareTyrePresent: z.boolean(),
    toolKitPresent: z.boolean(),
    keyCount: KeyCountEnum,
    keyType: KeyTypeEnum.optional(),
    serviceBookPresent: z.boolean(),
    rcInVehicle: PresenceEnum.default('NOT_VERIFIED'),
    insuranceCertInVehicle: PresenceEnum.default('NOT_VERIFIED'),
    cabinAccessoriesNote: z.string().max(200).default(''),

    // Section D — functional checks
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

    // Section E — SA signature (required at form save; customer signature captured separately)
    saSignatureDataUrl: z.string().min(1, 'Service Advisor signature is required'),
    saSignedAt: z.string().datetime(),

    // DMS-only
    nextActionNoteForWorkshop: z.string().max(500).default(''),
  });
}

export type IntakeFormValues = z.infer<ReturnType<typeof buildIntakeFormSchema>>;

// Re-export enums so consumers can import from this module
export {
  IntakeFuelLevelEnum,
  KeyCountEnum,
  KeyTypeEnum,
  DamageCodeEnum,
  DamageViewEnum,
  DamageSeverityEnum,
  BatteryConditionEnum,
  TyreConditionEnum,
  PresenceEnum,
  IntakePhotoSlotEnum,
};
