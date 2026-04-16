import { z } from 'zod';
import { VehicleImageSchema } from './vehicle';

// ─── Article ──────────────────────────────────────────────────────────────────

export const ArticleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  heroImage: VehicleImageSchema,
  /** ISO 8601 date string */
  publishDate: z.string().datetime(),
  category: z.string().min(1),
  author: z.string().min(1),
  readTimeMinutes: z.number().int().positive(),
});
export type Article = z.infer<typeof ArticleSchema>;
