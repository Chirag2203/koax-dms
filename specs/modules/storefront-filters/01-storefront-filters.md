---
spec_id: SPEC-STOREFRONT-FILTERS-001
title: Storefront filters, advanced search & vehicle compare
domain: storefront
status: approved
version: 1.0
risk_level: low
pii_sensitivity: low
flags: [storefront-filters, compare, saved-searches]
owners: [orchestrator]
created: 2026-04-30
depends_on:
  - SPEC-ARCH-UI-001
  - SPEC-CUSTOMERS-001
related_specs:
  - SPEC-CUSTOMER-PORTAL-001
  - SPEC-CUSTOMER-PORTAL-002
---

# SPEC-STOREFRONT-FILTERS-001 — Storefront filters, advanced search & vehicle compare

## Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | URL-driven filter state | All filter state lives in the URL search parameters (`?priceMin=&priceMax=&fuel=petrol,diesel` etc.). No additional client store for transient filter state. Enables shareable links, back-button history, and SSR-compatible page rendering. | Theme C C1 requirement; Doc 03 §CX. |
| L2 | Price as integer rupee range | Price parameters are raw integer rupees in the URL (`priceMin=500000`). The UI converts to lakhs/crores for display. Never store as lakh-floats to avoid decimal precision bugs. | Doc 09 glossary; India number system. |
| L3 | Multi-value params as comma-separated | Multi-select facets (fuel, bodyType) are encoded as a single comma-separated param (`fuel=petrol,diesel`). This keeps URLs readable and avoids repeated-key ambiguity across Next.js router. | L1 corollary; Theme C C1. |
| L4 | Compare max 3 | Side-by-side compare limited to 3 vehicles. A 4th selection replaces the oldest. Sticky bar shows count badge. Spec does not permit compare of more than 3 — UI blocks the selection. | Theme C C1 spec; UX benchmark (Doc 01 §1 BBT, Porsche Approved). |
| L5 | Saved-search storage | Saved searches stored in `localStorage` keyed by `bn-saved-searches`. Zustand slice `useSavedSearchesStore` wraps the local storage. No backend call in Phase 1 — pure client-side. Portal account page shows a read-only list linking back to the filter URL. | Theme C C1; Doc 07 §frontend-first principle. |
| L6 | CPO-only toggle | The `certified` parameter is a boolean (`certified=true`). Absent or `certified=false` means "show all". | Existing collection filter pattern; L1. |
| L7 | Outlet = city | The "Outlet" facet maps to the `city` field on the Vehicle fixture. Values: `bangalore`, `mumbai`, `chennai`. "Pan-India" = all cities (param absent). | Doc 09 §city; existing collection `FilterState.city`. |
| L8 | Inventory page URL | The filterable inventory page lives at `/inventory`. It is a new page; the existing `/collection` page is left unchanged so deep links are not broken. | Theme C C1 spec; backwards compatibility. |
| L9 | Mileage as km integer | Mileage range params are `kmMin` and `kmMax` in integer kilometres. | Doc 09; L2 analogy. |
| L10 | Year range boundaries | Year range params are `yearMin` and `yearMax` as 4-digit integers. | Doc 09. |
| L11 | Color multi-select | Color is a comma-separated multi-select. Color swatches are derived by mapping known color name strings to CSS hex approximations. Unknown colors fall back to a neutral chip. | Theme C C1 spec. |
| L12 | Compare bar persistence | Compare selection is in React state local to the inventory page (not URL). It resets on page reload. This keeps URLs clean and avoids confusing states when users share links. | UX judgment; L1 complementary. |
| L13 | Saved-search auth gate | Only authenticated customers (portal session) can save searches. Unauthenticated users see a "Sign in to save this search" prompt. | Theme C C1; Doc 14 R20. |
| L14 | Inventory inherits collection primitives | InventoryView reuses the same FilterBar, ActiveFilters, ResultsToolbar, Pagination, VehicleCard, and CollectionEmptyState components from `src/components/collection/`. No local redefinitions. | SPEC-ARCH-UI-001 §Card/Field reuse principle. |
| L15 | Sidebar facets + top bar | Desktop: left-sidebar with full facets (all filters). Mobile: slide-up sheet. The existing collection top-bar is augmented with a "Filters" CTA that opens the sidebar. | Doc 03 §CX; Doc 01 §1 luxury browser pattern. |

