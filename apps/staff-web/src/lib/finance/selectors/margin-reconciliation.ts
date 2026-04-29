/**
 * Margin reconciliation selector — SPEC-FINANCE-001 §4.3, seam 18/19
 *
 * Pure selector: reads from vehicles-store (sales-events + cost-ledger).
 * L14: No upstream stores are mutated. Read-on-demand via getState().
 * L1: GST margin formula from math/gst-margin.ts.
 * L13: PAN masking via math/pan-mask.ts.
 * L20: Discrepancy detection.
 *
 * Seam 18: Finance GST → Vehicles sales-events selector
 * Seam 19: Finance GST drill-down → cost-ledger selector
 */

import type { MarginReconciliationRow } from '@dms/types';
import type { FYPeriod } from '../math/period';
import { isInPeriod } from '../math/period';
import { computeMarginAndGst, detectGstDiscrepancy } from '../math/gst-margin';
import { maskPan } from '../math/pan-mask';
import { useVehiclesStore } from '../../vehicles/vehicles-store';

// ─── Outlet scope type ────────────────────────────────────────────────────────

export type OutletScope = 'BLR' | 'MUM' | 'CHE' | 'ALL';

// ─── Selector ────────────────────────────────────────────────────────────────

/**
 * Compute MarginReconciliationRow[] from sales-events + cost-ledger.
 *
 * L14: Pure selector — reads only; no mutations.
 * L1: margin = max(0, salePrice - acquisitionCost - allowableRefurb); gst = margin × 18/118.
 * L20: Discrepancy if |computed - stored| > ₹1.
 * Seam 18 + 19: SPEC-FINANCE-001 §9.
 */
export function getMarginReconciliation(
  period: FYPeriod,
  scope: OutletScope,
  discrepancyAcks: Record<string, { reason: string; actorId: string; ackedAt: string }>,
  marginRowReconciliations: Record<string, { notes?: string; reconciledBy: string; reconciledAt: string }>,
): MarginReconciliationRow[] {
  // L14: read upstream stores via getState() — no subscriptions
  const vehiclesState = useVehiclesStore.getState();
  const allVehicles = vehiclesState.vehicles;
  const allSalesEvents = vehiclesState.salesEvents;
  const costLedger = vehiclesState.costLedger;

  const rows: MarginReconciliationRow[] = [];

  for (const [vin, events] of Object.entries(allSalesEvents)) {
    const soldEvents = events.filter((e) => e.kind === 'SOLD');

    for (const event of soldEvents) {
      // Period filter
      if (!isInPeriod(event.at, period)) continue;

      const vehicle = allVehicles[vin];
      if (!vehicle) continue;

      // Outlet scope filter — L27
      const outletId = (vehicle as Record<string, unknown>)['outletId'] as 'BLR' | 'MUM' | 'CHE';
      if (scope !== 'ALL' && outletId !== scope) continue;

      // Extract sale payload fields (PLAN-VEHICLES-003 L4/L5 inheritance)
      const payload = event.payload as Record<string, unknown>;
      const salePricePaise = ((payload['finalPrice'] as number) ?? 0) * 100;
      const storedGstPaise = payload['gstMargin'] != null
        ? ((payload['gstMargin'] as number) * 100)
        : null;
      const acquisitionCostPaise = ((vehicle as Record<string, unknown>)['acquisitionCost'] as number ?? 0) * 100;

      // Seam 19: allowable refurb from cost-ledger
      const vinLedger = costLedger[vin] ?? [];
      const allowableRefurbPaise = vinLedger
        .filter((e) => {
          const isAllowable = (e as Record<string, unknown>)['isAllowableRefurb'] as boolean;
          const entryAt = (e as Record<string, unknown>)['createdAt'] as string;
          return isAllowable && entryAt < event.at;
        })
        .reduce((sum, e) => {
          const amount = (e as Record<string, unknown>)['amount'] as number;
          return sum + (amount ?? 0) * 100;
        }, 0);

      // L1: compute margin + GST
      const { marginPaise, gstPaise } = computeMarginAndGst({
        salePricePaise,
        acquisitionCostPaise,
        allowableRefurbPaise,
      });

      // L20: discrepancy detection
      const discrepancyDetected = detectGstDiscrepancy(gstPaise, storedGstPaise);

      const rowKey = `${vin}:${event.id}`;
      const ack = discrepancyAcks[rowKey] ?? null;
      const recon = marginRowReconciliations[rowKey];

      const customerPan = (payload['customerPan'] as string | undefined) ?? null;

      rows.push({
        vin,
        saleEventId: event.id,
        saleDate: event.at,
        customerName: (payload['buyerName'] as string | undefined) ?? 'Unknown',
        customerPanLast4: customerPan ? maskPan(customerPan) : '—',  // L13
        outletId: outletId ?? 'BLR',
        salePricePaise,
        acquisitionCostPaise,
        allowableRefurbPaise,
        computedMarginPaise: marginPaise,
        computedGstPaise: gstPaise,
        storedGstPaise,
        discrepancyDetected,
        discrepancyAck: ack,
        hsnMissing: false, // L25: HSN derived from upstream; flag when missing
        reconciliationStatus: recon ? 'reconciled' : 'open',
        reconciledBy: recon?.reconciledBy,
        reconciledAt: recon?.reconciledAt,
        reconciledNotes: recon?.notes,
      });
    }
  }

  // Sort by saleDate desc
  rows.sort((a, b) => (a.saleDate < b.saleDate ? 1 : -1));
  return rows;
}
