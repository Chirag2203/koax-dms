---
spec_id: PLAN-PARTS-002
domain: parts
status: approved
risk_level: low
pii_sensitivity: low
flags: [parts-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001]
---

# S5 P2 — Parts Landing Page

Phase-level spec elaborating on SPEC-PARTS-001 §3 (landing page). Defines the
component decomposition, URL contract, state machine for UI concerns, filter
predicates, empty/loading/error handling, accessibility, design-doc compliance,
and acceptance scenarios for P2.

**Scope:** replace the placeholder at `/parts` with the full landing surface —
5 URL-synced tabs (Stock List / Low Stock / POs / GRNs / Suppliers), filter
bars, DataTables, per-outlet stock badges, read-only supplier panel, and
header CTAs that deep-link to the P4 create forms.

**Out of P2 scope (deferred):**
- `/parts/[partCode]` detail (P3)
- `/parts/po/new`, `/parts/grn/new` create forms (P4)
- `/parts/po/[id]`, `/parts/grn/[id]` detail + approval actions (P5)
- Service → Parts loop wiring (P6)
- `next-intl` lift (coordinated sweep post-S5)
- Filter URL persistence (revisit post-S5)
- DataTable virtualization

## 1. Route surface

| Route | P2 change |
|---|---|
| `/parts` | Placeholder replaced with `<PartsLandingView />`. Accepts `?tab=stock-list | low-stock | po | grn | suppliers` (default: `stock-list`). Amending SPEC-PARTS-001 §2 (`?view=` → `?tab=`) for cross-module consistency. |
| `/parts/layout.tsx` | Unchanged (P1 hydrator stays). |
| `/parts/po/new` | **Not implemented in P2.** Header CTA links here; clicks 404 until P4. Matches S4 precedent (warranty CTA shipped before the form). |
| `/parts/grn/new` | Not implemented in P2. |
| Row click on PO table | Navigates to `/parts/po/[id]` — 404 until P5. |
| Row click on GRN table | Navigates to `/parts/grn/[id]` — 404 until P5. |
| Row click on Suppliers table | Opens `<SupplierDetailPanel />` SlideInPanel (fully functional in P2 per spec §3.5). |
| Row click on Stock List / Low Stock | Navigates to `/parts/[partCode]` — 404 until P3. |

## 2. Component tree

All new files under `apps/staff-web/src/components/parts/`.

```
parts/
├── parts-landing-view.tsx            — shell: header + tabs + panels
├── parts-filter-bar.tsx              — shared filter row for Stock + Low Stock
├── stock-badges.tsx                  — per-outlet qty mini-badges with a11y label
├── supplier-detail-panel.tsx         — SlideInPanel (read-only) for §3.5
├── helpers.ts                        — pure: chip mappers, formatters, filters
└── tabs/
    ├── stock-list-tab.tsx            — default tab: filter + DataTable shell
    ├── stock-list-columns.ts         — ColumnDef<Part>[] extracted
    ├── low-stock-tab.tsx             — filter + Shortfall + "Raise PO" action (shell)
    ├── low-stock-columns.ts          — ColumnDef<Part>[] with derived cols
    ├── purchase-orders-tab.tsx       — PO filter + DataTable shell
    ├── po-columns.ts                 — ColumnDef<PurchaseOrder>[]
    ├── grns-tab.tsx                  — GRN filter + DataTable shell
    ├── grn-columns.ts                — ColumnDef<Grn>[]
    └── suppliers-tab.tsx             — Suppliers DataTable + panel trigger
```

Target LoC per file: **≤ 350**. Column definitions are extracted to sibling
`*-columns.ts` files so every tab shell stays ≤ 250 LoC. No file exceeds the
cap. Columns files are leaf modules (import helpers + primitives; export a
`columns: ColumnDef<T>[]` array).

## 3. URL contract

- Primary tab: `?tab=<id>`. Valid ids: `stock-list`, `low-stock`, `po`, `grn`, `suppliers`. Unknown or missing → `stock-list`. Default value is NOT written to URL on first mount (matches service).
- Secondary filter state (outlet / brand / category / criticality / search / has-discrepancy / date range / status) — NOT synced to URL in P2. `useState` per tab.
- `?part=<code>` deep-link into `/parts/po/new` is read in P4 (out of scope here).
- Row-click navigation uses `router.push` (not `replace`) so the landing page is in history.

**Amendment to parent spec**: SPEC-PARTS-001 §2 originally specified `?view=`.
We are amending to `?tab=` in this phase spec for cross-module consistency —
staff-web service module uses `?tab=` today and any future tabbed surface
(finance, reports) should share the same param name for muscle memory. URLs
may be bookmarked; consistency across modules matters more than local spec
phrasing. Parent spec §2 table will be updated in the SPEC-PARTS-001 §15
changelog row filed with the P2 shipment. See §16 of this doc.

## 4. State machine (UI-level)

No new domain state machines. P2 consumes `PO_TRANSITIONS` and `GRN_TRANSITIONS`
from `apps/staff-web/src/lib/parts/state-machine.ts` only for **reading status
chips**, never for transitions (those are P5).

## 5. StateChip extension

Edit `apps/staff-web/src/components/primitives/state-chip.tsx`:

Add to `StateChipStatus` union (alphabetical within each group):

```
// ── Parts: Stock status ─────────────────────────────────────────
| 'stock-ok'
| 'stock-low'
| 'stock-out'
// ── Parts: Purchase Order statuses ──────────────────────────────
| 'po-draft'
| 'po-pending-approval'
| 'po-approved'
| 'po-rejected'
| 'po-cancelled'
| 'po-dispatched'
| 'po-partially-received'
| 'po-received'
| 'po-closed'
// ── Parts: GRN statuses ─────────────────────────────────────────
| 'grn-draft'
| 'grn-pending-qc'
| 'grn-matched'
| 'grn-rejected'
| 'grn-posted'
```

