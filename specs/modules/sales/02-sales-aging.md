---
spec_id: SPEC-INVENTORY-AGING-001
title: Inventory Aging + Pricing Intelligence
domain: inventory
status: approved
version: 1.0
risk_level: low
pii_sensitivity: none
flags: []
owners: [orchestrator]
depends_on:
  - PLAN-VEHICLES-003
  - SPEC-REPORTS-001
created: 2026-04-30
---

# SPEC-INVENTORY-AGING-001 — Inventory Aging + Pricing Intelligence

## Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1  | Aging bands | Five bands: <30d, 30–60d, 60–90d, 90–180d (amber), 180+d (red). Band boundaries are day-count-inclusive (≥30 means 30 and above). | Theme B §B3 |
| L2  | Guardrail: 5% min margin | `suggestedPrice` MUST be ≥ `costBasis × 1.05`. No suggestion ever drops below this floor. This is a NON-NEGOTIABLE lock — no override path. | Brief §Hard rules |
| L3  | Chip suppression during RESERVED | When the active deal stage is `reserved`, the aging chip is suppressed (L23 from PLAN-VEHICLES-003 holds). The reports list still shows the row — suppression is only in the chip render. | PLAN-VEHICLES-003 L23 |
| L4  | Pure selectors only — no new store | All selectors are pure functions accepting `(state, now)`. No Zustand slice added. `applySuggestedPriceDrop` extends `vehicles-store` (SalesEventsSlice) by emitting a `PRICE_CHANGED` event. | Brief §NO new store |
| L5  | ACTIVE listings only in Reports view | Only vehicles whose last SalesEvent is one of: ACQUIRED, LISTED, PRICE_CHANGED, RESERVATION_LOST are shown (same logic as SalesTab isCurrentlyOnSale). SOLD/RETURNED are excluded. | Theme B §B3 |
| L6  | R10+ gate on applySuggestedPriceDrop | The store action checks `actor.role` ≥ R10 before writing. Roles allowed: R10, R11, R12, R19, R22, R24. If the caller is below R10, the action throws `InsufficientRoleError`. | Doc 14 §Sales Mgr R10 |
| L7  | Competitor data: v1 static fixture | `packages/mocks/src/fixtures/competitor-prices.ts` provides static competitor prices for 8 VINs. The selector accepts `competitorPrices` as a param so v2 can wire a real scrape without changing the selector signature. | Brief §Fixtures |
| L8  | costBasis from cost-ledger entries | `costBasis` = sum of all `CostLedgerEntry.amount` for the VIN (fixtures + runtime). Falls back to 0 if no entries. The reports selector reads `state.costLedger[vin]` directly from vehicles-store. | PLAN-VEHICLES-003 §cost-ledger |
| L9  | Reason codes | Suggestion reason is one of: `'competitor_price'` (competitor median is below current price), `'margin_guardrail'` (competitor data not available, drop by age-heuristic subject to guardrail), `'no_suggestion'` (vehicle < 30d or already competitively priced). | Brief §Selectors |
| L10 | suggestedDrop sign convention | `suggestedDrop = currentPrice - suggestedPrice`. Positive = price reduction. If no suggestion (reason=`'no_suggestion'`), both suggestedPrice = currentPrice and suggestedDrop = 0. | Consistency with reports UX |
| L11 | Price-change event payload | `applySuggestedPriceDrop` emits `PRICE_CHANGED` with payload `{ previousPrice, newPrice, reason, source: 'AGING_SUGGESTION' }`. Validated by `validateSalesEventPayload`. | PLAN-VEHICLES-003 L28 |
| L12 | Drill-down route `/inventory-aging/[vin]` | Shows full price-change history (all PRICE_CHANGED events for VIN) + competitor data table + margin trace. Read-only — no new actions on drill-down. | Brief §Routes |
| L13 | i18n namespace `inventoryAging` | All user-facing strings under `messages/en-IN.json` → `{ "inventoryAging": { … } }` (top-level). hi-IN fallback keys must exist. | CLAUDE.md §10 item 7 + §17 |

---

## 1. Domain overview

Inventory carrying cost in luxury pre-owned is high — depreciation, insurance, and floor space. A car sitting on lot for 90+ days begins to destroy margin. This spec defines:

