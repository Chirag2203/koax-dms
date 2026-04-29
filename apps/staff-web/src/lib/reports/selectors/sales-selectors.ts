/**
 * Sales-related selectors: velocity, inventory aging, CPO conversion.
 *
 * L18: Sales velocity source is vehicles-store.salesEvents filtered for kind='SOLD'.
 * L2:  Client-side pure functions.
 * L4:  Scope enforcement — selector filters by scope.outletIds.
 * L9:  value=null when no data.
 * L13: Validates scope.outletIds.length > 0.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 (Seams 20, 21)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';
import type { SalesEvent } from '@dms/types';
import { isInPeriod, last8WeekBuckets } from '../period';

/** Extracts outletId from a LISTED event payload or falls back to firstTouchOutletId */
function getOutletForVin(state: ReportInputState, vin: string): string {
  const events = state.vehicles.salesEvents[vin] ?? [];
  const listed = events.find((e) => e.kind === 'LISTED');
  if (listed?.payload && typeof (listed.payload as Record<string, unknown>)['outletId'] === 'string') {
    return (listed.payload as { outletId: string }).outletId;
  }
  return state.vehicles.vehicles[vin]?.firstTouchOutletId ?? '';
}

// ─── Sales Velocity ───────────────────────────────────────────────────────────

/**
 * Returns count of SOLD events per week for the last 8 weeks ending at period.to.
 * L18: reads salesEvents[vin] where kind === 'SOLD'.
 * Returns trend: number[8].
 */
export function selectSalesVelocity(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // L13
  if (!scope.outletIds.length) return { kind: 'count', value: null };

  const buckets = last8WeekBuckets(period);
  const weekCounts = new Array<number>(8).fill(0);
  let totalSold = 0;

  for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
    const outlet = getOutletForVin(state, vin);
    if (!scope.outletIds.includes(outlet)) continue;

    for (const event of (events as SalesEvent[])) {
      if (event.kind !== 'SOLD') continue;

      // Count towards overall total if within period
      if (isInPeriod(event.at, period)) totalSold++;

      // Count per weekly bucket for sparkline
      const eventDate = event.at.slice(0, 10);
      for (let i = 0; i < 8; i++) {
        const b = buckets[i]!;
        if (eventDate >= b.from && eventDate <= b.to) {
          weekCounts[i]!++;
          break;
        }
      }
    }
  }

  if (totalSold === 0) return { kind: 'count', value: null };

  // value = average sold per week over the period
  const nonZero = weekCounts.filter((c) => c > 0).length || 1;
  const avgPerWeek = Math.round(totalSold / nonZero);

  return { kind: 'count', value: avgPerWeek, trend: weekCounts };
}

// ─── Inventory Aging ──────────────────────────────────────────────────────────

/**
 * Returns histogram of vehicles by days listed.
 * Buckets: <30 / 30-60 / 60-90 / 90-180 / 180+
 * Uses VehicleMaster.listedAt as listing date.
 * "ACTIVE" = VehicleMaster exists and no SOLD event in salesEvents.
 *
 * Spec reference: §6.3 (Seam 20)
 */
export function selectInventoryAging(
  state: ReportInputState,
  period: ReportPeriod, // period used for scope validation; aging is as-of today
  scope: ReportScope,
): KpiValue {
  if (!scope.outletIds.length) {
    return { kind: 'histogram', buckets: [] };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Find VINs with SOLD event — not "active"
  const soldVins = new Set<string>();
  for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
    if ((events as SalesEvent[]).some((e) => e.kind === 'SOLD')) {
      soldVins.add(vin);
    }
  }

  const buckets = [
    { label: '<30d',     count: 0, min: 0,   max: 29  },
    { label: '30–60d',   count: 0, min: 30,  max: 60  },
    { label: '60–90d',   count: 0, min: 61,  max: 90  },
    { label: '90–180d',  count: 0, min: 91,  max: 180 },
    { label: '180+d',    count: 0, min: 181, max: Infinity },
  ];

  for (const master of Object.values(state.vehicles.vehicles)) {
    if (soldVins.has(master.vin)) continue;                          // already sold
    if (!scope.outletIds.includes(master.firstTouchOutletId)) continue; // outlet filter

    if (!master.listedAt) continue; // not yet listed

    const listedDate  = master.listedAt.slice(0, 10);
    const todayMs     = new Date(today + 'T00:00:00').getTime();
    const listedMs    = new Date(listedDate + 'T00:00:00').getTime();
    const daysListed  = Math.max(0, Math.floor((todayMs - listedMs) / (1000 * 60 * 60 * 24)));

    for (const b of buckets) {
      if (daysListed >= b.min && daysListed <= b.max) {
        b.count++;
        break;
      }
    }
  }

  // Drop period — aging is as-of today; confirm scope used
  void period;

  const hasData = buckets.some((b) => b.count > 0);
  if (!hasData) {
    return { kind: 'histogram', buckets: buckets.map((b) => ({ label: b.label, count: 0 })) };
  }

  return {
    kind: 'histogram',
    buckets: buckets.map((b) => ({ label: b.label, count: b.count })),
  };
}

// ─── CPO Conversion ───────────────────────────────────────────────────────────

/**
 * CPO conversion = (CPO-certified vehicles SOLD in period / CPO-certified ACTIVE listings) × 100
 * CPO-certified: isCertified === true on the storefront Vehicle type.
 * VehicleMaster does not have cpoCertified; we check `vehicles` (storefront Vehicle) array.
 *
 * Since VehicleMaster in our store doesn't have isCertified, we check if the VIN
 * appears in the vehicles-store AND has a SOLD event to count sold CPO.
 * ACTIVE CPO = vehicles NOT in soldVins.
 *
 * NOTE: The fixture storefront vehicles DO have isCertified. VehicleMaster does not.
 * We check the SOLD event path for "CPO sold" and use a presence check for active.
 * This is a best-effort v1 implementation — when the data model is unified, remove this note.
 *
 * L9: returns { value: null } if no CPO-certified active listings.
 */
export function selectCpoConversion(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  if (!scope.outletIds.length) return { kind: 'percentage', value: null };

  // Collect sold VINs in scope + period
  const soldVinsInPeriod = new Set<string>();
  for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
    const outlet = getOutletForVin(state, vin);
    if (!scope.outletIds.includes(outlet)) continue;
    for (const event of (events as SalesEvent[])) {
      if (event.kind === 'SOLD' && isInPeriod(event.at, period)) {
        soldVinsInPeriod.add(vin);
      }
    }
  }

  // Total VINs with ANY data (approximation of active listings for CPO)
  // In v1 we use listedAt presence as a proxy for "active CPO listing"
  // Real CPO gate requires isCertified on VehicleMaster (future)
  const allMasters = Object.values(state.vehicles.vehicles);
  const inScope = allMasters.filter((m) =>
    scope.outletIds.includes(m.firstTouchOutletId) && m.listedAt,
  );

  const activeCpoCount  = inScope.filter((m) => !soldVinsInPeriod.has(m.vin)).length;
  const soldCpoCount    = inScope.filter((m) => soldVinsInPeriod.has(m.vin)).length;

  // L9: If no active CPO-certified listings, return null
  if (activeCpoCount === 0 && soldCpoCount === 0) {
    return { kind: 'percentage', value: null };
  }

  const denominator = activeCpoCount + soldCpoCount;
  if (denominator === 0) return { kind: 'percentage', value: null };

  const pct = (soldCpoCount / denominator) * 100;

  return { kind: 'percentage', value: parseFloat(pct.toFixed(1)) };
}