Color mapping uses EXISTING state tokens — zero new colors. Variants that
share a token are differentiated by LABEL, not color; but semantically-opposed
states (rejected vs low stock; cancelled vs out of stock; dispatched vs
partially-received) MUST use different tokens so the UI can be skimmed by
color alone.

Available `--state-*` tokens (verified in `apps/staff-web/src/components/primitives/state-chip.tsx`):
`--state-listed` (green) · `--state-reserved` (blue) · `--state-in-refurb` (orange/active) · `--state-stale` (red — muted/negative-terminal) · `--state-sold` (grey — positive-terminal) · `--state-draft` (muted grey) · `--state-overdue` (amber — action-needed) · `--state-cpo` (accent) · `--state-pending` (yellow).

No `--state-danger` exists; introducing a new token is out of P2 scope. Mapping below uses the existing palette and accepts some context-disambiguated collisions (e.g. `stock-out` and `po-cancelled` both map to `--state-stale`; `stock-low` and `po-rejected` both map to `--state-overdue`). These collisions mirror the service module (`wc-rejected` uses `--state-overdue`, `svc-cancelled` uses `--state-stale`) — cross-module consistency over local disambiguation.

| Variant | Token | Rationale |
|---|---|---|
| `stock-ok` | `--state-listed` (green) | healthy inventory |
| `stock-low` | `--state-overdue` (amber) | action needed |
| `stock-out` | `--state-stale` (red) | alarm / dead |
| `po-draft`, `grn-draft` | `--state-draft` (muted grey) | not yet submitted |
| `po-pending-approval`, `grn-pending-qc` | `--state-pending` (yellow) | awaiting human action |
| `po-approved`, `grn-matched` | `--state-reserved` (blue) | approved, not final |
| `po-rejected`, `grn-rejected` | `--state-overdue` (amber) | negative final — matches `wc-rejected` precedent |
| `po-cancelled` | `--state-stale` (red) | user-voided terminal — matches `svc-cancelled` precedent |
| `po-dispatched` | `--state-in-refurb` (accent/active) | in-flight toward receipt |
| `po-partially-received` | `--state-pending` (yellow) | mid-flight, further action needed |
| `po-received` | `--state-listed` (green) | positive non-terminal |
| `po-closed` | `--state-sold` (grey) | positive terminal |
| `grn-posted` | `--state-sold` (grey) | positive terminal (same semantic as `po-closed`; acceptable share) |

Chip label: sentence-case the enum (e.g. `PENDING_APPROVAL` → `Pending Approval`).

## 6. Filter predicates

### 6.1 Stock List (default tab)

Filter shape (`useState<StockListFilters>`):

```ts
interface StockListFilters {
  outletId: 'ALL' | 'BLR-01' | 'MUM-01' | 'CHE-01';
  brand: 'ALL' | string;  // derived from parts.map(p => p.brand).uniq
  category: 'ALL' | PartCategory;
  criticality: 'ALL' | PartCriticality;
  search: string;  // matches partCode OR name (case-insensitive)
}
```

Predicate:

```ts
part => {
  if (f.outletId !== 'ALL' && !part.stock.some(s => s.outletId === f.outletId)) return false;
  if (f.brand !== 'ALL' && part.brand !== f.brand) return false;
  if (f.category !== 'ALL' && part.category !== f.category) return false;
  if (f.criticality !== 'ALL' && part.criticality !== f.criticality) return false;
  if (f.search && !(part.partCode.toLowerCase().includes(q) || part.name.toLowerCase().includes(q))) return false;
  return true;
}
```

Stock status per row (for the status chip column):
- If ANY outlet row has `qty === 0` → `OUT`
- Else if ANY outlet row has `qty <= reorderLevel` → `LOW`
- Else → `OK`

If `outletId` filter is active, evaluate stock status against that single
outlet only. A part present-but-zero at the filtered outlet shows as `OUT`
and is NOT hidden from the table (present-outlet is the filter contract;
stock=0 is a data point, not a filter rule).

### 6.2 Low Stock

Base set: parts where `part.stock.some(s => s.qty <= s.reorderLevel)`. Then apply the same filter bar as Stock List.

Extra columns (computed against the WORST outlet — defined as the stock row
with the largest `max(0, reorderLevel - qty)` across the 3 outlets; ties
broken by outlet order BLR → MUM → CHE. If the outlet filter is active,
"worst" is constrained to that single outlet):

- **Shortfall** = `max(0, worstRow.reorderLevel - worstRow.qty)` (integer).
  If `worstRow` is `undefined` (defensive), show `—`.
