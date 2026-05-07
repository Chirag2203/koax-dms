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
  'refunded', // W3.3: post-sale cancellation / refund state
]);

export const LeadSourceEnum = z.enum([
  'web',
  'referral',
  'walk-in',
  'whatsapp',
  'phone',
]);

export const DealPriorityEnum = z.enum(['low', 'medium', 'high']);

// ─── W3.2 — Lost reason ───────────────────────────────────────────────────────

/**
 * L_S-LOST-1: Every transition to stage='lost' MUST carry a lostReason.
 * UI enforces via MarkDealLostDialog; store rejects if lostReason absent.
 * W3.2 / SPEC-SALES-001 §13 (added 2026-05-07).
 */
export const LostReasonCategoryEnum = z.enum([
  'PRICE_TOO_HIGH',
  'CHOSE_COMPETITOR',
  'FINANCING_FALLTHROUGH',
  'CHANGED_MIND',
  'VEHICLE_ISSUE',
  'TIMING',
  'OTHER',
]);
export type LostReasonCategory = z.infer<typeof LostReasonCategoryEnum>;

export const LostReasonSchema = z.object({
  category: LostReasonCategoryEnum,
  /** Required when category === 'OTHER', must be ≥10 chars. Optional for others. */
  freeText: z.string().optional(),
  capturedAt: z.string(),
  capturedByEmployeeId: z.string(),
});
export type LostReason = z.infer<typeof LostReasonSchema>;

// ─── W3.3 — Refund ────────────────────────────────────────────────────────────

/**
 * L_S-REFUND-1: Refund block populated only when stage transitions to 'refunded'.
 * R12+ only. freeText reason ≥30 chars enforced by store.
 * W3.3 / SPEC-SALES-001 §14 (added 2026-05-07).
 */
export const RefundCategoryEnum = z.enum([
  'DOA',
  'FINANCE_REJECTED',
  'CUSTOMER_REMORSE',
  'VEHICLE_DEFECT',
  'OTHER',
]);
export type RefundCategory = z.infer<typeof RefundCategoryEnum>;

export const RefundBlockSchema = z.object({
  category: RefundCategoryEnum,
  /** Free-text reason; ≥30 chars enforced by store and UI. */
  reason: z.string().min(30),
  /** Amount refunded in INR paisa or full rupees (consistent with deal.amount). */
  refundedAmount: z.number().min(0),
  refundedAt: z.string(),
  refundedByEmployeeId: z.string(),
});
export type RefundBlock = z.infer<typeof RefundBlockSchema>;

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
   * @deprecated For new code, prefer lostReason (W3.2). cancellationReason retained
   *   for backward-compat with PLAN-VEHICLES-003 L26 expiry path.
   */
  cancellationReason: z.enum([
    'EXPIRED',
    'BUYER_WITHDREW',
    'INVENTORY_SOLD',
    'MANUAL_CANCEL',
  ]).optional(),
  /**
   * W3.2 — structured lost reason. Required on every manual transition to
   * stage='lost'. Not set for auto-expiry (EXPIRED) — those use cancellationReason.
   * L_S-LOST-1 / SPEC-SALES-001 §13.
   */
  lostReason: LostReasonSchema.optional(),
  /**
   * ISO datetime string — when the reservation expires.
   * Set on advanceStage to 'reserved'. Used by lazy expiry useEffect (L37).
   * PLAN-VEHICLES-003 P2.
   */
  reservationExpiresAt: z.string().datetime().optional(),
  /**
   * W3.3 — refund block. Populated only when stage === 'refunded'.
   * L_S-REFUND-1 / SPEC-SALES-001 §14.
   */
  refund: RefundBlockSchema.optional(),
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

// ─── W3.1 — Reservation conflict error shape ──────────────────────────────────

/**
 * Typed error emitted by reserveDeal / advanceStage('reserved') when a
 * conflicting reservation already exists for the same VIN.
 * L_S-RES-1 / SPEC-SALES-001 §12 / W3.1.
 */
export interface ReservationConflictError {
  ok: false;
  error: 'VIN_ALREADY_RESERVED';
  conflictingDealId: string;
  conflictingCustomerName: string;
}

export function isReservationConflictError(
  e: unknown,
): e is ReservationConflictError {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as ReservationConflictError).error === 'VIN_ALREADY_RESERVED'
  );
}
