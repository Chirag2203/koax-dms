/**
 * Inventory Aging + Pricing Intelligence — pure selectors.
 *
 * Spec reference: SPEC-INVENTORY-AGING-001
 *
 * Locked decisions:
 *   L1: aging bands (<30, 30–60, 60–90, 90–180, 180+)
 *   L2: suggestedPrice >= costBasis * 1.05 ALWAYS (non-negotiable guardrail)
 *   L3: RESERVED vehicles included in reports (chip suppression is UI concern)
 *   L5: ACTIVE = last SalesEvent in {ACQUIRED, LISTED, PRICE_CHANGED, RESERVATION_LOST}
 *   L8: costBasis = sum of all CostLedgerEntry.amount for VIN
 *   L9: reason codes: competitor_price | margin_guardrail | no_suggestion
 *   L10: suggestedDrop = currentPrice - suggestedPrice (positive = reduction)
 */

import type { VehiclesState } from '@/src/lib/vehicles/vehicles-store/types';
import type { CompetitorPrice } from '@dms/mocks/fixtures';
import type { Deal, DealStage } from '@dms/types';

// ─── Band types ───────────────────────────────────────────────────────────────

/** L1: Aging band for a listed vehicle. */
export type AgingBand =
  | 'fresh'     // < 30 days
  | 'moderate'  // 30–60 days
  | 'aging'     // 60–90 days
  | 'stale'     // 90–180 days (amber chip)
  | 'critical'; // 180+ days (red chip)

/** L9: Suggestion reason codes. */
export type PriceSuggestionReason =
  | 'competitor_price'   // competitor median < currentPrice (above guardrail)
  | 'margin_guardrail'   // heuristic drop, capped at guardrail
  | 'no_suggestion';     // < 30d or already competitively priced

/** A row in the aged-inventory report. */
export interface AgedListingRow {
  vin: string;
  vehicleName: string;      // "{year} {make} {model} {variant}"
  listedAt: string;         // ISO timestamp from VehicleMaster.listedAt
  daysListed: number;
  agingBand: AgingBand;
  currentPrice: number;     // rupees (vehicle.price)
  costBasis: number;        // sum of CostLedgerEntry.amount (L8)
  suggestedPrice: number;   // never < costBasis * 1.05 (L2)
  suggestedDrop: number;    // currentPrice − suggestedPrice (L10)
  reason: PriceSuggestionReason;
  competitorMedian?: number; // present when competitor data exists
  outletId: string;
  /** Most-recent open Deal for this VIN, if any (stage not in ['lost','delivered']). */
  linkedDealId?: string;
  linkedDealStage?: DealStage;
}

// ─── deriveCurrentPrice ───────────────────────────────────────────────────────

/**
 * Derives the current listing price from the SalesEvent stream.
 * - LISTED event sets the base price (payload.listPrice)
 * - Each subsequent PRICE_CHANGED event updates it (payload.toPrice)
 *
 * Returns 0 if no LISTED event exists.
 */
function deriveCurrentPrice(events: VehiclesState['salesEvents'][string]): number {
  if (!events) return 0;
  let price = 0;
  for (const ev of events) {
    if (ev.kind === 'LISTED') {
      const p = ev.payload as { listPrice?: number };
      price = p.listPrice ?? 0;
    } else if (ev.kind === 'PRICE_CHANGED') {
      const p = ev.payload as { toPrice?: number };
      if (p.toPrice != null) price = p.toPrice;
    }
  }
  return price;
}

// ─── ACTIVE kinds (L5) ────────────────────────────────────────────────────────
// L3: RESERVED is included — chip suppression is a UI concern; reports still show reserved vehicles.
// SOLD / RETURNED remove the vehicle from the active list.
const ACTIVE_SALES_KINDS = new Set([
  'ACQUIRED',
  'LISTED',
  'PRICE_CHANGED',
  'RESERVED',          // L3: included — chip suppressed in SalesTab, row shown in reports
  'RESERVATION_LOST',
]);