---

## Entities

### FilterParams (URL state)

```ts
interface InventoryFilterParams {
  priceMin?: number;        // integer rupees
  priceMax?: number;
  yearMin?: number;         // e.g. 2018
  yearMax?: number;
  fuel?: string[];          // ['petrol','diesel','electric','hybrid']
  transmission?: string;    // 'automatic' | 'manual'
  kmMin?: number;
  kmMax?: number;
  bodyType?: string[];      // multi-select
  color?: string[];         // multi-select
  certified?: boolean;
  city?: string;            // 'bangalore' | 'mumbai' | 'chennai'
  sort?: string;
  page?: number;
}
```

### SavedSearch

```ts
interface SavedSearch {
  id: string;          // nanoid
  name: string;        // user-provided label
  url: string;         // full query string e.g. "?fuel=petrol&priceMax=5000000"
  savedAt: string;     // ISO timestamp
}
```

### CompareSelection

```ts
interface CompareSelection {
  vins: string[];       // max 3 VINs
}
```

---

## Scenarios

| ID | Scenario | Given | When | Then |
|---|---|---|---|---|
| S1 | Price range slider filters results | Inventory page with 28 vehicles | User sets priceMin=500000, priceMax=10000000 | Only vehicles with price in [5L, 1Cr] range displayed; URL updated; active filter chip shows "₹5L – ₹1Cr" |
| S2 | Multi-select fuel filter | Inventory loaded | User selects "Petrol" + "Diesel" checkboxes | URL has `fuel=petrol,diesel`; results show both fuel types; two chips appear |
| S3 | Body type multi-select | Inventory loaded | User checks "SUV" + "Sedan" | URL has `bodyType=suv,sedan`; filter chip rail shows both |
| S4 | CPO-only toggle | Inventory with mix of CPO and non-CPO | User enables CPO toggle | Only `isCertified=true` vehicles shown; chip "CPO Only" appears |
| S5 | Clear single filter chip | Active price filter + active fuel filter | User clicks ✕ on fuel chip | Fuel removed from URL, price remains, results refresh |
| S6 | Clear all filters | Multiple active filters | User clicks "Clear all" | All params removed from URL; full inventory shown |
| S7 | URL deep-link | User copies URL with `?fuel=electric&city=bangalore` | User pastes in new tab | Filters auto-applied on load; chips rendered; results pre-filtered |
| S8 | Compare selection | Inventory page | User clicks compare icon on 3 vehicles | Sticky compare bar appears at bottom with 3 thumbnails; "Compare" button enabled |
| S9 | Compare bar blocked at 3 | 3 vehicles already in compare | User clicks compare on 4th vehicle | 4th replaces oldest in compare (FIFO); count stays at 3 |
| S10 | Compare page renders | 3 vehicles in compare selection | User clicks "Compare" in sticky bar | Navigates to `/inventory/compare?vins=VIN1,VIN2,VIN3`; side-by-side spec table; 3 columns |
| S11 | Compare remove | Compare page open | User clicks ✕ on one vehicle column | Column removed; compare shows 2 vehicles; "Add a vehicle" placeholder appears |
| S12 | Saved search — authenticated | Logged-in portal user on inventory | User applies filters, clicks "Save search", enters name | Search saved to localStorage; portal account "Saved searches" list shows it with link |
| S13 | Saved search — unauthenticated | Not logged in | User clicks "Save search" | Portal sign-in prompt shown; not saved |
| S14 | Saved search apply | Portal account page | User clicks saved search link | Navigates to inventory with saved URL; filters applied |
| S15 | Empty state with filters active | Filters set to combination with 0 results | — | Empty state shows "No vehicles match — try broadening your search" with "Clear all" CTA |
| S16 | Mileage range filter | Inventory loaded | User sets kmMax=30000 | Only vehicles with km ≤ 30000 shown |
| S17 | Year range filter | Inventory loaded | User sets yearMin=2021 | Only vehicles from 2021 onwards shown |
| S18 | Color swatch filter | Inventory loaded | User clicks "Agate Grey" swatch | Vehicles with `color` containing "Agate Grey" shown |
| S19 | Transmission filter | Inventory loaded | User selects "Manual" | Only manual vehicles shown |
| S20 | Outlet / city filter | Inventory loaded | User selects "Mumbai" | Only vehicles with city=mumbai shown |
| S21 | Sort + filters combined | Fuel=petrol + sort=priceAsc | — | Petrol vehicles sorted cheapest first |
| S22 | Pagination resets on filter change | On page 3 | User changes any filter | Page resets to 1 |

