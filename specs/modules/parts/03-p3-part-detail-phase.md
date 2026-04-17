---
spec_id: PLAN-PARTS-003
domain: parts
status: approved
risk_level: low
pii_sensitivity: low
flags: [parts-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001, PLAN-PARTS-002]
---

# S5 P3 — Part Detail page

Phase-level spec elaborating on SPEC-PARTS-001 §2 (`/parts/[partCode]`) and
§9 P3 rollout. Replaces the P2 row-click 404 with a full detail page:
overview stats · supersession chain · per-outlet stock · paginated movement
history · open POs · primary supplier · linked Service job cards.

**Scope:** new route `/parts/[partCode]` (+ `not-found.tsx`), one client view
composed of 9 sections, layout update on the parts route tree to mount both
store hydrators, plus 4 new `mov-*` StateChip variants for the movement-type
column.

**Fixture amendment landed in this phase** (addresses spec-review BLOCKER #01):
Three service partsLines retrofitted from `PRT-*` codes to catalog codes so the
new Linked Service Job Cards section has real demo data:
- `prt-002` — `PRT-OIL-FILT-911` → `POR-OIL-FLTR-9A2` (already in catalog; semantically equivalent)
- `prt-013` — `PRT-OIL-FILT-718` → `POR-OIL-FLTR-9A2` (consolidates; same part fits both 911/718 per fitsVehicles)
- `prt-019` — `PRT-OIL-FILT-GLC` → `MB-OIL-FLTR-M274` (already in catalog; same engine family)
No other service data shifts. Service-side flows (labour/parts/inspection) are
untouched because they read on `prt.id` not `partCode`. Long-term path is a
single parts namespace across service + parts (spec §11.2 P6 territory).

**Out of P3 scope (deferred):**
- Edit part master (parts catalog admin — not in v1 per SPEC-PARTS-001 §13 non-goals)
- `/parts/po/new` + `/parts/grn/new` create forms (P4 — Raise PO CTA links there; 404 until P4)
- `/parts/po/[id]` + `/parts/grn/[id]` detail + approvals (P5)
- Auto-reserve Service PartsLine on GRN POST (P6)
- Inter-outlet transfer flow from this page (P6)
- Role-gated outlet filtering on stock distribution (defer to P5)
- Movement-history filter bar (defer unless user requests)
- `next-intl` lift (FL-i18n-001 coordinated sweep)

## 1. Route surface

| Route | P3 change |
|---|---|
| `/parts/[partCode]` | **New.** Client component reads `usePartsStore(s => s.parts.find(p => p.partCode === params.partCode))` and calls `notFound()` on miss; otherwise renders `<PartDetailView part={part} />`. |
| `/parts/[partCode]/not-found.tsx` | **New.** Route-level 404 — simple message + "Back to Parts" button. Cloned from `service/jobcards/[id]/not-found.tsx`. |
| `/parts/layout.tsx` | **Updated.** Mounts both `PartsStoreHydrator` AND `ServiceStoreHydrator` — the detail view reads linked Service JobCards from the service store, so the service store must be seeded on client. Hydrators are idempotent (single module-level init). |
| `/parts/po/new?part=<code>` | Still 404 (P4). Raise PO CTA links here. |
| `/parts/grn/new` | Still 404 (P4). No link from this route. |
| `/service/jobcards/[id]` | Linked Service Job Card rows navigate here — already exists (S4). |

## 2. Client-page wiring

`page.tsx` pattern (mirrors `service/jobcards/[id]/page.tsx` exactly):

```tsx
'use client';
import { notFound } from 'next/navigation';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { PartDetailView } from '@/src/components/parts/detail/part-detail-view';

interface PageProps { params: { partCode: string }; }

export default function Page({ params }: PageProps) {
  const part = usePartsStore((s) =>
    s.parts.find((p) => p.partCode === params.partCode),
  );
  if (!part) notFound();
  return <PartDetailView part={part} />;
}
```

Notes:
- `params` is a **plain object**, NOT a `Promise` (Next 14, matches service/sales/inventory convention). S4 bug tracker called this out three times.
- `usePartsStore(s => s.parts.find(...))` is safe because `.find()` returns a stable reference across renders (same underlying `Part` object). `.filter()` would NOT be safe — Zustand derived-selector trap applies only to selectors that create new arrays/objects each call.
- `notFound()` works inside `'use client'` components in Next 14 (service/jobcards/[id]/page.tsx is the proof).

## 3. Layout — 70/30 content + sidebar

Chosen layout: **B** (70/30 split) — matches service `jobcard-detail-view.tsx` for cross-module consistency. Single-column on `< lg`.

Container: `mx-auto max-w-[1440px] px-6 pb-12 pt-6`.

Grid inside the breadcrumb/header block: `grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6`.

**Breakpoint choice:** `xl:` (1280px) — NOT `lg:` (1024px). At `lg` the main column becomes ~572px which squishes the 6-col Movement History DataTable. Service jobcard-detail uses `lg:` but its primary column shows tabbed thinner content; parts detail's Movement History needs the extra room. Below `xl`, sidebar stacks below the primary column.

```
╔══════════════════════ breadcrumb + header + CTAs ════════════════════════╗
║ Parts › BMW-BRK-PAD-F30   [OUT] [Safety]            [New GRN] [Raise PO] ║
╠══════════════════════════════════════════════════════════════════════════╣
║ ┌─ Primary column (70%) ─────────┐   ┌─ Sidebar (30%, 380px) ──────┐   ║
║ │ PartOverviewCard                │   │ PartOpenPos                  │   ║
║ │ PartSupersessionRow (cond.)     │   │ PartPrimarySupplier          │   ║
║ │ PartStockDistribution           │   │ PartLinkedJobCards           │   ║
║ │ PartMovementHistory             │   │                              │   ║
║ └─────────────────────────────────┘   └──────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## 4. Component tree

All new files under `apps/staff-web/src/components/parts/detail/`:

```
detail/
├── part-detail-view.tsx            — composer: breadcrumb/header/CTAs + 70/30 grid
├── part-header.tsx                 — breadcrumb + h1 + subtitle + badges + CTAs
├── part-overview-card.tsx          — stat grid (Avg Cost / MRP / Last PP / HSN / etc.)
├── part-supersession-row.tsx       — conditional banner card (3 states — §8)
├── part-stock-distribution.tsx     — per-outlet plain table (3 rows max)
├── part-movement-history.tsx       — section card wrapping paginated DataTable
├── part-movement-columns.ts        — pure column defs (extracted per P2 pattern)
├── part-open-pos.tsx               — sidebar card: non-terminal POs for this part
├── part-primary-supplier.tsx       — sidebar card: supplier[0] + "+N alternates" panel
├── part-linked-jobcards.tsx        — sidebar card: Service JCs consuming this part
└── part-detail-helpers.ts          — local helpers (getMovementsForPart, etc.)
```

Target LoC per file: ≤ 350. Heaviest is `part-detail-view` at ~240 (composer) and `part-stock-distribution` / `part-movement-columns` at ~140 each. All within cap.

No file moves from the existing `parts/helpers.ts` — the shared helpers stay shared; detail-only helpers live next to their consumers.

## 5. Store access contract

Reads (never writes — P3 is read-only):

```ts
// Parts store
const part = usePartsStore(s => s.parts.find(p => p.partCode === partCode)); // page.tsx
const parts = usePartsStore(s => s.parts);                                    // for supersession lookup
const suppliers = usePartsStore(s => s.suppliers);                            // primary supplier card
const purchaseOrders = usePartsStore(s => s.purchaseOrders);                  // open POs card
const stockMovements = usePartsStore(s => s.stockMovements);                  // movement history

// Service store
const jobCards = useServiceStore(s => s.jobCards);                            // linked JCs
const partsLines = useServiceStore(s => s.partsLines);                        // to join JC to part
```

All `.filter()` operations run inside `useMemo` after a stable base-array selector. No exceptions.

## 6. Header (breadcrumb + title + CTAs)

```
Parts ›  BMW-BRK-PAD-F30                          [New GRN] [Raise PO]
Brake Pad Set — Front (F30 / F31)
[OUT] [Safety] [Mechanical] · BMW · SET · HSN 8708
```

- Breadcrumb: `font-mono text-[13px] text-accent` with `ChevronRight` separators, identical to service jobcard-detail.
- h1: `text-[28px] font-semibold leading-[1.25] text-ink-primary`. The part code in `font-mono` to signal it's an identifier.
- Subtitle row: name in `text-[15px] text-ink-secondary`, then a chip row — worst-across-outlets stock StateChip + Criticality chip (only when `CRITICAL` or `SAFETY`) + Category chip (muted neutral) + brand · UoM · HSN as text.
- CTAs right-aligned:
  - **New GRN** (outline) → `/parts/grn/new` (P4 404). Matches landing header convention.
  - **Raise PO** (primary filled accent) → `/parts/po/new?part=<code>` (P4 404).
- Bottom: `border-b border-line pb-5 mb-6`.

## 7. Section: PartOverviewCard

Card `rounded-md border border-line bg-bg-surface p-6`. Eyebrow `"Overview"` in `text-[11px] uppercase tracking-widest text-ink-muted`.

Stat grid breakpoints: `grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5`. Between 768 (md) and 1024 (lg) keeps 2 columns — the primary column is still narrow and 4 money tiles would crush. At `lg` expands to the intended 4-col.

| Avg Cost | MRP | Last Purchase Price | HSN |
| Category | Criticality | UoM | Warranty Policy |

Each stat is a mini-tile: label uppercase `text-[11px] text-ink-muted` + value `text-[15px] text-ink-primary font-medium`. Money values use `<AmountCell size="md" align="left">`. Warranty Policy shows `—` when absent.

## 8. Section: PartSupersessionRow (conditional)

Inline card between Overview and Stock Distribution. Only renders when at least one of the two conditions holds. Left-accent strip color varies by state:

**State A — Part is superseded by something in catalog** (e.g. `BMW-BRK-PAD-F30`):
```
┌────────────────────────────────────────────────────────────────────────┐
│▍ ⚠ Superseded by BMW-BRK-PAD-F30-V2 (Brake Pad Set — revised)   [View →] │
└────────────────────────────────────────────────────────────────────────┘
```
Left accent `border-l-2 border-[rgb(var(--state-overdue))]` (amber), `AlertTriangle` icon 16px, successor code in mono, "View" as `text-accent` link → `/parts/<successor>`.

**State B — Part is superseded by something NOT in catalog** (e.g. `AUDI-OIL-FLTR-EA888`):
```
┌────────────────────────────────────────────────────────────────────────┐
│▍ ⚠ Superseded by AUDI-OIL-FLTR-EA888-GEN3 (not in catalog yet)         │
└────────────────────────────────────────────────────────────────────────┘
```
Same amber accent. Muted text `text-ink-muted`, no link, no View button.

**State C — This part IS a successor** (reverse lookup via `parts.filter(p => p.supersededBy === thisCode)`):
```
┌────────────────────────────────────────────────────────────────────────┐
│▍ ↻ Replaces BMW-BRK-PAD-F30 (Brake Pad Set — original)       [View →] │
└────────────────────────────────────────────────────────────────────────┘
```
Left accent `border-l-2 border-[rgb(var(--state-reserved))]` (blue — informational), `RotateCcw` icon. Multiple predecessors join with " · ".

A and C can stack if the part is in the middle of a chain (no such fixture today; logic supports it).

When neither A nor C nor B applies → row returns `null`.

## 9. Section: PartStockDistribution

Card `p-6`. Eyebrow `"Stock Distribution"`. Plain `<table>` (NOT DataTable — only 3 fixed rows). Columns:

| OUTLET | QTY | REORDER LEVEL | LOCATION | STATUS |

Rows always in canonical order `BLR → MUM → CHE`. Missing outlet rows render with qty `—`, reorder `—`, location `—`, status `stock-out`.

Font: body `text-[13px]`, qty mono right-aligned. Status column uses `<StateChip stock-*>` per-row (single-outlet evaluation — not the worst-across-outlets chip the header shows).

Row heights `h-11`. Thead `bg-bg-subtle`, `border-b border-line`.

## 10. Section: PartMovementHistory

Card `p-6`. Eyebrow `"Movement History"`. Uses `<DataTable>` primitive (density=compact, pageSize=20). No filter bar in P3.

Data source: `useMemo(() => stockMovements.filter(m => m.partCode === partCode).sort((a, b) => at-desc), [stockMovements, partCode])`.

Columns (6):
- **At** — `dd MMM HH:mm` (spec §17.2 format reuse) in `text-[13px] text-ink-secondary`
- **Type** — `<StateChip mov-*>` — see §15 for new variants
- **Qty** — signed mono right-aligned. `text-[rgb(var(--state-listed))]` (green) when positive, `text-[rgb(var(--state-stale))]` (red) when negative
- **Outlet** — `<OutletPill>`
- **Ref** — linkified for IN (GRN) and OUT (JOBCARD):
  - `refType === 'GRN'` → `/parts/grn/<refId>` (P5 404) — show as `text-accent font-mono`
  - `refType === 'JOBCARD'` → `/service/jobcards/<refId>` — show as `text-accent font-mono` (works today)
  - `refType === 'ADJUST'` → plain mono text for the refId + a second line below in `text-[11px] text-ink-muted` showing the `reason` verbatim (visible + SR-audible; dropped the `title` attribute which has weak screen-reader support)
  - `refType === 'TRANSFER'` → plain mono text for the refId + a second line below showing `"<fromOutlet> → <toOutlet>"` derived from the paired movement (walk `stockMovements` for matching `refId` to find the other side)
- **Actor** — staff name via `staffName()` helper, `text-[13px] text-ink-secondary`

Default sort: `at` desc. Empty state: `"No stock movements yet."` — muted single-line inside the card body.

## 11. Section: PartOpenPos (sidebar)

Sidebar card `p-4`. Eyebrow `"Open Purchase Orders"`.

Data: `purchaseOrders.filter(po => po.lines.some(l => l.partCode === partCode) && !TERMINAL_PO.includes(po.status))`. `TERMINAL_PO = {CLOSED, CANCELLED, REJECTED}` — reuse `helpers.ts` constant.

Per-row render (not a DataTable — short list, 0–3 items typical):

```
PO-2026-00007                         [Dispatched]
BMW India Parts Distribution · BLR
3 lines · ₹ 1,88,160 · Expected 18 Apr
```

Hover `bg-bg-subtle cursor-pointer` → `/parts/po/<id>` (P5 404). Rows separated by `border-b border-line`.

Empty state: `"No open purchase orders for this part."` + ghost secondary "Raise PO" button inside the card → `/parts/po/new?part=<code>`.

Sort by `createdAt desc`. Cap visible to 5; if more, show `+N more` footer that links to `/parts?tab=po` (filter-by-part in PO tab is NOT yet supported; link omits filter for P3 and lands on all POs — accept as known gap until we wire `?part=<code>` seeding, future phase).

## 12. Section: PartPrimarySupplier (sidebar)

Sidebar card `p-4`. Eyebrow `"Primary Supplier"`.

Source: `suppliers.find(s => s.id === part.supplierIds[0])`. With `noUncheckedIndexedAccess` `part.supplierIds[0]` is `string | undefined`; guard and render empty state `"No supplier on file for this part."` on miss.

Happy-path body:
```
BMW India Parts Distribution          [Active]
GSTIN 29AABCB0001A1Z5 (mono)
+91 20 6712 3400                      (tel: link)
Net 30 · INR
```

Footer affordances:
- Primary: `"View in Suppliers tab →"` link → `/parts?tab=suppliers` (landing tab).
- If `part.supplierIds.length > 1`: hint rendered as a button opening a `<SlideInPanel>` listing all alternates (name · contact · payment terms). Label pluralizes: **1 alternate** → `"+1 alternate supplier"`; **≥2 alternates** → `"+N alternate suppliers"`. Decision: **SlideInPanel, not navigation** — a filtered suppliers tab isn't supported in P2 (spec §3 explicitly no filter URL sync).

## 13. Section: PartLinkedJobCards (sidebar)

Sidebar card `p-4`. Eyebrow `"Linked Service Job Cards"`.

Reads service store:
```ts
const jobCards = useServiceStore(s => s.jobCards);
const linked = useMemo(
  () => jobCards.filter(jc => jc.partsLines.some(pl => pl.partCode === part.partCode)),
  [jobCards, part.partCode],
);
```

Per-row render:
```
JC-2026-00001                         [In Progress]
BMW 3 Series · Priya Sharma · 12 Apr
```

Hover `bg-bg-subtle cursor-pointer` → `/service/jobcards/<id>` (exists, S4).

Customer name lookup: **inline minimal CUSTOMER_MAP in this file** (~10 entries covering the fixture customers). Do NOT import from service module view files (cross-module view-layer coupling). TODO comment to consolidate into a shared fixture helper in S6 Customers phase.

Empty state: `"No service job cards have consumed this part."`.

Sort by `receivedAt desc`. Cap visible to 5; `+N more` footer links to `/service?tab=jobcards` — filter-by-part in service jobcards tab is NOT supported; link is aspirational for P6 when Parts↔Service integration lands. Accept as known gap.

## 14. `part-detail-helpers.ts` — pure helpers

Local module (not shared — detail-page-only consumers):

```ts
export function getSuccessorPart(part, allParts):
  { kind: 'in-catalog' | 'not-in-catalog', code: string, name?: string } | null
  // reads part.supersededBy; returns null when absent

export function getPredecessorParts(partCode, allParts): Part[]
  // reverse lookup: parts.filter(p => p.supersededBy === partCode)

export function getMovementsForPart(partCode, movements): StockMovement[]
  // sorted desc by `at`

export function getOpenPosForPart(partCode, pos): PurchaseOrder[]
  // filters non-terminal POs that include the partCode

export function getLinkedJobCards(partCode, jobCards): JobCard[]
  // filters JCs whose partsLines include the partCode

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string>
  // { IN: 'In', OUT: 'Out', ADJUST: 'Adjust', TRANSFER: 'Transfer' }
```

All pure. Unit-testable without React or stores.

## 15. StateChip extension — 4 new `mov-*` variants

Add to `apps/staff-web/src/components/primitives/state-chip.tsx`:

| Variant | Token | Rationale |
|---|---|---|
| `mov-in` | `--state-listed` (green) | positive stock event |
| `mov-out` | `--state-overdue` (amber) | stock consumed |
| `mov-adjust` | `--state-pending` (yellow) | manual adjustment |
| `mov-transfer` | `--state-reserved` (blue) | inter-outlet neutral |

Labels: `In` / `Out` / `Adjust` / `Transfer`.

Helper `movementTypeToChip(type: StockMovementType): StateChipStatus` in `part-detail-helpers.ts`.

## 16. Empty / loading / error

| Condition | Treatment |
|---|---|
| Loading | No async boundary; synchronous store reads. N/A. |
| Part not found | `notFound()` → `/parts/[partCode]/not-found.tsx` route. |
| Movement history empty | "No stock movements yet." muted inside card. |
| Open POs empty | "No open purchase orders for this part." + ghost "Raise PO" button. |
| Primary supplier missing | "No supplier on file for this part." |
| Linked JC empty | "No service job cards have consumed this part." |
| Supersession N/A | Section returns `null` (no empty row). |

## 17. Accessibility

- Breadcrumb: `aria-label="Breadcrumb"` on the `<nav>`, `<ol>` list of links with `aria-current="page"` on the last item.
- h1 is the only top-level heading; section eyebrows are `<h2>` with appropriate visual sizing (`text-[11px] uppercase`).
- Clickable cards (Open POs rows, Linked JC rows, "+N alternates" button) have `focus-visible:ring-2 focus-visible:ring-accent` and are reachable via Tab. Row click uses the DataTable primitive where applicable (inherits its existing keyboard gap — tracked separately).
- Status chips have visible label text, not color-only signalling.
- `notFound()` page has a heading-first structure and a prominent "Back to Parts" link.

## 18. Cross-module consistency (user mandate)

| Dimension | Reference | P3 match |
|---|---|---|
| Container width | `max-w-[1440px] px-6 pb-12 pt-6` (service/jobcards/[id]) | ✓ |
| Breadcrumb style | `font-mono text-[13px] text-accent` | ✓ |
| h1 class | `text-[28px] font-semibold leading-[1.25]` | ✓ |
| 70/30 grid | `grid-cols-[minmax(0,1fr)_380px]` (jobcard-detail-view) | ✓ |
| Section eyebrow | `text-[11px] uppercase tracking-widest text-ink-muted` | ✓ |
| Sidebar card padding | `p-4` | ✓ |
| Primary card padding | `p-6` | ✓ |
| CTA layout | outline secondary + filled accent | ✓ |
| StateChip usage | all chips via primitive; no bespoke colors | ✓ |
| No new primitives | only 4 new chip variants in existing primitive | ✓ |

## 19. Scenarios (GPA format — acceptance)

### S1: Happy path for supersession + supplier + stock (BMW brake pad)
- **Given** navigating to `/parts/BMW-BRK-PAD-F30`
- **When** the page mounts
- **Then** breadcrumb "Parts › BMW-BRK-PAD-F30" renders
- **And** h1 shows part code (mono), subtitle shows "Brake Pad Set — Front (F30 / F31)" + chip row
- **And** Overview card shows 8 stat tiles populated from fixture (Avg Cost ₹12,200 · MRP ₹18,500 · Last PP ₹12,400 · HSN 8708 · Mechanical · Critical · SET · "12 months / 20,000 km")
- **And** Supersession row renders in State A (amber) linking to `BMW-BRK-PAD-F30-V2`
- **And** Stock Distribution shows 3 outlet rows (BLR 8 OK · MUM 3 LOW · CHE 6 OK)
- **And** Movement History is non-empty (this part has TRANSFER movements via xfer-001)
- **And** Open POs lists po-002 (DRAFT, linked to jc-001, references BMW-BRK-PAD-F30-V2) — v1 targets the V2 successor not the original; for the original part the Open POs section may be empty, which is accepted (see S1c)
- **And** Primary Supplier shows BMW India Parts Distribution with "+1 alternate supplier" hint (BMW + Bosch)
- **And** Linked Service JobCards is empty (no JC has consumed this specific brake-pad code yet — demo pivots to S1b for the linked-JC path)

### S1b: Happy path for Linked JCs + Movement History (Porsche oil filter)
- **Given** navigating to `/parts/POR-OIL-FLTR-9A2`
- **Then** Overview card populates
- **And** Stock Distribution shows 3 outlet rows
- **And** Linked Service JobCards shows at least 2 rows (jc-001 and jc-006 now reference this part code post-amendment)
- **And** clicking a JC row navigates to `/service/jobcards/<id>` and the page renders correctly (service detail works for both old PRT-* and new catalog codes — the service-side detail looks up by prt-id, not partCode)

### S1c: Part with no open POs and no linked JCs (Mercedes turbo)
- **Given** navigating to `/parts/MB-TURBO-OM654` (no PO references this; no JC consumes it)
- **Then** Overview / Stock Distribution / Movement History render as usual (movement history may be empty)
- **And** Open POs shows empty state "No open purchase orders for this part." + ghost Raise PO button
- **And** Linked Service JobCards shows empty state "No service job cards have consumed this part."

### S2: Supersession state B — successor not in catalog
- **Given** navigating to `/parts/AUDI-OIL-FLTR-EA888`
- **Then** Supersession row shows "Superseded by AUDI-OIL-FLTR-EA888-GEN3 (not in catalog yet)" in muted text with no link

### S3: Supersession state C — reverse lookup (successor viewed)
- **Given** navigating to `/parts/BMW-BRK-PAD-F30-V2`
- **Then** Supersession row shows "Replaces BMW-BRK-PAD-F30" with blue accent + link back to the predecessor

### S4: Not found
- **Given** navigating to `/parts/DOES-NOT-EXIST`
- **Then** `/parts/[partCode]/not-found.tsx` renders with "Part not found" heading + "Back to Parts" button

### S5: Raise PO CTA
- **Given** on `/parts/BMW-BRK-PAD-F30`
- **When** clicking "Raise PO"
- **Then** router navigates to `/parts/po/new?part=BMW-BRK-PAD-F30` (P4 404 — acceptable)

### S6: Alternate suppliers panel
- **Given** on a part with `supplierIds.length > 1` (e.g. BMW-BRK-PAD-F30 has [BMW, Bosch])
- **When** clicking "+1 alternate supplier"
- **Then** SlideInPanel opens with Bosch supplier card
- **When** pressing Escape
- **Then** panel closes, focus returns to the trigger button

### S7: Linked Service JobCard navigation
- **Given** on `/parts/BMW-BRK-PAD-F30` with linked JC row
- **When** clicking the JC row
- **Then** router navigates to `/service/jobcards/jc-001`

### S8: Movement history ref link — IN from GRN
- **Given** on `/parts/AUDI-BRK-PAD-B8-F` (has IN movements from grn-004)
- **When** clicking the Ref cell for an IN row
- **Then** router navigates to `/parts/grn/grn-004` (P5 404)

### S9: Movement history ref link — OUT to JobCard
- **Given** on `/parts/BMW-OIL-FLTR-N20` (the OUT pattern in `stock-movements.ts` consumes this part with refIds cycling through `jc-001`..`jc-018`)
- **When** clicking the Ref cell for an OUT row
- **Then** router navigates to `/service/jobcards/<refId>` — the specific refId depends on the row clicked; all 18 service JCs exist so no 404

### S10: Stock distribution — missing outlet row (OUT state)
- **Given** a part where one outlet has `qty === 0` (e.g. BMW-CTRL-ARM-F30-L on CHE)
- **Then** that outlet's row shows qty `0`, status chip `stock-out`, row is NOT hidden

### S11: Movement history empty
- **Given** navigating to `/parts/MB-TURBO-OM654` (a real catalog part whose code is in no stockMovement, no GRN line, and no JC partsLine — verified against fixtures)
- **Then** Movement History section shows "No stock movements yet." empty copy
- **And** Open POs shows empty state
- **And** Linked JobCards shows empty state

### S12: Typecheck + build
- `pnpm -F staff-web typecheck` exits 0 after P3.

## 20. Acceptance criteria

1. Scenarios S1–S11 behave as specified (manual smoke via preview tool).
2. Typecheck clean.
3. Every file ≤ 350 LoC.
4. Zero `bg-[var(--color-*)]` / hex literals in new code.
5. No new npm dependencies.
6. 4 new `mov-*` chip variants use EXISTING tokens only.
7. `/parts/[partCode]/not-found.tsx` works when partCode is unknown.
8. `/parts/layout.tsx` now mounts BOTH hydrators (parts + service).
9. Primary column uses 70/30 split on `lg:` matching service jobcard-detail.
10. Supersession row correctly handles 3 states + null case (S1–S3 + absent case).
11. Raise PO CTA links to `/parts/po/new?part=<code>` (404 until P4 — acceptable).
12. Breadcrumb + h1 + section styles byte-match the service jobcard-detail pattern.
13. Code-reviewer report lists no BLOCKERs.
14. Visual smoke across 3+ partCodes shows no console errors.

## 21. Risks + known gaps

| Risk | Mitigation |
|---|---|
| `params` typing — plain object not Promise | Explicit `interface PageProps { params: { partCode: string } }` in page.tsx with comment citing S4 lesson. |
| Zustand `.filter()` trap | All filters inside `useMemo`; `.find()` in selector allowed (stable ref). |
| `noUncheckedIndexedAccess` on `supplierIds[0]` | Guard with early-return + empty state. |
| `.next` stale cache (11 new files) | `rm -rf apps/staff-web/.next` if modules appear un-findable. |
| Cross-store hydration order | Both hydrators mount independently; Zustand initializers are module-singletons — no ordering hazard. |
| Customer-name lookup for linked JCs | Inline minimal 10-customer map in `part-linked-jobcards.tsx`; TODO comment to consolidate in S6. |
| "+N more" links on Open POs / Linked JCs lack filter-by-part | Link to unfiltered listing; accept as known gap until Parts↔Service wiring (P6). |
| `notFound()` in client component | Verified works in Next 14 (service/jobcards precedent). |
| DataTable primitive row-click keyboard gap | Inherited from P2; not P3's scope to fix. Follow-up on primitives owner. |

## 21a. Visual-design resolutions (from design-agent open questions)

1. **Stock chip tie-break** — when all outlets are OK, show `stock-ok`. Straight OK wins; no special "healthy" chip.
2. **Category chip styling** — muted neutral pill, NOT a StateChip variant. Matches the P2 filter-bar chip convention. No `cat-*` variants added.
3. **Criticality chip labeling** — render chip only when `criticality === 'CRITICAL'` OR `criticality === 'SAFETY'`. Labels "Critical" (amber) / "Safety" (amber) using a new `criticality-critical` / `criticality-safety` pair on StateChip — OR reuse one variant with dynamic label. **Decision:** reuse `svc-waiting-parts` token style (amber warning chip) via a new `crit-safety` variant (singular) with dynamic label prop — avoids two new variants for one visual. Spec §15 extended in implementation to add just `crit-safety` mapping to `--state-overdue`.
4. **"+N more" link destination** — accept the known gap; link to unfiltered tab. The "more" affordance communicates that additional items exist even without the filter; removing it would hide that signal.
5. **Mobile `< sm`** — acceptable degradation per Doc 00 (staff surface desktop-first). Primary column and sidebar stack; tables scroll horizontally within cards. No bespoke mobile polish in P3.
6. **Transfer ref second-line text** — `"<fromOutlet> → <toOutlet>"` derived by walking `stockMovements` to find the paired movement with the same `refId`. If pair not found (shouldn't happen), show nothing on the second line.
7. **Supplier tel: link** — `<a href="tel:...">` only; no communications-log write in P3. Logging requires a parts-side comms schema that doesn't exist.

## 22. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | P3 phase spec written. Pending spec-reviewer sign-off. |
| 2026-04-17 | **P3 code review.** Opus reviewer returned 3 CONCERN + 14 NIT, 0 BLOCKER. Fixes applied: (#02 a11y keyboard) sidebar row clickables in PartOpenPos + PartLinkedJobCards switched from `onClick` on `<li>` to wrapping content in `<Link>` — native keyboard/focus/middle-click support; (#03 a11y semantic) breadcrumb now uses `<ol>`/`<li>` structure inside `<nav aria-label="Breadcrumb">` with `aria-current="page"` on the terminal item; (#04 consistency) Stock Distribution missing-outlet qty fallback changed from string `'0'` to number `0`. #01 (h1 = part code vs part name) deferred — current impl matches scenario S1 wording literally; flagged for later user decision. NITs accepted as-is (duplicate jobStatusToChip helper, `-mx-4 px-4` row hover trick, `stopPropagation` belt-and-suspenders) — all documented. |
| 2026-04-17 | **Spec review + design-agent integration.** Spec reviewer found 1 BLOCKER + 7 CONCERN + 7 NIT; design agent returned wireframes with 7 open questions. All resolved in-spec: (BLOCKER #01) fixture amendment added — 3 service partsLines renamed to catalog codes (POR-OIL-FLTR-9A2 × 2, MB-OIL-FLTR-M274) so Linked JCs has data; amendment documented at top of spec. (#02/S9) refined to walk the `refId` cycle rather than hard-coding `jc-001`. (#03/S11) pivoted to `MB-TURBO-OM654` as a no-movement real catalog part. (#04) "+1 alternate supplier" / "+N alternate suppliers" pluralization rule in §12. (#05) 70/30 grid breakpoint bumped from `lg:` (1024) to `xl:` (1280) to avoid squishing the 6-col Movement History table; documented divergence from service jobcard-detail. (#06) CUSTOMER_MAP now has data post-amendment — not dead code. (#07) ADJUST/TRANSFER `title` attr replaced by an inline second-line render for screen-reader parity. (#08) Stat grid breakpoints explicit: `grid-cols-2 md:grid-cols-2 lg:grid-cols-4`. (#09) Sort orders specified: POs `createdAt desc`, Linked JCs `receivedAt desc`. Plus the §14 "+N more" link-destination normalized (Linked JCs → `/service?tab=jobcards`). Design open questions resolved in §21a (stock-ok tie-break, neutral category chip, criticality chip variant, transfer-ref rendering, tel: link no-op, mobile acceptance, "+N more" accepted gap). Status: approved. Ready for implementation. |
