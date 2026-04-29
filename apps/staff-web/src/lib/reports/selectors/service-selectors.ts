/**
 * Service SLA selector.
 *
 * Formula (§6.3):
 *   median(deliveredAt − receivedAt in days)
 *   for JobCards with status === 'DELIVERED', outletId IN scope, deliveredAt IN period.
 *   SLA target = SERVICE_SLA_TARGET_DAYS (5d).
 *
 * L2: pure client-side function.
 * L9: value=null when no DELIVERED job cards in period.
 * L13: validates scope.outletIds.length > 0.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 (Seam 22)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';
import type { JobCard } from '@dms/types';
import { isInPeriod } from '../period';

/** Median of a sorted numeric array */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return ((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function selectServiceSlaMedian(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // L13
  if (!scope.outletIds.length) return { kind: 'days', value: null };

  const durations: number[] = [];

  for (const jc of (state.service.jobCards as JobCard[])) {
    if (jc.status !== 'DELIVERED') continue;
    if (!jc.deliveredAt) continue;
    if (!isInPeriod(jc.deliveredAt, period)) continue;
    if (!scope.outletIds.includes(jc.outletId)) continue;

    const received  = new Date(jc.receivedAt).getTime();
    const delivered = new Date(jc.deliveredAt).getTime();
    const days      = (delivered - received) / (1000 * 60 * 60 * 24);

    if (days >= 0) durations.push(days);
  }

  // L9: no data
  if (durations.length === 0) return { kind: 'days', value: null };

  durations.sort((a, b) => a - b);
  const med = median(durations);

  return { kind: 'days', value: Math.round(med) };
}