// ─── Heuristic drop percentages by band ──────────────────────────────────────
// When no competitor data is available, apply a band-based heuristic drop.
// All drops are capped by the 5% margin guardrail (L2).
const HEURISTIC_DROP_PCT: Record<AgingBand, number> = {
  fresh:    0,     // no drop for fresh
  moderate: 0,     // no drop for moderate
  aging:    0.02,  // 2% suggested drop at 60–90d
  stale:    0.04,  // 4% suggested drop at 90–180d
  critical: 0.08,  // 8% suggested drop at 180+d
};

// ─── computeAgingBand ─────────────────────────────────────────────────────────

/**
 * Compute the aging band for a given daysListed count.
 * L1: band boundaries (day-count-inclusive).
 */
export function computeAgingBand(daysListed: number): AgingBand {
  if (daysListed >= 180) return 'critical';
  if (daysListed >= 90)  return 'stale';
  if (daysListed >= 60)  return 'aging';
  if (daysListed >= 30)  return 'moderate';
  return 'fresh';
}

// ─── computePriceSuggestion ───────────────────────────────────────────────────

/**
 * Compute suggested price and reason for a listed vehicle.
 *
 * L2: suggestedPrice >= costBasis * 1.05 (ALWAYS, non-negotiable)
 * L9: reason codes
 * L10: suggestedDrop = currentPrice - suggestedPrice
 */
export function computePriceSuggestion(
  currentPrice: number,
  costBasis: number,
  daysListed: number,
  competitorPricesForVin: CompetitorPrice[],
): {
  suggestedPrice: number;
  suggestedDrop: number;
  reason: PriceSuggestionReason;
  competitorMedian?: number;
} {
  // L2: guardrail floor — NEVER suggest below this
  const guardrailFloor = Math.ceil(costBasis * 1.05);

  const band = computeAgingBand(daysListed);

  // Fresh / moderate with no competitor data — no suggestion
  if (band === 'fresh' || band === 'moderate') {
    if (competitorPricesForVin.length === 0) {
      return {
        suggestedPrice: currentPrice,
        suggestedDrop: 0,
        reason: 'no_suggestion',
      };
    }
  }

  // Compute competitor median if data exists
  let competitorMedian: number | undefined;
  if (competitorPricesForVin.length > 0) {
    const sorted = [...competitorPricesForVin]
      .map((c) => c.listedPrice)
      .sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    competitorMedian =
      sorted.length % 2 !== 0
        ? sorted[mid]!
        : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }

  // Decide candidate price based on competitor data or heuristic
  let candidatePrice: number;
  let candidateReason: PriceSuggestionReason;

  if (competitorMedian !== undefined && competitorMedian < currentPrice) {
    // Competitor suggests lower — use their median but enforce guardrail
    candidatePrice = competitorMedian;
    candidateReason = 'competitor_price';
  } else if (band !== 'fresh' && band !== 'moderate') {
    // Age-heuristic drop
    const dropPct = HEURISTIC_DROP_PCT[band];
    candidatePrice = Math.round(currentPrice * (1 - dropPct));
    candidateReason = 'margin_guardrail';
  } else {
    // Fresh/moderate with competitor data but competitor >= currentPrice → no suggestion
    return {
      suggestedPrice: currentPrice,
      suggestedDrop: 0,
      reason: 'no_suggestion',
      competitorMedian,
    };
  }

  // L2: enforce guardrail — candidate must be >= guardrailFloor
  const suggestedPrice = Math.max(candidatePrice, guardrailFloor);

  // If enforcing guardrail pushed us back to (or above) currentPrice, no meaningful drop
  if (suggestedPrice >= currentPrice) {
    return {
      suggestedPrice: currentPrice,
      suggestedDrop: 0,
      reason: 'no_suggestion',
      competitorMedian,
    };
  }

  // L10: suggestedDrop = currentPrice - suggestedPrice
  const suggestedDrop = currentPrice - suggestedPrice;

  // If candidate was below guardrail, reason changes to margin_guardrail
  const reason: PriceSuggestionReason =
    candidatePrice < guardrailFloor ? 'margin_guardrail' : candidateReason;

  return {
    suggestedPrice,
    suggestedDrop,
    reason,
    ...(competitorMedian !== undefined ? { competitorMedian } : {}),
  };
}

