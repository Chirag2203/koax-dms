/**
 * Review & Ratings domain types — SPEC-REVIEWS-001
 *
 * L1:  NPS scale 0–10 (integer). Detractors 0–6; Passives 7–8; Promoters 9–10.
 * L2:  kind: 'delivery' | 'service' only.
 * L3:  Status machine: pending-moderation → approved | hidden.
 * L4:  Public surface exposes only firstName + city (PII masking).
 * L5:  NPS → star mapping: 0–6 → 1★; 7–8 → 4★; 9–10 → 5★.
 *      2★ and 3★ are unused in v1 (bimodal trust/concern display).
 * L9:  freeText is optional (max 1,000 chars).
 * L10: One review per (customerId, vinOrJcId) pair.
 * L12: hideReason required (min 5 chars) when hiding a review.
 */

import { z } from 'zod';

// ─── Enumerations ─────────────────────────────────────────────────────────────

export const ReviewStatusEnum = z.enum([
  'pending-moderation',
  'approved',
  'hidden',
]);
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

export const ReviewKindEnum = z.enum(['delivery', 'service']);
export type ReviewKind = z.infer<typeof ReviewKindEnum>;

// ─── Core entity ──────────────────────────────────────────────────────────────

export const ReviewSchema = z.object({
  id: z.string(),                         // 'rev-{nanoid}'
  customerId: z.string(),                 // FK → Customer.id
  vinOrJcId: z.string(),                  // VIN (delivery) or JC id (service) — L8
  kind: ReviewKindEnum,                   // L2
  npsScore: z.number().int().min(0).max(10), // L1
  freeText: z.string().max(1000).optional(), // L9
  submittedAt: z.string(),                // ISO timestamp
  status: ReviewStatusEnum,              // L3
  moderatedBy: z.string().optional(),    // staffId
  moderatedAt: z.string().optional(),    // ISO timestamp
  hideReason: z.string().optional(),     // required when status='hidden' (L12)
  outletId: z.string(),                  // for scope filtering (L13)
  // Denormalised PII-safe display fields (L4)
  customerFirstName: z.string(),         // only first name shown publicly
  customerCity: z.string(),             // only city shown publicly
});

export type Review = z.infer<typeof ReviewSchema>;

// ─── Action parameter types ───────────────────────────────────────────────────

export interface SubmitReviewParams {
  id: string;                 // pre-minted ID (L14)
  customerId: string;
  vinOrJcId: string;
  kind: ReviewKind;
  npsScore: number;
  freeText?: string;
  outletId: string;
  customerFirstName: string;  // L4: stored at submit time; PII-safe subset
  customerCity: string;
}

// ─── NPS → Stars helper (L5) ─────────────────────────────────────────────────

/**
 * L5: NPS to star mapping.
 *   0–6  → 1★ (detractor signal)
 *   7–8  → 4★ (passive — positive but not loyal)
 *   9–10 → 5★ (promoter)
 * Note: 2★ and 3★ are intentionally unused in v1 to produce a bimodal
 * trust/concern display matching BBT and Porsche Approved patterns (Doc 03 §CX).
 */
export function npsToStars(nps: number): 1 | 4 | 5 {
  if (nps <= 6) return 1;
  if (nps <= 8) return 4;
  return 5;
}

// ─── Error classes ────────────────────────────────────────────────────────────

export class DuplicateReviewError extends Error {
  constructor(customerId: string, vinOrJcId: string) {
    super(
      `Customer ${customerId} has already submitted a review for ${vinOrJcId}. Only one review per entity is allowed (SPEC-REVIEWS-001 L10).`,
    );
    this.name = 'DuplicateReviewError';
  }
}

export class MissingHideReasonError extends Error {
  constructor(reviewId: string) {
    super(
      `A hide reason (min 5 chars) is required when hiding review ${reviewId} (SPEC-REVIEWS-001 L12).`,
    );
    this.name = 'MissingHideReasonError';
  }
}

export class ReviewNotFoundError extends Error {
  constructor(reviewId: string) {
    super(`Review ${reviewId} not found.`);
    this.name = 'ReviewNotFoundError';
  }
}
