import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const TestDriveStatusEnum = z.enum([
  'PENDING',
  'SCHEDULED',
  'EXECUTING',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
]);
export type TestDriveStatus = z.infer<typeof TestDriveStatusEnum>;

export const TestDriveSlotEnum = z.enum([
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'FULL_DAY',
]);
export type TestDriveSlot = z.infer<typeof TestDriveSlotEnum>;

export const TestDriveInterestLevelEnum = z.enum(['cold', 'warm', 'hot']);
export type TestDriveInterestLevel = z.infer<typeof TestDriveInterestLevelEnum>;

// ─── Fuel level bucket ────────────────────────────────────────────────────────

export const FuelLevelEnum = z.union([
  z.literal(0),
  z.literal(25),
  z.literal(50),
  z.literal(75),
  z.literal(100),
]);
export type FuelLevel = z.infer<typeof FuelLevelEnum>;

// ─── TestDriveExecution ───────────────────────────────────────────────────────

/**
 * L12: licenseNumber + fuelLevelBefore + odometerBefore are required
 * before EXECUTING → COMPLETED can proceed.
 */
export const TestDriveExecutionSchema = z.object({
  licenseNumber: z.string().min(1),
  licenseVerifiedAt: z.string(),
  fuelLevelBefore: FuelLevelEnum,
  odometerBefore: z.number().nonnegative(),
  fuelLevelAfter: FuelLevelEnum.optional(),
  odometerAfter: z.number().nonnegative().optional(),
  routeNotes: z.string().optional(),
  driverName: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type TestDriveExecution = z.infer<typeof TestDriveExecutionSchema>;

// ─── TestDriveFeedback ────────────────────────────────────────────────────────

/**
 * L5: feedback is staff-entered post-drive, not customer self-report.
 */
export const TestDriveFeedbackSchema = z.object({
  interestLevel: TestDriveInterestLevelEnum,
  followUpDays: z.union([
    z.literal(1),
    z.literal(3),
    z.literal(7),
    z.literal(14),
    z.literal(30),
  ]),
  freeText: z.string().optional(),
  recordedAt: z.string(),
  recordedBy: z.string(),
});
export type TestDriveFeedback = z.infer<typeof TestDriveFeedbackSchema>;

// ─── TestDriveBooking ─────────────────────────────────────────────────────────

export const TestDriveBookingSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  vehicleVin: z.string(),
  vehicleMake: z.string(),
  vehicleModel: z.string(),
  vehicleYear: z.number(),
  outletId: z.string(),
  requestedDate: z.string(),
  requestedSlot: TestDriveSlotEnum,
  confirmedDate: z.string().optional(),
  confirmedSlot: TestDriveSlotEnum.optional(),
  assignedAdvisorId: z.string().optional(),
  assignedAdvisorName: z.string().optional(),
  status: TestDriveStatusEnum,
  cancellationReason: z.string().optional(),
  /** L6: optional link to B1 leads module */
  leadId: z.string().optional(),
  notes: z.string().optional(),
  execution: TestDriveExecutionSchema.optional(),
  feedback: TestDriveFeedbackSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TestDriveBooking = z.infer<typeof TestDriveBookingSchema>;
