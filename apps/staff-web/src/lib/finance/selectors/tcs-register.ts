/**
 * TCS register selector — SPEC-FINANCE-001 §4.3, seam 21
 *
 * L2: Cumulative per-PAN per-FY. TCS = 1% on > ₹10L.
 * L3: Waivers read-only from sales-events.
 * L13: customerPanLast4 only.
 * L21: 4-state threshold chip.
 * L14: Pure selector — no mutations.
 *
 * Seam 21: Finance TCS Register → sales-events PAN aggregator.
 */

import type { TcsRegisterRow } from '@dms/types';
import type { FYPeriod } from '../math/period';
import { isInPeriod } from '../math/period';
import { computeCumulativeTcs, computeTcsThresholdState } from '../math/tcs';
import { maskPan } from '../math/pan-mask';
import { useVehiclesStore } from '../../vehicles/vehicles-store';
import type { OutletScope } from './margin-reconciliation';

// ─── Selector ─────────────────────────────────────────────────────────────────

/**
 * Compute TcsRegisterRow[] per PAN per FY from sales-events.
 *
 * L14: Pure selector — no mutations.
 * L2: Cumulative per-PAN per-FY; TCS @ 1% > ₹10L.
 * L3: Waivers excluded from TCS collected but included in cumulative purchase.
 * Seam 21: SPEC-FINANCE-001 §9.
 */
export function getTcsRegister(
  period: FYPeriod,
  scope: OutletScope,
): TcsRegisterRow[] {
  // L14: read upstream via getState()
  const vehiclesState = useVehiclesStore.getState();
  const allVehicles = vehiclesState.vehicles;
  const allSalesEvents = vehiclesState.salesEvents;

  // Group SOLD events by customerPan, filtered by FY
  const panMap = new Map<string, {
    customerId: string;
    customerName: string;
    pan: string;
    events: Array<{
      eventId: string;
      vin: string;
      saleDate: string;
      invoiceValuePaise: number;
      tcsWaived: boolean;
      tcsWaivedReason?: string;
      tcsWaivedBy?: string;
    }>;
  }>();

  for (const [vin, events] of Object.entries(allSalesEvents)) {
    const vehicle = allVehicles[vin];

    for (const event of events) {
      if (event.kind !== 'SOLD') continue;
      // FY period filter
      if (!isInPeriod(event.at, period)) continue;

      // Outlet scope filter
      const outletId = ((vehicle as Record<string, unknown>)?.['outletId'] as string);
      if (scope !== 'ALL' && outletId !== scope) continue;

      const payload = event.payload as Record<string, unknown>;
      const customerPan = (payload['customerPan'] as string | undefined) ?? 'UNKNOWN0000';
      const customerId = (payload['buyerCustomerId'] as string | undefined) ?? 'unknown';
      const customerName = (payload['buyerName'] as string | undefined) ?? 'Unknown';
      const invoiceValuePaise = ((payload['finalPrice'] as number) ?? 0) * 100;
      const tcsWaived = (payload['tcsWaived'] as boolean | undefined) ?? false;
      const tcsWaivedReason = payload['tcsWaivedReason'] as string | undefined;
      const tcsWaivedBy = payload['tcsWaivedBy'] as string | undefined;

      if (!panMap.has(customerPan)) {
        panMap.set(customerPan, { customerId, customerName, pan: customerPan, events: [] });
      }

      panMap.get(customerPan)!.events.push({
        eventId: event.id,
        vin,
        saleDate: event.at,
        invoiceValuePaise,
        tcsWaived,
        tcsWaivedReason,
        tcsWaivedBy,
      });
    }
  }

  const rows: TcsRegisterRow[] = [];

  for (const { customerId, customerName, pan, events } of panMap.values()) {
    // Sort events by date ascending for cumulative calculation
    const sorted = [...events].sort((a, b) => (a.saleDate < b.saleDate ? -1 : 1));
    const enriched = computeCumulativeTcs(sorted);

    const cumulativePurchasePaise = enriched.reduce((s, e) => s + e.invoiceValuePaise, 0);
    // L3 + S-F-17: TCS-applicable cumulative excludes waived events from threshold calc
    const tcsApplicablePaise = enriched
      .filter((e) => !e.tcsWaived)
      .reduce((s, e) => s + e.invoiceValuePaise, 0);
    const tcsCollectedTotalPaise = enriched.reduce((s, e) => s + e.tcsAppliedPaise, 0);
    const waivedSalesCount = enriched.filter((e) => e.tcsWaived).length;
    const lastSaleAt = enriched[enriched.length - 1]?.saleDate ?? '';

    rows.push({
      customerId,
      customerName,
      customerPanLast4: maskPan(pan), // L13
      fy: period.label.slice(0, 4),   // 'FY26'
      cumulativePurchasePaise,
      tcsApplicablePaise,
      thresholdState: computeTcsThresholdState(tcsApplicablePaise), // L21
      tcsCollectedTotalPaise,
      salesCount: enriched.length,
      waivedSalesCount,
      lastSaleAt,
      events: enriched.map((e) => ({
        eventId: e.eventId,
        vin: e.vin,
        saleDate: e.saleDate,
        invoiceValuePaise: e.invoiceValuePaise,
        tcsAppliedPaise: e.tcsAppliedPaise,
        tcsWaived: e.tcsWaived,
        tcsWaivedReason: e.tcsWaivedReason,
        tcsWaivedBy: e.tcsWaivedBy,
      })),
    });
  }

  // Sort by cumulative desc
  rows.sort((a, b) => b.cumulativePurchasePaise - a.cumulativePurchasePaise);
  return rows;
}
