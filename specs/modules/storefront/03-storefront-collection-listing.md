---
spec_id: SPEC-STOREFRONT-003
domain: storefront
title: The Collection (Inventory Listing)
status: draft
risk_level: low
pii_sensitivity: none
flags: [storefront.collection.v1]
owners: [planner, ux-writer, qa-planner, integrator]
depends_on:
  - SPEC-STOREFRONT-001 (header, footer, VehicleCard)
  - SPEC-STOREFRONT-002 (VDP route for card links)
docs_consulted:
  - Doc 02 §Storefront must-haves (faceted filters, sort, saved search)
  - Doc 03 §2.2 (Inventory listing)
  - Doc 09 (Glossary)
  - Doc 12 §Performance (search < 200ms)
  - Design 01 §2.4 (Layout — 12-col grid)
  - Stitch export: 06-collection.html, 06-collection.jpg
  - Research: §2 (Scenarios 1,2,6,7), §3 (Edge cases 3.5 zero results)
  - Plan: §1 (Routing), §3 (Component map — FilterPanel, SortDropdown, SearchInput)
effective_date: 2026-04-16
---

# SPEC-STOREFRONT-003 — The Collection (Inventory Listing)

---

## 1. Summary

The Collection page is the primary browsing surface for BN Automobiles inventory. It presents all published vehicles in a filterable, sortable grid with editorial presentation. The page balances discovery (filters, search) with luxury tone (generous spacing, serif headings, curated feel).

Route: `/collection` (ISR 30s, searchParams-driven filters).

---

## 2. Context & motivation

Per Doc 03 §2.2, the listing page must support faceted filtering (make, body type, fuel, transmission, price range, km range, city, certification status) with sort options (newest, price low→high, price high→low, lowest km). The Stitch design shows a curated editorial layout — not a dense marketplace grid — with a hero featured vehicle, an editorial quote block, and a 3-column card grid. Filter state lives in URL searchParams for bookmarkability and sharing (Research §2 Scenario 2).

---

## 3. Goals

- Buyer finds relevant vehicles within 3 interactions (filter/sort/scroll).
- Filter state persisted in URL searchParams — bookmarkable, shareable.
- Zero-results state is branded and actionable (Research §3.5).
- Page renders within ISR 30s. Client-side filter transitions feel instant (<200ms per Doc 12).
- Reuses VehicleCard `collection` variant from Slice 1.
- City selector in header filters collection automatically.

---

## 4. Non-goals

- Saved search with email/WhatsApp alerts (v1.5).
- Map-based browsing (v2).
- Side-by-side comparison tool (v1.5 — placeholder link only).
- Infinite scroll (use pagination).

---

## 5-6. Domain model / State machine

No changes. Collection is a read-only filtered projection of published vehicles.

---

## 7. API contracts

### GET /api/vehicles
Already defined in SPEC-STOREFRONT-001 §7. Extended query params:

| Param | Type | Description |
|-------|------|-------------|
| `make` | string | Filter by make (e.g., "Porsche") |
| `bodyType` | string | Filter by body type enum |
| `fuel` | string | Filter by fuel type enum |
| `transmission` | string | Filter by transmission enum |
| `city` | string | Filter by city enum |
| `priceMin` | number | Minimum price |
| `priceMax` | number | Maximum price |
| `kmMax` | number | Maximum km |
| `certified` | boolean | Only CPO vehicles |
| `sort` | string | "newest" (default), "price_asc", "price_desc", "km_asc" |
| `page` | number | Page number (1-indexed) |
| `limit` | number | Per page (default 12) |

All filters combine with AND logic. Response includes facet counts for available filter values.

---

## 8. UI/UX outline

### 8.1 Page structure

Reference: Stitch `06-collection.jpg`.

| # | Section | Theme | Component |
|---|---------|-------|-----------|
| 1 | **Page header** | Light Editorial | CollectionHeader |
| 2 | **Filter bar** | Light | FilterBar |
| 3 | **Active filters** | Light | ActiveFilterChips |
| 4 | **Results count + sort** | Light | ResultsToolbar |
| 5 | **Vehicle grid** | Light | VehicleGrid (VehicleCard x N) |
| 6 | **Editorial quote** | Light (accent bg) | EditorialQuote |
| 7 | **Pagination** | Light | Pagination |
| 8 | **Empty state** | Light | CollectionEmptyState |

### 8.2 Section details

**Section 1 — Page Header**
- `bg-bg-paper py-16 md:py-24 px-6 md:px-12 lg:px-24`
- Eyebrow: `font-mono text-xs uppercase tracking-widest text-accent mb-4` — "THE COLLECTION"
- Title: `font-display text-4xl md:text-6xl lg:text-7xl italic` — "The Collection"
- Subtitle: `font-sans text-lg text-ink-secondary mt-4 max-w-2xl` — "Every vehicle in our care, presented without reservation. Filter by what matters to you."

