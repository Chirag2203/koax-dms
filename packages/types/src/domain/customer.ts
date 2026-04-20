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
});
export type Customer = z.infer<typeof CustomerSchema>;
