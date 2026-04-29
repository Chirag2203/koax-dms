/**
 * Outlet P&L selector.
 *
 * Formula (§6.3):
 *   revenue      = sum(salesEvent.payload.finalPrice WHERE kind='SOLD', outletId IN scope, date IN period)
 *   directCost   = sum(costLedger.amount WHERE category IN ['acquisition','refurb*','parts'], vin SOLD in period, outlet IN scope)
 *   operatingCost = sum(staffProfile.grossSalary × daysInPeriod / daysInMonth WHERE outletId IN scope) — pro-rated
 *   P&L = revenue − directCost − operatingCost
 *
 * L2: client-side only, pure function.
 * L4: scope enforcement is the selector's responsibility.
 * L8: format via formatINR at render time; selector returns raw number.
 * L9: value=null when no data.
 * L13: validates scope.outletIds.length > 0.
 *
 * Spec reference: SPEC-REPORTS-001 §6.3 (Seams 18, 19, 25)
 */

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '../types';
import type { SalesEvent } from '@dms/types';
import { isInPeriod, daysInPeriod } from '../period';

// Cost categories that count as direct cost (§6.3)
const DIRECT_COST_CATEGORIES = [
  'acquisition',
  'refurb-mechanical',
  'refurb-cosmetic',
  'refurb-detailing',
  'transport',
  'registration-tax',
  'insurance',
  'floor-plan-interest',
  'overhead',
  'photography',
  'misc',
  'custom-build-parts',
  'custom-build-labour',
  'custom-build-vendor-fee',
  'custom-build-customizations',
] as const;

/** Extracts outletId from a SOLD event's LISTED ancestor payload, or falls back to VehicleMaster.firstTouchOutletId */
function getOutletForVin(state: ReportInputState, vin: string): string {
  // Try to derive outlet from LISTED event payload
  const vinEvents = state.vehicles.salesEvents[vin] ?? [];
  const listedEvent = vinEvents.find((e) => e.kind === 'LISTED');
  if (listedEvent?.payload && typeof (listedEvent.payload as Record<string, unknown>)['outletId'] === 'string') {
    return (listedEvent.payload as { outletId: string }).outletId;
  }
  // Fallback: VehicleMaster.firstTouchOutletId
  const master = state.vehicles.vehicles[vin];
  return master?.firstTouchOutletId ?? '';
}

// L18: selectOutletPnL reads vehicles-store.salesEvents
export function selectOutletPnL(
  state: ReportInputState,
  period: ReportPeriod,
  scope: ReportScope,
): KpiValue {
  // L13: validate scope
  if (!scope.outletIds.length) return { kind: 'currency', value: null };

  // Collect all SOLD events within period + scope
  let revenue = 0;
  const soldVins: string[] = [];

  for (const [vin, events] of Object.entries(state.vehicles.salesEvents)) {
    const outletId = getOutletForVin(state, vin);
    if (!scope.outletIds.includes(outletId)) continue;

    for (const event of (events as SalesEvent[])) {
      if (event.kind !== 'SOLD') continue;
      if (!isInPeriod(event.at, period)) continue;

      const payload = event.payload as { finalPrice?: number } | undefined;
      const price = payload?.finalPrice ?? 0;
      revenue += price;
      soldVins.push(vin);
    }
  }

  if (soldVins.length === 0) return { kind: 'currency', value: null };

  // Direct cost: cost ledger for sold VINs
  let directCost = 0;
  const soldVinSet = new Set(soldVins);

  for (const [vin, entries] of Object.entries(state.vehicles.costLedger)) {
    if (!soldVinSet.has(vin)) continue;
    for (const entry of entries) {
      if (DIRECT_COST_CATEGORIES.includes(entry.category as (typeof DIRECT_COST_CATEGORIES)[number])) {
        directCost += entry.amount;
      }
    }
  }

  // Operating cost: pro-rated monthly gross salary for in-scope staff
  // L15: salary from staffProfile.salary (SalaryStructure) or fallback to 0
  const periodDays = daysInPeriod(period);
  // Approximate: period days / 30 as fraction of month
  const monthFraction = Math.min(1, periodDays / 30);

  let operatingCost = 0;
  for (const profile of Object.values(state.staff.staffById)) {
    if (!scope.outletIds.some((id) => outletMatchesStaff(id, profile.outlet))) continue;
    // L15: salary field is z.unknown() on StaffProfile — cast safely
    const sal = profile.salary as { basic?: number; hra?: number; specialAllowance?: number; da?: number } | undefined;
    if (!sal) continue;
    const gross = (sal.basic ?? 0) + (sal.hra ?? 0) + (sal.specialAllowance ?? 0) + (sal.da ?? 0);
    operatingCost += gross * monthFraction;
  }

  const pnl = revenue - directCost - operatingCost;

  return { kind: 'currency', value: Math.round(pnl) };
}

/** Map outlet ID (e.g. 'BLR-01') to StaffProfile.outlet string ('bangalore'|'mumbai'|'chennai'|'all') */
function outletMatchesStaff(outletId: string, staffOutlet: string): boolean {
  if (staffOutlet === 'all') return true;
  const map: Record<string, string> = {
    'BLR-01': 'bangalore',
    'MUM-01': 'mumbai',
    'CHE-01': 'chennai',
  };
  return map[outletId] === staffOutlet;
}