---

## Component map

| Component | Path | Responsibility |
|---|---|---|
| `InventoryPage` | `app/(storefront)/inventory/page.tsx` | Server component shell; Suspense boundary |
| `InventoryView` | `src/components/storefront/inventory/inventory-view.tsx` | Client view; wires `useFilters` → grid + sidebar |
| `FilterSidebar` | `src/components/storefront/filters/filter-sidebar.tsx` | Left-rail facets + mobile sheet; full filter set |
| `PriceRangeSlider` | `src/components/storefront/filters/price-range-slider.tsx` | Dual-thumb range for price (₹5L – ₹2Cr) |
| `RangeSlider` | `src/components/storefront/filters/range-slider.tsx` | Generic dual-thumb range primitive |
| `MultiCheckFacet` | `src/components/storefront/filters/multi-check-facet.tsx` | Checkbox group for fuel/bodyType/color |
| `ColorSwatchPicker` | `src/components/storefront/filters/color-swatch-picker.tsx` | Color swatch grid |
| `FilterChipRail` | `src/components/storefront/filters/filter-chip-rail.tsx` | Active filter chips with clear-each + clear-all |
| `CompareBar` | `src/components/storefront/compare/compare-bar.tsx` | Sticky bottom bar; thumbnails + compare CTA |
| `CompareButton` | `src/components/storefront/compare/compare-button.tsx` | Per-card toggle button |
| `ComparePage` | `app/(storefront)/inventory/compare/page.tsx` | Compare page route |
| `CompareView` | `src/components/storefront/compare/compare-view.tsx` | Side-by-side spec table |
| `useFilters` | `src/lib/storefront/use-filters.ts` | URL ↔ filter state hook |
| `useSavedSearches` | `src/lib/storefront/use-saved-searches.ts` | localStorage saved searches store |
| `SavedSearchButton` | `src/components/storefront/filters/saved-search-button.tsx` | Save current search CTA |
| `SavedSearchList` | `src/components/portal/account/saved-search-list.tsx` | Portal account display of saved searches |
| `InventoryError` | `app/(storefront)/inventory/error.tsx` | Error boundary per §17.0 |

---

## i18n keys (top-level `inventory` namespace)

All new strings under `inventory.*` in both `en-IN.json` and `hi-IN.json`.

---

## Acceptance criteria

1. `/inventory` page renders all published vehicles with correct counts.
2. Every filter facet updates the URL and results without a full page reload.
3. Active filter chips render for all active filters; each ✕ removes only that filter.
4. Compare bar appears when ≥1 vehicle selected; hidden when 0.
5. `/inventory/compare?vins=…` renders a full spec table for the selected VINs.
6. Saved searches persist across page reloads (localStorage); portal account lists them.
7. Unauthenticated save-search shows sign-in prompt — no silent save.
8. `error.tsx` present at `/inventory` and `/inventory/compare`.
9. ≥15 unit tests passing at `src/lib/storefront/__tests__/`.
10. No `text-[NNpx]` or `rounded-lg/xl` in new code.
11. Typecheck clean on customer-web.
12. All i18n keys present in en-IN.json AND hi-IN.json.

---

## Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-04-30 | 1.0 | orchestrator | Initial spec — approved for build. |