1. **Aging chip enhancement** on the Sales tab — surface the amber/red band more prominently for ≥90d vehicles (the chip already exists via `StaleListingChip`; this spec promotes it with explicit aging-band copy and an inline "View in Aging Report" deep-link).
2. **Reports view** `/inventory-aging` — full table of all active listings sorted by days-listed desc, grouped by aging band, with a suggested price drop column and an R10+ "Apply suggestion" CTA.
3. **Drill-down** `/inventory-aging/[vin]` — per-VIN price history, competitor data, margin trace.
4. **Store action** `applySuggestedPriceDrop` — emits a `PRICE_CHANGED` SalesEvent after R10+ gate.

---

## 2. Entities and types

```typescript
/** Aging band for a listed vehicle. */
export type AgingBand =
  | 'fresh'       // < 30 days
  | 'moderate'    // 30–60 days
  | 'aging'       // 60–90 days
  | 'stale'       // 90–180 days (amber)
  | 'critical';   // 180+ days (red)

/** Suggestion reason. */
export type PriceSuggestionReason =
  | 'competitor_price'   // competitor median < currentPrice
  | 'margin_guardrail'   // heuristic drop, capped at guardrail
  | 'no_suggestion';     // < 30d or already competitive

/** A row in the aged-inventory report. */
export interface AgedListingRow {
  vin: string;
  vehicleName: string;      // "{year} {make} {model} {variant}"
  listedAt: string;         // ISO timestamp
  daysListed: number;
  agingBand: AgingBand;
  currentPrice: number;     // rupees
  costBasis: number;        // sum of cost-ledger entries (rupees)
  suggestedPrice: number;   // never < costBasis × 1.05 (L2)
  suggestedDrop: number;    // currentPrice − suggestedPrice (L10)
  reason: PriceSuggestionReason;
  competitorMedian?: number; // if competitor data exists for this VIN
  outletId: string;
}

/** Competitor price record — v1 static fixture. */
export interface CompetitorPrice {
  vin: string;
  competitorName: string;
  listedPrice: number;
  scrapedAt: string; // ISO date
}
```

---

## 3. State machine

No new state machine. Uses existing `VehicleMaster.listedAt` + `salesEvents` stream from vehicles-store.

---

## 4. Selector signatures

All in `apps/staff-web/src/lib/inventory-aging/selectors.ts`.

```typescript
/**
 * Compute the aging band for a given daysListed count.
 * L1: band boundaries (≥N inclusive).
 */
export function computeAgingBand(daysListed: number): AgingBand;

/**
 * Given current price, cost basis, days listed, and optional competitor prices,
 * compute the suggested price and reason.
 *
 * L2: suggestedPrice ≥ costBasis × 1.05 (ALWAYS enforced, no exceptions)
 * L9: reason codes
 * L10: suggestedDrop = currentPrice − suggestedPrice
 */
export function computePriceSuggestion(
  currentPrice: number,
  costBasis: number,
  daysListed: number,
  competitorPrices: CompetitorPrice[],
): { suggestedPrice: number; suggestedDrop: number; reason: PriceSuggestionReason; competitorMedian?: number };

/**
 * Returns all ACTIVE listed vehicles sorted by daysListed desc,
 * annotated with aging band + price suggestion.
 *
 * L3: chip suppression is a UI concern — this selector ALWAYS includes
 *     RESERVED vehicles (their row shows in reports; chip is suppressed in SalesTab).
 * L5: ACTIVE = last SalesEvent in {ACQUIRED, LISTED, PRICE_CHANGED, RESERVATION_LOST}.
 *
 * @param state - VehiclesState (vehicles + salesEvents + costLedger)
 * @param competitorPrices - all competitor price records (keyed lookup done inside)
 * @param now - ISO timestamp (for deterministic day-count in tests)
 */
export function selectAgedListings(
  state: Pick<VehiclesState, 'vehicles' | 'salesEvents' | 'costLedger'>,
  competitorPrices: CompetitorPrice[],
  now: string,
): AgedListingRow[];
```

---

## 5. Store action (vehicles-store extension)

Added to `sales-events-slice.ts` (or a thin wrapper in the slice) and declared in `types.ts`:

```typescript
/**
 * R10+ gate — apply a suggested price drop.
 * Emits PRICE_CHANGED SalesEvent via existing emitSalesEvent.
 * L6: throws InsufficientRoleError if actor.role not in R10+.
 * L11: payload includes { previousPrice, newPrice, reason, source: 'AGING_SUGGESTION' }.
 */
applySuggestedPriceDrop(
  vin: string,
  newPrice: number,
  reason: string,
  actor: Actor,
): void;
```

---

