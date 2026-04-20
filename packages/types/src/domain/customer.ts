import { z } from 'zod';
import { CityEnum } from './vehicle';

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
});
export type Customer = z.infer<typeof CustomerSchema>;
