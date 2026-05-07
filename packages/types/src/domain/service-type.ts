import { z } from 'zod';

// ─── Price Range ──────────────────────────────────────────────────────────────

const PriceRangeSchema = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
});

// ─── Service Type ─────────────────────────────────────────────────────────────

export const ServiceTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  priceRange: PriceRangeSchema,
  durationHours: z.number().positive(),
  /** Lucide icon name (e.g. "wrench", "shield-check", "zap") */
  icon: z.string().min(1),
  /**
   * When true, selecting this service type at JC creation requires the
   * advisor to fill a free-text "Describe the issue" field (validated on
   * submit). Used by the catch-all "Other" type per SPEC-SERVICE-001 §6.3.
   */
  requiresDescription: z.boolean().optional(),
});
export type ServiceType = z.infer<typeof ServiceTypeSchema>;