## 6. Scenarios (P1 scope)

### S-IA-01 — Fresh vehicle (< 30d): no suggestion, no aging chip
**Given** a vehicle listed 10 days ago, no competitor data
**When** `selectAgedListings` runs
**Then** row has `agingBand='fresh'`, `reason='no_suggestion'`, `suggestedDrop=0`

### S-IA-02 — Stale vehicle (90–180d): amber chip visible
**Given** a vehicle listed 100 days ago, `currentPrice=8_000_000`, `costBasis=6_000_000`
**When** `selectAgedListings` runs
**Then** row has `agingBand='stale'`, chip renders amber in SalesTab

### S-IA-03 — Critical vehicle (180+d): red chip visible, suggestion via guardrail
**Given** a vehicle listed 200 days ago, `currentPrice=8_000_000`, `costBasis=7_500_000`
**When** `computePriceSuggestion` runs with no competitor data
**Then** `suggestedPrice = 7_875_000` (= 7_500_000 × 1.05), `reason='margin_guardrail'`

### S-IA-04 — Competitor data drives suggestion below guardrail: guardrail wins
**Given** `currentPrice=8_000_000`, `costBasis=7_600_000`, competitor median = 7_500_000
**When** `computePriceSuggestion` runs
**Then** `suggestedPrice = 7_980_000` (= 7_600_000 × 1.05, NOT 7_500_000), `reason='competitor_price'`
(guardrail enforced because competitor median < floor)

### S-IA-05 — Competitor data drives suggestion above guardrail: competitor wins
**Given** `currentPrice=10_000_000`, `costBasis=6_000_000`, competitor median = 9_200_000
**When** `computePriceSuggestion` runs
**Then** `suggestedPrice = 9_200_000` (competitor median is above guardrail of 6_300_000), `reason='competitor_price'`

### S-IA-06 — RESERVED suppression (L3, L23)
**Given** a vehicle listed 100 days ago with active deal stage='reserved'
**When** `StaleListingChip` is rendered
**Then** chip returns null (suppressed per L3/L23)
**But** when `selectAgedListings` runs, the VIN IS present in the reports list

### S-IA-07 — R10+ gate on applySuggestedPriceDrop
**Given** actor.role = 'R05' (Service Advisor)
**When** `applySuggestedPriceDrop(vin, newPrice, reason, actor)` is called
**Then** throws `InsufficientRoleError` with actor.role and VIN in message

### S-IA-08 — applySuggestedPriceDrop emits PRICE_CHANGED
**Given** actor.role = 'R10', vehicle exists
**When** `applySuggestedPriceDrop(vin, 7_000_000, 'Too expensive for market', actor)` is called
**Then** `salesEvents[vin]` contains a PRICE_CHANGED event with
  `payload.newPrice = 7_000_000`, `payload.source = 'AGING_SUGGESTION'`

### S-IA-09 — Empty state when no active listings
**Given** state has no vehicles OR all vehicles have status SOLD
**When** `/inventory-aging` page renders
**Then** empty-state card is shown with helpful copy

### S-IA-10 — Grouping by aging band
**Given** 3 vehicles: one in each of fresh, stale, critical bands
**When** reports view renders
**Then** three band sections render; stale appears before fresh (sort by daysListed desc)

---

## 7. UI layout

### `/inventory-aging` (Reports view)
```
PageHeader: "Inventory Aging" | subtitle "Active listings sorted by time on lot"
                               | right: Gate R10 → "Refresh Competitor Data (stub)"

[Band group: Critical (180+d)] ── red header chip
  table: VIN | Vehicle | Days Listed | Current Price | Cost Basis | Suggested Drop | Reason | Action
  rows sorted by daysListed desc
  Action: Gate R10+ → "Apply Suggestion" → AlertDialog with reason textarea

[Band group: Stale (90–180d)] ── amber header chip
  same table pattern

[Band group: Aging (60–90d)] ── muted yellow header
...

Empty state: single card, "No aging inventory." copy
```

### `/inventory-aging/[vin]` (Drill-down)
```
PageHeader: "{year} {make} {model}" | VINBadge | back link "← Aging Report"
  
[Price History card]
  table of PRICE_CHANGED events: date | old price | new price | change | actor | source

[Competitor Data card]
  table: competitor | listed price | scraped at

[Margin Trace card]
  Cost Basis: ₹X
  Current Price: ₹Y
  Current Margin: ₹Z (X%)
  Guardrail Floor: ₹W (cost × 1.05)
```

