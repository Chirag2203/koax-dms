import { z } from 'zod';
import { CityEnum } from './vehicle';

// ─── Consent types (SPEC-CUSTOMERS-001 §3 + GAP-3/GAP-10) ────────────────────

export const ConsentPurposeEnum = z.enum([
  'WHATSAPP_MARKETING',
  'EMAIL_MARKETING',
  'SERVICE_REMINDER',
  'DATA_PROCESSING',
  'INSURANCE_MARKETING',
  /** DPDP-C2: communication channel consents added 2026-04-30 */
  'SMS_MARKETING',
  'CALL_MARKETING',
  'GENERAL_MARKETING',
]);
export type ConsentPurpose = z.infer<typeof ConsentPurposeEnum>;

export const ConsentSourceEnum = z.enum(['PORTAL_SIGNUP', 'STAFF_FORM', 'IMPORT']);
export type ConsentSource = z.infer<typeof ConsentSourceEnum>;

export const ConsentEntrySchema = z.object({
  id: z.string(),
  customerId: z.string(),
  purpose: ConsentPurposeEnum,
  /** ISO 8601 timestamp when consent was captured */
  capturedAt: z.string().datetime(),
  capturedBy: z.string(),
  capturedByName: z.string(),
  source: ConsentSourceEnum,
  /** ISO 8601 timestamp — present when consent was revoked */
  revokedAt: z.string().datetime().optional(),
  revokedBy: z.string().optional(),
  revokedByName: z.string().optional(),
  revocationReason: z.string().optional(),
});
export type ConsentEntry = z.infer<typeof ConsentEntrySchema>;

// ─── Customer lifecycle enums (SPEC-CUSTOMERS-001 §4) ────────────────────────

export const CustomerLifecycleStageEnum = z.enum(['PROSPECT', 'ACTIVE', 'DORMANT', 'CHURNED']);
export type CustomerLifecycleStage = z.infer<typeof CustomerLifecycleStageEnum>;

export const CustomerSegmentEnum = z.enum(['STANDARD', 'PREMIER', 'ULTRA_HNW']);
export type CustomerSegment = z.infer<typeof CustomerSegmentEnum>;

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  avatar: z.string(), // 2-letter initials
  preferredCity: CityEnum,
  preferredLanguage: z.enum(['en-IN', 'hi-IN']),
  memberSince: z.string(),
  /** PAN card number — used for auto-match fingerprinting (SPEC-VEHICLES-001 §3.4) */
  pan: z.string().optional(),
  /**
   * When true, staff below R19 (GM) see masked phone/email/address.
   * High-net-worth / privacy-sensitive customers only.
   * PLAN-VEHICLES-002 §A — contactConfidential field.
   */
  contactConfidential: z.boolean().default(false),
  /**
   * ISO timestamp of DPDP Act 2023 consent capture.
   * Required when a customer is created inline during the build-enquiry wizard
   * (CLAUDE §9 DPDP). Null means consent was not captured at creation time
   * (legacy records pre-dating this field).
   * SPEC-CUSTOM-BUILDS-001 L65.
   */
  dpdpConsentGivenAt: z.string().datetime().optional(),
  /**
   * Customer lifecycle stage — SPEC-CUSTOMERS-001 §4.
   * Optional on legacy records; populated for new and updated customers.
   */
  lifecycleStage: CustomerLifecycleStageEnum.optional(),
  /**
   * Customer segment tier — SPEC-CUSTOMERS-001 §4.
   * ULTRA_HNW = ultra-high-net-worth; PREMIER = premier; STANDARD = standard.
   */
  segment: CustomerSegmentEnum.optional(),
  /**
   * Last 4 digits of Aadhaar — DPDP / Aadhaar Act: never store full number.
   * Displayed as XXXX-XXXX-{last4}.
   * SPEC-CUSTOMERS-001 §4 + CLAUDE §9.
   */
  aadhaarLast4: z.string().length(4).optional(),
  /**
   * Referral source — GAP-8.
   * Either a customer id (string starting with 'cust-'), or a fixed channel:
   * 'event' | 'website' | 'walk-in'.
   */
  referredBy: z
    .union([z.string(), z.literal('event'), z.literal('website'), z.literal('walk-in')])
    .optional(),
  /**
   * Denormalized display name when referredBy is a customer id.
   * Not stored for channel strings.
   */
  referredByName: z.string().optional(),
  /**
   * Communication channel preferences — DPDP-C2 (2026-04-30).
   * Each toggle corresponds to a ConsentPurpose. Staff create/edit flows write
   * ConsentEntry rows via staff-consent-bridge when these change.
   * Purpose map: whatsappUpdates → WHATSAPP_MARKETING, smsAlerts → SMS_MARKETING,
   *   emailNewsletter → EMAIL_MARKETING, callConsent → CALL_MARKETING,
   *   marketingConsent → GENERAL_MARKETING.
   */
  communicationPreferences: z
    .object({
      whatsappUpdates: z.boolean(),
      smsAlerts: z.boolean(),
      emailNewsletter: z.boolean(),
      callConsent: z.boolean(),
    })
    .optional(),
  /**
   * General marketing consent — DPDP-C2 (2026-04-30).
   * Corresponds to GENERAL_MARKETING ConsentPurpose.
   */
  marketingConsent: z.boolean().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;
