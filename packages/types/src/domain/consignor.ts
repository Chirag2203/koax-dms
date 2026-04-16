import { z } from 'zod';
import { CityEnum } from './vehicle';

export const ConsignmentStatusEnum = z.enum(['listed', 'reserved', 'under-offer', 'sold', 'withdrawn']);
export type ConsignmentStatus = z.infer<typeof ConsignmentStatusEnum>;

export const ConsignedVehicleSchema = z.object({
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  variant: z.string(),
  year: z.number(),
  color: z.string(),
  city: CityEnum,
  imageUrl: z.string(),
  consignmentDate: z.string(),
  askingPrice: z.number(),
  currentListPrice: z.number(),
  status: ConsignmentStatusEnum,
  viewingsCount: z.number(),
  inquiriesCount: z.number(),
  daysListed: z.number(),
  feePercentage: z.number(), // e.g., 10 = 10%
});
export type ConsignedVehicle = z.infer<typeof ConsignedVehicleSchema>;

export const PayoutStatusEnum = z.enum(['pending', 'processing', 'completed']);
export type PayoutStatus = z.infer<typeof PayoutStatusEnum>;

export const ConsignorPayoutSchema = z.object({
  id: z.string(),
  vehicleVin: z.string(),
  vehicleName: z.string(),
  salePrice: z.number(),
  feePercentage: z.number(),
  feeAmount: z.number(),
  reimbursables: z.number(), // refurb costs, marketing costs deducted
  netPayout: z.number(),
  status: PayoutStatusEnum,
  estimatedDate: z.string().optional(),
  completedDate: z.string().optional(),
});
export type ConsignorPayout = z.infer<typeof ConsignorPayoutSchema>;

export const ConsignorMessageSchema = z.object({
  id: z.string(),
  date: z.string(),
  from: z.enum(['advisor', 'consignor']),
  senderName: z.string(),
  subject: z.string(),
  body: z.string(),
  isRead: z.boolean(),
});
export type ConsignorMessage = z.infer<typeof ConsignorMessageSchema>;

export const ConsignmentAgreementSchema = z.object({
  id: z.string(),
  vehicleVin: z.string(),
  vehicleName: z.string(),
  signedDate: z.string(),
  feePercentage: z.number(),
  durationMonths: z.number(),
  termsUrl: z.string(),
});
export type ConsignmentAgreement = z.infer<typeof ConsignmentAgreementSchema>;