### Sales tab enhancement
- `StaleListingChip` promoted: on ≥90d vehicles, add an inline "View in Aging Report" link (`/inventory-aging/${vin}`) below the chip.

---

## 8. Sidebar nav

Under the "Operations" group in `staff-sidebar.tsx`:
```
{ key: 'inventoryAging', href: '/inventory-aging', icon: TrendingDown }
```
i18n key `staff.nav.inventoryAging = "Inventory Aging"`.

---

## 9. File manifest

| File | Action |
|---|---|
| `specs/modules/inventory-aging/01-inventory-aging-pricing.md` | **This spec** |
| `packages/mocks/src/fixtures/competitor-prices.ts` | Create — 8 VINs, static prices |
| `apps/staff-web/src/lib/inventory-aging/selectors.ts` | Create — pure selector functions |
| `apps/staff-web/src/lib/vehicles/vehicles-store/slices/sales-events-slice.ts` | Extend — add `applySuggestedPriceDrop` |
| `apps/staff-web/src/lib/vehicles/vehicles-store/types.ts` | Extend — add to `SalesEventsActions` |
| `apps/staff-web/app/(shell)/inventory-aging/error.tsx` | Create — module error boundary |
| `apps/staff-web/app/(shell)/inventory-aging/page.tsx` | Create — Reports view page |
| `apps/staff-web/app/(shell)/inventory-aging/[vin]/page.tsx` | Create — drill-down page |
| `apps/staff-web/src/components/inventory-aging/inventory-aging-view.tsx` | Create — Reports UI |
| `apps/staff-web/src/components/inventory-aging/aging-band-section.tsx` | Create — band group row |
| `apps/staff-web/src/components/inventory-aging/apply-suggestion-dialog.tsx` | Create — AlertDialog for apply action |
| `apps/staff-web/src/components/inventory-aging/aging-drill-down-view.tsx` | Create — drill-down UI |
| `apps/staff-web/src/components/vehicles/detail/tabs/sales/stale-listing-chip.tsx` | Modify — add deep-link |
| `apps/staff-web/src/components/shell/staff-sidebar.tsx` | Modify — add nav entry |
| `apps/staff-web/src/tests/inventory-aging.test.ts` | Create — ≥15 tests |
| `apps/staff-web/messages/en-IN.json` | Extend — `inventoryAging` namespace |
| `apps/staff-web/messages/hi-IN.json` | Extend — `inventoryAging` namespace |

---

## 10. Acceptance criteria

- [ ] `/inventory-aging` page loads, lists all active VINs sorted by daysListed desc
- [ ] Band grouping renders correct sections (only non-empty bands shown)
- [ ] "Apply suggestion" CTA is behind Gate R10+; below-R10 user sees disabled state
- [ ] AlertDialog requires a non-empty reason text before enabling confirm
- [ ] On confirm, `applySuggestedPriceDrop` emits PRICE_CHANGED and the row's price updates
- [ ] `/inventory-aging/[vin]` shows price history, competitor data, and margin trace
- [ ] `StaleListingChip` on ≥90d vehicles shows "View in Aging Report" link
- [ ] No `text-[NNpx]` or `rounded-lg/xl` in new files (drift test passes)
- [ ] i18n: no hardcoded user-facing strings; `inventoryAging` key exists in both locale files
- [ ] `applySuggestedPriceDrop` throws `InsufficientRoleError` for actor.role < R10
- [ ] 5% margin guardrail is never violated in any test or fixture scenario
- [ ] error.tsx exists and uses `ModuleErrorFallback`
- [ ] `error-boundaries.test.ts` passes (inventory-aging has error.tsx)
- [ ] `ui-canon-drift.test.ts` passes (no new baseline entries needed)
- [ ] All ≥15 tests pass; typecheck clean

---

## 11. Open items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-IA-1 | Real competitor scrape (v2) | P3 | Wire to BSP/Google scraper; selector signature unchanged (L7) |
| DEF-IA-2 | Outlet-scoped view for R10 | P2 | R10 sees only own-outlet vehicles; R19+ sees all |
| DEF-IA-3 | Email/WhatsApp alert when vehicle crosses 90d threshold | P3 | Notifications module seam (Seam 27+) |
| DEF-IA-4 | Price history sparkline on drill-down | P2 | Chart.js or Recharts; deferred to avoid new dep |

---

## 12. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-30 | 1.0 | orchestrator | Initial approved spec |
