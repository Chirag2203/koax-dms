/**
 * Reviews store — SPEC-REVIEWS-001 §5
 *
 * Guards at action boundaries:
 *   L3:  Status machine — pending-moderation → approved | hidden (R10+ | R02+)
 *   L10: DuplicateReviewError — one review per (customerId, vinOrJcId)
 *   L12: MissingHideReasonError — hideReason required (min 5 chars)
 *   L13: selectPendingModeration — outlet-scoped for non-GM staff
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Review, SubmitReviewParams, ReviewKind } from '@dms/types';
import {
  DuplicateReviewError,
  MissingHideReasonError,
  ReviewNotFoundError,
} from '@dms/types';
import type { ReportPeriod, ReportScope } from '@/src/lib/reports/types';

// ─── State + Actions ──────────────────────────────────────────────────────────

export interface ReviewsState {
  reviews: Review[];
}

export interface ReviewsActions {
  /**
   * Submit a new review.
   * L10: Throws DuplicateReviewError if (customerId, vinOrJcId) already exists.
   */
  submitReview(params: SubmitReviewParams): Review;

  /**
   * Approve a review. R10+ only (enforced by Gate in UI; store trusts caller).
   * L3: Transitions pending-moderation → approved.
   */
  approveReview(id: string, actorId: string): Review;

  /**
   * Hide a review. R02+ only.
   * L3: Transitions pending-moderation → hidden.
   * L12: reason must be ≥ 5 chars.
   */
  hideReview(id: string, actorId: string, reason: string): Review;

  /** All approved reviews for a VIN (public VDP). */
  selectApprovedForVin(vin: string): Review[];

  /**
   * Top-N approved reviews for a VIN sorted by submittedAt DESC.
   * L6: default limit = 3 for VDP.
   */
  selectTopApprovedForVin(vin: string, limit?: number): Review[];

  /**
   * Reviews in pending-moderation, optionally filtered by outlet (L13).
   * Pass outletId=undefined to get all (R19+ use case).
   */
  selectPendingModeration(outletId?: string): Review[];

  /**
   * Average NPS across approved reviews for the given period + scope.
   * L11: Returns null when no reviews exist in the period.
   * Seam 28: consumed by reports hub.
   */
  selectNpsAverage(period: ReportPeriod, scope: ReportScope): number | null;

  /** Seed initial state (called by hydrator). */
  _seed(reviews: Review[]): void;
}

export type ReviewsStore = ReviewsState & ReviewsActions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function isInPeriod(isoTimestamp: string, period: ReportPeriod): boolean {
  const date = isoTimestamp.slice(0, 10);
  return date >= period.from && date <= period.to;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useReviewsStore = create<ReviewsStore>()(
  immer((set, get) => ({
    reviews: [],

    // ── submitReview ──────────────────────────────────────────────────────────

    submitReview(params) {
      // L10: Dedup check
      const existing = get().reviews.find(
        (r) => r.customerId === params.customerId && r.vinOrJcId === params.vinOrJcId,
      );
      if (existing) {
        throw new DuplicateReviewError(params.customerId, params.vinOrJcId);
      }

      const now = nowIso();
      const review: Review = {
        id: params.id,
        customerId: params.customerId,
        vinOrJcId: params.vinOrJcId,
        kind: params.kind as ReviewKind,
        npsScore: params.npsScore,
        freeText: params.freeText,
        submittedAt: now,
        status: 'pending-moderation', // L3: always starts here
        outletId: params.outletId,
        customerFirstName: params.customerFirstName,
        customerCity: params.customerCity,
      };

      let created!: Review;
      set((state) => {
        state.reviews.push(review);
        created = review;
      });

      return created;
    },

    // ── approveReview ─────────────────────────────────────────────────────────

    approveReview(id, actorId) {
      const review = get().reviews.find((r) => r.id === id);
      if (!review) throw new ReviewNotFoundError(id);

      const now = nowIso();
      set((state) => {
        const r = state.reviews.find((x) => x.id === id);
        if (!r) return;
        r.status = 'approved'; // L3: only approved transition here
        r.moderatedBy = actorId;
        r.moderatedAt = now;
      });

      return get().reviews.find((r) => r.id === id)!;
    },

    // ── hideReview ────────────────────────────────────────────────────────────

    hideReview(id, actorId, reason) {
      // L12: reason required, min 5 chars
      if (!reason || reason.trim().length < 5) {
        throw new MissingHideReasonError(id);
      }

      const review = get().reviews.find((r) => r.id === id);
      if (!review) throw new ReviewNotFoundError(id);

      const now = nowIso();
      set((state) => {
        const r = state.reviews.find((x) => x.id === id);
        if (!r) return;
        r.status = 'hidden'; // L3
        r.moderatedBy = actorId;
        r.moderatedAt = now;
        r.hideReason = reason.trim();
      });

      return get().reviews.find((r) => r.id === id)!;
    },

    // ── selectApprovedForVin ──────────────────────────────────────────────────

    selectApprovedForVin(vin) {
      return get().reviews.filter(
        (r) => r.vinOrJcId === vin && r.status === 'approved',
      );
    },

    // ── selectTopApprovedForVin ───────────────────────────────────────────────

    selectTopApprovedForVin(vin, limit = 3) {
      return get()
        .reviews.filter((r) => r.vinOrJcId === vin && r.status === 'approved')
        .sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        )
        .slice(0, limit);
    },

    // ── selectPendingModeration ───────────────────────────────────────────────

    selectPendingModeration(outletId) {
      const pending = get().reviews.filter((r) => r.status === 'pending-moderation');
      if (!outletId) return pending; // R19+ sees all
      return pending.filter((r) => r.outletId === outletId); // L13: outlet-scoped
    },

    // ── selectNpsAverage ──────────────────────────────────────────────────────

    selectNpsAverage(period, scope) {
      if (!scope.outletIds.length) return null;

      const matching = get().reviews.filter(
        (r) =>
          r.status === 'approved' &&
          isInPeriod(r.submittedAt, period) &&
          scope.outletIds.includes(r.outletId),
      );

      if (matching.length === 0) return null;

      const sum = matching.reduce((acc, r) => acc + r.npsScore, 0);
      return parseFloat((sum / matching.length).toFixed(1));
    },

    // ── _seed ─────────────────────────────────────────────────────────────────

    _seed(reviewsData) {
      set((state) => {
        state.reviews = structuredClone(reviewsData);
      });
    },
  })),
);
