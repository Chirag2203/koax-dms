import { z } from 'zod';
import { CityEnum } from './vehicle';

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
});
export type Customer = z.infer<typeof CustomerSchema>;
