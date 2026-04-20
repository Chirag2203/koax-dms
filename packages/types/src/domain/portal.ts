import { z } from 'zod';

export const SavedVehicleSchema = z.object({
  vehicleVin: z.string(),
  savedAt: z.string(),
  savedAtPrice: z.number(),
});
export type SavedVehicle = z.infer<typeof SavedVehicleSchema>;

export const ReservationSchema = z.object({
  id: z.string(),
  vehicleVin: z.string(),
  vehicleName: z.string(),
  depositAmount: z.number(),
  status: z.enum(['active', 'expired', 'completed', 'released']),
  createdAt: z.string(),
  expiresAt: z.string(),
  thumbnailUrl: z.string(),
});
export type Reservation = z.infer<typeof ReservationSchema>;

export const OwnedVehicleSchema = z.object({
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  variant: z.string(),
  year: z.number(),
  color: z.string(),
  registrationNumber: z.string(),
  registrationCity: z.string(),
  imageUrl: z.string(),
  nextServiceDue: z.string(),
  nextServiceDueKm: z.number(),
  lastServiceKm: z.number(),
  currentMileage: z.number(),
  isServiceOverdue: z.boolean(),
});
export type OwnedVehicle = z.infer<typeof OwnedVehicleSchema>;

export const ServiceRecordSchema = z.object({
  id: z.string(),
  vehicleVin: z.string(),
  vehicleName: z.string(),
  date: z.string(),
  type: z.string(),
  km: z.number(),
  cost: z.number(),
  advisorName: z.string(),
  items: z.array(z.string()),
  invoiceUrl: z.string().optional(),
  status: z.enum(['completed', 'in-progress']),
});
export type ServiceRecord = z.infer<typeof ServiceRecordSchema>;

export const BookingSchema = z.object({
  id: z.string(),
  type: z.enum(['test-drive', 'service']),
  vehicleVin: z.string(),
  vehicleName: z.string(),
  outletCity: z.string(),
  outletName: z.string(),
  date: z.string(),
  time: z.string(),
  status: z.enum(['confirmed', 'completed', 'cancelled']),
  advisorName: z.string().optional(),
  estimatedDuration: z.string().optional(),
  estimatedCost: z.string().optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const DocumentSchema = z.object({
  id: z.string(),
  vehicleVin: z.string(),
  vehicleName: z.string(),
  type: z.enum([
    'rc',
    'insurance',
    'puc',
    'warranty',
    'invoice',
    'service-record',
    'purchase-agreement',
    'inspection-report',
  ]),
  name: z.string(),
  uploadedAt: z.string(),
  expiresAt: z.string().optional(),
  fileUrl: z.string(),
  fileSize: z.string(),
  /**
   * Id of a newer document that superseded this one (REPLACE operation).
   * Portal renders as boolean "Replaced" label — never exposes the id (L27).
   * Staff-web keeps the id for linking to the replacement doc.
   * PLAN-VEHICLES-003 §1.3.
   */
  supersededBy: z.string().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const CommunicationPreferencesSchema = z.object({
  whatsappUpdates: z.boolean(),
  smsReminders: z.boolean(),
  emailNotifications: z.boolean(),
  quarterlyJournal: z.boolean(),
});
export type CommunicationPreferences = z.infer<typeof CommunicationPreferencesSchema>;
