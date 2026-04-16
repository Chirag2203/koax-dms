---
spec_id: SPEC-INVENTORY-002
domain: inventory
title: Staff Inventory Module (list, detail, state machine, cost ledger)
status: draft
risk_level: high
pii_sensitivity: low
flags: [staff.inventory.v1]
owners: [planner, data-architect, finance-reviewer, integrator]
depends_on:
  - SPEC-PLATFORM-001 (app shell + primitives)
docs_consulted:
  - Doc 02 §Inventory (v1 feature list)
  - Doc 04 §2 (Acquisition), §3 (Refurbishment), §4 (Listing), §5 (Cost ledger)
  - Doc 06 §GST.margin (margin scheme — affects cost ledger)
  - Doc 09 (Glossary — VIN, CPO, Landed Cost, Appraisal)
  - Doc 10 §Vehicle, §Listing (domain model)
  - Doc 11 §ListingStateMachine
  - Doc 14 §R03 GM, §R09 Sales Associate, §R10 Sales Manager (RBAC on publish/unpublish)
  - Design 03 Screen 3 (Inventory list), Screen 4 (Vehicle detail)
  - Stitch: inventory_vehicle_list_dark, inventory_vehicle_list_light, inventory_vehicle_list_bulk_actions, inventory_advanced_filters_dark, inventory_empty_state_*, inventory_vehicle_detail_full_page_dark, inventory_vehicle_detail_full_page_light, inventory_vehicle_detail_draft_variant, inventory_vehicle_detail_in_refurb_state, inventory_vehicle_detail_published_state, inventory_vehicle_detail_timeline_full_dark, inventory_vehicle_detail_documents_full_dark
effective_date: 2026-04-17
---

# SPEC-INVENTORY-002 — Staff Inventory Module

## 1. Summary

Staff-side inventory management for BN Automobiles. Covers the full lifecycle of a vehicle from acquisition through refurb, appraisal, listing, reservation, and sale. This is the most complex staff module — 11 Stitch screens mapped to 5 routes + multiple tab states + state machine.

Per Doc 04 §1: "Per-VIN, not per-SKU. Each pre-owned unit is unique." Every page treats a vehicle as a distinct asset with its own P&L (cost ledger), photos, appraisal, timeline, and documents.

## 2. Routes delivered

| Route | Description |
|-------|-------------|
| `/inventory` | Vehicle list (dense data table with filters, bulk actions, saved views) |
| `/inventory/[vin]` | Vehicle detail full-page (6 tabs: Overview, Cost Ledger, Photos, Appraisal, Timeline, Documents) |
| `/inventory/new` | Add vehicle form (stub in v1 — real form defers to S2b+) |
| `/inventory/[vin]/edit` | Edit vehicle (stub in v1) |

## 3. Listing state machine

Per Doc 11:
```
DRAFT → IN_REVIEW → PUBLISHED → RESERVED → SOLD → ARCHIVED
                  ↓
              UNPUBLISHED (side state, can return to PUBLISHED)
             IN_REFURB (side state, blocks PUBLISHED)
             STALE (side state, age-based, triggers auto-price-drop rules)
```

- **DRAFT** → IN_REVIEW (staff completes required fields)
- **IN_REVIEW** → PUBLISHED (Sales Manager R10 approval) | DRAFT (rejected back)
- **PUBLISHED** → RESERVED (deposit taken) | UNPUBLISHED (manual withdraw) | STALE (auto at 60d) | SOLD
- **RESERVED** → SOLD | PUBLISHED (reservation expired/released)
- **SOLD** → ARCHIVED (after delivery)
- **UNPUBLISHED** → PUBLISHED (republish)
- **IN_REFURB** → DRAFT (refurb complete, ready to list)

## 4. Roles + permissions (per Doc 14)

| Action | Roles |
|--------|-------|
| View inventory list | R03+ (GM+), R05+ (Sales Associate+), R19 (GM cross-outlet) |
| Edit vehicle | R05+ (own outlet), R10 (own outlet), R19 (cross-outlet) |
| Publish listing | R10 Sales Manager+ |
| Unpublish | R10+ |
| Bulk update | R10+ |
| Transfer outlet | R19+ (GM) |
| Approve cost ceiling breach | R10+ |
| View landed cost | R10+ (R05 sees only ask price) |

Use `<Gate role="R10+" fallback="disable">` primitive for role-gated UI.

## 5. Vehicle list page (`/inventory`)

### 5.1 Layout

Reference: Stitch `inventory_vehicle_list_dark/screen.png`