**Section 2 — Filter Bar**
- Horizontal row of filter dropdowns, scroll-snap on mobile.
- Filters: Make, Body Type, Fuel, Transmission, City, Price Range, Certified Only
- Each filter is a dropdown/popover trigger styled as: `border border-line rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-widest`
- Active filter has `bg-accent/10 border-accent text-accent`
- Price range uses dual slider (min/max)
- "Clear all" link when any filter is active

**Section 3 — Active Filter Chips**
- Row of dismissible chips showing applied filters: "Porsche ×", "SUV ×", "Bangalore ×"
- `inline-flex items-center gap-1 bg-bg-subtle border border-line rounded-full px-3 py-1 font-mono text-[11px]`
- X button removes that filter

**Section 4 — Results Toolbar**
- Flex between count + sort
- Left: `font-mono text-sm text-ink-muted` — "Showing 12 of 28 vehicles"
- Right: Sort dropdown — "Sort by: Newest" with options (Newest, Price ↑, Price ↓, Lowest KM)

**Section 5 — Vehicle Grid**
- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10`
- Uses `VehicleCard variant="collection"` from Slice 1
- 12 vehicles per page
- Cards link to `/collection/{vin}` (VDP)

**Section 6 — Editorial Quote (mid-grid, optional)**
- Inserted after the first 6 vehicles (between rows 2 and 3 on desktop)
- Full-width accent-tinted block: `bg-accent/5 py-16 px-12`
- Playfair Display italic quote: "Luxury is not about ownership, it is about the stewardship of history."
- Per Stitch design — this breaks the grid with an editorial moment

**Section 7 — Pagination**
- Simple previous/next + page numbers
- `font-mono text-sm`, active page `text-accent font-medium`, others `text-ink-muted`
- Shows "Page 1 of 3" on mobile
- URL updates on page change (searchParams)

**Section 8 — Empty State (Research §3.5)**
- When zero vehicles match filters
- `font-display text-3xl text-ink-primary mb-4` — "No vehicles match your current filters."
- Suggestions: "Try broadening your search" + list which filter is most restrictive
- "Clear all filters" button
- "Set an alert" link (placeholder for v1.5)

### 8.3 Filter interaction

- All filter changes update URL searchParams immediately (shallow router push)
- Vehicle grid re-filters client-side from fixture data (no API call in v1)
- URL example: `/collection?make=Porsche&bodyType=suv&sort=price_asc`
- Back button restores previous filter state (URL-driven)
- City from global CityProvider is synced as a filter (but user can override on this page)

### 8.4 Responsive

| Breakpoint | Grid | Filters | Sort |
|------------|------|---------|------|
| Mobile (<640px) | 1-col | Horizontal scroll chips + "Filters" sheet button | Dropdown |
| Tablet (640-1023px) | 2-col | Horizontal scroll | Dropdown |
| Desktop (>=1024px) | 3-col | Inline row | Inline |

### 8.5 Accessibility

- Filter dropdowns: `role="listbox"`, keyboard arrow navigation
- Active filter chips: `role="status"` container, each chip has dismiss button with `aria-label="Remove filter: Porsche"`
- Results count announced via `aria-live="polite"` on filter change
- Grid: `role="list"`, each card `role="listitem"`
- Pagination: `nav` with `aria-label="Pagination"`, current page `aria-current="page"`

---

## 9-10. Notifications / Integrations

None.

---

## 11. Data & analytics

| Event | Properties | Trigger |
|-------|------------|---------|
| `collection_view` | filters, sort, page, result_count | Page mount / filter change |
| `filter_apply` | filter_name, filter_value | Filter applied |
| `filter_remove` | filter_name | Filter chip dismissed |
| `filter_clear_all` | previous_filter_count | Clear all clicked |
| `sort_change` | new_sort, previous_sort | Sort changed |
| `collection_card_click` | vin, position, filters_active | Card click |
| `pagination_click` | page_number, direction | Page change |
| `empty_state_view` | filters | Zero results rendered |

---

## 12-13. Permissions / Privacy

Public page, no PII collected.

---

## 14. Non-functional requirements

| NFR | Target |
|-----|--------|
| Filter response | < 200ms client-side (Doc 12) |
| Page render | ISR 30s |
| CLS | < 0.1 (fixed grid dimensions) |

---

## 15. Failure modes

| # | What can go wrong | Recovery |
|---|-------------------|----------|
| 1 | Zero results for filter combination | Branded empty state with suggestions |
| 2 | Invalid searchParams in URL | Ignore invalid params, render unfiltered |
| 3 | Very long make/model names in filters | Truncate with ellipsis |

---

## 16-20. Migration / Tests / Dependencies

- Feature flag: `storefront.collection.v1`
- Depends on: SPEC-001 (VehicleCard, header/footer), SPEC-002 (VDP route)
- Tests: filter apply/remove, sort, pagination, empty state, URL persistence, mobile filter sheet

---

## 21. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-16 | 0.1 | Claude (integrator) | Initial draft |
