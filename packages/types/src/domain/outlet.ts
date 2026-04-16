import { z } from 'zod';
import { CityEnum } from './vehicle';

// ─── Opening Hours ─────────────────────────────────────────────────────────────

const OpeningHoursSchema = z.object({
  weekday: z.string().min(1),
  saturday: z.string().min(1),
  sunday: z.string().min(1),
});

// ─── Coordinates ──────────────────────────────────────────────────────────────

const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ─── Outlet ───────────────────────────────────────────────────────────────────

export const OutletSchema = z.object({
  id: z.string().min(1),
  city: CityEnum,
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  openingHours: OpeningHoursSchema,
  /** Total vehicles currently in inventory at this outlet */
  vehicleCount: z.number().int().nonnegative(),
  /** Total active service jobs at this outlet */
  serviceCount: z.number().int().nonnegative(),
  /** Vehicles expected to arrive at this outlet */
  arrivingCount: z.number().int().nonnegative(),
  coordinates: CoordinatesSchema,
});
export type Outlet = z.infer<typeof OutletSchema>;

// ─── Outlet Summary ────────────────────────────────────────────────────────────

/** Lighter projection used in listings / nav dropdowns */
export const OutletSummarySchema = z.object({
  city: CityEnum,
  vehicleCount: z.number().int().nonnegative(),
  serviceCount: z.number().int().nonnegative(),
});
export type OutletSummary = z.infer<typeof OutletSummarySchema>;
