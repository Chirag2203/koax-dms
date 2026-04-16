import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const CityEnum = z.enum(['bangalore', 'mumbai', 'chennai']);
export type City = z.infer<typeof CityEnum>;

export const FuelTypeEnum = z.enum(['petrol', 'diesel', 'electric', 'hybrid']);
export type FuelType = z.infer<typeof FuelTypeEnum>;

export const TransmissionEnum = z.enum(['automatic', 'manual']);
export type Transmission = z.infer<typeof TransmissionEnum>;

export const BodyTypeEnum = z.enum([
  'sedan',
  'suv',
  'coupe',
  'convertible',
  'hatchback',
  'wagon',
  'van',
]);
export type BodyType = z.infer<typeof BodyTypeEnum>;

export const VehicleStatusEnum = z.enum(['published', 'reserved', 'sold']);
export type VehicleStatus = z.infer<typeof VehicleStatusEnum>;

// ─── Vehicle Image ─────────────────────────────────────────────────────────────

export const VehicleImageSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type VehicleImage = z.infer<typeof VehicleImageSchema>;

// ─── Vehicle Pricing ───────────────────────────────────────────────────────────

export const VehiclePricingSchema = z.object({
  /** Ex-showroom / acquisition cost of the vehicle */
  exShowroom: z.number().nonnegative(),
  /** Dealer's gross margin on the vehicle */
  dealerMargin: z.number().nonnegative(),
  /** GST computed on dealer margin (18% on profit margin under margin scheme) */
  gstOnMargin: z.number().nonnegative(),
  /**
   * TCS at 1% triggered when sale value > ₹10,00,000 (per PAN per FY).
   * Ref: Doc 06 §TCS.
   */
  tcs: z.number().nonnegative(),
  /** RTO registration charges */
  rtoRegistration: z.number().nonnegative(),
  /** Road tax applicable for the city */
  roadTax: z.number().nonnegative(),
  /** Insurance premium */
  insurance: z.number().nonnegative(),
  /** Standard dealer warranty cost */
  dealerWarranty: z.number().nonnegative(),
  /** Extended warranty cost (optional add-on) */
  extendedWarranty: z.number().nonnegative().optional(),
  /**
   * Final on-road price — sum of all components above.
   * Treated as a computed/derived field; kept in the schema for serialisation.
   */
  onRoadPrice: z.number().nonnegative(),
});
export type VehiclePricing = z.infer<typeof VehiclePricingSchema>;

// ─── Vehicle ───────────────────────────────────────────────────────────────────

export const VehicleSchema = z.object({
  /** Vehicle Identification Number — canonical identifier per Doc 09 */
  vin: z.string().min(17).max(17),
  make: z.string().min(1),
  model: z.string().min(1),
  variant: z.string().min(1),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  /** Odometer reading in kilometres */
  km: z.number().int().nonnegative(),
  fuel: FuelTypeEnum,
  transmission: TransmissionEnum,
  bodyType: BodyTypeEnum,
  color: z.string().min(1),
  interiorColor: z.string().min(1),
  city: CityEnum,
  /**
   * Customer-facing price — mirrors onRoadPrice from pricing breakdown.
   * Kept as a top-level field for fast listing queries.
   */
  price: z.number().nonnegative(),
  pricing: VehiclePricingSchema,
  images: z.array(VehicleImageSchema),
  /** True when vehicle has passed the BN CPO inspection (210-point default) */
  isCertified: z.boolean(),
  /** Number of certified inspection points; defaults to 210 */
  certificationPoints: z.number().int().positive().default(210),
  previousOwners: z.number().int().nonnegative(),
  /** Free-text accident history description; empty string means clean */
  accidentHistory: z.string(),
  serviceHistorySummary: z.string(),
  /** Long-form editorial copy for the vehicle detail page */
  editorialCopy: z.string(),
  /** URL slug derived from make-model-year-vin-last-6 */
  slug: z.string().min(1),
  /** ISO 8601 date-time string when the vehicle was listed */
  listedAt: z.string().datetime(),
  status: VehicleStatusEnum,

  // ─── Technical Specs (VDP) ─────────────────────────────────────────────────

  /** Engine descriptor e.g. "3.0L I6 Turbo" */
  engine: z.string(),
  /** Peak power output e.g. "374 PS" */
  power: z.string(),
  /** Peak torque output e.g. "500 Nm" */
  torque: z.string(),
  /** Electronically limited or measured top speed e.g. "250 km/h" */
  topSpeed: z.string(),
  /** 0–100 km/h acceleration e.g. "0-100 in 4.4s" */
  acceleration: z.string(),
  /** Drivetrain layout: "AWD" | "RWD" | "FWD" */
  driveType: z.string(),

  // ─── Registration & Compliance ─────────────────────────────────────────────

  /** RTO state code e.g. "KA" | "MH" | "TN" */
  registrationState: z.string(),
  /** ISO date of registration expiry e.g. "2028-06-15" */
  registrationExpiry: z.string(),
  /** ISO date of insurance expiry e.g. "2026-11-30" */
  insuranceExpiry: z.string(),
  /** ISO date of warranty expiry; null if no warranty remaining */
  warrantyExpiry: z.string().nullable(),

  // ─── Condition ─────────────────────────────────────────────────────────────

  /** Number of physical keys available with the vehicle */
  keyCount: z.number().int().positive(),
  /** Free-text tyre condition summary e.g. "85% Tread" */
  tyreCondition: z.string(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;
