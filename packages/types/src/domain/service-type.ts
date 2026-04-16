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
});
export type ServiceType = z.infer<typeof ServiceTypeSchema>;