- **Days of Cover (DoC)** — simple demo heuristic:
  - If `worstRow.qty === 0` → `—` (no cover).
  - Else if `worstRow.reorderLevel === 0` → `—` (no reorder signal; DoC
    undefined — don't render a misleading large number).
  - Else `dailyRate = worstRow.reorderLevel / 7` (one week of target holding);
    `DoC = round(worstRow.qty / dailyRate)` days.
- **Last PO Date** = max `createdAt` across all POs whose `lines` include
  this `partCode`, formatted `dd MMM`; `—` if none.
- **Raise PO** button → `/parts/po/new?part=<partCode>`. Links even though
  P4 route is a 404. OK per §1.

All derived columns must guard `undefined` from `part.stock.find(...)` under
TypeScript `noUncheckedIndexedAccess` — use early-return or nullish-coalesce,
never non-null assertions.

Empty state: "Great — no parts below reorder level." Success-coded UI (green icon or muted). No CTA.

### 6.3 Purchase Orders

Columns per spec §3.3: PO No (mono) · Supplier · Outlet (OutletPill) · Status (StateChip po-*) · Lines (count) · Total ₹ (right-aligned mono, use AmountCell) · Created By (staff name) · Expected Delivery (red if past AND status ∉ `{RECEIVED, CLOSED, CANCELLED, REJECTED}`).

Filters:
```ts
interface PoFilters {
  status: 'ALL' | PurchaseOrderStatus;
  supplierId: 'ALL' | string;
  outletId: 'ALL' | string;
  dateRange: 'today' | 'this-week' | 'this-month' | 'all';  // on createdAt
}
```

Row click: `router.push('/parts/po/' + po.id)` (404 until P5).

### 6.4 GRNs

Columns per §3.4: GRN No (mono) · PO No (link, monotext) · Supplier · Outlet · Status (grn-*) · Lines (count) · Received/Ordered (sum receivedQty / sum orderedQty, mono fraction) · Received At (dd MMM HH:mm) · Received By · Discrepancy (dot icon + label if `threeWayMatchStatus === 'DISCREPANCY'`).

Filters:
```ts
interface GrnFilters {
  status: 'ALL' | GrnStatus;
  outletId: 'ALL' | string;
  dateRange: 'today' | 'this-week' | 'this-month' | 'all';  // on receivedAt
  hasDiscrepancy: boolean;  // toggle
}
```

Row click: `router.push('/parts/grn/' + grn.id)` (404 until P5).

### 6.5a Table defaults (applies to every DataTable in P2)

| Concern | Default |
|---|---|
| Page size | 25 (no pagination needed at 65/10/5/8 rows, but primitive renders footer consistently) |
| Default sort | Stock List: `partCode` asc · Low Stock: `shortfall` desc · POs: `createdAt` desc · GRNs: `receivedAt` desc · Suppliers: `name` asc |
| Sticky header | thead is `position: sticky; top: 0` within the panel scroll container (design §4 convention — already in DataTable primitive per S4 usage) |
| Horizontal overflow | DataTable wrapper has `overflow-x-auto`; wide tables (PO with 8 cols) scroll horizontally on narrow viewports. Min table width `min-w-[960px]` on the PO/GRN tables. |
| Sort toggleable | All columns sortable by header click EXCEPT derived columns (Stock badges, Raise PO button) |
| Empty row render | See §8 empty states |

### 6.5 Suppliers

Columns per spec §3.5:
- **Name** · **GSTIN** (mono; show `—` if absent — import supplier) · **Payment Terms**
- **Active POs** = count of POs for this supplier where `status ∉ TERMINAL_PO`. `TERMINAL_PO = {'CLOSED', 'CANCELLED', 'REJECTED'}`.
- **Lifetime Value ₹** = sum of `po.total` across all this supplier's POs where `status ∉ {'CANCELLED', 'REJECTED'}`. Voided POs don't count; `CLOSED` / `RECEIVED` / in-flight do.
- **Last Order** = max `createdAt` across ALL their POs (incl. voided). `—` if supplier has no POs.

No filter bar in P2 (spec §3.5 doesn't call for one — 8 rows).

Row click: opens `<SupplierDetailPanel supplierId={id} onClose={...} />` SlideInPanel.

## 7. Per-outlet stock badges (§3.1)

Component `stock-badges.tsx` — used in Stock List + Low Stock (and later Part Detail in P3).

Props: `{ stock: PartStock[] }`. Renders 3 small chips in fixed order: BLR / MUM / CHE. For each:
- `qty === 0` → red dot + "BLR 0"
- `qty <= reorderLevel` → amber dot + "BLR 3"
- else → neutral + "BLR 8"
- Missing outlet row → dashed outline + "BLR —"

Accessibility: wrap the 3 chips in `<span role="group" aria-label="Stock: Bangalore 8, Mumbai 3 (low), Chennai 6">`. Chips themselves `aria-hidden`. Label text produced by a pure helper `buildStockAriaLabel(stock)`.

## 8. Empty / loading / error states

| Condition | Treatment |
|---|---|
| **Loading** | Store is in-memory synchronous clone of fixtures. No async boundary at route level. **Decision: no `loading.tsx`** — with no Suspense boundary to hold open, the file would never render. If hydration flashes appear in dev, reconsider. |
| **Empty (filtered)** | Friendly copy + "Clear filters" link that resets filter state to default. See §6 per-tab copy. |
| **Empty (no fixture data — defensive)** | Same empty copy; link hidden if filters are already default. |
| **Error** | No async failure in P2. Do NOT add per-tab ErrorBoundaries. If defensive cover desired, add `app/(shell)/parts/error.tsx` as Next's route-level boundary — 1 file. **Decision: skip for P2**; add when P3 introduces detail-page async. |
| **Not found** | `app/(shell)/parts/not-found.tsx` scoped to the /parts tree — **out of P2 scope** (P3 owns detail routes where 404s are meaningful). |

## 9. Accessibility

- **Tabs**: copy the canonical pattern from `service-landing-view.tsx:80-112` verbatim. IDs: `tab-<view-id>` / `panel-<view-id>`. `role="tablist"` / `role="tab"` / `role="tabpanel"`. `aria-selected`, `aria-controls`, `hidden` on inactive panels.
- **DataTable**: `@tanstack/react-table` emits `<table>`/`<thead>`/`<tbody>` via the existing `DataTable` primitive — no extra work.
- **Filter bar**: each input gets a visible label OR a descriptive `aria-label`. Height `h-10` per `design/04_staff_component_patterns.md:160` (input template) and `:265` (violation checklist — "Inputs not h-10 / rounded-md / bg-bg-subtle"). Service module uses h-9 — pre-existing debt; P2 does not replicate.
- **Stock badges**: single group-level `aria-label` (see §7).
- **Row actions (Raise PO)**: Link is keyboard-focusable, has visible focus ring via `focus-visible:ring-accent`. Label "Raise PO for {partCode}".
- **Focus trap**: SlideInPanel primitive already handles focus trap + restore + Escape to close (verified in service codebase).

## 10. Design-doc compliance (§12 of main spec)

Inline rules — zero violations:
- Card padding: filter-bar card `p-3`, empty-state container `py-16`, SlideInPanel internals `p-4`/`p-6`.
- Canonical underline tabs: copy from service-landing-view.tsx.
- Inputs: `h-10`, `rounded-md`, uppercase labels (`text-[11px] font-medium uppercase tracking-wide text-ink-muted`) above the control.
- Buttons: primary = `bg-accent text-white`, secondary = `border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle`.
- NO `bg-[var(--color-*)]` / NO hex literals. Use `bg-bg-surface`, `text-ink-primary`, `border-line`, `bg-accent`, `text-state-stale` / `text-state-overdue` for danger/warning, `bg-bg-subtle`.
- Typography: title `text-[28px] font-semibold leading-[1.25] text-ink-primary`; subtitle `text-[13px] text-ink-muted leading-[1.5]`; table body `text-[13px]`.

## 11. Cross-module consistency (user mandate)

| Dimension | Service ref | P2 parts | Verdict |
|---|---|---|---|
| Page header layout | service-landing-view.tsx:46-78 | identical | ✓ |
| Tab row style | service-landing-view.tsx:80-112 | identical | ✓ |
| Panel wrapper | `flex-1 min-h-0 overflow-auto` | identical | ✓ |
| CTA layout | secondary (outline) + primary (filled) | `New GRN` (outline) + `New PO` (primary filled) | ✓ |
| Empty state | hardcoded English | hardcoded English | ✓ |
| i18n | not used | not used | ✓ (coordinated sweep deferred) |
| Input height | h-9 (legacy) | **h-10 (per design §4)** | divergence — justified by spec |
| Derived selectors | raw store → useMemo | raw store → useMemo | ✓ |
| Toast usage | ToastContainer + useToast | same (only needed if we add "Filters cleared" toast — skip in P2) | ✓ |
| URL param name | `?tab=` | `?tab=` (amending parent spec §2 from `?view=` for cross-module consistency) | ✓ aligned |

Divergences are SPEC-mandated and will be called out in the P2 code-review brief so the reviewer doesn't flag them as drift.

## 12. Scenarios (GPA format — acceptance)

### S1: Land on /parts with no query params
- **Given** the demo user is R24 Meera Iyer (default)
- **When** navigating to `/parts`
- **Then** the header reads "Parts" with subtitle "Stock, purchase orders, GRNs, and suppliers"
- **And** two CTAs render: "New GRN" (outlined) and "New PO" (accent-filled)
- **And** five tabs render in order: Stock List, Low Stock, Purchase Orders, GRNs, Suppliers
- **And** Stock List is active (no `?tab=` in URL)
- **And** the DataTable shows 65 rows (or page 1 if paginated)

### S2: Click a tab → URL updates, panel switches
- **Given** on /parts with Stock List active
- **When** clicking the "Low Stock" tab
- **Then** URL becomes `/parts?tab=low-stock`
- **And** Stock List panel is `hidden`; Low Stock panel is visible
- **And** Low Stock shows ≥10 rows (spec §8 guarantee)

### S3: Enter an unknown tab id
- **Given** navigating to `/parts?tab=nonsense`
- **When** the page mounts
- **Then** Stock List is active (fallback)
- **And** URL stays `?tab=nonsense` — no auto-rewrite (matches service behavior on unknown `?tab=`)

### S4: Stock List filter — outlet
- **Given** Stock List is active, filter bar visible
- **When** selecting Outlet = Bangalore
- **Then** table shows only parts where `stock[].outletId === 'BLR-01'` is present (which is all parts in current fixtures — 65)
- **When** changing to Mumbai
- **Then** table count is unchanged (all parts carry rows for all 3 outlets) but the stock status chip is now evaluated against Mumbai only

### S5: Stock List filter — search
- **Given** Stock List active
- **When** typing "brake" into search
- **Then** matches 5 parts with "brake" in name or partCode (case-insensitive)
- **When** clearing search
- **Then** all 65 rows return

### S5a: Stock List filter — brand + category combo
- **Given** Stock List active
- **When** selecting Brand = BMW AND Category = CONSUMABLE
- **Then** table shows only BMW consumable parts (e.g. BMW-OIL-FLTR-N20, BMW-AIR-FLTR-N20, BMW-SPK-PLG-N55, BMW-COOLANT-G48, BMW-WIPER-F30-FR ≈ 5 rows)

### S5b: Stock List filter — criticality = SAFETY
- **Given** Stock List active
- **When** selecting Criticality = SAFETY
- **Then** table shows 6 parts (per spec §8 safety-critical guarantee)

### S6: Low Stock "Raise PO" action
- **Given** Low Stock tab active
- **When** clicking "Raise PO" on a row with partCode BMW-BRK-DISC-F30
- **Then** router navigates to `/parts/po/new?part=BMW-BRK-DISC-F30`
- **And** (P4 not shipped) the page 404s — acceptable per §1

### S7: Purchase Orders — status filter
- **Given** PO tab active
- **When** selecting Status = PENDING_APPROVAL
- **Then** table shows 2 rows (po-003 and po-004)
- **When** selecting Status = CLOSED
- **Then** table shows 1 row (po-010)

### S7a: PO — supplier filter
- **Given** PO tab active
- **When** selecting Supplier = BMW India Parts Distribution (`sup-001`)
- **Then** table shows only POs where `supplierId === 'sup-001'` (po-001, po-002, po-007, po-010 = 4 rows)

### S7b: PO — date range "today"
- **Given** PO tab active
- **When** setting Date Range = Today
- **Then** table shows 0 rows (no PO has `createdAt` today — all fixtures are back-dated; expected behavior)
- **When** changing to "All"
- **Then** table shows 10 rows

### S8: PO — Expected Delivery overdue
- **Given** PO tab active, Status = All
- **Then** po-008 (PARTIALLY_RECEIVED, expectedDeliveryAt = 2 days ago) shows Expected Delivery in red text
- **And** po-010 (CLOSED, expectedDeliveryAt = 30 days ago) shows Expected Delivery in default color — closed POs don't alarm

### S9: GRNs — discrepancy filter
- **Given** GRN tab active
- **When** toggling "Has discrepancy" on
- **Then** table shows 1 row (grn-003) with amber dot + "Discrepancy" chip

### S9a: GRN — outlet filter
- **Given** GRN tab active
- **When** selecting Outlet = Mumbai
- **Then** table shows GRNs where `outletId === 'MUM-01'` (grn-003, grn-005 = 2 rows)

### S10: GRNs — row click
- **Given** GRN tab active
- **When** clicking the grn-002 row
- **Then** router pushes `/parts/grn/grn-002` (P5 404)

### S11: Suppliers — row click opens panel
- **Given** Suppliers tab active
- **When** clicking the row for sup-001 (BMW India)
- **Then** SlideInPanel opens with name, GSTIN, address, payment terms, currency, active POs count, lifetime value ₹
- **And** Escape closes the panel
- **And** focus returns to the row button after close

### S12: Suppliers — import supplier shows "—" for GSTIN
- **Given** Suppliers tab active
- **Then** row for sup-008 (LuxeAuto Imports, Germany) shows `—` in the GSTIN column
- **And** row shows `Import` or EUR badge (subtle indicator)

### S13: Keyboard navigation of tabs
- **Given** on /parts
- **When** focusing any tab with Tab key and pressing ← / →
- **Then** focus moves between adjacent tabs (WAI-ARIA tabs pattern)
- **When** pressing Enter/Space on a tab
- **Then** it activates (same as click)

*Note: arrow-key tab switching is WAI-ARIA expected behavior but is NOT implemented in the service module's canonical tab code. **Decision for P2: document as known gap, match service**. File a follow-up "Add roving tabindex to canonical tabs primitive" — applies to service + parts + any future module using the pattern.*

### S14: Stock badges accessibility
- **Given** Stock List row for part with BLR qty 8 (OK), MUM qty 3 (LOW), CHE qty 6 (OK)
- **When** a screen reader reads the row
- **Then** it announces "Stock: Bangalore 8, Mumbai 3 (low), Chennai 6" as one phrase (via `aria-label` on the group)

### S14a: Zustand selector safety — no cross-tab re-render
- **Given** Stock List is active with a filter applied (e.g. Brand = BMW)
- **When** switching to PO tab and back
- **Then** the Stock List's filter state is preserved (tab component remount is fine; no infinite re-render loop in dev tools)
- **And** React DevTools shows tab components re-render ONLY when their own `usePartsStore(s => s.<field>)` selector returns a new reference — confirmation that no tab uses a `.filter(...)` inline inside the selector

### S15: Typecheck + build
- **Given** P2 implementation complete
- **When** running `pnpm -F staff-web typecheck`
- **Then** exits 0 with zero errors

## 13. Acceptance criteria (used by /review)

P2 is COMPLETE when ALL of the following hold:

1. Scenarios S1–S15 behave as specified (manual verification OK — no Playwright yet).
2. Typecheck clean on `@dms/staff-web` and `@dms/mocks`.
3. Every file ≤ 350 LoC. No monolithic views.
4. Zero `bg-[var(--color-*)]` / hex literals in new code.
5. Zero new npm dependencies.
6. `StateChip` extension uses existing tokens only.
7. Canonical tab pattern copied verbatim from `service-landing-view.tsx` (header + tabs + panels).
8. Every DataTable uses the existing `DataTable` primitive (no bespoke tables).
9. Per-outlet stock badges have a single group-level `aria-label` (S14).
10. Row-click navigation: POs → `/parts/po/[id]`, GRNs → `/parts/grn/[id]`, Stock → `/parts/[partCode]`, Suppliers → panel.
11. Low Stock "Raise PO" links to `/parts/po/new?part=<partCode>`.
12. CTAs in header link to `/parts/po/new` and `/parts/grn/new` (404 until P4 — acceptable).
13. Empty states implemented with "Clear filters" affordance where filters are active.
14. `/parts/page.tsx` shrunk to ≤ 10 LoC (renders `<PartsLandingView />`).
15. Review agent report lists no BLOCKERs.

## 14. Risks + known gaps carried forward

| Risk | Mitigation | Owner |
|---|---|---|
| Zustand derived-selector infinite loop (S4 bug) | Raw selector + `useMemo` enforced in every tab; reviewer checks each `usePartsStore` call | coder + reviewer |
| `noUncheckedIndexedAccess` on `part.stock.find(...)` returns `\| undefined` | Must guard; propose `stock.find(s => s.outletId === o) ?? null` pattern | coder |
| Row-click → P5 404 | Accept per service precedent; documented in S6/S10 | N/A |
| Arrow-key tab navigation missing | Document follow-up sweep across service+parts | follow-up |
| i18n lift deferred | Hardcoded English; coordinated sweep FL-i18n-001 (parts + service in one PR when scheduled). CLAUDE.md §10 DoD item 7 waiver is auditable via this ticket reference. | follow-up FL-i18n-001 |
| Filter URL persistence deferred | `useState` in-memory only | follow-up |
| DataTable virtualization | Not needed at 65 / 10 / 5 / 8 rows | N/A |
| `.next` webpack stale cache | Standard gotcha — `rm -rf .next` if module-not-found errors after adding files | coder |

## 15. Definition of Done (per CLAUDE.md §10)

1. ✓ Spec (this doc) approved — awaiting spec-reviewer sign-off
2. Empty / loading / error — §8 documented (loading N/A; empty per tab; error deferred to P3)
3. Accessibility — §9 enumerated; keyboard nav + focus rings + group aria-labels
4. Breakpoints — desktop-first (staff surface convention per Doc 00); no mobile layout work in P2
5. Mocked data — 65 parts, 10 POs, 5 GRNs, 8 suppliers, 210 movements from P1 cover happy path + ≥2 edge cases per tab
6. RBAC gates — no role-gated actions in P2; P5 adds approve/post gates
7. i18n — deferred (§11)
8. Storybook — N/A for P2 (module-level spec doesn't require stories per tab in the current pipeline; add when the design-system team requests)
9. Unit tests — scenarios S1–S15 are candidates; P2 ships without Playwright; revisit in S10 polish
10. Reviewer signed off — agent pass required before commit

## 16. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | P2 phase spec written. Pending spec-reviewer sign-off. |
| 2026-04-17 | Spec-reviewer produced 12 findings (5 CONCERN + 7 NIT) — all addressed. Key amendments: §5 token mapping differentiates rejected vs low-stock (now danger vs overdue) and dispatched vs partially-received (accent vs pending); §6.2 DoC formula + §6.1 outlet-filter edge cases clarified with noUncheckedIndexedAccess guards; §6.5a Table Defaults section added (sort / page size / sticky / overflow); §6.5 Supplier aggregation enumerated TERMINAL_PO set and Lifetime Value voided-exclusion; §3 URL contract flipped from `?view=` (parent spec) to `?tab=` for cross-module consistency — amending SPEC-PARTS-001 §2; §2 file tree extracts `*-columns.ts` files to keep every tab shell ≤ 250 LoC; §8 loading/not-found decisions explicit; §9 h-10 citation to design §4 lines 160+265; §12 scenarios extended with S5a/S5b/S7a/S7b/S9a/S14a covering criticality, brand combo, date-range, outlet-filter, Zustand selector safety; §14 i18n follow-up ticket FL-i18n-001 recorded. |
| 2026-04-17 | **P2 code review (opus).** 13 findings, 0 BLOCKER, 6 CONCERN, 7 NIT. Fixes applied: (#01) Low Stock row left-accent selector narrowed from `[&_tbody_tr]` to `[&_tbody_tr:has(td:not([colspan]))]` to exclude the empty-state row; (#02) inactive tab panels no longer render at all (removed redundant `hidden` attribute + per-panel wrappers; only the active panel mounts — matches "no filter URL persistence" spec); (#04) Stock List Location column now resolves to the filter-outlet when a filter is active, else falls back to the outlet with the most stock (not `stock[0]` arbitrary); (#06) PO tab `?supplier=` deep-link side-effect documented in §17.3 — when seeded, date-range widens to `All`; (#07) landing view `handleTabChange` comment explains one-shot cleanup of `?supplier=`; (#12) `OutletCode` import moved to top of `helpers.ts`. Follow-ups (out of P2): DataTable primitive row-click has no keyboard/role (pre-existing gap, scope: primitives); PO + GRN tabs share ~40 lines of filter-bar boilerplate with the shared `PartsFilterBar` (minor DRY, revisit in P5). P2 shipped. |
| 2026-04-17 | **Stitch inventory + design agent pass.** Three existing Stitch screens for Parts: `parts_stock_list_dark` (used as P2 Stock List tab visual reference), `parts_low_stock_detail_dark` (right-drawer — P3 scope, used as visual language reference for P2's SupplierDetailPanel), `parts_grn_detail_pending_approval` (P5 scope). Gaps for P2: PO list, GRN list, Suppliers list, Low Stock LIST view. Resolution per user direction: use design agent to produce wireframes grounded in existing Stitch visual language; spec wins on content discrepancies (per-outlet badges kept over Stitch's single-outlet style; Suppliers remains 5th tab, Transfers deferred to P6). Design-agent wireframes integrated into new §17 Visual Design. Design-agent open questions resolved: (a) GRN PO No cell = whole-row navigation to GRN detail, no nested link (upgrade in P5); (b) Suppliers "View POs" deep-link = read-once `?supplier=<id>` on PO tab mount into initial filter state (small documented exception to no-URL-sync rule, §3); (c) Suppliers copy-to-clipboard = out of P2 scope (adds buttons); (d) Lifetime Value for LuxeAuto (EUR supplier) = ₹ — verified `po.total` is always INR across fixtures (fxRate is informational); (e) DoC render = `"3 d"` abbreviation; (f) Low Stock row-alert treatment = left-accent `border-l-2 border-state-overdue` only (no full-row tint). Spec status: approved. |

## 17. Visual design — wireframes

Produced by the design agent (2026-04-17) grounded in the 3 existing Stitch
screens. Filter bars live in a card `p-3` above the DataTable card. Inputs
`h-10`, labels uppercase `text-[11px] tracking-wide text-ink-muted`. Row
height 44px across all tabs.

### 17.1 Purchase Orders tab

Layout (ASCII):

```
┌ FILTER BAR CARD (p-3, flex gap-3 items-end) ──────────────────────────────────┐
│ [STATUS v]  [SUPPLIER v]  [OUTLET v]  [DATE RANGE v]  [SEARCH icon flex-1 ]   │
│  h-10 w-40  h-10 w-56     h-10 w-40   h-10 w-40       h-10                    │
└───────────────────────────────────────────────────────────────────────────────┘
  mt-4
┌ DATATABLE CARD (min-w-[960px], overflow-x-auto) ──────────────────────────────┐
│ PO NO | SUPPLIER | OUTLET | STATUS | LINES | TOTAL | CREATED BY | EXPECTED DEL│
│ PO-2026-0008 | Bosch | MUM | Part.Recvd | 3 | Rs 4,80,500 | R.Kumar | 15 Apr   │
│  ...                                                                           │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Filters (5):** STATUS (select, all 9 PO statuses) · SUPPLIER (select, 8 suppliers) · OUTLET (select, 3 outlets) · DATE RANGE (today/week/month/all on createdAt, default This Month) · SEARCH (icon-prefix, matches poNo or supplier name).

**Columns (8):** PO No (mono 13px, w-140) · Supplier (13px trunc w-200) · Outlet (`<OutletPill>`, w-80) · Status (`<StateChip po-*>`, w-160) · Lines (mono right, w-72) · Total (`<AmountCell currency="INR">`, w-140) · Created By (staff name, w-140) · Expected Delivery (dd MMM, w-120; `text-state-stale font-medium` if past AND status is not in `{RECEIVED, CLOSED, CANCELLED, REJECTED}`).

Default sort: `createdAt desc`.

Row: hover `bg-bg-subtle cursor-pointer` then `router.push('/parts/po/' + id)`. Column-level overdue treatment only; no row-level tint.

Empty state: `package-search` icon 40px, copy "No purchase orders match these filters.", "Clear filters" link (hidden if filters at default).

### 17.2 GRNs tab

Layout (ASCII):

```
┌ FILTER BAR CARD ──────────────────────────────────────────────────────────────┐
│ [STATUS v] [OUTLET v] [DATE RANGE v] [Has discrepancy toggle] [SEARCH ...]    │
└───────────────────────────────────────────────────────────────────────────────┘
  mt-4
┌ DATATABLE CARD (min-w-[1100px]) ──────────────────────────────────────────────┐
│ GRN NO | PO NO | SUPPLIER | OUTLET | STATUS | LINES | RECV/ORD | RECEIVED AT  │
│    | RECEIVED BY | DISCREPANCY                                                 │
│ GRN-2026-003 | PO-2026-0008 | Bosch | MUM | Pending QC | 3 | 10/12(amber) |   │
│    14 Apr 16:40 | R.K | dot+Discrepancy                                        │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Filters (5):** STATUS (5 GRN statuses) · OUTLET · DATE RANGE (on receivedAt) · HAS DISCREPANCY (toggle button; active `bg-accent/10 border-accent text-accent` + 14px `triangle-alert`) · SEARCH (grnNo / poNo).

**Columns (10):** GRN No (mono, w-140) · PO No (mono `text-accent` styled; whole-row click still goes to GRN detail — see decision (a) in §16; w-140) · Supplier (w-180 trunc) · Outlet (OutletPill, w-80) · Status (`<StateChip grn-*>`, w-140) · Lines (right, w-64) · Recv/Ord (mono fraction right; numerator in `text-state-overdue` when recv<ord; w-88) · Received At (`dd MMM HH:mm`, w-120) · Received By (w-120) · Discrepancy (dot+label `text-state-overdue text-[12px] font-medium`; empty otherwise; w-130).

Default sort: `receivedAt desc`.

Row: hover then `router.push('/parts/grn/' + id)`. No row-level discrepancy tint — column signal only, for scan-cost.

Empty state: `inbox` icon 40px, "No GRNs match these filters." + Clear filters link.

### 17.3 Suppliers tab

No filter bar (8 rows per spec §3.5).

Layout:

```
┌ DATATABLE CARD ───────────────────────────────────────────────────────────────┐
│ NAME | GSTIN | PAYMENT TERMS | ACTIVE POS | LIFETIME VAL | LAST ORDER         │
│ BMW India Parts Dist. | 29ABCDE1234F1Z5 | NET 30 | 3 | Rs 48,60,000 | 14 Apr  │
│ LuxeAuto Imports [EUR] | — | ADVANCE | 1 | Rs 21,00,000 | 20 Mar              │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Columns (6):** Name (13px font-medium; + inline `[EUR]` badge `text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-1.5 py-0.5 rounded` when `currency !== 'INR'`) · GSTIN (mono; `—` in `text-ink-muted` if absent) · Payment Terms · Active POs (mono right, w-96) · Lifetime Value (`<AmountCell currency="INR">`, w-140 — INR for all suppliers) · Last Order (`dd MMM` or `—`, w-110).

Default sort: `name asc`.

Row click opens **`<SupplierDetailPanel supplierId>`** SlideInPanel (right-anchored, `w-[480px]`):

```
┌ SLIDE-IN PANEL ──────────────────────────────────────┐
│ HEADER (p-6 border-b)                                 │
│ [x] Supplier                                          │
│ BMW India Parts Distribution    [Active badge]        │
├───────────────────────────────────────────────────────┤
│ BODY (p-6 space-y-6, scroll)                          │
│                                                       │
│ IDENTITY (eyebrow)                                    │
│   GSTIN                                               │
│   29ABCDE1234F1Z5                                     │
│                                                       │
│ ADDRESS                                               │
│   221B Industrial Estate, Peenya, Bengaluru 560058    │
│                                                       │
│ CONTACT                                               │
│   +91 98765 43210   (tel: link text-accent)           │
│   parts@bmwindia.example   (mailto: link text-accent) │
│                                                       │
│ COMMERCIAL (2-col grid gap-4, each tile bg-bg-subtle  │
│   p-4 rounded-md)                                     │
│   [PAYMENT TERMS: Net 30]  [CURRENCY: INR]            │
│   [ACTIVE POS: 3]          [LAST ORDER: 14 Apr 2026]  │
│   [LIFETIME VALUE: Rs 48,60,000  (full-width tile)]   │
│                                                       │
│ LINKS                                                 │
│   [-> View POs]   (text-accent; navigates to          │
│                    /parts?tab=po&supplier=sup-001;    │
│                    PO tab reads ?supplier on mount    │
│                    into initial filter state)         │
├───────────────────────────────────────────────────────┤
│ FOOTER (p-6 border-t)                [Close] (right)  │
└───────────────────────────────────────────────────────┘
```

Panel structure mirrors `parts_low_stock_detail_dark/code.html:203-324`. Escape closes; focus returns to the row button. Animation handled by the `<SlideInPanel>` primitive.

**Deep-link side-effect (PO tab mount):** when PO tab is seeded via `?supplier=<id>`, the date-range filter also initialises to `All` (not the normal `This Month` default). Rationale: the user came from Suppliers expecting to see this supplier's historical POs; restricting to the current calendar month would often produce an empty result set. The supplier-seeding and the date-range widening happen together, atomically, in the `useState` initialiser. This is a UX convenience, not a spec-overriding behaviour — it does not persist back to the URL. Added 2026-04-17 after P2 code review.

### 17.4 Low Stock tab (LIST view — NOT the detail drawer)

Layout:

```
┌ FILTER BAR CARD (same controls as Stock List) ────────────────────────────────┐
│ [OUTLET v] [BRAND v] [CATEGORY v] [CRITICALITY v] [SEARCH ...]                │
└───────────────────────────────────────────────────────────────────────────────┘
  mt-4
┌ DATATABLE CARD (min-w-[1040px]) — every row has border-l-2 border-state-overdue┐
│ | PART CODE | NAME | STOCK (3 chips) | SHORTFALL | DoC | LAST PO | RAISE PO   │
│ | BMW-BRK-DISC-F30 | Brake Disc Front | [BLR•1][MUM 4][CHE 2] | 4 | 3 d |     │
│   22 Mar | [Raise PO ->]                                                       │
│ | POR-TAYCAN-HV-CABLE | HV Cable Taycan | [BLR 1][MUM•0][CHE 1] | 1 | — | — | │
│   [Raise PO ->]                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

Each row carries `border-l-2 border-state-overdue` (2px left accent strip; no extra width consumed). Signals "alert view" without row-level tint.

**Filters:** same as Stock List (OUTLET / BRAND / CATEGORY / CRITICALITY / SEARCH).

**Columns (7):** Part Code (mono, w-150) · Name (trunc w-260) · Stock (`<StockBadges>` primitive) · Shortfall (mono right `font-medium text-state-overdue`, w-90) · DoC (mono right, format `"3 d"` suffix; `—` in `text-ink-muted` when undefined per §6.2; w-72) · Last PO (`dd MMM` or `—`, w-100) · Raise PO (button, w-120).

Default sort: **Shortfall desc** (spec §6.5a — worst first).

**Raise PO button** — small secondary `h-8`:
`inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-primary hover:bg-bg-subtle hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`
Trailing `arrow-right` lucide icon (12px). `aria-label="Raise PO for {partCode}"`. Handler uses `event.stopPropagation()` before `router.push('/parts/po/new?part=<code>')`, so the surrounding row-click (navigates to Part Detail — P3 404) does not also fire.

**`<StockBadges>` primitive** (`stock-badges.tsx`):
- Container: `role="group"`, `aria-label={buildStockAriaLabel(stock)}`, `inline-flex gap-1.5`
- Each chip: `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono`; dot `w-1.5 h-1.5 rounded-full`
  - `qty === 0` → red dot `bg-state-stale` + label "BLR 0"
  - `qty <= reorderLevel` → amber dot `bg-state-overdue` + label "BLR 3"
  - `qty > reorderLevel` → neutral dot `bg-ink-muted` + label "BLR 8"
  - missing outlet row → dashed outline, `text-ink-muted`, label "BLR —"
- Individual chips are `aria-hidden="true"`; the group-level label is the sole screen-reader utterance.

**Empty state — two variants:**
- Success (no filters active, zero low-stock parts): icon `check-circle-2` 40px `text-state-listed` · "Great — no parts below reorder level." · no CTA.
- Filtered (filters active, zero results): icon `package-search` 40px `text-ink-muted` · "No parts match these filters." · "Clear filters" link.

### 17.5 Stock List tab (default) — already in spec §3 + §6.1, visual notes

Layout mirrors PO tab shape with the Stock List column set per spec §3.1:
Columns: Part Code (mono) · Name · Brand · Fits (2 chips max, `+N more`) · Stock (`<StockBadges>`) · Reorder Level (mono right) · Avg Cost (`<AmountCell>`) · MRP (`<AmountCell>`) · Location (mono) · Status (`<StateChip stock-*>`).

Filter bar identical to Low Stock (OUTLET / BRAND / CATEGORY / CRITICALITY / SEARCH).

Default sort: `partCode asc`.

Row: hover then `router.push('/parts/' + partCode)` (P3 404).

Empty state: `package-search` 40px, "No parts match these filters." + Clear filters.

### 17.6 Global visual notes (all tabs)

- Header (shared shell): `h1 text-[28px] font-semibold` "Parts" + subtitle `text-[13px] text-ink-muted` "Stock, purchase orders, GRNs, and suppliers" + right CTAs "New GRN" (outline secondary) + "New PO" (primary accent). Matches Stitch `parts_stock_list_dark` header.
- Canonical underline tabs row: copy verbatim from `service-landing-view.tsx:80-112` with parts IDs.
- Light-theme mirror: all semantic tokens flip automatically via `[data-theme]`. No light-only overrides required.
- Filter bar responsive behavior: single flex row at 1280px+. Below 1280 is out of scope (staff surface is desktop-first per Doc 00).
- Row click uses `router.push` (not `replace`) so the landing page stays in history.
- Focus rings: `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`.
