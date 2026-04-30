/**
 * Reviews NPS selector for the Reports hub.
 *
 * L11: selectNpsAverage reads approved reviews in period + scope.
 *      Returns null when no reviews exist → tile shows '—'.
 * Seam 28: reviews-store → reports selectors.
 *
 * Spec reference: SPEC-REVIEWS-001 §5 (selectNpsAverage), L11
 */

import type { ReportPeriod, ReportScope, KpiValue } from '../types';
import type { Review } from '@dms/types';

// ─── Input state shape ────────────────────────────────────────────────────────

export interface ReviewsInputState {
  reviews: Review[];
}

// ─── selectNpsAverage ─────────────────────────────────────────────────────────

/**
 * Average NPS score across all approved reviews for the given period + scope.
 *
 * L11: R10+ gated in UI; selector is ungated (pure function).
 * L9 analog: Returns { kind: 'percentage', value: null } when no reviews.
 *
 * Why percentage kind? Re-uses the existing KpiValue union without adding a
 * new variant. NPS 0–10 is displayed as-is via a custom renderer in NpsTile.
 */
export function selectNpsAverage(
  state: ReviewsInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // Scope guard
  if (!scope.outletIds.length) return { kind: 'percentage', value: null };

  const matching = state.reviews.filter((r) => {
    if (r.status !== 'approved') return false;
    if (!scope.outletIds.includes(r.outletId)) return false;
    const date = r.submittedAt.slice(0, 10);
    return date >= period.from && date <= period.to;
  });

  if (matching.length === 0) return { kind: 'percentage', value: null };

  const sum = matching.reduce((acc, r) => acc + r.npsScore, 0);
  const avg = parseFloat((sum / matching.length).toFixed(1));

  return { kind: 'percentage', value: avg };
}
