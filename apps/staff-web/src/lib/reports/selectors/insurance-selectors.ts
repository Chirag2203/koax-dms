/**
 * Insurance attachment rate selector.
 *
 * L19: Attachment rate = count(InsuranceLead WHERE createdAt ≤ soldAt + 7d AND vin IN SOLD_VINs)
 *                        / count(SOLD events in period) × 100
 *      Window: INSURANCE_ATTACH_WINDOW_DAYS = 7 (constant in constants.ts).
 * L2: pure client-side.
 * L9: value=null when no SOLD events.
 * L13: validates scope.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 L19 (Seam 23)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';
import type { SalesEvent, InsuranceLead } from '@dms/types';
import { isInPeriod, last8WeekBuckets } from '../period';
import { INSURANCE_ATTACH_WINDOW_DAYS } from '../constants';

function getOutletForVin(state: ReportInputState, vin: string): string {
  const events = state.vehicles.salesEvents[vin] ?? [];
  const listed = events.find((e) => e.kind === 'LISTED');
  if (listed?.payload && typeof (listed.payload as Record<string, unknown>)['outletId'] === 'string') {
    return (listed.payload as { outletId: string }).outletId;
  }
  return state.vehicles.vehicles[vin]?.firstTouchOutletId ?? '';
}

export function selectInsuranceAttachmentRate(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // L13
  if (!scope.outletIds.length) return { kind: 'percentage', value: null, trend: [] };

  // Build map of VIN → SOLD event timestamp for events in period + scope
  const soldEventMap = new Map<string, Date>(); // vin → soldAt Date

  for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
    const outlet = getOutletForVin(state, vin);
    if (!scope.outletIds.includes(outlet)) continue;

    for (const event of (events as SalesEvent[])) {
      if (event.kind === 'SOLD' && isInPeriod(event.at, period)) {
        soldEventMap.set(vin, new Date(event.at));
      }
    }
  }

  const totalSold = soldEventMap.size;
  if (totalSold === 0) return { kind: 'percentage', value: null, trend: [] };

  // Count leads attached within window
  const windowMs = INSURANCE_ATTACH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  let attachedCount = 0;

  for (const lead of (state.insurance.leads as InsuranceLead[])) {
    const soldAt = soldEventMap.get(lead.vin);
    if (!soldAt) continue;
    const leadCreated = new Date(lead.createdAt).getTime();
    if (leadCreated <= soldAt.getTime() + windowMs) {
      attachedCount++;
    }
  }

  const rate = (attachedCount / totalSold) * 100;

  // Sparkline: 8-week trend
  const buckets  = last8WeekBuckets(period);
  const trend: number[] = buckets.map((bucket) => {
    // Count sold in this week
    let wSold = 0;
    let wAttached = 0;

    for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
      const outlet = getOutletForVin(state, vin);
      if (!scope.outletIds.includes(outlet)) continue;

      for (const event of (events as SalesEvent[])) {
        if (event.kind !== 'SOLD') continue;
        const d = event.at.slice(0, 10);
        if (d < bucket.from || d > bucket.to) continue;
        wSold++;

        const soldAt = new Date(event.at).getTime();
        for (const lead of (state.insurance.leads as InsuranceLead[])) {
          if (lead.vin !== vin) continue;
          if (new Date(lead.createdAt).getTime() <= soldAt + windowMs) {
            wAttached++;
          }
        }
      }
    }

    if (wSold === 0) return 0;
    return parseFloat(((wAttached / wSold) * 100).toFixed(1));
  });

  return { kind: 'percentage', value: parseFloat(rate.toFixed(1)), trend };
}
