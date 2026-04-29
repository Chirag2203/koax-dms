/**
 * Custom Builds revenue contribution selector.
 *
 * L20: Build job revenue contribution = sum(BuildJob.quoteTotal WHERE stage='DELIVERED'
 *       AND outletId IN scope AND deliveredAt IN period) / totalRevenue × 100.
 *
 * totalRevenue is derived from selectOutletPnL sub-value (revenue component).
 * Contribution % = buildRevenue / totalRevenue.
 *
 * L2: pure client-side.
 * L9: value=null when no DELIVERED jobs or no total revenue.
 * L13: validates scope.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 L20 (Seam 24)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';
import type { BuildJob, SalesEvent } from '@dms/types';
import { isInPeriod } from '../period';

function getOutletForVin(state: ReportInputState, vin: string): string {
  const events = state.vehicles.salesEvents[vin] ?? [];
  const listed = events.find((e) => e.kind === 'LISTED');
  if (listed?.payload && typeof (listed.payload as Record<string, unknown>)['outletId'] === 'string') {
    return (listed.payload as { outletId: string }).outletId;
  }
  return state.vehicles.vehicles[vin]?.firstTouchOutletId ?? '';
}

export function selectCustomBuildsRevContribution(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // L13
  if (!scope.outletIds.length) return { kind: 'percentage', value: null };

  // L20: Sum BuildJob.quoteTotal for DELIVERED jobs in scope + period
  let buildRevenue = 0;

  for (const job of (state.customBuilds.jobs as BuildJob[])) {
    if (job.stage !== 'DELIVERED') continue;
    if (!scope.outletIds.includes(job.outletId)) continue;
    if (!job.deliveredAt || !isInPeriod(job.deliveredAt, period)) continue;
    buildRevenue += job.quoteTotal ?? 0;
  }

  // totalRevenue: sum(salesEvent.payload.finalPrice WHERE kind='SOLD' in period + scope)
  let totalRevenue = 0;
  for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
    const outlet = getOutletForVin(state, vin);
    if (!scope.outletIds.includes(outlet)) continue;
    for (const event of (events as SalesEvent[])) {
      if (event.kind === 'SOLD' && isInPeriod(event.at, period)) {
        const payload = event.payload as { finalPrice?: number } | undefined;
        totalRevenue += payload?.finalPrice ?? 0;
      }
    }
  }

  // L9: no data
  if (totalRevenue === 0 && buildRevenue === 0) return { kind: 'percentage', value: null };
  if (totalRevenue === 0) return { kind: 'percentage', value: null };

  const pct = (buildRevenue / totalRevenue) * 100;

  return { kind: 'percentage', value: parseFloat(pct.toFixed(1)) };
}
