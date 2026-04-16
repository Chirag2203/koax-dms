import { z } from 'zod';
import { VehicleSchema } from '../domain/vehicle';
import { ArticleSchema } from '../domain/article';
import { OutletSchema } from '../domain/outlet';

// ─── Pagination ───────────────────────────────────────────────────────────────

const PaginationSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
});
export type Pagination = z.infer<typeof PaginationSchema>;

// ─── Vehicle responses ────────────────────────────────────────────────────────

export const VehicleListResponseSchema = z.object({
  vehicles: z.array(VehicleSchema),
  pagination: PaginationSchema,
});
export type VehicleListResponse = z.infer<typeof VehicleListResponseSchema>;

export const FeaturedVehiclesResponseSchema = z.object({
  vehicles: z.array(VehicleSchema),
});
export type FeaturedVehiclesResponse = z.infer<typeof FeaturedVehiclesResponseSchema>;

// ─── Article responses ────────────────────────────────────────────────────────

export const ArticleListResponseSchema = z.object({
  articles: z.array(ArticleSchema),
  pagination: PaginationSchema,
});
export type ArticleListResponse = z.infer<typeof ArticleListResponseSchema>;

// ─── Outlet responses ─────────────────────────────────────────────────────────

export const OutletListResponseSchema = z.object({
  outlets: z.array(OutletSchema),
});
export type OutletListResponse = z.infer<typeof OutletListResponseSchema>;