- **Page header:** "Vehicles" Inter 28/600 left. Right: "Add Vehicle" primary button + "Import" ghost button.
- **Saved view tabs:** "All" (active) · "Listed" · "In Refurb" · "Stale (>60d)" · "My Listings". Custom saved views appear after with a `+` button to save current filter state.
- **Filter bar row:** search input (VIN, model, plate) + filter icon + column config + density toggle
- **Bulk action bar:** appears when ≥1 row selected — "3 selected" + Export + Update Status + Assign Outlet + Archive + clear-X
- **DataTable** with columns (user-configurable, default visible):
  - [ ] (checkbox, 40px)
  - Photo (48×36 thumbnail)
  - VIN (mono 13px, masked `WP0ZZZ97•••1234`, click copies full)
  - Year
  - Make & Model (primary Inter 14/500, trim below in 12px muted)
  - Outlet (OutletPill BLR/MUM/CHE)
  - Status (StateChip)
  - Days (ageing number with color: green <30, amber 30-60, red >60)
  - Ask Price (AmountCell right-aligned)
  - Landed Cost (mono muted right-aligned, hidden for R05)
  - Margin (mono, success-green positive / danger-red negative)
  - CPO (badge or empty)
  - Actions (on hover: eye/pencil/ellipsis)
- **Pagination footer:** "Showing 1-50 of 342 vehicles" + rows per page selector + prev/next
- **Empty state** (when filter returns nothing): car icon + "No vehicles match your filters" + "Clear filters" link

### 5.2 Advanced filters panel

Reference: `inventory_advanced_filters_dark`

Opens as a right slide-in panel (`SlideInPanel` 400px width) with filter form:
- Make (multi-select combobox)
- Body type (multi-select)
- Outlet (checkbox list)
- Status (multi-select)
- Price range (min/max inputs)
- KM range (min/max)
- Age range (days on lot)
- Certified only (toggle)
- Fuel type, Transmission
- Acquisition date range

Clear all button + Apply (primary). Filter state persists in URL searchParams for shareability.

## 6. Vehicle detail page (`/inventory/[vin]`)

Reference: Stitch `inventory_vehicle_detail_full_page_dark`

### 6.1 Layout — top section

- **Breadcrumb:** Inventory / Vehicles / WP0ZZZ97•••1234
- **Left column (main content):** Photo hero 16:9 aspect, ~400px tall, thumbnail dots below for switching
- **Right column (320px sidebar):**
  - Financial snapshot card:
    - Ask Price (Inter 24/600, mono amount)
    - Landed Cost (muted)
    - Projected Margin (green)
    - Days on lot
  - Action buttons: "Publish Vehicle" (primary, state-dependent) / "View on Storefront" / "Unpublish" — based on current status

### 6.2 Tabs row (below top section)

6 tabs, horizontal:

**Overview** — default
- Provenance: year, make, model, variant, colors, owners, location
- Technical: powertrain, transmission, fuel, displacement, power, torque
- Ownership: ODO, service history, warranty, road tax, insurance, reg state, keys
- Each section: 3-column grid of label/value pairs, hairline separators

**Cost Ledger** — most important tab (reference: Stitch detail full page shows this by default)
- Header: "Expense Breakdown" + "Add Entry" button
- Table columns: Category | Date | Amount (₹)
- Categories per Doc 04 §5:
  - Base Acquisition
  - Refurbishment (Detailing)
  - Inbound Transport
  - State Registration Tax
  - Insurance
  - Floor-plan interest (allocated)
  - Overhead allocation
  - Photography
- Running total row: "Total Landed Cost ₹ 98,40,000"
- Each row has edit/delete icons (R10+ only via `<Gate>`)

**Photos** — grid of 20+ thumbnails with kind labels (EXTERIOR_FRONT, EXTERIOR_REAR, INTERIOR_DASH, ENGINE_BAY, etc.)
- Upload, reorder, delete actions (R05+)
- Kind labels in mono 11px uppercase
- Click opens lightbox

**Appraisal** — grade badge (A/A-/B+/B/B-/C), 210-point checklist completion %, inspector name, inspection date
- Read-only for R05, editable for R10+

**Timeline** (reference: `inventory_vehicle_detail_timeline_full_dark`)
- Activity log: "Created by Rahul K. on 2 Apr 2026", "Submitted for review on 4 Apr", "Published by Sunita M. on 5 Apr", "Reserved by customer Priya S. on 15 Apr"
- Each entry: avatar 20px + action text + timestamp
- Mono dates, Inter body text
- Vertical timeline with hairline connector