// ─── selectAgedListings ───────────────────────────────────────────────────────

// Deal stages that are considered "open" (i.e. not terminal) for linking.
const OPEN_DEAL_STAGES: ReadonlySet<string> = new Set([
  'new-lead',
  'contacted',
  'test-drive',
  'reserved',
  'sales-order',
  'on-hold',
]);

/**
 * Returns all ACTIVE listed vehicles sorted by daysListed desc.
 *
 * L3: RESERVED vehicles ARE included (chip suppression is a UI concern).
 * L5: ACTIVE = last SalesEvent in ACTIVE_SALES_KINDS.
 * L8: costBasis = sum of all CostLedgerEntry.amount for VIN.
 *
 * @param state - VehiclesState (vehicles + salesEvents + costLedger)
 * @param competitorPrices - all competitor price records from fixture / scrape
 * @param now - ISO timestamp (for deterministic tests)
 * @param deals - optional Record<id, Deal> from SalesDealsStore; defaults to {}
 *                so existing callers are unaffected.
 */
export function selectAgedListings(
  state: Pick<VehiclesState, 'vehicles' | 'salesEvents' | 'costLedger'>,
  competitorPrices: CompetitorPrice[],
  now: string,
  deals: Record<string, Deal> = {},
): AgedListingRow[] {
  const nowMs = new Date(now).getTime();
  const rows: AgedListingRow[] = [];

  for (const [vin, vehicle] of Object.entries(state.vehicles)) {
    if (!vehicle) continue;

    // L5: check last SalesEvent — must be an ACTIVE kind
    const salesEvents = state.salesEvents[vin] ?? [];
    const lastEvent = salesEvents[salesEvents.length - 1];

    // No events: fall back to vehicle.listedAt + vehicle presence check
    const isActive =
      lastEvent != null
        ? ACTIVE_SALES_KINDS.has(lastEvent.kind)
        : Boolean(vehicle.listedAt); // treat as active if listedAt exists with no events

    if (!isActive) continue;
    if (!vehicle.listedAt) continue;

    // Days listed
    const listedMs = new Date(vehicle.listedAt).getTime();
    const daysListed = Math.max(0, Math.floor((nowMs - listedMs) / (1000 * 60 * 60 * 24)));

    const agingBand = computeAgingBand(daysListed);

    // Derive current price from the LISTED event (listPrice) with subsequent
    // PRICE_CHANGED events applied (toPrice). VehicleMaster has no price field.
    const currentPrice = deriveCurrentPrice(salesEvents);

    // L8: costBasis = sum of CostLedgerEntry.amount
    const ledgerEntries = state.costLedger[vin] ?? [];
    const costBasis = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

    // Competitor prices for this VIN
    const vinCompetitors = competitorPrices.filter((c) => c.vin === vin);

    // Compute suggestion
    const { suggestedPrice, suggestedDrop, reason, competitorMedian } =
      computePriceSuggestion(currentPrice, costBasis, daysListed, vinCompetitors);

    // Vehicle name
    const vehicleName = [vehicle.year, vehicle.make, vehicle.model, vehicle.variant]
      .filter(Boolean)
      .join(' ');

    // Find most-recent open Deal for this VIN (not 'lost' or 'delivered').
    const openDealsForVin = Object.values(deals)
      .filter((d) => d.vehicleVin === vin && OPEN_DEAL_STAGES.has(d.stage))
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
    const linkedDeal = openDealsForVin[0];

    rows.push({
      vin,
      vehicleName,
      listedAt: vehicle.listedAt,
      daysListed,
      agingBand,
      currentPrice,
      costBasis,
      suggestedPrice,
      suggestedDrop,
      reason,
      ...(competitorMedian !== undefined ? { competitorMedian } : {}),
      outletId: vehicle.firstTouchOutletId ?? '',
      ...(linkedDeal ? { linkedDealId: linkedDeal.id, linkedDealStage: linkedDeal.stage } : {}),
    });
  }

  // Sort by daysListed desc (oldest first)
  rows.sort((a, b) => b.daysListed - a.daysListed);

  return rows;
}
