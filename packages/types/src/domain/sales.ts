import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const DealStageEnum = z.enum([
  'new-lead',
  'contacted',
  'test-drive',
  'reserved',
  'sales-order',
  'delivered',
  'lost',
  'on-hold',
]);

export const LeadSourceEnum = z.enum([
  'web',
  'referral',
  'walk-in',
  'whatsapp',
  'phone',
]);

export const DealPriorityEnum = z.enum(['low', 'medium', 'high']);

// ─── Deal ─────────────────────────────────────────────────────────────────────

export const DealSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().optional(),
  vehicleVin: z.string().optional(),
  vehicleName: z.string().optional(),
  vehicleImage: z.string().optional(),
  amount: z.number(),
  stage: DealStageEnum,
  source: LeadSourceEnum,
  priority: DealPriorityEnum,
  city: z.string(),
  outlet: z.string(),
  assignedTo: z.string().optional(),
  assignedToName: z.string().optional(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
  daysInStage: z.number(),
  microStatus: z.string().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  notes: z.string().optional(),
  /**
   * Set when stage transitions to 'lost' (the cancelled state in this enum).
   * Discriminates WHY the deal was cancelled. PLAN-VEHICLES-003 L26.
   * Note: DealStageEnum does NOT add 'EXPIRED' — expiry is modelled as
   * stage:'lost' + cancellationReason:'EXPIRED'.
   */
  cancellationReason: z.enum([
    'EXPIRED',
    'BUYER_WITHDREW',
    'INVENTORY_SOLD',
    'MANUAL_CANCEL',
  ]).optional(),
  /**
   * ISO datetime string — when the reservation expires.
   * Set on advanceStage to 'reserved'. Used by lazy expiry useEffect (L37).
   * PLAN-VEHICLES-003 P2.
   */
  reservationExpiresAt: z.string().datetime().optional(),
});

export type DealStage = z.infer<typeof DealStageEnum>;
export type LeadSource = z.infer<typeof LeadSourceEnum>;
export type DealPriority = z.infer<typeof DealPriorityEnum>;
export type Deal = z.infer<typeof DealSchema>;

// ─── Interaction ──────────────────────────────────────────────────────────────

export const InteractionTypeEnum = z.enum([
  'whatsapp-sent',
  'whatsapp-received',
  'call-inbound',
  'call-outbound',
  'call-ai',
  'email-sent',
  'email-received',
  'note',
  'enquiry-created',
  'stage-changed',
  'assigned',
  'test-drive-scheduled',
  'payment-received',
]);

export const InteractionSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  type: InteractionTypeEnum,
  title: z.string(),
  body: z.string().optional(),
  templateId: z.string().optional(),
  durationSeconds: z.number().optional(),
  createdAt: z.string(),
  addedByName: z.string(),
});

export type InteractionType = z.infer<typeof InteractionTypeEnum>;
export type Interaction = z.infer<typeof InteractionSchema>;

// ─── KYC ─────────────────────────────────────────────────────────────────────

export const KycStatusEnum = z.enum([
  'verified',
  'pending',
  'rejected',
  'not-started',
]);

export const KycSchema = z.object({
  dealId: z.string(),
  aadhaar: KycStatusEnum,
  pan: KycStatusEnum,
  bankStatement: KycStatusEnum,
});

export type KycStatus = z.infer<typeof KycStatusEnum>;
export type Kyc = z.infer<typeof KycSchema>;