**Documents** (reference: `inventory_vehicle_detail_documents_full_dark`)
- Table: Document Name | Type | Uploaded By | Uploaded At | Size | Actions
- Doc types: RC, Insurance, Appraisal PDF, Inspection Report, Tally Export, Invoice (after sale), Transfer Deed
- Upload / download / delete (R05+)

### 6.3 State-specific variants

Per Stitch screens:

**`inventory_vehicle_detail_draft_variant`** — DRAFT state
- Status chip "Draft"
- Primary action: "Submit for Review" (R05+)
- Hides publish/reserve actions
- Shows warning banner: "This vehicle is a draft. Complete required fields and submit for review."

**`inventory_vehicle_detail_in_refurb_state`** — IN_REFURB state
- Status chip "In Refurb"
- Primary action: "Mark Refurb Complete" (R11 Workshop Technician+)
- Shows refurb progress: X of Y items complete
- Hides publish actions

**`inventory_vehicle_detail_published_state`** — PUBLISHED state (most common)
- Status chip "Published" (green)
- Primary action: "View on Storefront" (links to customer surface `/collection/[vin]`)
- Secondary: "Unpublish" (R10+)
- Shows "17 enquiries · 342 views" metrics

## 7. Data model

Uses existing `Vehicle` type from `@dms/types/domain/vehicle.ts`. Extensions needed:

```typescript
// packages/types/src/domain/inventory.ts (new)
export const CostLedgerCategoryEnum = z.enum([
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
]);

export const CostLedgerEntrySchema = z.object({
  id: z.string(),
  vin: z.string(),
  category: CostLedgerCategoryEnum,
  date: z.string(),
  amount: z.number(),
  note: z.string().optional(),
  addedBy: z.string(), // staff user id
  addedAt: z.string(),
});

export const AppraisalGradeEnum = z.enum(['A', 'A-', 'B+', 'B', 'B-', 'C']);

export const AppraisalSchema = z.object({
  id: z.string(),
  vin: z.string(),
  grade: AppraisalGradeEnum,
  pointsCompleted: z.number(),
  pointsTotal: z.number(), // 210
  inspectorName: z.string(),
  inspectionDate: z.string(),
  notes: z.string().optional(),
});

export const VehicleTimelineEventSchema = z.object({
  id: z.string(),
  vin: z.string(),
  type: z.enum([
    'created','submitted','approved','rejected','published','unpublished',
    'reserved','sold','archived','cost-added','price-changed','refurb-started','refurb-complete',
  ]),
  actorId: z.string(),
  actorName: z.string(),
  timestamp: z.string(),
  note: z.string().optional(),
});

export const VehicleDocumentTypeEnum = z.enum([
  'rc','insurance','appraisal','inspection','tally-export','invoice','transfer-deed','other',
]);

export const VehicleDocumentSchema = z.object({
  id: z.string(),
  vin: z.string(),
  type: VehicleDocumentTypeEnum,
  name: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
  fileSize: z.string(),
  fileUrl: z.string(),
});
```

## 8. MSW handlers

```
GET /api/staff/inventory/vehicles — list with query params (filters, sort, page)
GET /api/staff/inventory/vehicles/:vin — single vehicle with all related data
GET /api/staff/inventory/vehicles/:vin/cost-ledger
GET /api/staff/inventory/vehicles/:vin/appraisal
GET /api/staff/inventory/vehicles/:vin/timeline
GET /api/staff/inventory/vehicles/:vin/documents
POST /api/staff/inventory/vehicles/:vin/cost-ledger — add entry
POST /api/staff/inventory/vehicles/:vin/publish — state transition
POST /api/staff/inventory/vehicles/:vin/unpublish — state transition
POST /api/staff/inventory/vehicles/:vin/transitions — generic state transition
```

## 9. Fixtures to add

- **Cost ledger entries:** ~5 entries per vehicle for first 10 vehicles
- **Appraisals:** 1 per vehicle for first 10 vehicles
- **Timeline events:** ~4-8 per vehicle
- **Vehicle documents:** ~4 per vehicle (RC, insurance, appraisal PDF, inspection)

## 10. Build phases

- **S2a — List page:** vehicle list + filters + bulk actions + saved views + empty state
- **S2b — Detail page:** 6-tab detail with state-specific variants + state machine transitions
- **S2c — Add/edit:** placeholder forms for v1 (full form is v1.1)

## 11. Non-functional requirements

- List with 342 vehicles must render < 200ms (virtualized via TanStack Virtual)
- Filter change: < 100ms client-side re-filter
- Detail page first paint: < 500ms
- State transition: < 300ms optimistic update + toast

## 12. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-17 | 0.1 | Claude (integrator) | Initial spec for staff Inventory Phase S2 |
