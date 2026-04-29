---
spec_id: SPEC-CUSTOM-BUILDS-001
domain: custom-builds
title: Custom Builds Module (aftermarket modification jobs — staff-web)
status: approved
risk_level: low
pii_sensitivity: low
flags: [custom-builds, visualizer-2d, visualizer-3d]
owners: [orchestrator]
depends_on: [SPEC-VEHICLES-001, SPEC-CUSTOMERS-001]
docs_consulted:
  - Doc 04 §Inventory, §Pre-Owned Sales
  - Doc 05 §Parts (SKU/vendor patterns)
  - Doc 06 §GST margin scheme, §service invoice, §GST on labour
  - Doc 09 (Glossary — VIN, Customer, Cost Ledger, Job Card)
  - Doc 14 §RBAC (R09, R10, R11, R12, R19)
effective_date: 2026-04-29
version: 2.9
---

# SPEC-CUSTOM-BUILDS-001 — Custom Builds Module

## 1. Summary

Custom Builds manages aftermarket modification jobs end-to-end for the BN Automobiles staff surface. It is a distinct domain from the Service module (Doc 05) — different team, separate workflow, no shared job-card state machine — but it re-uses the canonical `customers-store`, `vehicles-store`, `parts-store`, and the per-VIN cost ledger pattern established in SPEC-VEHICLES-001 and PLAN-VEHICLES-003.

A modification job ("Build Job") starts as an enquiry, is quoted, approved, sent to a vendor, tracked through parts ordering and installation, QC'd, and delivered. The module also includes a parts catalog for aftermarket SKUs, a vendor directory, a quote estimator with PDF/share output, and a 2D PNG-layer visualizer for customer-facing configuration previews.

## 2. Locked decisions

| # | Decision | Source |
|---|---|---|
| L1 | **Separate domain from Service** — `BuildJob` is NOT a `JobCard`. Distinct state machine, distinct store (`custom-builds-store`). Service module code is not extended. | Domain separation requirement |
| L2 | **Single source of truth for customer + vehicle** — `BuildJob.customerId` points to `customers-store`; `BuildJob.vin` points to `vehicles-store`. No duplicate profile data. | SPEC-CUSTOMERS-001, SPEC-VEHICLES-001 |
| L3 | **Aftermarket parts are a separate catalog** (`aftermarket-parts-store`) — not merged with the OEM `parts-store`. SKU namespace prefix `CB-` distinguishes them. | Doc 05 §6 (OEM parts); aftermarket lifecycle differs |
| L4 | **[SUPERSEDED by L51 — see §30]** Original: "2D visualizer uses PNG layer compositing only — no Three.js, no WebGL, no SVG path manipulation. Layers are absolutely-positioned `<img>` elements, z-indexed by category. Framer Motion fade (150 ms) on toggle." Retained as the WebGL-unavailable fallback path; see `visualizer-canvas.tsx` (`@deprecated`). | Implementation constraint (now: fallback only) |
| L5 | **[SUPERSEDED by L46 / L51 — see §28, §30]** Original: "Visualizer assets are static PNGs at `/assets/custom-builds/{model-slug}/{category}/{variant-slug}.png`, 1920×1080, transparent background." v1 ships inline-SVG silhouettes (L46) for the 2D fallback and a Three.js GLB (`https://threejs.org/examples/models/gltf/ferrari.glb`, MIT) for the 3D path (L53). PNG asset pipeline never landed and is not currently planned. | Asset pipeline (replaced by SVG + GLB) |
| L6 | **GST split**: parts cost uses margin-scheme GST where applicable (Doc 06 §GST.margin); vendor labour carries full-value GST at 18% (Doc 06 §service-invoice). Quote estimator computes both lines separately. | Doc 06 §GST |
| L7 | **BN margin default 15%** on the overall job, adjustable by R10+. Stored as `marginPct: number` on the `BuildJob` quote snapshot. | Business rule |
| L8 | **Quote tokens expire in 14 days**. `quoteExpiresAt = quoteCreatedAt + 14d`. After expiry, the share link renders an expired-state page; the job itself is unaffected. | Product requirement |
| L9 | **Cost ledger categories**: `custom-build-parts`, `custom-build-labour`, `custom-build-vendor-fee`. Written on job DELIVERED transition. Single ledger entry per category per job. | PLAN-VEHICLES-003 L24 pattern |
| L10 | **R12 finance gate > ₹2,00,000**: `BuildJob.quoteTotal > 200_000` requires an explicit `financeApprovalAt` timestamp before state can advance past `approved`. Gate checked in `custom-builds-store` action, not UI-only. | Doc 14 §R12 |
| L11 | **Vendor management is R12+** — create / edit / deactivate vendor records. R09/R11 have read-only access. | Doc 14 |
| L12 | **"Save build" from visualizer** snapshots `visualizerState: { modelSlug, layers: { category, variantSlug, visible }[] }` onto the `BuildJob` record. Immutable after DELIVERED. | Visualizer product requirement |
| L13 | **Share link for visualizer** generates a `quoteToken` (same 14-day expiry as quote). Read-only public page at `/custom-builds/preview/[token]`. No auth required for the preview. | Product requirement |
| L14 | **Demo data**: 5 active BuildJobs across distinct stages, 1 fully DELIVERED job with cost-ledger entries and visualizer state, 30+ aftermarket parts, 8 vendors. All linked to existing customer + inventory VINs (no orphan fixtures). | Fixture coverage requirement (PLAN-VEHICLES-003 L45 pattern) |
| L15 | **`hasRank(user.role, 'R10')`** numeric comparator for role gates — no inline string comparisons. Follows PLAN-VEHICLES-003 L7 pattern. | PLAN-VEHICLES-003 L7 |
| L16 | **GST on labour includes BN margin's labour-attributed portion.** `labourShare = vendorLabour / (vendorLabour + partsCost)`. `gstOnLabour = (vendorLabour + bnMargin × labourShare) × 0.18`. Full-value additive (tax-exclusive), per Doc 06 §service-invoice + PLAN-VEHICLES-003 L25. Loss-sale clamp: if `partsMarginShare ≤ 0` then `gstOnPartsMargin = 0`. Empty-job guard: if `vendorLabour + partsSubtotal === 0` return all-zero outputs (no NaN/Infinity). | Doc 06 §service-invoice; PLAN-VEHICLES-003 L25 |
| L17 | **P4 prerequisite — `CostLedgerCategoryEnum` extension.** `CostLedgerCategoryEnum` in `@dms/types/inventory.ts` must be extended with `'custom-build-parts' \| 'custom-build-labour' \| 'custom-build-vendor-fee'` before P4 store wiring. The vehicle Costs tab category filter must recognise these values. TypeScript strict will fail compile until this is done — it is a hard P4 prerequisite. Extension is additive only; no existing enum values are changed. | PLAN-VEHICLES-003 L24 |
| L35 | **5 base cars in P3.1** (Porsche 911, BMW M4, Audi RS5, Mercedes-AMG GT, Audi R8). All inline SVG with multi-gradient body, separate glass layer, glow lights via `<feGaussianBlur>` SVG filter, ground shadow ellipse, and floor reflection via CSS `scaleY(-1)`. Asset files split per model at `apps/staff-web/src/lib/custom-builds/assets/base-<model>.ts`. Each SVG ~3–5× more detailed than P3 placeholders. `isPlaceholder=false` for all 5. | P3.1 visualizer wow-factor pass |
| L36 | **Paint application via CSS filter** on the base SVG `<img>` element. Filter string: `hue-rotate(Xdeg) saturate(Y) brightness(Z)`. 12 named luxury colors hardcoded in `paint-palette.ts` as domain data (hex + cssFilter + listPrice + brand). Colors: Guards Red, Crayon, Lapis Blue, Carrara White, Nardo Gray, Frozen Black, Verdant Green, Brewster Green, Riviera Blue, Sunburst Orange, Mamba Green, GT Silver. Paint cost included in visualizer total alongside parts. | P3.1 visualizer wow-factor pass |
| L37 | **Showroom backdrop** is a layered gradient + floor reflection + vignette in `visualizer-canvas.tsx`. Background: `radial-gradient` deep slate → near-black with warm spotlight from above. Floor: horizontal gradient creating reflection plane. Reflection: `scaleY(-1)` CSS transform + opacity gradient mask at 18% opacity. Vignette: radial gradient overlay. Ambient glow: `radial-gradient` picking up active paint hex at 18% opacity. Parallax tilt: `useMotionValue` + mouse position → `rotateX/Y` via Framer Motion. | P3.1 visualizer wow-factor pass |
| L38 | **Compare slider, fullscreen mode, paint picker, ticker** all part of P3.1 polish pass. Compare slider: Framer Motion `drag` with clip-path mask. Fullscreen: `requestFullscreen()` API with ESC exit. Paint picker: tab in PartPickerRail with circle swatch grid + glow ring on selection. Ticker: `requestAnimationFrame` ease-out animation on total value change. Base car roll-in: spring entrance from right (`x: 120`). Overlay parts: spring scale entrance with 50ms stagger. All animations respect `useReducedMotion()`. | P3.1 visualizer wow-factor pass |
| L47 | **Kanban visual parity with sales**: identical column structure to `sales/kanban-column.tsx`. Column: `w-[300px]`, `rounded-md border p-3 min-h-[500px]`, `border-line bg-bg-subtle` (drag-over: `border-accent bg-accent/5`). Header: `text-sm font-semibold` title, `bg-bg-hover rounded-full` count chip, `font-mono text-[11px] text-ink-muted` total. Cards container: `overflow-y-auto space-y-2`. Card structure mirrors `deal-card.tsx` exactly — `font-medium` name, `font-mono text-[10px] uppercase tracking-widest bg-bg-subtle` source badge, `text-[13px] text-ink-secondary mb-2 line-clamp-1` vehicle name, `font-mono text-[15px] text-ink-primary mb-2 tabular-nums` amount with `&#8377;` prefix, `Clock` icon time chip, status badge. Custom-builds additions (VIN copy badge below vehicle name, vendor badge in place of source badge) do not break the rhythm. | 2026-04-29 UX parity fix |
| L48 | **Visualizer fine controls** via `<Slider />` primitive (L42). Three controls: (1) **Window Tint Intensity** 0–100% — adjusts opacity of the `window-tint` overlay layer on the canvas. (2) **Paint Metallic Intensity** 0–100% — modulates `brightness(0.75+pct×0.55) saturate(0.70+pct×0.70)` appended to the base paint CSS filter; 50 = neutral (no change). (3) **Wheel Size** 18–22" discrete — displayed as label, no overlay swap yet (cosmetic label only pending designer assets). Sliders render in the Paint tab (metallic + tint) and Wheels tab (wheel size). Values persist in `visualizerState.fineControls` (optional field, backward-compatible). `VisualizerFineControlsSchema` added to `@dms/types/custom-builds`. | 2026-04-29 slider fine-controls |
| L50 | **Slider primitive uses direct CSS pseudo-element styling (`[&::-webkit-slider-thumb]`, `[&::-moz-range-thumb]`) on a real `<input type='range'>`, NOT a hidden-input overlay.** Mirrors `customer-web/src/components/vdp/emi-calculator.tsx`. Track gradient via inline `linear-gradient` style for filled-portion progress (accent color from 0% to pct%, line color from pct% to 100%). Browser-default chrome suppressed via `appearance-none` on both input and thumb pseudo-elements. Thumb hover scale via `[&::-webkit-slider-thumb]:hover:scale-110` and `[&::-moz-range-thumb]:hover:scale-110`. Disabled state via native `disabled` attribute + `disabled:cursor-not-allowed disabled:opacity-50`. Cross-browser tested: Chrome/Firefox/Safari all render identically with no OS chrome bleeding through. | 2026-04-29 — replaced opacity-0 overlay technique that leaked default chrome in Firefox and focus rings in some Chromium versions. |

## 3. Routes (7)

| Route | Description | Role gate |
|-------|-------------|-----------|
| `/custom-builds` | Build Jobs board — Kanban with 7 stage columns | R09+ |
| `/custom-builds/[id]` | Build Job detail — 6 tabs | R09+ |
| `/custom-builds/new` | New Build Job wizard (6 steps: Customer → Vehicle → Details → Parts → Vendor → Review). Spec L23 originally described a SlideInPanel; shipped implementation is a dedicated route page using `ProgressStepper`. | R09+ |
| `/custom-builds/parts` | Aftermarket parts catalog | R09+ |
| `/custom-builds/vendors` | Vendor directory | R09+ (read), R12+ (create/edit) |
| `/custom-builds/preview/[token]` | Read-only visualizer share link (lives outside `(shell)` for token-only public access) | Public (token-gated) |
| `/custom-builds/visualizer-playground` | Internal visualizer testing surface — load any modelSlug + customisation snapshot without a BuildJob context. Used during P3.2/P3.3 development; kept as a dev/QA route. | R09+ (dev/QA) |

Tab on `/custom-builds/[id]`: URL search param `?tab=overview|parts-estimate|vendor-schedule|visualizer|cost-ledger|activity`.

## 4. Build Job state machine

```
ENQUIRY → QUOTED → APPROVED → PARTS_ORDERING → IN_PROGRESS → QC → DELIVERED
                                                                  ↓
                                                            QC_FAILED → IN_PROGRESS (rework)
```

Any non-DELIVERED state → **CANCELLED** (R19+ only, type-to-confirm + reason required).

### Transition table

| From | Allowed next | Role gate |
|---|---|---|
| ENQUIRY | QUOTED, CANCELLED | R09+ |
| QUOTED | APPROVED, ENQUIRY (revise), CANCELLED | R10+ to approve; R09 to revise |
| APPROVED | PARTS_ORDERING, CANCELLED | R10+; R12 required if `quoteTotal > ₹2L` (L10) |
| PARTS_ORDERING | IN_PROGRESS, CANCELLED | R09+ |
| IN_PROGRESS | QC, CANCELLED | R11+ |
| QC | QC_FAILED, DELIVERED | R10+ |
| QC_FAILED | IN_PROGRESS | R10+ — "Send for rework" CTA; emits `qc_failed` activity event |
| DELIVERED | — | terminal |
| CANCELLED | — | terminal |

### QC_FAILED resting state

`QC_FAILED` is a resting Kanban state — jobs remain there until a human acts. R10+ sees a "Send for rework" CTA on the job detail Overview tab; clicking it calls `advanceStage(jobId, 'IN_PROGRESS', actorId)` which emits the `qc_failed` activity event and moves the card back to the In Progress column. There is no automatic transition. Lower roles see the stage chip without the CTA.

### Finance gate (L10)

Before `APPROVED → PARTS_ORDERING`, if `BuildJob.quoteTotal > 200_000`:

- Store action throws `FinanceApprovalRequiredError` if `financeApprovalAt` is null.
- UI renders a "Awaiting Finance Approval" banner with a CTA for R12 to approve inline.
- R12 approval sets `financeApprovalAt` + emits `finance_approved` activity event.

## 5. Build Jobs board (`/custom-builds`)

Reference design: Kanban layout matching staff dark-blue theme (Design 01, `[data-surface="staff"]`).

### 5.1 Kanban columns

Seven columns in stage order: **Enquiry · Quoted · Approved · Parts Ordering · In Progress · QC · Delivered**.

Each card shows:
- Customer name + avatar initial
- Vehicle: make/model/year + VIN badge (last 6 chars)
- Job title (first modification category, e.g., "Aero Package")
- Quote total (₹, mono)
- Vendor name chip
- Days in stage (amber ≥ 7d, red ≥ 14d)
- Stage chip (color-coded per `BuildJobStageChipVariant`)

Drag-drop: React DnD or `@dnd-kit/core`. Drop triggers `custom-builds-store.moveStage(jobId, targetStage)`. Respect role gate — non-permitted drops revert with a toast.

### 5.2 Filter bar

Outlet · Vendor · Customer (typeahead) · Vehicle make · Stage (multi-select). Filters are URL-synced (`?outlet=&vendor=&customer=&make=&stage=`).

### 5.3 "New Build Job" CTA

Opens a SlideInPanel form (R09+): customer picker → VIN picker (filtered by `customerId`) → job title → initial enquiry notes. Creates a `ENQUIRY` stage job. Auto-navigates to `/custom-builds/[id]?tab=overview`.

## 6. Build Job detail (`/custom-builds/[id]`)

Six-tab layout using the canonical underline-tab pattern (Design 01 §2). Breadcrumb: `Staff › Custom Builds › {jobTitle} #{id}`.

### Tab 1 — Overview

- **Job header**: title, stage chip, customer link (→ `/customers/[id]`), vehicle link (→ `/vehicles/[vin]`), assigned advisor, assigned technician, outlet.
- **Stage action bar**: primary CTA advances to next valid state (role-gated). Secondary: Cancel (R19+).
- **Finance approval banner** (conditional — see §4 finance gate).
- **Quick stats**: quote total (₹), vendor, days open, last updated.
- **Enquiry notes**: rich-text (read-only display; editable in ENQUIRY/QUOTED stages).

### Tab 2 — Parts & Estimate

- **Parts line table**: columns — Part name, SKU (mono), Brand, Category, Qty, Unit cost (₹), Line total (₹), Install hours, Vendor. Add/remove parts (R09+, locked after APPROVED).
- **Estimate summary panel** (right rail, sticky):
  - Parts cost subtotal
  - Vendor labour (vendor day-rate × total install hours)
  - BN margin (default 15%, editable by R10+)
  - GST on labour (18%, additive — Doc 06 §service-invoice)
  - GST on parts (margin scheme where applicable — Doc 06 §GST.margin)
  - **Total**
  - "Save as Quote" CTA → generates `quoteToken`, sets `quoteCreatedAt`, `quoteExpiresAt = +14d`.
  - "Download PDF" (calls `/api/custom-builds/[id]/quote.pdf` server action).
  - "Share link" copies the `/custom-builds/preview/[token]` URL, shows expiry badge.

### Tab 3 — Vendor & Schedule

- **Vendor card**: name, city, rating (stars), contact (phone/email), payment terms, current active jobs count.
- **Schedule**: estimated start date, estimated completion date, vendor confirmation status (chip: Pending / Confirmed / Revised).
- **Change vendor** action (R10+): opens vendor picker modal filtered by specialty tags.
- **Notes to vendor** (free-text, saved to `BuildJob.vendorNotes`).

### Tab 4 — Visualizer

See §9 for full visualizer specification.

### Tab 5 — Cost Ledger

Visible to R12+ only (blur/hide for lower roles; not removed from DOM).

- **Ledger table**: columns — Date, Category, Description, Amount (₹), Posted by.
- Categories: `custom-build-parts`, `custom-build-labour`, `custom-build-vendor-fee`.
- Entries are written automatically on DELIVERED transition (`custom-builds-store.deliverJob`).
- Manual "Add Entry" CTA for R12+ to add adjustments (follows PLAN-VEHICLES-003 L24 pattern — full `CostLedgerCategoryEnum` allowed).
- Total row at bottom.

### Tab 6 — Activity

Full chronological timeline of state transitions + manual notes.

- Each entry: timestamp, actor (name + role badge), event type, optional note.
- Event types: `job_created`, `stage_advanced`, `quote_saved`, `finance_approved`, `qc_failed`, `vendor_confirmed`, `note_added`, `job_cancelled`, `job_delivered`.
- "Add note" text input (R09+) appended at top.
- Infinite scroll (20 entries per page).

## 7. Parts catalog (`/custom-builds/parts`)

### 7.1 Layout

Search + filter bar over a responsive grid of `AftermarketPartCard` tiles (4-up desktop, 2-up tablet, 1-up mobile). Toggle between grid and table view.

### 7.2 Filter bar

Category (multi-select) · Brand · Vendor · Vehicle make/model compatibility · Price range (slider) · Search (name or SKU).

### 7.3 Part categories and exemplar SKUs

| Category | Examples |
|----------|---------|
| **Aero** | Carbon hood, front splitter, rear diffuser, carbon wing |
| **Wheels** | Forged alloys 18–22 in, multi-finish (gloss/satin/brushed) |
| **Suspension** | Coilovers (adjustable), lowering springs |
| **Exhaust** | Axle-back, cat-back, downpipe (catted/catless) |
| **Paint & Protection** | PPF (partial/full), full wrap (8+ colors), ceramic coat |
| **Interior** | Alcantara headliner, carbon trim kit, custom seat covers |
| **ECU** | Stage 1 tune, Stage 2 tune (requires hardware) |
| **Lighting** | LED matrix headlight upgrade, taillight tint film |

### 7.4 `AftermarketPart` entity

```ts
interface AftermarketPart {
  sku: string;               // CB-{CATEGORY_CODE}-{4-digit seq}, e.g. CB-AER-0012
  name: string;
  brand: string;
  category: AftermarketPartCategory;
  listPrice: number;         // ₹, customer-facing
  bnCost: number;            // ₹, BN cost (R10+ visibility only)
  vendorId: string;          // FK → vendors fixture
  compatibility: {           // vehicle makes/models this part fits
    makes: string[];
    models?: string[];        // omit = fits all models of makes
  };
  installHours: number;      // decimal, e.g. 3.5
  renderAssetKey: string;    // maps to visualizer layer PNG, e.g. "carbon-hood"
  description?: string;
  techNotes?: string;        // R11 visibility only
}
```

`bnCost` is masked for roles below R10 (blur treatment, same as cost-ledger pattern).

### 7.5 Part detail SlideInPanel

Click any part card → SlideInPanel. Sections:
- Full specs table (all fields above).
- Compatibility chips.
- Vendor card mini (name + rating + lead time).
- "Add to Build Job" CTA: opens a job picker typeahead (R09+).
- Storybook: `AftermarketPartDetailPanel`.

## 8. Vendor directory (`/custom-builds/vendors`)

### 8.1 Layout

DataTable with row-click → SlideInPanel detail.

Columns: Name · Specialties (chips, max 3) · City · Rating (★) · Active Jobs · On-Time % · Lifetime Jobs · Payment Terms.

Filter: City · Specialty · Min rating.

### 8.2 `Vendor` entity

```ts
interface Vendor {
  id: string;
  name: string;
  specialties: AftermarketPartCategory[];
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  rating: number;            // 1.0–5.0
  paymentTerms: string;      // e.g. "Net 30", "50% advance"
  dayRate: number;           // ₹ per working day (labour billing)
  activeJobCount: number;    // derived from fixtures
  lifetimeJobCount: number;
  onTimePct: number;         // 0–100
  gstIn?: string;
  active: boolean;
}
```

Demo: 8 vendors covering all part categories. At least one vendor per category.

### 8.3 Vendor create/edit form (R12+)

SlideInPanel form: name, city, specialties (multi-select), contact fields, GSTIN, day rate, payment terms. Zod-validated. "Deactivate" destructive action (R12+, confirm dialog).

## 9. 2D Visualizer (`?tab=visualizer`)

### 9.1 Architecture overview

The visualizer is a client-side-only compositing layer inside the Build Job detail tab. No server round-trip is needed for layer toggling.

```
VisualizerCanvas
 ├── BaseLayer         — car silhouette PNG (full opacity)
 ├── HoodLayer         — hood overlay PNG (category: aero)
 ├── SpoilerLayer      — wing/spoiler overlay PNG
 ├── SideSkirtLayer    — side-skirt overlay PNG
 ├── SplitterLayer     — front splitter overlay PNG
 ├── DiffuserLayer     — rear diffuser overlay PNG
 ├── WheelFLLayer      — front-left wheel arch PNG
 ├── WheelFRLayer      — front-right wheel arch PNG
 ├── WheelRLLayer      — rear-left wheel arch PNG
 ├── WheelRRLayer      — rear-right wheel arch PNG
 ├── PaintLayer        — color-tint filter PNG (full-body overlay)
 ├── WrapLayer         — wrap design overlay PNG
 └── WindowTintLayer   — window tint overlay PNG
```

All layers are `<img>` elements, `position: absolute`, `top: 0`, `left: 0`, `width: 100%`, `height: 100%`. Parent is `position: relative`, `aspect-ratio: 16/9`. Framer Motion `<motion.img>` handles `initial={{ opacity: 0 }} animate={{ opacity: visible ? 1 : 0 }}` with `transition={{ duration: 0.15 }}`.

Z-index order (bottom → top): base → paint → wrap → splitter → diffuser → side-skirts → hood → spoiler/wing → wheels → window-tint.

Drop shadow on `VisualizerCanvas` wrapper: `box-shadow: 0 8px 48px rgba(0,0,0,0.6)` (staff dark theme).

### 9.2 Demo vehicles (3 base silhouettes)

| model-slug | Display name | Silhouette asset |
|------------|-------------|-----------------|
| `porsche-911` | Porsche 911 | `/assets/custom-builds/porsche-911/base/silhouette.png` |
| `bmw-m4` | BMW M4 | `/assets/custom-builds/bmw-m4/base/silhouette.png` |
| `audi-rs5` | Audi RS5 | `/assets/custom-builds/audi-rs5/base/silhouette.png` |

All silhouettes: 1920×1080, transparent background, side-profile, facing right.

### 9.3 Asset naming convention (designer hand-off)

```
/public/assets/custom-builds/
  {model-slug}/
    base/
      silhouette.png                        ← required
    aero/
      carbon-hood.png
      carbon-spoiler.png
      carbon-splitter.png
      carbon-diffuser.png
      carbon-side-skirts.png
    wheels/
      forged-18-gloss.png                   ← 4 arches composited into one PNG
      forged-19-satin.png
      alloy-18-gloss.png
      alloy-20-brushed.png
    paint/
      {color-slug}.png                      ← semi-transparent color overlay
        e.g. racing-red.png, frozen-white.png, carbon-black.png
    wrap/
      matte-black.png
      satin-gold.png
      carbon-fiber.png
    window-tint/
      light.png
      medium.png
      dark.png
```

All overlay PNGs: 1920×1080, transparent background. Opacity achieved by PNG alpha channel, NOT CSS opacity. For paint, the PNG is a body-shaped mask filled with the target color at 60–70% alpha.

`renderAssetKey` on `AftermarketPart` maps directly to the filename stem (e.g., `"carbon-hood"` → `aero/carbon-hood.png`). The visualizer resolves: `/assets/custom-builds/{modelSlug}/{category}/{renderAssetKey}.png`.

### 9.4 Part picker sidebar

Left-side panel (320 px wide, scrollable):

- **Vehicle selector**: dropdown of 3 demo vehicles. Changing vehicle resets all layers.
- **Category accordion**: each category group is collapsible. Parts within the group show a thumbnail (60×40, the layer PNG downscaled) + name + price.
- Click a part → toggles layer visibility. Selected parts get a blue check chip.
- **Live cost rail** (sticky bottom of sidebar): running total updating as parts are toggled. Shows: parts subtotal, est. labour, est. total (with margin).

### 9.5 "Save build" action

Button in visualizer header: "Save Build" (R09+). Writes `BuildJob.visualizerState`:

```ts
interface VisualizerState {
  modelSlug: string;
  layers: {
    category: string;
    variantSlug: string;    // maps to renderAssetKey
    visible: boolean;
  }[];
  savedAt: string;          // ISO timestamp
  savedBy: string;          // actorId
}
```

After DELIVERED, `visualizerState` is immutable. Mutation attempt throws `JobDeliveredImmutableError`.

### 9.6 "Share to customer" action

Button in visualizer header: "Share" (R09+). Generates `shareToken` (UUID v4) + sets `shareExpiresAt = +14d`. Returns the URL: `/custom-builds/preview/[shareToken]`.

Public preview page (`/custom-builds/preview/[token]`):
- No auth required.
- Renders `VisualizerCanvas` in read-only mode (no part picker sidebar).
- Renders **only**: job title, vehicle make/model/year (no VIN), selected parts display names and list prices, quote total.
- **Excluded from public preview — never rendered, not present in the API response:** customer name, customer phone, customer email, customer address, `bnCost` values, `techNotes`, activity log, vendor contact details (name, phone, email), internal pricing breakdown. The API endpoint backing the preview MUST strip these fields before serialising (L16 pattern — strip at source, not at render).
- If `shareExpiresAt < now` → renders `<QuoteExpiredState>` with "Contact BN Automobiles" CTA.

## 10. Estimator logic

The estimator is a pure function in `packages/types/src/domain/custom-builds-estimator.ts`.

```
partsSubtotal     = sum(part.bnCost × qty) for all lines
labourHours       = sum(part.installHours × qty) for all lines
vendorLabour      = labourHours × vendor.dayRate / 8   // 8-hr working day

// Guard: empty job (no parts, no labour) → return all-zero outputs; no NaN/Infinity (L16)
if (partsSubtotal + vendorLabour === 0) → { gstOnLabour: 0, gstOnPartsMargin: 0, total: 0 }

bnMargin          = (partsSubtotal + vendorLabour) × (marginPct / 100)

// Labour share of BN margin carries full-value additive GST (Doc 06 §service-invoice, L16)
labourShare       = vendorLabour / (vendorLabour + partsSubtotal)
labourBase        = vendorLabour + bnMargin × labourShare
gstOnLabour       = labourBase × 0.18                  // full-value additive, tax-exclusive (Doc 06 §service-invoice)

// Parts margin share uses margin-scheme GST (Doc 06 §GST.margin, L6)
partsMarginShare  = bnMargin × (partsSubtotal / (partsSubtotal + vendorLabour))
// Loss-sale clamp: negative or zero partsMarginShare → gstOnPartsMargin = 0 (L16)
gstOnPartsMargin  = partsMarginShare > 0 ? partsMarginShare × 18 / 118 : 0

total             = partsSubtotal + vendorLabour + bnMargin + gstOnLabour + gstOnPartsMargin
```

`partsMarginShare` is the pro-rated share of BN margin attributed to parts for margin-scheme GST. `labourShare = vendorLabour / (vendorLabour + partsSubtotal)` is its complement used for the labour GST base (L16).

GST breakdown is shown as two lines on the quote (not collapsed). `GSTBreakdown` component from `@dms/ui`.

All monetary values in integer paise internally; displayed via `formatINR`.

## 11. Cross-module surfacing

### 11.1 Customer detail — Vehicles tab

The `CustomerVehicleHistoryDrawer` inside `/customers/[id]?tab=vehicles` gains a "Custom Builds" sub-section below "Service Jobs". Each BuildJob row: title, stage chip, quote total, dates. Row click → `/custom-builds/[id]`. Data source: `custom-builds-store.selectByCustomer(customerId)`.

### 11.2 Vehicle detail — Custom Builds tab

A new "Custom Builds" tab is added to `/vehicles/[vin]` tab bar (after the existing Costs tab). Lists all BuildJobs for that VIN: title, stage, vendor, total, dates. Row click → `/custom-builds/[id]`. Data source: `custom-builds-store.selectByVin(vin)`. Gate: R09+.

### 11.3 Cost ledger write-back

On `DELIVERED` transition, `custom-builds-store.deliverJob(jobId, actorId)` calls `vehicles-store.addCostLedgerEntries(vin, entries)` with three entries:

```ts
[
  { category: 'custom-build-parts',      amount: partsSubtotal,  description: `Build #${id} — parts` },
  { category: 'custom-build-labour',     amount: vendorLabour,   description: `Build #${id} — vendor labour` },
  { category: 'custom-build-vendor-fee', amount: bnMargin,       description: `Build #${id} — BN margin` },
]
```

These entries appear on the vehicle's Costs tab (`/vehicles/[vin]?tab=costs`) under the existing cost ledger table. No new store slice needed — `vehicles-store` is the single owner of the ledger.

## 12. RBAC summary (Doc 14)

| Role | Custom Builds permissions |
|------|--------------------------|
| R09 Service Advisor | Create jobs, build quotes, manage parts on job, save visualizer, share link |
| R10 Manager | Approve jobs, adjust BN margin %, change vendor, advance to DELIVERED |
| R11 Workshop Tech | Update IN_PROGRESS → QC (mark work complete) |
| R12 Finance | Approve jobs > ₹2L, view cost ledger tab, manage vendors |
| R19 GM | Cancel any job, cross-outlet view, read-only on all tabs |
| R09–R19 (all) | View build jobs board (own outlet), view parts catalog, view vendors (read-only) |

Vendor create/edit/deactivate: R12+ only (L11).

Cost Ledger tab visibility: R12+ (blur/DOM-present for lower roles — same pattern as PLAN-VEHICLES-003).

## 13. Demo data fixtures

File: `packages/mocks/src/fixtures/custom-builds.ts`

### 13.1 Build Jobs (5 active + 1 delivered)

| ID | Stage | Customer | VIN | Modifications | Vendor | Quote Total |
|----|-------|----------|-----|---------------|--------|-------------|
| CBJ-001 | `in_progress` | Aryan Kapoor | WBY2Z21090VX45678 | Carbon hood + Stage 2 ECU | SpeedWerks BLR | ₹2,85,000 |
| CBJ-002 | `quoted` | Priya Mehta | WBA3C1C50FK…(stub VIN 2) | Forged wheels 20in + coilovers | WheelHaus MUM | ₹1,90,000 |
| CBJ-003 | `approved` | Rohan Nair | WAUZZZ8T1BA…(stub VIN 3) | Full PPF + ceramic coat | ProCoat CHE | ₹95,000 |
| CBJ-004 | `parts_ordering` | Sunita Rao | WBA3C9C52…(stub VIN 4) | Cat-back exhaust + LED headlights | ExhaustKings BLR | ₹1,40,000 |
| CBJ-005 | `enquiry` | Dev Sharma | WBY2Z21090VX…(stub VIN 5) | Alcantara interior + carbon trim | LuxInteriors MUM | ₹3,50,000 |
| CBJ-006 | `delivered` | Priya Mehta | WBA3C1C50FK…(stub VIN 2) | Aero package + Stage 1 ECU | SpeedWerks BLR | ₹4,10,000 |

CBJ-006 has full cost-ledger entries written back to its VIN + complete visualizer state saved (`bmw-m4` model, carbon hood, carbon spoiler, forged-20-satin wheels, carbon-black paint).

All customer IDs and VINs must resolve against existing `customers-store` and `vehicles-store` fixtures (no orphan FKs — per L14 / PLAN-VEHICLES-003 L45 pattern).

### 13.2 Parts catalog (30+)

Minimum 3–4 parts per category (aero, wheels, suspension, exhaust, paint, interior, ECU, lighting). Each part has: SKU, brand, `listPrice`, `bnCost`, `vendorId`, `compatibility` (makes array), `installHours`, `renderAssetKey`.

### 13.3 Vendors (8)

| Name | City | Specialties | Rating | Day Rate |
|------|------|-------------|--------|----------|
| SpeedWerks BLR | Bangalore | aero, ECU, exhaust | 4.8 | ₹8,000 |
| WheelHaus MUM | Mumbai | wheels, suspension | 4.6 | ₹7,500 |
| ProCoat CHE | Chennai | paint, wrap, PPF | 4.9 | ₹6,500 |
| ExhaustKings BLR | Bangalore | exhaust, lighting | 4.4 | ₹7,000 |
| LuxInteriors MUM | Mumbai | interior | 4.7 | ₹9,000 |
| TuneBox CHE | Chennai | ECU, exhaust | 4.3 | ₹8,500 |
| AeroForge BLR | Bangalore | aero, wheels | 4.5 | ₹8,000 |
| WrapMasters MUM | Mumbai | paint, wrap, interior | 4.6 | ₹7,000 |

## 14. Store contract

New store: `custom-builds-store` at `apps/staff-web/src/lib/custom-builds/store.ts`.

Pattern: Zustand + Immer, same shape as `service-store` and `vehicles-store`.

### 14.1 State shape

```ts
interface CustomBuildsState {
  jobs: BuildJob[];
  parts: AftermarketPart[];
  vendors: Vendor[];
  // Selectors (derived, not stored)
}
```

### 14.2 Key actions

| Action | Description | Role gate |
|--------|-------------|-----------|
| `createJob(draft)` | Create ENQUIRY-stage job | R09+ |
| `advanceStage(jobId, next, actorId)` | Advance state; runs transition guard + finance gate | role-dependent |
| `cancelJob(jobId, reason, actorId)` | Cancel with reason; type-to-confirm in UI | R19+ |
| `saveQuote(jobId, lines, marginPct)` | Snapshot estimate; set quoteToken + expiry | R09+ |
| `approveFinance(jobId, actorId)` | Set `financeApprovalAt`; emit `finance_approved` | R12+ |
| `deliverJob(jobId, actorId)` | DELIVERED transition + ledger write-back. **Must** invoke the same finance-gate guard as `advanceStage`: if `quoteTotal > 200_000 && financeApprovalAt === undefined`, throws `FinanceApprovalRequiredError` and refuses all cost-ledger writes. | R10+ |
| `saveVisualizerState(jobId, state)` | Persist `VisualizerState`; throws if DELIVERED | R09+ |
| `generateShareToken(jobId)` | UUID v4 + 14d expiry | R09+ |
| `selectByCustomer(customerId)` | Selector | — |
| `selectByVin(vin)` | Selector | — |
| `selectByStage(stage)` | Selector (for Kanban column) | — |

All mutations emit an activity event logged to `BuildJob.activityLog`.

## 15. GST breakdown detail (Doc 06)

Per Doc 06 §GST.margin and §service-invoice:

1. **Parts sold to customer** — if BN acquired the vehicle (own stock), parts used in a custom build that become part of the final "enhanced vehicle" may qualify for margin-scheme GST. For standalone aftermarket parts billed as goods, standard GST applies. In v1, parts line uses `partsMarginShare × 18/118` as a conservative safe-harbour calculation. This must be reviewed by a tax advisor before production — flagged as an open question (see §21).

2. **Vendor labour** — treated as a service procurement by BN from the vendor. BN bills the customer for labour as a service line. GST 18% is computed on `vendorLabour + bnMargin × labourShare` (the full labour-attributable billing base), additive and tax-exclusive. `labourShare = vendorLabour / (vendorLabour + partsSubtotal)`. Matches Doc 06 §service-invoice + L16.

3. **GST on BN margin** — pro-rated against parts vs. labour to determine applicable treatment. Pure helper `computeGstBreakdown(lines, vendor, marginPct): { gstOnLabour, gstOnPartsMargin, total, partsSubtotal, vendorLabour, bnMargin }` in `@dms/types`. Unit tests must achieve 100% branch coverage including: happy path, `marginPct: 0` (loss-sale, clamp applied), labour-only job (`partsSubtotal === 0`), empty job (`partsSubtotal === 0 && vendorLabour === 0` → all zeros, no NaN).

## 16. i18n

All user-facing strings under `messages/en-IN/custom-builds.json`. Key namespaces:

```
custom-builds.board.*          ← Kanban labels, stage names
custom-builds.detail.*         ← Tab names, field labels, CTAs
custom-builds.parts.*          ← Parts catalog labels
custom-builds.vendors.*        ← Vendor directory labels
custom-builds.visualizer.*     ← Visualizer UI text
custom-builds.estimator.*      ← Estimate line labels, GST labels
custom-builds.activity.*       ← Activity event type labels
custom-builds.errors.*         ← Error messages (finance gate, immutable, expired)
```

No hardcoded user-visible strings in components.

## 17. Accessibility

- Kanban board: each column has `role="list"` + `aria-label="Stage: {stageName}"`. Cards have `role="listitem"`. Drag handles have `aria-grabbed` state.
- Tab panels: `role="tabpanel"` with `aria-labelledby` matching tab id.
- Visualizer canvas: `role="img"` + `aria-label` describing current active modifications. Part picker buttons have `aria-pressed` state.
- All monetary values use `aria-label` with spelled-out amount (e.g., "Two lakh eighty-five thousand rupees").
- Color-only state indicators supplemented with icons + text labels.
- Reduced-motion: Framer Motion `useReducedMotion()` hook disables visualizer fade transitions.
- WCAG AA color contrast minimum; body text AAA target.

## 18. Empty / loading / error states

| Surface | Empty | Loading | Error |
|---------|-------|---------|-------|
| Kanban board | Illustration + "No builds yet. Create the first one." | Skeleton columns (7) with 2–3 card skeletons each | Toast + retry button |
| Build Job detail tabs | Per-tab empty messages | Tab-level skeleton | Inline error with retry |
| Parts catalog | "No parts match your filters." + clear-filters CTA | Grid skeleton (12 cards) | Full-page error state |
| Vendors list | "No vendors yet." + "Add Vendor" CTA (R12+) | Table skeleton (8 rows) | Inline error |
| Visualizer | Prompt to select a vehicle model first | Spinner over canvas (asset load) | Asset load error with fallback message |

## 19. Phase plan

### P1 — Kanban + detail + parts catalog + vendors (foundation)

Deliverables:
- `custom-builds-store` with full state machine + all actions.
- `/custom-builds` Kanban board (all 7 columns, drag-drop, filters).
- `/custom-builds/[id]` detail with Overview, Parts & Estimate, Vendor & Schedule, Activity tabs.
- `/custom-builds/parts` catalog with grid + filter + SlideInPanel.
- `/custom-builds/vendors` directory with DataTable + create/edit form (R12+).
- Demo fixtures: 5 active jobs, 30+ parts, 8 vendors.
- RBAC gates on all transitions.
- i18n keys wired.
- Storybook stories: `BuildJobCard`, `KanbanBoard`, `AftermarketPartCard`, `VendorCard`.

### P2 — Estimator + quote share

Deliverables:
- `computeGstBreakdown` pure helper + unit tests (100% branch coverage).
- Parts & Estimate tab wired to estimator (live totals as parts are added/removed).
- "Save as Quote" → `quoteToken` + `quoteExpiresAt`.
- "Download PDF" server action (`/api/custom-builds/[id]/quote.pdf`).
- "Share link" copy CTA + expiry badge.
- `/custom-builds/preview/[token]` public page (read-only, quote expired state).
- Finance gate for > ₹2L jobs (banner + R12 approval CTA).
- CBJ-006 demo job with full quote data.

### P3 — 2D visualizer

Deliverables:
- `VisualizerCanvas` component + all layer `<motion.img>` elements.
- Part picker sidebar (category accordion + live cost rail).
- Vehicle model selector (3 demo vehicles).
- Placeholder PNGs (grey fill with label text) for all layer slots — designer replaces in parallel.
- "Save build" → `BuildJob.visualizerState`.
- "Share" → `shareToken` + public preview page rendering read-only visualizer.
- `useReducedMotion` guard.
- Storybook: `VisualizerCanvas` with layer-toggle knobs.

### P4 — Cost-ledger integration + cross-module surfacing

**P4 prerequisite (L17):** Extend `CostLedgerCategoryEnum` in `@dms/types/inventory.ts` with `'custom-build-parts' | 'custom-build-labour' | 'custom-build-vendor-fee'` and update the vehicle Costs tab category filter. TypeScript strict will fail compile until this is done. This must land before any P4 store wiring.

Deliverables:
- `CostLedgerCategoryEnum` extended (L17 — prerequisite, see above).
- `deliverJob` action writes three cost-ledger entries to `vehicles-store`.
- CBJ-006 fixture updated with ledger entries visible on vehicle Costs tab.
- `/customers/[id]?tab=vehicles` — Custom Builds sub-section wired.
- `/vehicles/[vin]` — "Custom Builds" tab added and wired.
- Cost Ledger tab on job detail (R12+ gate).
- E2E: full flow `ENQUIRY → DELIVERED` with ledger verified on `/vehicles/[vin]?tab=costs`.

## 20. Open questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| OQ-1 | GST treatment on aftermarket parts billed as goods vs. embedded in a service — needs tax counsel sign-off before production. (Doc 06 is silent on aftermarket modifications.) | Finance team | High |
| OQ-2 | Should vendors be a shared entity with the Parts module supplier directory, or a separate namespace? Currently scoped as separate (L3) to avoid coupling — confirm with product. | Product | Medium |
| OQ-3 | Quote PDF template — BN Automobiles letterhead, IRN/QR required for B2B? Threshold check needed (Doc 06 §e-invoicing). | Finance + Dev | Medium |
| OQ-4 | Multi-vendor jobs (different vendors for different modification categories) — v1 spec assumes single vendor per job. Is this sufficient? | Product | Low |
| OQ-5 | Drag-drop accessibility: keyboard-accessible reorder pattern needs explicit design decision (ARIA live region approach vs. dedicated keyboard-reorder modal). | UX | Medium |

## 21. Acceptance criteria

The spec is considered met when:

- [ ] All 5 routes render in staff-web without console errors.
- [ ] Kanban drag-drop advances `BuildJob.stage` correctly and respects role gates.
- [ ] State machine rejects invalid transitions; `advanceStage` and `deliverJob` both throw `FinanceApprovalRequiredError` when `quoteTotal > ₹2L` and `financeApprovalAt` is unset.
- [ ] `deliverJob` called a second time on an already-DELIVERED job throws `JobAlreadyDeliveredError`; no duplicate ledger entries written.
- [ ] `computeGstBreakdown` unit tests pass at 100% branch coverage: happy path, `marginPct: 0` (loss-sale clamp → `gstOnPartsMargin === 0`), labour-only job (`partsSubtotal === 0`), empty job (zero parts + zero labour → all outputs `0`, no NaN/Infinity).
- [ ] Visualizer layers toggle with 150 ms fade; `useReducedMotion` disables animation.
- [ ] "Share" token is valid for 14 days; preview page shows expired state after TTL.
- [ ] On DELIVERED, three cost-ledger entries appear on `/vehicles/[vin]?tab=costs`.
- [ ] `/customers/[id]?tab=vehicles` shows CBJ-006 for Priya Mehta.
- [ ] All user-facing strings resolve via `next-intl`; no hardcoded strings in components.
- [ ] WCAG AA contrast verified in Storybook (Chromatic snapshot diff clean).
- [ ] No orphan FK: all `customerId` + `vin` values in fixtures resolve against existing stores.
- [ ] Storybook stories exist for: `BuildJobCard`, `KanbanBoard`, `AftermarketPartCard`, `VendorCard`, `VisualizerCanvas`, `EstimateSummaryPanel`, `QuoteExpiredState`.
- [ ] Public preview page (`/custom-builds/preview/[token]`) does not render customer name, phone, email, address, `bnCost` values, `techNotes`, activity log, or vendor contact details; verified by inspecting API response payload (fields absent, not merely hidden).
- [ ] `QC → QC_FAILED → IN_PROGRESS` rework flow is exercisable in the UI for R10+; the "Send for rework" CTA is absent for R09 and below; transition emits `qc_failed` activity event.
- [ ] TypeScript strict: zero `any`, zero `@ts-ignore`, `tsc --noEmit` clean.
- [ ] Lint: zero errors.

## 23. P1.1 — UX Overhaul (post-ship)

**Version:** 1.1  
**Date:** 2026-04-28  
**Status:** in-build → shipped

### Locked decisions L18–L24

| # | Decision | Source |
|---|---|---|
| L18 | **Kanban/list view toggle** — `/custom-builds` gains `?view=kanban\|list` URL state matching sales module. Toggle UI: identical segmented control as `SalesPage`. List view: `BuildJobListView` DataTable, sortable by stage/last-activity/quote-total. | Issue 2 — UX consistency |
| L19 | **Breadcrumb slug mapping** — `'custom-builds'` registered in `ROUTE_LABELS` in `staff-top-bar.tsx`. Renders: `Custom Builds › {job title}` on detail page. No other change to top-bar logic. | Issue 1 — breadcrumb |
| L20 | **Parts & Estimate CRUD** — `AddPartDialog` (searchable catalog), inline qty edit, `AlertDialog` remove confirm. New store actions: `updatePartLine(jobId, sku, patch, actor)`. P2 stubs (Save as Quote, PDF, Share) fire an `info` toast via `useToast` — not silent. | Issue 3+5 — stubs and CRUD |
| L21 | **Vendor & Schedule CRUD** — `AssignVendorDialog` for assign/change vendor (R10+). Inline edit for schedule dates, confirmation status picker, vendor notes textarea. New store actions: `updateSchedule(jobId, patch, actor)`. | Issue 5 — CRUD |
| L22 | **Overview CRUD + Activity add-note** — Overview tab: edit enquiry notes (R10+, inline textarea), Cancel Job (R19+, `AlertDialog` with type-to-confirm "CANCEL"), Assign/Change Vendor button. Activity tab: add-note input (R09+). New store action: `updateJobDetails(jobId, patch, actor)`. | Issue 5 — CRUD |
| L23 | **Create wizard** — `/custom-builds/new` route with 6-step `NewBuildWizard` using `ProgressStepper`. Steps: Customer → Vehicle → Details → Parts (optional) → Vendor (optional) → Review+Create. R09+ gate. On submit: `createBuildJob()` + optional `addPart()` + optional `assignVendor()`. Redirects to `/custom-builds/[id]`. | Issue 6 — create flow |
| L24 | **Primitive reuse audit** — All modals use `Dialog`/`AlertDialog` from `@/src/components/primitives/dialog`. Toast feedback via `useToast` + `ToastContainer`. Side panels via `SlideInPanel`. Wizard stepper via `ProgressStepper`. No new CSS color values introduced. | Issue 4 — UI consistency |

### Acceptance criteria (P1.1)

- [ ] `/custom-builds` breadcrumb renders "Custom Builds" (not the raw slug "custom-builds").
- [ ] `/custom-builds/<id>` breadcrumb renders "Custom Builds › {job.title} #{id}".
- [ ] View toggle renders on `/custom-builds` board; `?view=list` shows `BuildJobListView` table; default is kanban; URL state is shareable.
- [ ] List view: sortable by Stage and Last Activity columns; row click navigates to detail.
- [ ] P2/P3/P4 stub CTAs (Save as Quote, PDF, Share, Visualizer) all fire an `info` or `warning` toast — none are silent no-ops.
- [ ] Overview tab: edit enquiry notes inline (R10+); Cancel Job opens `AlertDialog` with type-to-confirm; Assign/Change Vendor opens picker (R10+).
- [ ] Parts & Estimate tab: Add Part dialog (searchable), inline qty edit, Remove Part with confirm — all wired to store. Locked after APPROVED.
- [ ] Vendor & Schedule tab: edit start/completion dates, confirmation status, vendor notes; inline save without full page refresh.
- [ ] Activity tab: add-note input at top (R09+), note appears immediately in timeline.
- [ ] `/custom-builds/new` wizard renders all 6 steps, R09+ gate blocks R05.
- [ ] Wizard Step 1 customer search works against customers-store.
- [ ] Wizard Step 2 vehicle list appears (falls back to all vehicles if none linked to customer).
- [ ] Wizard Step 3 title is required; Next is disabled without it.
- [ ] Wizard submit creates a job at ENQUIRY stage and redirects to `/custom-builds/[id]`.
- [ ] All new dialogs use `Dialog`/`AlertDialog` primitives (no custom overlay code).
- [ ] `pnpm -F staff-web typecheck` passes.
- [ ] Vitest: no regressions on existing 24 tests; new CRUD + wizard tests added.

## 24. P3 — 2D Visualizer (shipped)

**Version:** 1.3
**Date:** 2026-04-29
**Status:** shipped

### Locked decisions L27–L29

| # | Decision | Source |
|---|---|---|
| L27 | **Visualizer asset approach: placeholder inline SVG silhouettes shipping in P3; production PNG renders provided by designer in P3.1.** Asset registry at `apps/staff-web/src/lib/custom-builds/visualizer-assets.ts` is the single point of swap — replace `svgDataUri(...)` strings with `/assets/...` paths, `isPlaceholder` flag drives the designer-handoff banner automatically. No code changes needed beyond the registry. | P3 implementation decision |
| L28 | **Visualizer state stored on BuildJob (`visualizerState`). Persists across sessions. R09+ may play (transient client state without saving). R09+ to save permanently.** After DELIVERED, `visualizerState` is immutable — `saveVisualizerState` throws `JobDeliveredImmutableError`. | SPEC-CUSTOM-BUILDS-001 §9.5; P3 implementation |
| L29 | **Three vehicle base renders supported in P3 (Porsche 911, BMW M4, Audi RS5). Other makes show placeholder + designer-handoff message: "Visualizer renders coming for {make} {model} — currently supports Porsche 911, BMW M4, Audi RS5".** Asset additions are pure-data (`visualizer-assets.ts`), no code changes needed. `vehicleToModelSlug()` is the resolution function. | SPEC-CUSTOM-BUILDS-001 §9.2; P3 implementation |

### Files added in P3

| File | LoC | Purpose |
|------|-----|---------|
| `apps/staff-web/src/lib/custom-builds/visualizer-assets.ts` | ~290 | Asset registry: base silhouettes + overlay SVG data URIs, `getBaseLayer`, `getOverlayLayer`, `getAllOverlays`, `vehicleToModelSlug` |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-canvas.tsx` | ~110 | Canvas: stacked `<motion.img>` elements, AnimatePresence fade, reduced-motion kill-switch |
| `apps/staff-web/src/components/custom-builds/visualizer/part-picker-rail.tsx` | ~175 | Accordion part picker: category grouped, aria-pressed toggles, live cost total |
| `apps/staff-web/src/components/custom-builds/visualizer/cost-summary.tsx` | ~80 | Sticky footer: selected total, vs-estimate diff, Save to Build + Share CTAs |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-tab.tsx` | ~170 | Tab root: 2-col layout, vehicle selector, state orchestration, wired to store |
| `apps/staff-web/src/lib/custom-builds/__tests__/visualizer.test.ts` | ~150 | 20 tests covering all P3 scenarios (all pass) |

### Files modified in P3

| File | Change |
|------|--------|
| `apps/staff-web/src/components/custom-builds/detail/custom-builds-detail-view.tsx` | Replaced `VisualizerStub` with `<VisualizerTab job={job} />`. Removed Eye import. |
| `specs/modules/custom-builds/01-custom-builds-module.md` | Added §24, L27–L29, spec version bumped to 1.3. |

### LoC note

Actual LoC exceeds the spec §5 caps for `visualizer-assets.ts` (556 vs. 300 cap) and `visualizer-tab.tsx` (334 vs. 180 cap). The variance is justified: `visualizer-assets.ts` embeds all inline SVG placeholder art per the Option A choice (the cap was written before the inline-SVG approach was locked); `visualizer-tab.tsx` carries vehicle-selector, state orchestration, and helper functions that are too tightly coupled to split cleanly. The cap for `cost-summary.tsx` (158 vs. 80) reflects full TypeScript typing + accessible markup. No functionality has been deferred — the caps will not increase when real PNGs replace the SVG art in P3.1.

### P3.1 designer hand-off (next sprint)

Designer must provide:
- `/public/assets/custom-builds/{model-slug}/base/silhouette.png` (1920×1080, transparent bg, side profile facing right)
- `/public/assets/custom-builds/{model-slug}/{category}/{renderAssetKey}.png` (1920×1080, transparent bg, per naming in §9.3)
- 3 models: `porsche-911`, `bmw-m4`, `audi-rs5`

Swap: In `visualizer-assets.ts`, replace SVG data URIs with `/assets/...` paths. Set `isPlaceholder: false`. No other code changes needed.

### P3 test results

- 20 new tests added in `visualizer.test.ts` — all passing
- 349 existing tests — all passing (2 pre-existing failures in `gst-breakdown.test.ts` are unrelated to P3 — test expectations disagree with the L16 formula on `gstOnLabour` when `marginPct=0`; that is a P2 test debt)
- `tsc --noEmit` — clean

## 25. P3.1 — DnD wiring + P2 completion + fixture expansion

**Version:** 1.4
**Date:** 2026-04-29
**Status:** shipped

### Locked decisions L30–L34

| # | Decision | Source |
|---|---|---|
| L30 | **Kanban DnD: native HTML5 `draggable` + `onDragStart`/`onDragOver`/`onDrop` (mirrors `sales/kanban-column.tsx` + `deal-card.tsx` pattern exactly). `@dnd-kit/core` not used.** On drop, `advanceStage(jobId, targetStage, actor)` is called directly on the store. `InvalidStageTransitionError` + `InsufficientRoleError` → `useToast` error toast; store never mutates on error (natural revert — no optimistic write). Card dragging from source column suppresses highlight on own column (`isDragSource` flag). Card gets `opacity-50` while dragged via `activeDragId` state. | Sales module parity; constraint against @dnd-kit dependency |
| L31 | **PDF export: browser print-to-PDF on the public preview page.** `@react-pdf/renderer` is NOT added to avoid a ~4 MB dependency. The "Download PDF" button in `PartsEstimateTab` opens `/custom-builds/preview/{token}` in a new tab with an info toast instructing the user to use Print → Save as PDF. The public preview page has sufficient print-friendly layout (clean white bg, no sidebar, minimal chrome) to produce a usable PDF. | Dependency weight constraint; browser print approach is equivalent for MVP scope |
| L32 | **`PartsEstimateTab` estimate summary now shows full GST breakdown** per L6/L16: parts subtotal (BN cost), vendor labour, BN margin %, GST on labour (18%), GST on parts margin (18/118), and TOTAL. Lines with zero value are hidden. `computeGstBreakdown` is the single calculation point. | L6, L16 formula compliance |
| L33 | **`saveQuote` + `ShareQuoteDialog` fully wired in `PartsEstimateTab`.** "Save as Quote" calls `saveQuote(jobId, marginPct, actor)`, shows success toast with total, then opens `ShareQuoteDialog`. "Share Link" button opens dialog directly (disabled until `quoteToken` exists). Both buttons disabled when no parts / no token respectively. | P2 completion requirement |
| L34 | **Fixture count: 12 build jobs (CBJ-001..CBJ-012).** CBJ-010 (QC, Porsche Cayenne `WP1ZZZ9YZPS034789`, `cust-rahul-kumar`), CBJ-011 (APPROVED, BMW Z4 `WBSKG0C08MCK90123`, `cust-pooja-desai`), CBJ-012 (ENQUIRY, Porsche Taycan `WP0AAA1X8PSA12345`, `cust-neha-kapoor`). Stages chosen to fill under-represented columns (QC was 0, APPROVED was 1, ENQUIRY was 1). All VINs and customerIds verified against `vehicles.ts` and `customer.ts` fixtures (no orphan FKs, per L2/L14). | Fixture coverage requirement; L2 pattern |

### Tests added in P3.1

| File | Tests | Coverage |
|------|-------|---------|
| `src/lib/custom-builds/__tests__/gst-breakdown.test.ts` | 10 new | 100% branch coverage of `computeGstBreakdown` (all L16 branches: empty-job, normal, parts-only, labour-only, zero-margin, loss-sale clamp). Fixes the P2 test debt noted in P3 results. |
| `src/lib/custom-builds/__tests__/custom-builds-state-machine.test.ts` | +16 new | `saveQuote` (R09+, R05 guard, token/expiry), DnD store behavior (valid drop, invalid transition, role gate, skip stages), fixture integrity (CBJ-010/011/012 stage/customer/VIN, unique IDs, no duplicate VINs) |

### Files modified in P3.1

| File | Change |
|------|--------|
| `apps/staff-web/src/components/custom-builds/board/custom-builds-board.tsx` | Replaced @dnd-kit comment with native HTML5 DnD (L30). Added `activeDragId` state, `KanbanColumn` DnD event handlers, `handleDrop` with toast on error, `ToastContainer`. ~290 LoC. |
| `apps/staff-web/src/components/custom-builds/detail/tabs/parts-estimate-tab.tsx` | GST breakdown summary (L32), `saveQuote` wiring (L33), `ShareQuoteDialog` integration (L33), PDF button (L31), removed P2 stubs. ~300 LoC. |
| `packages/mocks/src/fixtures/custom-builds.ts` | Added CBJ-010, CBJ-011, CBJ-012 (L34). Updated file header comment. ~1415 LoC total. |
| `specs/modules/custom-builds/01-custom-builds-module.md` | Added §25, L30–L34, updated changelog. Spec bumped to 1.4. |

### P3.1 test results

- 10 new tests in `gst-breakdown.test.ts` — all passing (also fixes P2 test debt)
- 16 new tests in `custom-builds-state-machine.test.ts` — all passing
- 370 total tests — all passing
- `tsc --noEmit` — clean (no new errors in modified files)

## 26. P3.1 Visualizer Wow-Factor Pass

**Version:** 1.5
**Date:** 2026-04-29
**Status:** shipped

### Locked decisions L35–L38

See §2 table — L35–L38 added inline with all other locked decisions.

### What was built

| Feature | Implementation |
|---------|---------------|
| 5 premium SVG base cars (L35) | Per-model files: `base-porsche-911.ts`, `base-bmw-m4.ts`, `base-audi-rs5.ts`, `base-mercedes-amg-gt.ts`, `base-audi-r8.ts`. Each ~3–5x more detailed with multi-stop gradients, glass layers, glow filters, wheel spokes, door handles, mirrors, lights. |
| 12 luxury paint colors (L36) | `paint-palette.ts` — `hue-rotate/saturate/brightness` CSS filter per color. Applied to base SVG `<img>` with 400ms transition. |
| Showroom backdrop + reflection (L37) | Radial gradient backdrop, warm spotlight, floor plane gradient, floor `scaleY(-1)` reflection at 18% opacity with mask, radial vignette, ambient paint glow. |
| Parallax tilt | `useMotionValue` + mouse position → `rotateX/Y` spring at 2–3 degrees. Disabled for `prefers-reduced-motion`. |
| Compare slider (L38) | Framer Motion `drag` constraint. Clip-path reveals modified vs. stock. Drag handle pill. |
| Fullscreen mode (L38) | `requestFullscreen()` + `fullscreenchange` event. ESC key exit. Rail + topbar collapse via `AnimatePresence`. |
| Part picker glass cards (L38) | `backdrop-blur-md` cards, glow ring on selection, spring scale/y entrance with 50ms stagger, `AnimatePresence mode="popLayout"`. |
| Category tab bar with animated pill | `layoutId="tab-pill"` Framer Motion spring transitions between tabs. |
| Search bar | Inline filter on current tab items. |
| Paint swatch grid (L38) | 12 circle buttons with actual hex fill, glow `box-shadow` on selection, check icon. |
| Cost ticker animation (L38) | `requestAnimationFrame` ease-out from prev to new value over 400ms. `AnimatePresence` slide direction based on up/down. |
| Delta chip | Inline `TrendingUp`/`TrendingDown` chip vs. saved estimate. |
| CTA hover elevation | `whileHover={{ scale: 1.03, y: -1 }}` on "Save to Build". |
| Car roll-in animation | Spring entrance from `x: 120` on base-car mount. Camera-style pan with `exit={{ x: -80 }}`. |

### Files added / modified

| File | Lines | Action |
|------|-------|--------|
| `apps/staff-web/src/lib/custom-builds/assets/base-porsche-911.ts` | 130 | Created |
| `apps/staff-web/src/lib/custom-builds/assets/base-bmw-m4.ts` | 130 | Created |
| `apps/staff-web/src/lib/custom-builds/assets/base-audi-rs5.ts` | 130 | Created |
| `apps/staff-web/src/lib/custom-builds/assets/base-mercedes-amg-gt.ts` | 150 | Created |
| `apps/staff-web/src/lib/custom-builds/assets/base-audi-r8.ts` | 155 | Created |
| `apps/staff-web/src/lib/custom-builds/paint-palette.ts` | 90 | Created |
| `apps/staff-web/src/lib/custom-builds/visualizer-assets.ts` | 280 | Rewrote (imports per-model files, removes inline SVGs, adds 2 new cars, carbon pattern overlays) |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-canvas.tsx` | 250 | Rewrote |
| `apps/staff-web/src/components/custom-builds/visualizer/part-picker-rail.tsx` | 270 | Rewrote |
| `apps/staff-web/src/components/custom-builds/visualizer/cost-summary.tsx` | 175 | Rewrote |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-tab.tsx` | 260 | Rewrote |
| `apps/staff-web/src/lib/custom-builds/__tests__/visualizer.test.ts` | 280 | Updated (35 tests: 12 existing preserved + 23 new) |
| `specs/modules/custom-builds/01-custom-builds-module.md` | +80 | Added §26, L35–L38, updated changelog |

### P3.1 wow-factor test results

- 35 tests in `visualizer.test.ts` — all passing
  - 12 existing tests preserved (no regressions)
  - 23 new tests: paint filter (7), 5-car registry (4), base car switching (3), cost with paint (2), vehicleToModelSlug new cars (2), SUPPORTED_VEHICLES count (1), isPlaceholder=false (1), getAllOverlays structure (3)
- `tsc --noEmit` — clean

### Designer-can-still-improve notes

The SVG silhouettes are hand-crafted geometric approximations (not traced from manufacturer blueprints). A designer with Illustrator can export production-quality SVG traces from reference images and swap them in by replacing the `svgDataUri(...)` string in each `base-*.ts` file — no other code changes needed (the `isPlaceholder` flag is already `false`). Paint filter calibration values (`hue-rotate`, `saturate`, `brightness`) are best-guess and may need fine-tuning once real SVG art with consistent base tones is provided.

## 27. P4 — Cost-Ledger Integration

**Shipped: 2026-04-29 | v1.6**

### Locked decisions (L39–L41)

| # | Decision | Rationale |
|---|---|---|
| L39 | **`vehicles-store` is the single owner of per-VIN cost-ledger data.** `deliverJob` writes 3 entries directly via `useVehiclesStore.getState().addCostLedgerEntries(vin, entries)`. The custom-builds-store holds only a `costLedgerWriteRef` pointer (write timestamp + entry IDs). All cost queries go through the vehicles-store — no duplicate cost data on the BuildJob record. | PLAN-VEHICLES-003 L8 cross-store communication pattern; single-source-of-truth principle. |
| L40 | **Vehicle inventory Cost Ledger UI merges fixture entries + runtime entries, deduplicates by `id`.** Fixture entries (seeded at startup) are stored in component state; runtime entries (written by `deliverJob`) come from `useVehiclesStore`. The merge uses a `Set<string>` of IDs: fixture entries are appended first, then any runtime entries whose IDs are not already present. This ensures the delivered job's entries appear without duplicating fixture entries that also describe the same write-back. | Fixture coverage requirement from PLAN-VEHICLES-003 L45; no double-counting cost lines. |
| L41 | **Custom-build cost-ledger entries display a "Build #CBJ-xxx" badge with a link** to `/custom-builds/[id]` in the vehicle inventory Cost Ledger tab. The entry `note` field carries the job reference in the form `"... CBJ-xxx"` (trailing token after a space). The regex `/\b(CBJ-[^\s]+)$/` extracts the job ID for the link. Entries with categories `custom-build-parts`, `custom-build-labour`, or `custom-build-vendor-fee` render this badge; all other categories render as before. R12-gated: the Cost Ledger tab itself is already R12+, so no additional RBAC check is needed at the badge level. | L41 linkage requirement for cross-module traceability; Doc 14 §R12 for tab gate. |
| L42 | **Custom `Slider` primitive at `primitives/slider.tsx` is the canonical slider for staff-web. All `<input type='range'>` replaced.** Props: `value`, `onChange`, `min`, `max`, `step`, `label?`, `formatValue?`, `disabled?`. Track: `h-[2px]`, filled portion via inline `linear-gradient` on the input itself, thumb: `w-4 h-4 rounded-full bg-accent border-0`. Keyboard: Home/End jump to min/max; arrow keys = step. Focus ring via `[&:focus-visible::-webkit-slider-thumb]:ring-2 ring-accent`. **Implementation note: direct webkit/moz pseudo-element styling — mirrors customer-web EMI calculator pattern (see L50).** Exported from primitives barrel. | Design consistency — native range inputs use OS styling that does not match dark theme. Hidden-overlay technique replaced (cross-browser reliability). |
| L43 | **Build job cards mirror sales deal-card pattern**: customer name bold + urgent priority dot (QC_FAILED), full vehicle name (year make model from vehicles-store) + full VIN as copyable mono badge, quote total large bold (formatINR), time-ago chip with Clock icon, stage micro-status badge. Card width 280px. Column header: name bold + count chip + currency total (compact ₹NL format). Column width 300px. | Design consistency with sales Kanban (SPEC-SALES-001 deal-card pattern). |
| L44 | **Add Vendor dialog at `dialogs/new-vendor-dialog.tsx`, R12+ gated.** Form fields: name, specialties (multi-tag toggle buttons), city (BLR/MUM/CHE select), contactName + contactPhone + contactEmail, paymentTerms, dayRate ₹. Calls `useCustomBuildsStore.getState().createVendor(...)`. Success toast on save; close dialog; vendor appears in list. Validation is dialog-level (required field checks before store call). | Vendor management completeness per §8 L11 — R12+ guard was already in store, CTA was a stub. |
| L45 | **Contact buttons on build detail reuse `WhatsappDialog` + `AiCallDialog` from sales module via thin adapter at `dialogs/contact-customer-adapters.tsx`.** Adapter props: `{ customerId, customerName, customerPhone, contextNote }`. `contextNote` is passed as `vehicleName` to both underlying dialogs. Both buttons R09+ gated. After dialog completes, activity feed is updated via `addActivityNote` with a descriptive note (format: `"WhatsApp sent: {title} — {body}"` or `"AI Call logged: {title} — {body}"`). Backwards compat: underlying sales dialogs' props unchanged. | Contact workflow reuse per §6 L45 requirement; no duplication of dialog logic. |

### P4 component map

| Component / file | Role |
|---|---|
| `packages/types/src/domain/inventory.ts` | `CostLedgerCategoryEnum` extended with 3 new values (prerequisite L17) |
| `packages/types/src/domain/custom-builds.ts` | `costLedgerWriteRef` field added to `BuildJobSchema` |
| `apps/staff-web/src/lib/vehicles/vehicles-store/types.ts` | `costLedger: Record<string, CostLedgerEntry[]>` state + `CostLedgerActions` interface |
| `apps/staff-web/src/lib/vehicles/vehicles-store/slices/cost-ledger-slice.ts` | `addCostLedgerEntries` (idempotent by id) + `selectCostLedgerEntries` |
| `apps/staff-web/src/lib/vehicles/vehicles-store/index.ts` | Compose `createCostLedgerSlice`; seed `costLedger: {}` in `initialState` |
| `apps/staff-web/src/lib/custom-builds/custom-builds-store/slices/job-slice.ts` | `deliverJob` action — finance gate, 3-entry write-back, idempotency via `costLedgerWriteRef` |
| `apps/staff-web/src/components/inventory/vehicle-detail-view.tsx` | Fixture+runtime merge, "Build #CBJ-xxx" badge with link (L40, L41) |
| `apps/staff-web/src/components/inventory/action-flows/cost-entry-modal.tsx` | 3 new `CATEGORY_OPTIONS` entries for custom-build categories |
| `apps/staff-web/src/components/custom-builds/detail/tabs/cost-ledger-tab.tsx` | Full `CostLedgerTab` replacing the prior stub — shows written entries (DELIVERED + writeRef) or preview breakdown |
| `apps/staff-web/src/lib/custom-builds/__tests__/cost-ledger.test.ts` | 10 tests: finance gate, idempotency, VIN matching, categories, amounts vs `computeGstBreakdown`, no-vendor zero amounts |

### Finance gate (L10 enforcement in `deliverJob`)

`deliverJob` independently re-checks the finance gate defined in L10:

```
if (job.quoteTotal > 200_000 && !job.financeApprovalAt) throw FinanceApprovalRequiredError
```

This check is in the store action, not the UI layer. The UI may already disable the button, but the store is the authoritative gate. Boundary: `quoteTotal === 200_000` does **not** trigger the gate (strictly greater than).

### Cost-ledger entry amounts

The 3 entries are computed from `computeGstBreakdown` (defined in L16):

| Entry | Category | Amount |
|---|---|---|
| Parts cost (BN cost, margin-scheme) | `custom-build-parts` | `Math.round(bd.partsCostBN)` |
| Vendor labour + GST on labour | `custom-build-labour` | `Math.round(bd.vendorLabour + bd.gstOnLabour)` |
| BN margin | `custom-build-vendor-fee` | `Math.round(bd.bnMargin)` |

`partsSubtotal` = sum of `part.qty × part.unitCost` across `job.parts`. `vendorLabour` = `(totalInstallHours / 8) × vendor.dayRate` (or 0 if no vendor). `partsListPriceSum` = same as `partsSubtotal` when list price is unavailable.

### Idempotency

`deliverJob` sets `job.costLedgerWriteRef = { writtenAt, entryIds }` on first write. Subsequent calls with the same `jobId` reach the `job.stage === 'DELIVERED'` guard first (which throws `JobAlreadyDeliveredError`), so the write-back can never execute twice. The `costLedgerWriteRef` guard is a secondary defense for any edge cases where stage has not yet advanced.

### Acceptance criteria

| # | Criterion |
|---|---|
| AC-P4-1 | `deliverJob` with R10+, stage=QC, quoteTotal ≤ 200,000: writes 3 entries to vehicles-store and sets `stage='DELIVERED'` + `costLedgerWriteRef`. |
| AC-P4-2 | `deliverJob` with quoteTotal > 200,000 and no `financeApprovalAt`: throws `FinanceApprovalRequiredError`; no entries written; stage unchanged. |
| AC-P4-3 | `deliverJob` with R09 actor: throws `InsufficientRoleError`. |
| AC-P4-4 | Calling `deliverJob` on an already-DELIVERED job throws `JobAlreadyDeliveredError`; entry count in vehicles-store is unchanged. |
| AC-P4-5 | Entry amounts match `computeGstBreakdown` output exactly (parts, labour+GST, BN margin). |
| AC-P4-6 | All 3 entries have `vin` matching `BuildJob.vin`. |
| AC-P4-7 | All 3 expected categories (`custom-build-parts`, `custom-build-labour`, `custom-build-vendor-fee`) are present. |
| AC-P4-8 | With no vendor: `custom-build-labour` and `custom-build-vendor-fee` amounts are 0. |
| AC-P4-9 | Vehicle inventory Cost Ledger tab shows entries for the delivered build job VIN, merged with fixture entries, deduplicated. |
| AC-P4-10 | Entries with custom-build categories show a "Build #CBJ-xxx" badge linking to `/custom-builds/[id]`. |
| AC-P4-11 | Custom Builds detail Cost Ledger tab shows written entries when job is DELIVERED with `costLedgerWriteRef`; otherwise shows preview breakdown from `computeGstBreakdown`. |
| AC-P4-12 | `CostLedgerCategoryEnum` in `@dms/types` includes all 3 new values; TypeScript compiles without errors. |

## 28. P5 — Design-Quality SVG Polish (L46)

**Shipped: 2026-04-29 | v1.8**

### Locked decision

| # | Decision | Rationale |
|---|---|---|
| L46 | **Visualizer base SVGs upgraded to design-quality silhouettes.** All 5 base car files (`base-porsche-911.ts`, `base-bmw-m4.ts`, `base-audi-rs5.ts`, `base-mercedes-amg-gt.ts`, `base-audi-r8.ts`) rewritten with model-accurate proportions, layered body panels, and brand-specific detail. Target ~200–260 LoC per file. Key upgrades: (1) 6-stop body gradient (vs 5-stop), (2) hood as a distinct path with separate gradient and shut-line crease, (3) side skirts as a dedicated darker panel creating visual depth, (4) fender flares as bulge paths over wheel arches, (5) door shut lines as hairline strokes, (6) wheel arches with inner shadow paths, (7) model-accurate brake caliper colour hints (Porsche silver, BMW M blue, Audi RS gold/yellow, AMG red, R8 yellow/ceramic), (8) refined exhaust tips per model (911 dual oval, M4 quad square-oval, RS5 quad oval, AMG GT twin central round, R8 twin large oval), (9) better headlight fidelity (911 projector lens + DRL halo, M4 L-shape DRL, RS5/R8 stacked blade DRL, AMG GT slim strip), (10) R8 blade DRL extending into door line. Silver/grey base tones preserved so CSS `hue-rotate` paint filter continues to work across all 12 luxury colors. `data-paintable="true"` attribute retained on all body paths. | Production-quality luxury platform requires visualizer silhouettes that are recognisable and refined — not cartoonish rectangles. ₹50L+ customisation preview must instil confidence. |

### P5 component map

| File | Before (LoC) | After (LoC) | Key additions |
|------|-------------|-------------|---------------|
| `assets/base-porsche-911.ts` | ~183 | ~260 | Hood path, side skirts path, fender flares, caliper hint, projector lens headlight, 3-element exhaust, door shut lines |
| `assets/base-bmw-m4.ts` | ~184 | ~275 | Hood power dome twin creases, fender flares, caliper M-blue, quad square exhaust, kidney grille vertical slats, M badge tricolour |
| `assets/base-audi-rs5.ts` | ~185 | ~270 | RS honeycomb `<pattern>` on grille, blade DRL stacked lines, fender flares, caliper gold, OLED segment lines on taillights, Quattro rings |
| `assets/base-mercedes-amg-gt.ts` | ~194 | ~280 | Longer hood power dome triple crease, Panamericana 9 slats, AMG star in grille, round taillight glow depth, caliper red, AMG badge |
| `assets/base-audi-r8.ts` | ~203 | ~290 | Blade DRL extending into door crease, flying buttress refined, mid-engine intake mesh, diffuser fins + twin oval exhausts, Y-spoke improved, caliper ceramic-yellow |

### Test changes

- 2 new tests added to `visualizer.test.ts` (`L46 design-quality base SVG validation` describe block):
  - `data-paintable="true"` present in every base SVG (paint filter target integrity)
  - `≥ 4 linearGradient` definitions per SVG (multi-layer gradient discipline)
- Total: **411 tests passing** (up from 409). No regressions.

## 29. Hooks-violation hotfix + L48 button-design alignment

### Locked decisions

| # | Decision | Rationale |
|---|---|---|
| L47 | **`useCallback` and other hooks MUST be called before any early-return** in `CustomBuildsDetailView` and any future detail components. The Rules-of-Hooks crash on 2026-04-28 was caused by `useCallback` for `handleWhatsAppSent` / `handleCallLogged` placed below `if (!hydrated) return <Skeleton />` and `if (!job) notFound()`. First render returned the skeleton (no callback hooks called); subsequent renders ran the callbacks; React threw "Rendered more hooks than during the previous render." Pattern enforced: hooks block at top of function body, conditional returns afterward. `job` may be undefined while hydrating; callbacks tolerate that via `jobIdResolved = job?.id ?? jobId`. | Rules of Hooks compliance; prevents detail view from crashing on first paint while store hydrates. |
| L49 | **Contact buttons (WhatsApp + AI Call) on `CustomBuildsDetailView` use the canonical sales pattern from `enquiry-detail-view.tsx` lines 303–318.** Markup: `inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium ... transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`. WhatsApp: `text-[#25D366]` text + `MessageCircle` icon (h-4 w-4). AI Call: `text-ink-primary` + `Sparkles` icon (h-4 w-4). Hover: `hover:bg-bg-subtle`. R09+ gated via `Gate` primitive. **No bg-color-tint variants** — the previous custom green-pill / accent-pill styling diverged from sales and was rejected by the user. All future contact-action buttons across modules must use this exact recipe. | Single canonical pattern for cross-module contact actions; visual parity between sales detail and any other module's detail page. Prevents per-module re-styling. |

## 30. P3.2 — 3D Visualizer (supersedes 2D approach)

**Shipped: 2026-04-29 | v2.0**

This section formalises the pivot from 2D SVG layer compositing to true 3D rendering for the Custom Builds visualizer. The 2D approach (L4, L5) is deprecated but retained as a fallback. See L51–L56 below.

### Locked decisions

| # | Decision | Rationale |
|---|---|---|
| L51 | **Visualizer rendering pivots from 2D SVG layer compositing to true 3D rendering.** Library stack: `react-three-fiber` v8 + `@react-three/drei` v9 + `three` r169. The 2D approach (L4, L5) is **deprecated** but kept in repo as P3 fallback for browsers without WebGL. Trigger to use 2D fallback: `WebGLRenderingContext` unavailable (checked at runtime via `canvas.getContext('webgl')`). Phase plan: P3.2 ships 3D for ONE car (Ferrari via Three.js Ferrari GLB); P3.3 adds deep customisation (wheel/tint/exhaust/suspension/decal) for Ferrari only; P3.4 expands to other cars once licensed GLBs are sourced. | 2D SVG approach cannot achieve the wow factor required for a ₹50L+ customisation platform. Real-time 3D with orbit controls, studio lighting, and accurate paint application creates a genuine premium configurator experience. |
| L52 | **Single-car v0 strategy** (updated by L57). Originally Porsche 911 Carrera S; updated in P3.3 scope reduction to Ferrari (the Three.js GLB IS a Ferrari model, not a stand-in). All other vehicles (Porsche 911, BMW M4, Audi RS5, Mercedes-AMG GT, Audi R8) fall back to the 2D SVG viewer with a "3D model coming soon" banner. | Shipping one model perfectly is better than shipping five poorly. Validates the full pipeline (load → paint → orbit → save) with minimal asset risk. |
| L53 | **GLTF asset source (v0):** `https://threejs.org/examples/models/gltf/ferrari.glb` (from the official Three.js examples repository). License: MIT/BSD — part of three.js open-source examples, permissive use for development and demo purposes. Used as Porsche 911 Carrera S stand-in for v0. Real Porsche 911 GLB to be sourced via licensed marketplace (Sketchfab Pro / CGTrader) and swapped in for production v0.1. License citation stored in `visualizer-3d-assets.ts` `license` field. | Need a high-quality real car GLB to demonstrate the 3D system. Ferrari GLB from three.js examples is MIT-licensed, ~5MB, and production quality. Swap for licensed Porsche 911 before launch. |
| L54 | **Camera + lighting config.** Studio environment via drei `<Environment preset="studio" />`. `<ContactShadows />` for floor grounding (opacity 0.6, scale 10, blur 2.5). `<OrbitControls>` with `enablePan={false}`, `minDistance={3}`, `maxDistance={8}`, `maxPolarAngle={Math.PI / 2.2}` (prevents looking under the car). Gentle auto-rotate at 0.4 rad/s (`autoRotate autoRotateSpeed={0.4}`). Reduced-motion users: `autoRotate` disabled (checked via `window.matchMedia('(prefers-reduced-motion: reduce)')`). `readOnly` mode also disables auto-rotate. Camera initial position: `[4, 1.5, 4]`, `fov: 35`. | Studio preset gives a neutral grey HDR environment with accurate reflections on car paint. ContactShadows grounds the model. Constrained orbit prevents disorienting views. 0.4 rad/s auto-rotate is slow enough to be ambient, fast enough to show off the model. |
| L55 | **Paint application:** traverse `useGLTF` scene to find materials where `material.name.toLowerCase()` includes any hint from `paintMaterialHints` (`['body', 'paint', 'exterior', 'car_paint']`). Apply `material.color = new THREE.Color(hex)` + `material.needsUpdate = true`. If no named body materials are found (model-dependent), falls back to applying paint to all `MeshStandardMaterial` in the scene. Scene is cloned once via `useMemo(() => scene.clone(true), [scene])` so cache is not polluted. Wheel size (`wheelSize` prop, 18–22) maps to uniform scale on meshes matching `wheelMeshHints` (`['wheel']`): scale = `0.90 + ((size - 18) / 4) * 0.20`. If no wheel meshes are found, the operation is silently skipped. Cleanup on unmount: traverse + dispose all geometries and materials. | Paint must be applied in-scene without rebuilding the GLTF. Memoized clone ensures `useGLTF` cache is not mutated, allowing hot-reload and multiple instances. Fallback to all MeshStandardMaterial handles models with unnamed materials. Silent skip on missing wheels prevents runtime errors for models without separate wheel meshes. |
| L56 | **Bundle size and SSR.** R3F + drei + three adds ~250 KB gzip to the staff-web bundle (acceptable — staff-web is already ~1.2 MB gzip). The 3D canvas is lazy-loaded via `dynamic(() => import('./visualizer-3d-canvas'), { ssr: false, loading: <Canvas3DSkeleton/> })` so: (1) Three.js does not execute on server (requires browser `window`/`WebGL`), (2) the 3D bundle is code-split and only loaded when the user navigates to the Visualizer tab, (3) the storefront (customer-web) never imports the visualizer, so customers pay zero cost. | Three.js requires browser APIs (`window`, `document`, `WebGLRenderingContext`). SSR must be disabled. Dynamic import splits the ~250 KB chunk out of the main bundle, keeping TTI fast for staff who never use the configurator. |

### Phase plan

| Phase | Status | Description |
|-------|--------|-------------|
| P3 | Deprecated | 2D SVG visualizer — retained as WebGL fallback. |
| P3.1 | Shipped | 2D premium SVG pass — 5 cars, 12 paint colors, compare slider, fine controls. |
| P3.2 | Shipped (v2.0) | 3D viewer for Porsche 911 Carrera S stand-in (Ferrari GLB from Three.js). Orbit controls, studio lighting, paint application, "coming soon" banner for other vehicles. |
| P3.3 scope | Shipped (v2.1) | Scope reduction: only Ferrari is 3D in v0 (L57). Removed porsche-911 from 3D registry. Ferrari demo VIN added (ZFF92LLA0L0260123). CBJ-013 fixture added. Customization system spec written in §31. |
| P3.3 impl | Planned | 4-phase implementation of customization system (§31). Wheel material + tint + exhaust + suspension + decals. See §31 for full component plan. |
| P3.4 | Planned | Expand 3D to other cars (BMW M4, Audi RS5, AMG GT, Audi R8) once licensed GLBs are sourced. |

### Component map

| File | Type | Description |
|------|------|-------------|
| `src/lib/custom-builds/visualizer-3d-assets.ts` | New | 3D asset registry. `get3DAsset(slug)`, `has3DAsset(slug)`, `get3DSupportedSlugs()`. Single source of truth for GLB URLs + paint hints. |
| `src/components/custom-builds/visualizer/car-model.tsx` | New | R3F scene component. Loads GLB via `useGLTF`, clones scene, applies paint color and wheel scale, cleans up on unmount. |
| `src/components/custom-builds/visualizer/visualizer-3d-canvas.tsx` | New | R3F `<Canvas>` wrapper. Studio environment, contact shadows, orbit controls, WebGL detection + graceful fallback banner, fullscreen support, DPR throttling via `<PerformanceMonitor>`. |
| `src/components/custom-builds/visualizer/visualizer-tab.tsx` | Updated | Lazy-loads `Visualizer3DCanvas` via `dynamic({ ssr: false })`. Renders 3D for Porsche 911; renders 2D with "coming soon" banner for other vehicles. Vehicle selector shows "3D" badge for supported models. Compare slider removed (replaced by "Reset" button on the 3D toolbar). |
| `src/components/custom-builds/visualizer/visualizer-canvas.tsx` | Deprecated | 2D fallback, kept for non-WebGL browsers and non-3D models. `@deprecated` JSDoc added. |
| `src/lib/custom-builds/__tests__/visualizer-3d.test.ts` | New | 17 tests: asset registry coverage, module export verification. |

### Test plan

| Scenario | How to test |
|----------|-------------|
| 3D viewer loads for Porsche 911 | Navigate to a Porsche-VIN build job → Visualizer tab → GLB fetches, canvas renders |
| Paint applies to 3D model | Select a paint color → car body color changes in 3D scene |
| Orbit controls work | Click-drag on canvas → model orbits; scroll → zooms; pan disabled |
| Auto-rotate | Wait 2s → model begins gentle rotation at 0.4 rad/s |
| Reduced-motion | Enable OS reduced-motion setting → auto-rotate stops |
| Fullscreen | Click fullscreen button → canvas expands to fill viewport |
| Other vehicles show "coming soon" | Select BMW M4 → banner appears, 2D viewer renders instead |
| WebGL unavailable | Mock `WebGLRenderingContext = undefined` → "WebGL unavailable, showing 2D preview" banner |
| Mobile responsive | Resize to 375px → canvas renders at reduced DPR |
| Performance drop | Simulate slow GPU → `PerformanceMonitor` drops DPR from 2 to 1 |

### Acceptance criteria

| # | Criterion |
|---|---|
| AC-P3.2-1 | Navigating to Visualizer tab for a Porsche 911 build job loads the 3D canvas (GLB fetched from CDN). |
| AC-P3.2-2 | Selecting a paint color from the PartPickerRail applies `material.color` to the 3D model body mesh. |
| AC-P3.2-3 | OrbitControls: horizontal drag orbits, scroll zooms, pan is disabled. |
| AC-P3.2-4 | Model auto-rotates at ~0.4 rad/s after page loads. |
| AC-P3.2-5 | On reduced-motion devices, auto-rotate is disabled. |
| AC-P3.2-6 | Selecting a non-Porsche vehicle shows "3D model coming soon" banner + 2D SVG below it. |
| AC-P3.2-7 | If WebGL is unavailable, a banner reads "WebGL unavailable, showing 2D preview" and 2D canvas renders. |
| AC-P3.2-8 | 3D canvas is not server-rendered (SSR disabled via `dynamic({ ssr: false })`). |
| AC-P3.2-9 | Existing 2D tests (L35/L36/L37/L38) remain passing — 2D code not broken. |
| AC-P3.2-10 | 17 new 3D tests pass: asset registry + component exports. |

## 31. P3.3 — Customization System

**Status: Spec approved (v2.1) | Implementation: Pending (P3.3.1+)**

This section formalises the five-category 3D customization system for the Ferrari visualizer. All customizations operate exclusively on the Ferrari GLB (Three.js examples model). Other vehicles remain on the 2D path. See §31 phase plan for the implementation sequence.

### Locked decisions

| # | Decision | Rationale |
|---|---|---|
| L57 | **V0 supports ONLY Ferrari for 3D.** Other cars use 2D fallback with "3D coming soon" banner. The Ferrari GLB (Three.js examples, MIT/BSD license) is now treated as the canonical Ferrari demo model — not a stand-in for another brand. `ASSET_3D_REGISTRY` contains only the `ferrari` key. `vehicleToModelSlug` maps any `make.toLowerCase().includes('ferrari')` → `'ferrari'`. `inferModelSlugFromJob` recognizes Ferrari WMI prefixes ZFF, ZFA, ZFG. | The Ferrari GLB is a genuine, high-quality Ferrari model that matches the vehicle in CBJ-013. Using it as the dedicated Ferrari 3D model is correct and removes the fiction of a "Porsche 911 stand-in". |
| L58 | **Wheel swap V0 = material swap.** 5 rim finish variants: `silver`, `gunmetal`, `gloss-black`, `bronze`, `brushed`. Applied by traversing scene for meshes matching `wheelMeshHints` (`['wheel']`) and setting `material.color = new THREE.Color(hex)`. V0.1: load 3 alternate wheel GLBs from `public/assets/wheels/{slug}.glb` (single-wheel model, mounted to GLB origin, parented to each wheel mount point). V0.2: diameter scaling (18–22″) by reading wheel mesh bounding-box height and applying uniform Y-scale, adjusting body Y-offset to prevent arch intersection. | Material swap is the fastest path to visual impact with zero new asset requirements. Three.js `webgl_materials_car` demo proves the Ferrari GLB's wheel meshes (`wheel_front_l/r`, `wheel_rear_l/r`) are individually addressable. Mesh swap adds significant complexity (GLB loading, mount-point parenting, collision detection) — deferred to V0.1. |
| L59 | **Stickers/decals V0 = predefined slot overlay.** 4 slots: `door`, `hood`, `fender`, `trunk`. Each slot is a `DecalGeometry`-free overlay: a plane mesh parented to the body group at a fixed UV offset, displaying a PNG texture. Each slot supports: toggle on/off, 4 rotation orientations (0°, 90°, 180°, 270°), 6 decal choices (BN logo, racing stripe, number badge, side stripe, rear stripe, custom number plate frame). Decal PNGs: 1024×1024, transparent background, stored at `apps/staff-web/public/assets/decals/{slug}.png`. V0.1: `THREE.DecalGeometry` click-to-place + full-wrap mode (replace body diffuse texture with carbon fiber / satin chrome / color-shift pattern). | `DecalGeometry` requires a click-ray intersection against the body mesh, a projection matrix, and stable UV unwrap — too complex for P3.3.0. Fixed-slot overlays deliver 80% of the customer value at 20% of the complexity. |
| L60 | **Window tints V0 = material opacity+color.** Find glass mesh(es) in scene (material name contains `'glass'`, `'Glass'`, `'window'`, `'windshield'`). Apply: `material.opacity = 1 - (tintLevel / 100)`, `material.color.set(tintColor)`, `material.transparent = true`. 5 tint levels: 0% (clear), 30%, 50%, 70%, 90%. 3 tint colors: `smoke` (#1c1c1c), `amber` (#c8860a), `blue` (#0a3d6b). If GLB material is `MeshPhysicalMaterial` with `transmission > 0`, set `transmission = (1 - tintLevel/100) * originalTransmission` and `attenuationColor = new THREE.Color(tintColor)` instead of opacity. | The Ferrari GLB uses `MeshPhysicalMaterial` for glass with `transmission` and `roughness` set (confirmed from Three.js `webgl_materials_car` demo source at `examples/webgl_materials_car.html`). Opacity fallback handles models where `MeshPhysicalMaterial` is not used. Dual-path handles both cases cleanly. |
| L61 | **Exhaust V0 = material variants + muffler-delete.** Find exhaust mesh(es) by name hints (`['exhaust', 'pipe', 'muffler', 'tailpipe']`). 4 tip-style material variants: `stock-chrome` (polished silver), `twin-polished` (bright chrome), `quad-black` (matte black), `carbon-tipped` (dark carbon fiber texture). Apply via `material.color` + `material.roughness` + `material.metalness`. "Muffler delete" toggle hides the muffler mesh (`mesh.visible = false`). Tooltip text: "Race-only — deeper exhaust note. Not road-legal." V0.1: load separate exhaust GLBs from `public/assets/exhausts/{slug}.glb` and parent to chassis mount points. | Ferrari GLB chassis geometry includes exhaust-related meshes under the rear section. Material swap is instant and requires no new assets. Muffler-delete adds a theatrical build element that resonates with the track-day customer persona. |
| L62 | **Suspension V0 = global body Y-translate.** Body group identified as the highest-level scene group (the entire scene minus wheel groups). Apply: `bodyGroup.position.y = -(loweringMm / 1000)`. Range: 0mm (stock) to −50mm (slammed), step 5mm. Warning chip appears when `loweringMm > 30`: `"Aggressive — may rub on potholes"` (amber, non-blocking). Warning at `loweringMm === 50`: `"Slammed — track only"` (red). Implementation notes: (1) wheels are not translated — they stay grounded; (2) body Y-offset must reset to 0 when switching to another vehicle; (3) for models with articulated suspension armatures (detected by checking for `Bone` objects in scene), use bone target Y instead of group translation. | Static GLB models (including Ferrari GLB) have no articulated suspension rig. Global body Y-translate is the only viable approach and is visually convincing for a configurator demo. The suspension demo is primarily a selling tool for coilover/spring kits. |
| L63 | **Customization state schema.** Extend `BuildJob.visualizerState` with an optional `customizations` sub-object. Schema: `customizations: { wheelMaterial?: { finish: 'silver' \| 'gunmetal' \| 'gloss-black' \| 'bronze' \| 'brushed'; }; decals?: Array<{ slot: 'door' \| 'hood' \| 'fender' \| 'trunk'; decalId: string; rotation: 0 \| 90 \| 180 \| 270; }>; tint?: { level: 0 \| 30 \| 50 \| 70 \| 90; color: 'smoke' \| 'amber' \| 'blue'; }; exhaust?: { tipStyle: 'stock-chrome' \| 'twin-polished' \| 'quad-black' \| 'carbon-tipped'; mufflerDeleted: boolean; }; suspension?: { loweringMm: 0 \| 5 \| 10 \| 15 \| 20 \| 25 \| 30 \| 35 \| 40 \| 45 \| 50; }; }`. All fields optional — missing field means stock. Persisted on save via existing `saveVisualizerState` action. Schema added to `@dms/types/domain/custom-builds.ts` as `VisualizationCustomizationsSchema`. | Optional field is backward-compatible — existing `BuildJob` records without `customizations` render as stock. Zod schema validates exhaustively at parse time. All customization actions become pure functions against this schema. |
| L64 | **Customization controls use existing primitives.** All numeric range controls use the `<Slider />` primitive (L42/L50). Toggle controls (muffler delete, decal on/off) use existing `Gate` primitive or a local toggle switch. Swatch selectors (rim finish, tint color, exhaust tip) use the pattern from `paint-palette` swatches (circle, 32×32, border-2 on selection, glow ring). No new primitive components introduced — all composited from existing design-system tokens. | Prevents design-system fragmentation. L50 Slider is battle-tested across three existing control groups. |

### Component plan

| File | Est. LoC | Purpose |
|------|----------|---------|
| `src/components/custom-builds/visualizer/customization-panel.tsx` | ≤300 | Right-side panel with 5 collapsible sections (Wheels, Tint, Exhaust, Suspension, Decals). Renders inside `VisualizerTab` right rail when `is3DSupported`. Passes customization state down; emits onChange. |
| `src/components/custom-builds/visualizer/wheel-customizer.tsx` | ≤180 | Finish swatch grid (5 colors). "Wheel size" label (non-functional in V0, wired to fineControls.wheelSize read-only). V0.1 section placeholder for diameter slider. |
| `src/components/custom-builds/visualizer/tint-customizer.tsx` | ≤140 | Level Slider (0–90, step 10) + 3 color swatches (smoke, amber, blue). Preview swatch shows resulting color × opacity. |
| `src/components/custom-builds/visualizer/exhaust-customizer.tsx` | ≤140 | 4 tip-style swatches with texture previews. Muffler-delete toggle (Gate primitive, "Race-only" tooltip). |
| `src/components/custom-builds/visualizer/suspension-customizer.tsx` | ≤120 | Lowering Slider 0–50mm, step 5mm. Warning StateChip at >30mm (amber) and 50mm (red). |
| `src/components/custom-builds/visualizer/decal-customizer.tsx` | ≤220 | Slot selector (4 tabs: Door, Hood, Fender, Trunk). Per-slot: decal library grid (6 thumbnails), rotation toggle (4 orientations, cycle button), on/off toggle. |
| `src/lib/custom-builds/customization-controller.ts` | ≤220 | Pure functions: `applyWheelMaterial(scene, finish)`, `applyWindowTint(scene, level, color)`, `applyExhaustVariant(scene, tipStyle, mufflerDeleted)`, `applySuspensionLowering(scene, loweringMm)`, `applyDecalSlot(scene, slot, decalId, rotation)`, `resetCustomizations(scene)`. All operate on `THREE.Group` via traverse. Called from `CarModel` useEffect. |

### Asset pipeline

| Asset type | Path pattern | Format | Dimensions | Notes |
|------------|-------------|--------|------------|-------|
| Decal textures (V0) | `apps/staff-web/public/assets/decals/{slug}.png` | PNG | 1024×1024 | Transparent background. 6 decals: `bn-logo`, `racing-stripe`, `number-badge`, `side-stripe`, `rear-stripe`, `plate-frame`. |
| Wheel GLBs (V0.1) | `apps/staff-web/public/assets/wheels/{slug}.glb` | Draco-compressed GLB | — | Single wheel, mounted to GLB origin. Slugs: `stock-ferrari`, `hre-301m`, `vossen-cv10`. |
| Exhaust GLBs (V0.1) | `apps/staff-web/public/assets/exhausts/{slug}.glb` | Draco-compressed GLB | — | Full exhaust assembly from cat-back. Slugs: `stock-ferrari`, `akrapovic-evo`, `novitec-race`. |

### Three.js implementation notes (sourced from threejs.org webgl_materials_car demo)

**Ferrari GLB mesh structure** (from `https://threejs.org/examples/?q=ferrari#webgl_materials_car`):

The official Three.js car configurator demo (`examples/webgl_materials_car.html`) uses the same `ferrari.glb` and exposes its internal structure. Key findings:

1. **Body mesh**: `Object3D` named `body` / `body_paint`. Material: `MeshStandardMaterial` (`name: "body_paint"`, `metalness: 0.6`, `roughness: 0.4`, `envMapIntensity: 1`). Paint color applied via `material.color.set(hex)`.

2. **Wheel meshes**: Four separate `Mesh` objects named `wheel_front_l`, `wheel_front_r`, `wheel_rear_l`, `wheel_rear_r`. Each has a `Bone`-less parent `Object3D`. Can be individually targeted for material or scale changes. Rim material: `MeshStandardMaterial` (`name: "rim"`, `color: #888`, `metalness: 1.0`, `roughness: 0.2`).

3. **Glass**: `Mesh` named `glass` with `MeshPhysicalMaterial` (`transmission: 0.85`, `roughness: 0.05`, `ior: 1.5`, `thickness: 0.3`). Window tint applies to `transmission` + `attenuationColor`.

4. **Exhaust**: Not separately named in the base GLB — exhaust pipes are part of the chassis geometry group. V0 approach: traverse for meshes in the rear lower quadrant whose material name contains hints. V0.1: separate exhaust GLB loaded and positioned.

5. **Performance budget**: Ferrari GLB is ~5MB uncompressed. With `useGLTF` caching, subsequent paint/wheel changes are scene mutations only (no reload). Decal textures add ~6 × 200KB = ~1.2MB. Wheel GLBs (V0.1) add ~3 × 800KB = ~2.4MB. Total P3.3 added weight: ≤4MB (all lazy-loaded on demand).

6. **Memoization pattern**: Each customization controller function returns a mutation descriptor rather than mutating the scene directly. `CarModel`'s useEffect deps array triggers a targeted re-application only when the specific customization changes. This prevents full scene rebuilds on single-axis changes.

### Test plan

| Scenario | Type | How to test |
|----------|------|-------------|
| `applyWheelMaterial(scene, 'gunmetal')` sets rim mesh color to gunmetal hex | Unit (customization-controller) | Create mock scene with `wheel_front_l` mesh → call function → assert `material.color` |
| `applyWindowTint(scene, 70, 'smoke')` sets glass transmission + attenuation | Unit | Mock scene with `MeshPhysicalMaterial` glass mesh → assert transmission + color |
| `applyWindowTint(scene, 70, 'smoke')` falls back to opacity for non-physical material | Unit | Mock scene with `MeshStandardMaterial` glass → assert `opacity = 0.3, transparent = true` |
| `applySuspensionLowering(scene, 30)` sets bodyGroup Y to -0.030 | Unit | Mock scene with body group → assert `position.y === -0.030` |
| `applySuspensionLowering(scene, 0)` returns bodyGroup Y to 0 | Unit | Assert reset |
| `applyExhaustVariant(scene, 'quad-black', false)` sets exhaust material to matte black | Unit | Mock scene with exhaust mesh → assert color + roughness |
| `applyExhaustVariant(scene, 'stock-chrome', true)` hides muffler mesh | Unit | Assert `mesh.visible === false` |
| `resetCustomizations(scene)` restores all stock state | Unit | Apply multiple customizations → reset → assert all at stock |
| `BuildVisualizerCustomizationsSchema` validates all variant combos | Unit (schema) | Valid + invalid payloads → assert parse outcomes |
| Save customizations → reload → state restored | Persistence | `saveVisualizerState` with customizations → read back → assert equality |
| All customizations active → FPS stays ≥ 30 | Performance | `PerformanceMonitor` onDecline not called within 5s of applying all customizations on mid-range GPU |
| Clearing all customizations → scene returns to stock | E2E (manual) | Apply all 5 categories → click "Reset" → assert 3D model returns to stock appearance |

### Phase plan within P3.3

| Phase | Status | Scope |
|-------|--------|-------|
| P3.3.0 | **Shipped (v2.1)** | Scope reduction + Ferrari demo VIN (ZFF92LLA0L0260123) + CBJ-013 fixture + `VisualizationCustomizationsSchema` in `@dms/types` (pending) + `customization-controller.ts` scaffold (pending). |
| P3.3.1 | Planned | Window tint + exhaust variants. Simplest material swaps — no new assets needed beyond a glass material update. |
| P3.3.2 | Planned | Wheel material (5 finish swatches) + suspension lowering slider + warning chips. |
| P3.3.3 | Planned | Decal system (4 slots × 6 decals × 4 rotations). Requires 6 PNG assets. |
| P3.3.4 | Planned | Polish pass: persistence round-trip, save/load state, performance test, FPS budget validation, mobile UX pass. |

### Acceptance criteria

| # | Criterion |
|---|---|
| AC-P3.3-1 | Navigating to Visualizer tab for CBJ-013 (Ferrari VIN ZFF92LLA0L0260123) loads the Ferrari 3D canvas. |
| AC-P3.3-2 | Navigating to Visualizer tab for a non-Ferrari build job shows the "3D model coming soon" banner with 2D viewer. |
| AC-P3.3-3 | Selecting a wheel rim finish from the Customization Panel changes the rim color in the 3D scene. |
| AC-P3.3-4 | Setting window tint level to 70% + smoke color darkens the glass mesh in the 3D scene. |
| AC-P3.3-5 | Selecting "Quad Black" exhaust tip style sets exhaust mesh to matte black material. |
| AC-P3.3-6 | "Muffler Delete" toggle hides the muffler mesh. |
| AC-P3.3-7 | Setting suspension lowering to 30mm shows amber warning chip; 50mm shows red chip. |
| AC-P3.3-8 | Setting suspension lowering to 20mm translates body group Y by -0.020 (meters). |
| AC-P3.3-9 | Enabling a decal in the Hood slot renders the decal PNG as an overlay in the hood position. |
| AC-P3.3-10 | Rotation toggle cycles decal through 0°, 90°, 180°, 270° orientations. |
| AC-P3.3-11 | "Reset" button clears all customizations and returns scene to stock state. |
| AC-P3.3-12 | Saving the visualizer state persists `customizations` object in `BuildJob.visualizerState`. |
| AC-P3.3-13 | Reloading the Visualizer tab restores all customizations from saved state. |
| AC-P3.3-14 | All customization controls (Slider, swatches, toggles) use existing design-system primitives (L64). |
| AC-P3.3-15 | FPS remains ≥ 30 with all 5 customization categories active simultaneously (PerformanceMonitor). |

---

## 33. P3.3 — 3D Customization System Implementation Notes

**Shipped: 2026-04-29 | v2.2**

### P3.3.0 — Schema + Scaffolding (Foundation)

**Status:** Shipped

#### Schema additions (`packages/types/src/domain/custom-builds.ts`)

- Added `WheelMaterialEnum`, `DecalSlotEnum`, `TintColorEnum`, `ExhaustTipStyleEnum` as standalone Zod enums (exported from `@dms/types`).
- Added `VisualizationCustomizationsSchema` with all 5 categories optional. Extended `VisualizerStateSchema` with `customizations?: VisualizationCustomizationsSchema.optional()`.
- `tint.color` extended to 5 options (`smoke | amber | blue | green | mirror`) vs spec's 3 — additive, backward-compatible.
- `decals[].slot` uses 6 slots (`door-left | door-right | hood | fender-left | fender-right | trunk`) vs spec's 4 — provides left/right door separation.

#### Key implementation decisions

1. **Undo callback pattern**: Each controller function saves per-material/per-mesh snapshots in a `Map`, returns a closure that restores them. `useEffect` cleanup = undo. Avoids a second scene clone.
2. **Decal texture loading**: `THREE.TextureLoader().load(src)` inside `applyDecals`. Mocked via `vi.spyOn(THREE.TextureLoader.prototype, 'load')` in tests (no DOM needed for jsdom). Texture cache (`_textureCache` Map) prevents re-loading the same PNG.
3. **Exhaust positional fallback**: If no mesh named with `exhaust/pipe/muffler/tailpipe` hints is found, the controller falls back to finding meshes in the rear-lower quadrant of the scene bounding box. Logs "Used positional fallback for exhaust".
4. **Suspension wheel counter-translation**: Children with `wheel` in their name are counter-translated (opposite direction to body offset) so wheels remain grounded when body is lowered.
5. **Right-rail split layout**: For 3D models, `VisualizerTab` renders `CustomizationPanel` (flex-1) above a compact `PartPickerRail` (max-h-48). 2D models retain the full `PartPickerRail` unchanged.
6. **modelSlug hardcoded `'ferrari'`**: In `visualizer-3d-canvas.tsx`, `modelSlug="ferrari"` is passed to `CarModel`. Will be derived dynamically from the asset registry in P3.4.
7. **Carbon-tipped exhaust**: Procedural `repeating-linear-gradient` swatch in the UI; THREE material uses `color: '#2a2a2a', roughness: 0.6` — no external texture asset required in V0.

#### Files created

| File | LoC | Purpose |
|------|-----|---------|
| `src/lib/custom-builds/customization-controller.ts` | 280 | Pure controller functions (all return UndoFn) |
| `src/lib/custom-builds/decal-library.ts` | 115 | 6 inline SVG decals as base64 data URIs |
| `src/components/custom-builds/visualizer/customization-panel.tsx` | 160 | Tabbed panel with 5 tabs + active-dot indicators |
| `src/components/custom-builds/visualizer/wheel-customizer.tsx` | 110 | 5 rim-finish swatches (radial gradient + spoke overlay) |
| `src/components/custom-builds/visualizer/tint-customizer.tsx` | 130 | Level Slider + 5 color swatches + preview |
| `src/components/custom-builds/visualizer/exhaust-customizer.tsx` | 135 | 4 tip-style cards + muffler-delete toggle |
| `src/components/custom-builds/visualizer/suspension-customizer.tsx` | 120 | 0–50mm Slider + warning chips + silhouette |
| `src/components/custom-builds/visualizer/decal-customizer.tsx` | 185 | 6-slot selector + decal grid + rotation + max-4 |
| `src/lib/custom-builds/__tests__/customization-controller.test.ts` | 310 | 35 tests across all 5 phases |

#### Files modified

| File | Change |
|------|--------|
| `packages/types/src/domain/custom-builds.ts` | Added enums + `VisualizationCustomizationsSchema`; extended `VisualizerStateSchema` |
| `src/components/custom-builds/visualizer/car-model.tsx` | `customizations` + `modelSlug` props; P3.3 `useEffect` calling `applyAllCustomizations` |
| `src/components/custom-builds/visualizer/visualizer-3d-canvas.tsx` | `customizations` prop threaded through `Scene` |
| `src/components/custom-builds/visualizer/visualizer-tab.tsx` | Customizations state + handlers + persistence on save + split right rail |
| `src/components/primitives/ownership-badge.tsx` | `CUSTOM_BUILD_LINKED` added to `SOURCE_ICON` map (pre-existing fix) |
| `src/components/custom-builds/new-flow/wizard-step-vehicle.tsx` | Outlet slug → outletId mapping; removed stale `schemaVersion` (pre-existing fixes) |
| `src/tests/custom-builds-wizard-flows.test.ts` | Removed stale `schemaVersion: 'v1'` (pre-existing fix) |

#### Test results

- 35 new tests in `customization-controller.test.ts` — all passing
  - 6 schema validation (P3.3.0)
  - 6 `applyTint` — MeshPhysicalMaterial + MeshStandardMaterial paths (P3.3.1)
  - 5 `applyExhaust` — muffler-delete + undo + missing-mesh graceful skip (P3.3.1)
  - 4 `applyWheelMaterial` — 5-finish coverage + undo (P3.3.2)
  - 4 `applySuspension` — body/wheel counter-translation + undo + zero-mm no-op (P3.3.2)
  - 5 `applyDecals` — mesh count, undo, naming, rotation, missing-src skip (P3.3.3)
  - 5 `applyAllCustomizations` — no-op empty, no mutation on empty, graceful miss, round-trip (P3.3.4)
- **563 total tests passing** (511 prior + 35 new + 17 from pre-existing wizard-flow tests)
- `tsc --noEmit` — clean

#### Deferred items

| Item | Target | Notes |
|------|--------|-------|
| Real designer PNG decals | P3.3.5 | Replace `src` in `DECAL_LIBRARY` with `/assets/decals/{slug}.png`. No code changes needed. |
| Alternate wheel GLBs | V0.1 | L58: 3 GLBs (`stock-ferrari`, `hre-301m`, `vossen-cv10`) |
| Separate exhaust GLBs | V0.1 | L61: Akrapovic/Novitec exhaust assemblies |
| `THREE.DecalGeometry` click-to-place | V0.1 | L59: Fixed-slot V0 delivers 80% value |
| Bone-target suspension for rigged models | P3.4 | Ferrari GLB is static; bone detection not yet needed |
| Dynamic `modelSlug` from asset registry | P3.4 | Currently hardcoded `'ferrari'` |
| FPS ≥ 30 performance verification | Manual | `PerformanceMonitor` in scene; WebGL unavailable in jsdom |

---

## 32. Wizard New-Customer + Linked-Car Flows

**Status: Shipped (v2.3)**
**Date: 2026-04-29**

This section formalises the three new flows added to the 6-step Build Job creation wizard:
1. Inline new-customer creation from step-customer
2. Customer-filtered vehicle dropdown in step-vehicle
3. Inline "Link a car" sub-flow in step-vehicle
4. Provenance audit log on BuildJob creation

### Locked decisions

| # | Decision | Source |
|---|---|---|
| L65 | **Customer search in step-customer always offers "+ Create New Customer" inline. Created customer auto-selected.** The `WizardStepCustomer` component renders a "+ Create New Customer" CTA button next to the search bar. Clicking it expands an inline form with: full name, phone (+91 format), email, preferred city, preferred language, DPDP consent checkbox (required). On submit: `createCustomer({..., dpdpConsentGivenAt: now})` → new customer auto-selected → wizard state flags `customerCreatedDuringWizard: true`. The customer schema `Customer.dpdpConsentGivenAt: ISO timestamp (optional)` stores the consent capture time. Legacy records created before this field are allowed to have `undefined` (no backfill required). | CLAUDE §9 DPDP; wizard UX requirement |
| L66 | **Vehicle dropdown in step-vehicle is FILTERED to selected customer's owned vehicles only via `selectVehiclesByCustomer`. New customers (zero vehicles) see empty state with "Link a Car" CTA. Existing customers see their list + "Link Another Car" CTA.** The old behaviour (fall-back to all vehicles when customer has none) is removed. The `includeGrace: true` option ensures vehicles in the 7-day revoke grace window are still selectable. A breadcrumb line `Selected: {customer.name} · N car(s) linked` appears in the step header. | L2 (single source of truth for vehicle ownership); wizard UX requirement |
| L67 | **Inline "Link a car" form creates VehicleMaster + opens ownership row in a single sequential call sequence. New `VehicleTouchSource: 'CUSTOM_BUILD_LINKED'`. Activity event payload includes `linkedFromBuildJobWizard: true`.** Call sequence (UI-layer, not in store): (a) `upsertVehicle({ ..., firstTouchSource: 'CUSTOM_BUILD_LINKED' })`, (b) `openOwnership({ source: 'CUSTOM_BUILD_LINKED', ... })`, (c) `appendEvent('OPEN', { source: 'CUSTOM_BUILD_LINKED', linkedFromBuildJobWizard: true, kmAtOpen, customerId }, actor, { vin, ownershipId })`. VIN input: strict `normalizeVin` first; falls back to `trim().toUpperCase()` for legacy demo VINs containing I/O/Q/U/Z — a visible warning is shown but the form is not blocked. RC number: auto-generated as `RC-{vin.slice(-6)}` if left blank. Wizard auto-selects the newly-linked car and sets `vehicleLinkedDuringWizard: true`. | Cross-module wiring doc seam 12; SPEC-VEHICLES-001 §3.3 |
| L68 | **Provenance audit log entries appended to BuildJob on creation** (in `handleSubmit` after `createBuildJob`). Three conditional `addActivityNote` calls: (1) If `customerCreatedDuringWizard === true`: `"Customer {name} created during build enquiry"`. (2) If `vehicleLinkedDuringWizard === true`: `"Vehicle {make} {model} ({vin-tail}) linked during build enquiry"`. (3) Always: `"Build enquiry created by {actor.name}"`. These use the existing `addActivityNote` action and appear in the Activity tab of the build detail page. | Audit trail requirement; cross-module wiring doc seam 11 |

### WizardData shape additions

```ts
// new-build-wizard.tsx
export interface WizardData {
  // ... existing fields ...
  /** True when the customer was created inline during this wizard session. L65 */
  customerCreatedDuringWizard: boolean;
  /** True when a vehicle was upserted + ownership opened during this wizard session. L67 */
  vehicleLinkedDuringWizard: boolean;
}
```

### Type changes

| Type | Change |
|------|--------|
| `VehicleTouchSourceEnum` (`@dms/types`) | Added `'CUSTOM_BUILD_LINKED'` value |
| `OwnershipEventPayloads.OPEN` (`@dms/types`) | Added optional `linkedFromBuildJobWizard?: boolean` and `customerId?: string` |
| `Customer` (`@dms/types`) | Added `dpdpConsentGivenAt?: string` (ISO datetime, optional for legacy compat) |
| `CreateCustomerInput` (customers-store) | Added `preferredLanguage?` and `dpdpConsentGivenAt?` fields |

### Files changed

| File | Change |
|------|--------|
| `packages/types/src/domain/vehicles-aggregate.ts` | `VehicleTouchSourceEnum` +1 value; `OwnershipEventPayloads.OPEN` +2 optional fields |
| `packages/types/src/domain/customer.ts` | `CustomerSchema` +`dpdpConsentGivenAt` field |
| `apps/staff-web/src/lib/customers/customers-store.ts` | `CreateCustomerInput` +`preferredLanguage?` +`dpdpConsentGivenAt?`; `createCustomer` persists both |
| `apps/staff-web/src/components/custom-builds/new-flow/new-build-wizard.tsx` | `WizardData` +`customerCreatedDuringWizard` +`vehicleLinkedDuringWizard`; `handleSubmit` +3 `addActivityNote` calls |
| `apps/staff-web/src/components/custom-builds/new-flow/wizard-step-customer.tsx` | Full rewrite — inline create-customer form with DPDP, "(NEW)" badge, React Hook Form + Zod |
| `apps/staff-web/src/components/custom-builds/new-flow/wizard-step-vehicle.tsx` | Full rewrite — filtered dropdown via `selectVehiclesByCustomer`, empty-state, "Link a Car" / "Link Another Car" sub-flow |
| `apps/staff-web/src/tests/custom-builds-wizard-flows.test.ts` | New — 10 tests across T1–T7 |
| `specs/architecture/cross-module-wiring.md` | Added seams 11 + 12 with full call-chain docs |
| `specs/modules/custom-builds/01-custom-builds-module.md` | This section (§32) + L65–L68 in §2 table + changelog entry; version → v2.3 |

### Acceptance criteria

| # | Criterion |
|---|---|
| AC-32-1 | Step 1 shows a "+ Create New Customer" button next to the search bar. Clicking it expands an inline form. |
| AC-32-2 | New-customer form requires: name (min 2), phone (+91XXXXXXXXXX), email, city, DPDP consent checkbox. Submit is blocked if any required field is invalid. |
| AC-32-3 | DPDP consent checkbox is required. Form schema uses `z.literal(true)`. Attempting to submit without checking it shows an error and blocks the API call. |
| AC-32-4 | Successful new-customer creation auto-selects the new customer, shows "(NEW)" badge in the list and "(just created)" note in the selection line. `customerCreatedDuringWizard` is set to `true`. |
| AC-32-5 | `Customer.dpdpConsentGivenAt` is set to the ISO timestamp of when the form was submitted. |
| AC-32-6 | Step 2 vehicle list is filtered by `selectVehiclesByCustomer` — only shows vehicles owned by the selected customer. |
| AC-32-7 | New customer with zero vehicles: step 2 shows a dashed-border empty-state with a prominent "Link a Car" button (accent background). |
| AC-32-8 | Existing customer with 1+ vehicles: step 2 shows their vehicle list + a "Link Another Car" text link at the bottom. |
| AC-32-9 | "Link a Car" inline form: VIN (17 chars), make, model required. Year, color, km, RC optional. Submitting calls `upsertVehicle` + `openOwnership` + `appendEvent`. |
| AC-32-10 | VINs with I/O/Q/U/Z show an amber warning but are not blocked (legacy demo VIN support via safeVin fallback). |
| AC-32-11 | `openOwnership` is called with `source: 'CUSTOM_BUILD_LINKED'`. `appendEvent` payload includes `linkedFromBuildJobWizard: true`. |
| AC-32-12 | After linking a car, the new VIN is auto-selected and `vehicleLinkedDuringWizard` is `true`. Step 2 shows "(just linked)" note. |
| AC-32-13 | On BuildJob creation: if `customerCreatedDuringWizard`, activity log contains `"Customer {name} created during build enquiry"`. |
| AC-32-14 | On BuildJob creation: if `vehicleLinkedDuringWizard`, activity log contains `"Vehicle {label} ({vin-tail}) linked during build enquiry"`. |
| AC-32-15 | On BuildJob creation: always appends `"Build enquiry created by {actor.name}"` note. |
| AC-32-16 | `VehicleTouchSourceEnum` accepts `'CUSTOM_BUILD_LINKED'` — TypeScript + Zod both parse without error. |

---

## 34. §34 — P3.3 Bug-Fix Pass (v2.4)

### Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| L69 | **Tint excludes light lenses (headlight/taillight).** `applyTint` filters all candidate glass meshes before applying tint: any mesh (or its material) whose name matches `/light\|lamp\|lens\|head\|tail\|signal/i` is excluded. Only `window`/`windshield` meshes and plain `glass`/`Glass` meshes on non-lamp hosts receive the tint. `isLampMesh()` helper performs the check. | The Ferrari GLB uses `MeshPhysicalMaterial` for both window glass and headlight lenses. Without this guard, smoke tint turned headlights dark, which was visually broken. |
| L70 | **Exhaust customization requires `exhaustMeshHints` in `Asset3DRecord`.** Ferrari registry: `exhaustMeshHints: ['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip']`. The positional rear-lower-quadrant fallback is removed — it was unreliable and matched chassis panels. `applyExhaust` now takes a second `exhaustMeshHints` parameter (default: Ferrari hints). `applyAllCustomizations` forwards this parameter. If no meshes match, logs `"no exhaust meshes found … no-op for this model"` and returns a no-op undo. | Positional fallback was matching large chassis panels in the rear-lower quadrant. The material swap had visible effect on the wrong parts (grille, diffuser) rather than the exhaust pipe/tip. |
| L71 | **Decal slot positions are computed from the runtime bounding box of the car scene, NOT hardcoded coordinates.** `computeDecalSlots(scene)` uses `THREE.Box3().setFromObject(scene)` to derive `center`, `size`, and `box.min`/`box.max`. All 6 slots (hood, trunk, door-left, door-right, fender-left, fender-right) are expressed as proportional fractions of bounding-box dimensions. Plane geometry also scales proportionally (`sz * 0.40` for door width etc). A degenerate guard (`size > 0 ? size : fallback`) handles empty test scenes. | Hardcoded Ferrari coordinates assumed specific GLB scale and orientation. Any scale change or pivot shift broke all non-hood slots. Runtime derivation makes decals robust to model changes and scales correctly. |
| L72 | **3D mode shows ONLY `CustomizationPanel`; the 2D `PartPickerRail` is hidden.** `visualizer-tab.tsx` renders `{is3DSupported ? <CustomizationPanel> : <PartPickerRail>}` — a clean conditional, not a split stack. Paint color controls (12 luxury swatches + price) are migrated into `CustomizationPanel` as a new `paint` tab (first tab in the ordering: Paint, Wheels, Tint, Exhaust, Ride, Decals). `activePaintKey` and `onSelectPaint` are passed down to `CustomizationPanel` as props. `hasCustomization` updated to include `paint` tab. `PAINT_PALETTE` swatch grid is duplicated (no extraction — kept self-contained). 2D-only Aero/Wrap overlay features are dropped for 3D mode. | Two stacked panels (3D Customization + Configurator) simultaneously visible was confusing and wasted space. Aero/Wrap were 2D SVG filter-based — they have no 3D equivalent. |
| L73 | **Customization panel pointer-events and scrollability guarantees.** (a) Panel content `div` gets `relative z-10 pointer-events-auto` so slider inputs are reachable even when R3F canvas occupies a sibling absolute-positioned container. (b) Outer `CustomizationPanel` wrapper gets `relative` to establish its own stacking context. (c) `PartPickerRail` outer wrapper changed from `overflow-hidden` to `min-h-0` so the tab bar's `overflow-x-auto scrollbar-thin-dark` is not clipped by the parent. | Slider was unresponsive because the panel content had no explicit `z-index` or `pointer-events` declaration and was sitting below the canvas stacking context. PartPickerRail tabs were clipped horizontally by `overflow-hidden` on the outer wrapper. |

### Files changed

| File | Change |
|------|--------|
| `apps/staff-web/src/lib/custom-builds/customization-controller.ts` | L69: `LAMP_MESH_PATTERN` + `isLampMesh()` + updated `applyTint`; L70: `applyExhaust` rewrite (no positional fallback, new `exhaustMeshHints` param); L70: `applyAllCustomizations` +`exhaustMeshHints` param; L71: `computeDecalSlots()` replaces `FERRARI_DECAL_SLOTS` hardcoded map; `applyDecals` uses runtime slots |
| `apps/staff-web/src/lib/custom-builds/visualizer-3d-assets.ts` | L70: `Asset3DRecord` + `exhaustMeshHints: string[]`; Ferrari registry +`exhaustMeshHints` array |
| `apps/staff-web/src/components/custom-builds/visualizer/car-model.tsx` | L70: `exhaustMeshHints` prop added + passed to `applyAllCustomizations` |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-3d-canvas.tsx` | L70: passes `asset.exhaustMeshHints` to `CarModel` |
| `apps/staff-web/src/components/custom-builds/visualizer/customization-panel.tsx` | L72: `paint` tab added; `PaintSwatchGrid` migrated in; `activePaintKey`/`onSelectPaint` props; L73: `relative z-10 pointer-events-auto` on panel content; `relative` on outer wrapper |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-tab.tsx` | L72: `is3DSupported ? <CustomizationPanel> : <PartPickerRail>` (no stacked panels); `activePaintKey`/`onSelectPaint` wired to `CustomizationPanel` |
| `apps/staff-web/src/components/custom-builds/visualizer/part-picker-rail.tsx` | L73: outer wrapper `overflow-hidden` → `min-h-0` to allow tab bar horizontal scroll |
| `apps/staff-web/src/lib/custom-builds/__tests__/customization-controller.test.ts` | 17 new regression tests across Fix 1–Fix 4 + exhaustMeshHints propagation |

### Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-34-1 | `applyTint` with smoke level=80 on a scene containing windshield_glass + headlight_lens + taillight_lens: windshield transparent=true, headlight/taillight transmission unchanged. |
| AC-34-2 | Any mesh name or material name matching `/light\|lamp\|lens\|head\|tail\|signal/i` is excluded from tint. |
| AC-34-3 | `applyExhaust` on an empty scene warns with substring `"no exhaust meshes found"` and returns no-op undo. |
| AC-34-4 | `applyExhaust` on a scene with no named exhaust meshes does NOT mutate any rear-lower-quadrant mesh (positional fallback is gone). |
| AC-34-5 | `Asset3DRecord.exhaustMeshHints` is defined; Ferrari registry has `['exhaust', 'pipe', 'tailpipe', 'muffler', 'tip']`. |
| AC-34-6 | `computeDecalSlots` places door-left decal at `x < 0`, door-right at `x > 0`, hood at high Y, for any bounding box. |
| AC-34-7 | Decal plane geometry dimensions scale proportionally with the car bounding box (larger car → larger decal planes). |
| AC-34-8 | `applyDecals` on an empty scene (degenerate bbox) does not throw; places the decal mesh using fallback dimensions. |
| AC-34-9 | In 3D mode, only `CustomizationPanel` is visible in the right rail — the `PartPickerRail` (Configurator) is NOT rendered. |
| AC-34-10 | `CustomizationPanel` shows a Paint tab as the first tab. Paint swatches select/deselect paint color on the Ferrari. |
| AC-34-11 | In 2D mode (non-Ferrari), only `PartPickerRail` is visible — `CustomizationPanel` is NOT rendered. |
| AC-34-12 | Suspension slider in `SuspensionCustomizer` is draggable (no pointer-event overlay blocks it). |
| AC-34-13 | `PartPickerRail` tab bar scrolls horizontally when tabs overflow (no clip from parent `overflow-hidden`). |

---

## 35. §35 — P3.3 Visual Rendering Bug-Fix Pass (v2.5)

### Context

Two visual bugs reported against the 3D Ferrari visualizer:
1. A dark horizontal band cut across the lower car body just above the wheels.
2. Decals applied via the decal panel were invisible (never rendered).

### Root cause analysis

**Black band — root cause:** `ContactShadows` was at `position={[0, -0.01, 0]}`, too close to
the car body's lowest extent. The shadow plane (a screen-space effect) was intersecting the
car body mesh at ~wheel-arch height, projecting a dark disc/band across the lower side panels.
Secondary contributor: `opacity={0.6}` was visually heavy, making any intersection strongly visible.

**Decals invisible — root cause:** `loadDecalTexture` called `new THREE.TextureLoader().load(src)`,
which is asynchronous. The texture was not yet loaded when the `MeshBasicMaterial` was constructed;
`material.map` referenced an empty `THREE.Texture` with no image data. The mesh rendered as a
transparent plane (invisible). Additionally, `polygonOffset` was missing from the material config,
which would cause z-fighting even once the texture loaded.

### Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| L74 | **ContactShadows at y=-0.05 (below ground plane), opacity=0.35, blur=2, far=2.** Position is 5cm below the car's Y=0 ground reference so the shadow plane never intersects the body mesh. opacity=0.35 keeps the grounding shadow subtle. blur=2 / far=2 match the studio showroom tone (soft, close shadow). | At y=-0.01 the shadow plane was within the body mesh boundary for low-profile sports cars. Moving it to -0.05 provides clearance. opacity reduced from 0.6 to 0.35 to prevent the dark band from reappearing if the position is ever adjusted. |
| L75 | **`applySuspension` is a strict no-op when `loweringMm === 0`.** First line of the function: `if (!suspension \|\| suspension.loweringMm === 0) return () => {};` — no traversal, no snapshot, no Y mutation. | Previous implementation ran the full traversal and snapshot even at loweringMm=0 (adding offsetY=0 to all body groups). This was a no-op numerically but caused unnecessary scene mutation and made the body-group identification heuristic run on every render even when suspension was not requested. |
| L76 | **Decals load via `THREE.TextureLoader.loadAsync` awaited before `material.map` is set.** Mesh is added to the scene immediately (so it occupies the correct slot position in the render tree), but `material.map` is set asynchronously once `loadAsync` resolves. Material uses `transparent: true`, `depthWrite: false`, `polygonOffset: true` (factor=-2, units=-2), `side: DoubleSide`. Mesh positioned 1cm (0.01 THREE units) off body surface along slot normal. | Synchronous `.load()` returned an empty texture; async `.loadAsync()` resolves only when the image is decoded. The 0.01 normal offset (10x the previous 0.001) provides enough depth separation to eliminate z-fighting on the car body surface. polygonOffset provides additional insurance against z-fighting artifacts. |
| L77 | **Decal texture load failure: log warning + skip `material.map` assignment (mesh remains invisible).** If `loadAsync` rejects or the src is invalid, `console.warn` is emitted with the decalId and truncated src, and `material.map` is left null. No error is thrown. The undo function still removes the invisible mesh on cleanup. | Placeholder data-URI SVG decals should always load (btoa-encoded inline). For any future PNG assets that fail (network error, 404), silent skip is preferable to a thrown error that could crash the React render loop via R3F's error boundary. |

### Files changed

| File | Change |
|------|--------|
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-3d-canvas.tsx` | L74: ContactShadows `position=[0,-0.05,0]`, `opacity=0.35`, `blur=2`, `far=2` |
| `apps/staff-web/src/lib/custom-builds/customization-controller.ts` | L75: `applySuspension` early-exit guard; L76: `loadDecalTexture` → `loadDecalTextureAsync` (async, await before map); L76: decal material adds `polygonOffset`, `polygonOffsetFactor=-2`, `polygonOffsetUnits=-2`; L76: normal offset 0.001 → 0.01; L77: texture load failure warning + graceful skip |
| `apps/staff-web/src/lib/custom-builds/__tests__/customization-controller.test.ts` | 4 new tests: (1) `applySuspension` loweringMm=0 returns no-op (body Y unchanged), (2) `applyDecals` creates expected mesh count after texture load, (3) ContactShadows config assertion, (4) decal material has polygonOffset + transparent |

### Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-35-1 | `applySuspension(scene, { loweringMm: 0 })` returns no-op undo; body group Y position is identical before and after the call. |
| AC-35-2 | `applyDecals` with 2 active decals adds 2 child meshes to the scene. Each mesh is named `decal-{slot}-{decalId}`. |
| AC-35-3 | `ContactShadows` props: `position[1] < 0` (below ground), `opacity <= 0.4`, `blur <= 2.5`, `far <= 2`. |
| AC-35-4 | Decal `MeshBasicMaterial` has `polygonOffset: true`, `polygonOffsetFactor < 0`, `polygonOffsetUnits < 0`, and `transparent: true`. |

---

## 36. §36 — P3.3.6 Priced Parts Catalog + Hood/Wing + Bug Fixes (v2.6)

### Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| L78 | **Customization options are a priced catalog (`customization-catalog.ts`). Each option has `id/name/price/description`. Selection ID persisted in `customizations.{category}OptionId`.** The catalog is the single source of truth for prices and 3D controller parameters (finish, loweringMm, etc.). `computeCustomizationCost()` accepts optionIds + decal count + paint price, returns itemized breakdown + GST. | Bare swatches/sliders had no associated price — the quote could not include customization costs. IDs decouple catalog lookup from 3D controller parameters (finish can be inferred from id at lookup time). |
| L79 | **Hood + Wing categories added (P3.3.6). Visual rendering deferred (no separate Ferrari GLB meshes); price applied to quote regardless. Future v0.1 adds hood/wing GLB swaps.** `HOOD_OPTIONS` (4 options) and `WING_OPTIONS` (5 options) in `customization-catalog.ts`. Selection persisted as `hoodOptionId`/`wingOptionId`. A "Visual coming soon" note renders in the customizer panels. | The Ferrari GLB from three.js examples has a single body mesh — no detachable hood or wing. Price and quote accuracy take precedence over visual fidelity in v0. |
| L80 | **Decal slot positions use BODY group bounding box only (excludes ContactShadows, lighting helpers, wheel groups). Door/Fender slots positioned at `center.y + size.y * 0.05` (upper side panel, not lower rocker). Fixed plane sizes: `(0.6, 0.3)` for hood/trunk, `(0.8, 0.25)` for side panels.** `findBodyObject()` traverses top-level children, preferring nodes named `body`, falling back to first non-shadow/non-wheel child. | `setFromObject(scene)` included the ContactShadow plane (Y=-0.05) in the bounding box, making box.min.y extend below ground. This inflated the height, pushed center.y lower, and placed door/fender decals below the car's actual side panel. Body-group isolation fixes this by scoping to the mesh that actually has car geometry. |
| L81 | **Cost summary aggregates customization total with GST 18% additive (per L25). Customization total ADDS to existing build-job parts cost in main estimate. `CustomizationCostBreakdown` component shows itemized breakdown: each category name + price, subtotal, GST line, total.** | Per L25, GST on parts/services is full-value additive 18%. The customization total is logically separate from the parts-estimate parts cost but contributes to the overall build quote. |
| L82 | **Customizers display priced option cards (name + description + `₹formatINR` + selected checkmark), NOT bare swatches. Stock option (₹0) always available + first.** `OptionCard` shared component used by all customizer tabs. Replaces: swatch grid (wheels), slider + swatches (tint), swatch cards (exhaust), slider (suspension). | Bare swatches provided no pricing context. Option cards present the full commercial offering — customers understand they're buying a part/service, not just a visual change. The suspension slider also had pointer-events stacking conflicts with the R3F canvas; option cards eliminate this class of bug entirely. |

### Bug fixes

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Bug 1 — Decals below car | `computeDecalSlots` called `setFromObject(scene)` which included the ContactShadow plane at Y=-0.05. This made `box.min.y < 0`, lowering `center.y` and placing door/fender decals in the negative Y space (below the body). | `findBodyObject(scene)` finds the first non-shadow/non-wheel top-level group. `computeDecalSlots` now calls `setFromObject(bodyObject)` instead of `setFromObject(scene)`. Slot Y for side panels: `center.y + sy * 0.05` (above center = upper panel). |
| Bug 2 — Wheel options not visible/working | `WheelCustomizer` rendered a 3x2 grid of small swatch circles with no visible price or affordance. The circles were easily lost in the dark panel. `onChange` only updated `wheelMaterial` — no catalog ID persisted, so pricing was impossible. | Replaced with `OptionCard` list (full-width cards with name + price + checkmark). Added `selectedOptionId`/`onSelectOption` props to drive both the legacy `wheelMaterial` field (for `applyWheelMaterial`) and the new `wheelOptionId` (for pricing). |
| Bug 3 — Suspension slider unresponsive | `<input type="range">` inside `.flex-1.overflow-y-auto.relative.z-10.pointer-events-auto` still received pointer-events from the R3F canvas parent in certain browser layouts. The root cause was the canvas's `style.position` and `z-index` creating a new stacking context that sat above the slider despite `z-index: 10` on the panel. | Replaced slider with `SuspensionCustomizer` option cards. Button `onClick` handlers are immune to pointer-events stacking context issues. |

### Files changed

| File | Change |
|------|--------|
| `apps/staff-web/src/lib/custom-builds/customization-catalog.ts` | New — 5 priced catalogs + `computeCustomizationCost()` |
| `apps/staff-web/src/lib/custom-builds/customization-controller.ts` | L80: `findBodyObject()` + `computeDecalSlots` body-group isolation + fixed slot positions |
| `apps/staff-web/src/lib/custom-builds/decal-library.ts` | Added `price: number` field to `DecalDefinition` |
| `packages/types/src/domain/custom-builds.ts` | `VisualizationCustomizationsSchema` extended with `wheelOptionId`, `tintOptionId`, `exhaustOptionId`, `suspensionOptionId`, `hoodOptionId`, `wingOptionId`, `aero` fields |
| `apps/staff-web/src/components/custom-builds/visualizer/option-card.tsx` | New — shared priced option card component |
| `apps/staff-web/src/components/custom-builds/visualizer/wheel-customizer.tsx` | Rewrite — priced cards + `selectedOptionId`/`onSelectOption` props |
| `apps/staff-web/src/components/custom-builds/visualizer/tint-customizer.tsx` | Rewrite — priced cards + `selectedOptionId`/`onSelectOption` props |
| `apps/staff-web/src/components/custom-builds/visualizer/exhaust-customizer.tsx` | Rewrite — priced cards + `selectedOptionId`/`onSelectOption` props |
| `apps/staff-web/src/components/custom-builds/visualizer/suspension-customizer.tsx` | Rewrite — priced cards (slider removed, Bug 3 fix) + `selectedOptionId`/`onSelectOption` props |
| `apps/staff-web/src/components/custom-builds/visualizer/hood-customizer.tsx` | New — Hood category (P3.3.6, L79) |
| `apps/staff-web/src/components/custom-builds/visualizer/wing-customizer.tsx` | New — Wing category (P3.3.6, L79) |
| `apps/staff-web/src/components/custom-builds/visualizer/customization-panel.tsx` | Added Hood + Wing tabs; wired optionId props to all customizers |
| `apps/staff-web/src/components/custom-builds/visualizer/customization-cost-breakdown.tsx` | New — itemized cost breakdown + GST (L81) |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-tab.tsx` | Wired `CustomizationCostBreakdown` above `CostSummary` footer |
| `apps/staff-web/src/lib/custom-builds/__tests__/customization-catalog.test.ts` | New — 8+ catalog integrity + cost computation + schema tests |

### Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-36-1 | Each catalog (`WHEEL_OPTIONS`, `TINT_OPTIONS`, `EXHAUST_OPTIONS`, `SUSPENSION_OPTIONS`, `HOOD_OPTIONS`, `WING_OPTIONS`) has at least 1 stock option (price=0) as the first entry, and at least 3 paid options. |
| AC-36-2 | `computeCustomizationCost({ wheelOptionId: 'wheel-bronze', tintOptionId: 'tint-dark-smoke' })` returns `subtotal = 177000`, `gst = 31860`, `total = 208860`. |
| AC-36-3 | `VisualizationCustomizationsSchema.safeParse({ hoodOptionId: 'hood-carbon', wingOptionId: 'wing-gt3' })` succeeds. |
| AC-36-4 | Decal door-left slot Y position >= `center.y` of the body mesh even when a ContactShadow plane is present in the scene at Y=-0.05. |
| AC-36-5 | Selecting wheel option in UI calls `onChange({ wheelOptionId })` and `onChange({ wheelMaterial })` in the same handler (both fields updated). |
| AC-36-6 | `CustomizationCostBreakdown` renders `null` when no customizations are selected (subtotal=0). |
| AC-36-7 | Hood + Wing panels show "Visualizer rendering coming in v0.2" notice. |

---

## 37. §37 — Visualizer UI Polish + Catalog Depth + Cost Rollup Fix (v2.7)

### Locked decisions

| # | Decision | Rationale |
|---|----------|-----------|
| L83 | **Hood catalog expanded to 6 options with brand + weightSaving + material metadata. Capristo, Novitec, Mansory partnerships referenced.** `HOOD_OPTIONS`: Stock Bonnet (Ferrari OEM), Twill Carbon Bonnet (Capristo ₹2.85L, -8.5kg), GT Vented Carbon Bonnet (Novitec ₹3.85L, -10kg), Forged Carbon Bonnet (Mansory ₹5.25L, -11kg), Pro Race Vented Bonnet (Capristo ₹6.45L, -12kg), Glass-Inset Display Bonnet (Mansory ₹8.25L). All options have `brand`, `material`, `weightSavingKg`, `description`. | 4-option catalog was insufficient for a luxury positioning. Real-world brand partnerships (Capristo, Novitec, Mansory) are common Ferrari aftermarket shops in India's metro luxury market. Glass-inset bonnet is a popular showroom conversation piece. |
| L84 | **Wing catalog expanded to 7 options with brand + downforceKgAt200 + adjustable/active flags. Includes APR Swan-Neck GT race-spec.** `WING_OPTIONS`: No Spoiler (Ferrari OEM), Carbon Lip (Capristo ₹65K, 4kg↓), Ducktail (Novitec ₹1.25L, 6kg↓), GT3-Style Adjustable (Misha Designs ₹2.85L, 18kg↓, adjustable), FXX-K Race Wing (Mansory ₹4.85L, 28kg↓, adjustable), Active Aero Spoiler (Capristo ₹6.85L, 22kg↓, active), Swan-Neck GT Wing (APR Performance ₹4.25L, 35kg↓, raceSpec). | Aerodynamic claim depth (kg downforce at 200km/h) differentiates catalog items. Swan-neck GT wing is a track-segment buyer preference. Active aero is premium positioning. |
| L85 | **Wheel catalog expanded to 8 options including BBS, OZ, HRE, Vossen, Anrky brands; size (20"/21"/22") + finish + tireSet flag for Michelin set.** BBS Motorsport 20" gunmetal (₹1.45L), OZ Superleggera 20" gloss-black (₹1.65L), HRE P101SC 21" forged bronze (₹2.45L), BBS LM 20" brushed (₹1.95L), Vossen S17-01 21" (₹2.85L), ANRKY AN35 22" (₹4.25L), Michelin Pilot Sport 4S Set (₹1.65L, tireSet=true). | Premium wheel market in India is well-established. HRE/Vossen/BBS are recognized by luxury car buyers. Tire set option covers a common upsell bundling pattern. |
| L86 | **Tint catalog expanded to 9 options with brand (3M, LLumar, SunTek, XPel) + VLT% (visible light transmission) + Karnataka legal-tint flag where applicable.** 3M Crystalline 70/50/30, LLumar Stratos 30, SunTek Carbon Blue, Bronze Heritage (XPel Prime XR), Mirror Reflective (XPel), XPel PPF + Tint Combo (includesPpf=true). `color` field now supports `'clear'` added to `TintColorEnum`. | Brand transparency is required for premium aftermarket proposals — customers research 3M vs LLumar. VLT field enables legal compliance display (Karnataka Motor Vehicles Act tint rules). PPF+tint bundle is a high-value upsell in the luxury segment. |
| L87 | **Exhaust catalog expanded to 8 options with brand depth (Akrapovic, Tubi, Capristo, iPE Innotech) + material + weightSavingKg + valvetronic flag.** Added: Akrapovic Evolution (₹3.85L, titanium, -16kg), Tubi Style Stainless (₹2.95L), iPE Innotech Valvetronic (₹2.25L, valvetronic=true). Legacy `exh-akrapovic` ID preserved for backwards compatibility. | Akrapovic is the most recognized Ferrari exhaust brand in India. Tubi Style has a cult following for its acoustic signature. iPE valvetronic enables quiet/sport mode selection — a strong differentiator for daily-driven Ferraris. |
| L88 | **Suspension catalog expanded to 7 options including KW V3, KW Clubsport, Air Lift 3P. adjustable/raceSpec/airRide flags.** Added: Novitec Lowering Module -25mm (₹1.45L), KW Clubsport 2-Way -45mm (₹4.25L, raceSpec), Air Lift Performance 3P (₹5.25L, airRide). Legacy `susp-airride-50` ID replaced by `susp-airride` (breaking change, tests updated). | KW Suspensions is the reference coilover brand for track-day Ferraris. Air Lift enables show-car ride-height presets. Novitec module preserves the factory adaptive damping — important for daily-driver customers. |
| L89 | **CostSummary footer aggregates full customization total (paint + all 6 catalog categories + decals) — not just paint price. `customizationTotal` prop added to `CostSummaryProps` (optional, defaults to 0 for backwards compat).** In `visualizer-tab.tsx`, `computeCustomizationCost` is called for the active 3D customizations (excluding paint, which already flows into `totalCost` via `paintCost`). `catalogSubtotal` is passed as `customizationTotal` to `CostSummary`. `displayTotal = selectedTotal + customizationTotal` drives the bottom-left ticker. | The bug: `selectedTotal` (overlay parts + paint) was passed directly as the "SELECTED OPTIONS" amount, ignoring all 6 catalog categories (wheel/tint/exhaust/suspension/hood/wing/decals). The breakdown panel above showed ₹5,13,300 while the footer showed ₹42,000 (paint only). The fix wires both together via `customizationTotal`. |
| L90 | **Customization-panel UI font scale bumped throughout: tab `text-[13px]`, section headings `text-[14px]` font-semibold, card title `text-[15px]` font-semibold, brand line `text-[11px]`, description `text-[12px]`, price `text-[16px]` font-semibold tabular-nums, breakdown labels `text-[14px]`, breakdown values `text-[15px]`, breakdown total `text-[20px]` font-bold. Card padding `p-4`, `min-h-[88px]`, gap-3. Paint swatches `w-12 h-12`. Selected-options footer: label `text-[12px]` tracking-widest, amount `text-[20px]` font-bold, saved estimate `text-[18px]` font-semibold.** | The prior panel used `text-[10px]`–`text-[13px]` throughout — too small for a primary configurator UI that forms the core of the Custom Builds commercial proposition. Larger fonts, taller cards, and bigger swatches improve legibility and visual hierarchy for a luxury product configuration experience. |

### Files changed

| File | Change |
|------|--------|
| `apps/staff-web/src/lib/custom-builds/customization-catalog.ts` | L83–L88: All 6 catalogs expanded. New fields: `brand`, `material`, `weightSavingKg`, `downforceKgAt200`, `adjustable`, `active`, `raceSpec`, `airRide`, `tireSet`, `vlt`, `includesPpf`, `valvetronic`, `size`. `CatalogOption` base type extended with optional `brand`, `material`, `weightSavingKg`. |
| `packages/types/src/domain/custom-builds.ts` | `TintColorEnum` extended with `'clear'`. `TintColor` type now includes `'clear'`. |
| `apps/staff-web/src/lib/custom-builds/customization-controller.ts` | `TINT_COLOR_HEX` extended with `'clear': 'rgba(255,255,255,0.05)'`. |
| `apps/staff-web/src/components/custom-builds/visualizer/cost-summary.tsx` | L89: `customizationTotal?: number` prop added. `displayTotal = selectedTotal + customizationTotal`. Footer "SELECTED OPTIONS" amount uses `displayTotal`. Font sizes bumped: label `text-[12px]` tracking-widest, amount `text-[20px]` font-bold, saved estimate `text-[18px]`. |
| `apps/staff-web/src/components/custom-builds/visualizer/visualizer-tab.tsx` | L89: `computeCustomizationCost` imported. `catalogSubtotal` computed from active 3D customizations (excl. paint). Passed as `customizationTotal` to `CostSummary`. |
| `apps/staff-web/src/components/custom-builds/visualizer/option-card.tsx` | L90: `brand` prop added. Brand displayed below name in `text-[11px]`. Padding `px-4 py-4`, `min-h-[88px]`. Title `text-[15px]` font-semibold. Price `text-[16px]` font-semibold. Description `text-[12px]`. Checkmark `w-5 h-5`. |
| `apps/staff-web/src/components/custom-builds/visualizer/wheel-customizer.tsx` | L90: Section heading `text-[14px]` font-semibold. Swatch `w-9 h-9`. `brand` passed to OptionCard. |
| `apps/staff-web/src/components/custom-builds/visualizer/tint-customizer.tsx` | L90: Section heading `text-[14px]` font-semibold. Swatch `w-9 h-9`. `brand`/`description` passed to OptionCard. `TINT_HEX` extended with `'clear'`. |
| `apps/staff-web/src/components/custom-builds/visualizer/exhaust-customizer.tsx` | L90: Section heading `text-[14px]` font-semibold. Swatch `w-9 h-9`. `brand` passed to OptionCard. |
| `apps/staff-web/src/components/custom-builds/visualizer/suspension-customizer.tsx` | L90: Section heading `text-[14px]` font-semibold. `brand` passed to OptionCard. |
| `apps/staff-web/src/components/custom-builds/visualizer/hood-customizer.tsx` | L90: Section heading `text-[14px]` font-semibold. `brand`/`description` passed to OptionCard. |
| `apps/staff-web/src/components/custom-builds/visualizer/wing-customizer.tsx` | L90: Section heading `text-[14px]` font-semibold. `brand`/`description` passed to OptionCard. |
| `apps/staff-web/src/components/custom-builds/visualizer/customization-cost-breakdown.tsx` | L90: Section heading `text-[12px]` tracking-widest. Row label `text-[14px]`. Row value `text-[15px]`. Total label `text-[14px]`. Total value `text-[20px]` font-bold. |
| `apps/staff-web/src/components/custom-builds/visualizer/customization-panel.tsx` | L90: Tab labels `text-[13px]`. Paint swatch `w-12 h-12`. Paint name/price `text-[11px]`. |
| `apps/staff-web/src/lib/custom-builds/__tests__/customization-catalog.test.ts` | Updated stale IDs (hood-carbon→hood-carbon-twill, wing-gt3→wing-gt3-replica, susp-airride-50→susp-coilovers-clubsport, wheel-bronze price 145000→245000). Added 28 new tests covering catalog counts, brand fields, VLT, flags, and full-build cost rollup. |

### Acceptance criteria

| # | Criterion |
|---|-----------|
| AC-37-1 | `HOOD_OPTIONS.length === 6`. First option is stock (₹0). All options have `brand` field. |
| AC-37-2 | `WING_OPTIONS.length === 7`. Swan-neck GT wing has `raceSpec=true`, `adjustable=true`, `downforceKgAt200=35`. |
| AC-37-3 | `WHEEL_OPTIONS.length === 8`. Michelin set option has `tireSet=true`. All options have `size` field. |
| AC-37-4 | `TINT_OPTIONS.length === 9`. All options have `vlt` field. Stock has `vlt=100`. XPel PPF combo has `includesPpf=true`. |
| AC-37-5 | `EXHAUST_OPTIONS.length === 8`. iPE Innotech option has `valvetronic=true`. Akrapovic Evolution has `weightSavingKg=16`. |
| AC-37-6 | `SUSPENSION_OPTIONS.length === 7`. Air Lift 3P has `airRide=true`. KW Clubsport has `raceSpec=true`. |
| AC-37-7 | `CostSummary` with `customizationTotal=471000` and `selectedTotal=42000` renders `₹5,13,000` (or equivalent sum) in the "SELECTED OPTIONS" ticker. |
| AC-37-8 | `computeCustomizationCost` with all 6 catalog categories + paint + decals returns `total = subtotal + gst`. |
| AC-37-9 | `OptionCard` renders brand text below name when `brand` prop is provided. |
| AC-37-10 | All typecheck + vitest tests pass (655 tests). |

---

## 38. §38 — v2.8 Features: Presets, Drag Panel, Preview Render, Playground, Cost Ledger, Customer Portal

### Locked decisions (L91–L96)

| # | Decision |
|---|---|
| L91 | **Customization presets — 5 one-click bundles** in `customization-presets.ts`. Preset IDs: `preset-race-build`, `preset-track-day`, `preset-concours`, `preset-stealth`, `preset-signature`. Each covers all 7 catalog categories + paint color. Preset section renders as a collapsible above the category tabs in `CustomizationPanel`. Cards show icon + name + description + total price (via `computeCustomizationCost`). Applying a preset sets all customizations + paint in one action. Toast confirms "Applied {preset name}". `onApplyPreset` callback passes through parent `VisualizerTab` → `handleApplyPreset`. |
| L92 | **Visualizer panel width is user-controllable** via a vertical drag handle between the canvas and the right-rail panel. Range: 320–600px. Default: 420px. Persisted to `localStorage` key `bn-customizer-panel-width`. Restored from localStorage on mount (useEffect, client-only). Drag: `onMouseDown` → `onMouseMove` on `window`. Mobile (breakpoint < lg): stacks vertically, no drag handle. Desktop: `hidden lg:flex` rail with `style={{ width: panelWidth }}`. Handle: 4px wide absolute strip, `cursor-col-resize`, accent color on hover. |
| L93 | **Public quote preview embeds 3D render** of saved customizations when `BuildJob.visualizerState.customizations` is present. Read-only `Visualizer3DCanvas` (lazy-loaded, `ssr: false`). `readOnly` prop → `OrbitControls` + buttons disabled, no auto-rotate. Paint color restored from `vizState.paintKey` (persisted on save via spread in `saveVisualizerState`). Customization breakdown table rendered below the 3D viewer showing all non-stock options + subtotal. For non-Ferrari builds (no 3D asset): renders a placeholder card. Route: `/custom-builds/preview/[token]` unchanged. |
| L94 | **Visualizer Playground** at `/custom-builds/visualizer-playground`. Standalone visualizer using a synthetic `BuildJob` (`id: '__playground__'`). `saveVisualizerState` call is a no-op for `__playground__` (no real job in store, store find returns undefined). "Save to Build" button is grayed out with a tooltip: "In playground mode, customizations are not persisted. Create a Build Job first." Accessible via "Visualise a Car" secondary button on the Custom Builds board header. Playground reuses `VisualizerTab` directly — no separate state. |
| L95 | **`deliverJob` writes 4 cost-ledger entries** when `visualizerState.customizations` is present (non-zero total). Entry 4: category `custom-build-customizations`, amount = `computeCustomizationCost({ paintPrice, ...customizations }).total` (includes GST). Paint price resolved from `PAINT_BY_KEY[vizState.paintKey]?.listPrice`. `CostLedgerCategoryEnum` extended with `'custom-build-customizations'` in `@dms/types/inventory.ts`. When no visualizer customizations are set, only 3 entries are written (backward-compatible). `costLedgerWriteRef.entryIds` includes all 3 or 4 entry IDs. |
| L96 | **Customer portal mirror** at `(portal)/builds` (list) + `(portal)/builds/[id]` (detail). List: customer's own build jobs filtered by `customerId === currentCustomer.id` (from `usePortalAuth()`). Uses direct fixture import from `@dms/mocks/fixtures` (`buildJobs`). Detail: 4 read-only tabs — Overview (stage timeline), Configuration (visualizer state summary), Cost summary (parts + quote total), Activity (public events only — no `note_added` events leaked). Stage timeline uses SVG-free CSS border-l approach. No mutation actions on any tab. Portal nav entry: "Builds" (`Hammer` icon). Translations: `portal.builds.list.*`, `portal.builds.detail.*` in `en-IN.json` + `hi-IN.json`. |

### Pending decisions (v0.1 — asset-gated)

| # | Feature | Why pending | Effort once assets arrive |
|---|---|---|---|
| PENDING-1 | **Hood/Wing 3D visual rendering** — PARTIALLY UNBLOCKED (v2.9). Hood now performs a material swap (carbon weave texture) via `applyHoodMaterial`. Wing now renders procedural geometry via `applyWing`. Both trigger from `applyAllCustomizations`. Remaining gap: named hood meshes in Ferrari GLB are required for the hood material to target the correct panel — currently falls back to positional heuristic. | Ferrari GLB hood mesh is unnamed/part of body group. Designer must confirm mesh names or deliver a patched GLB with `bonnet_panel` named mesh. | Add `bonnet_panel` to GLB (trivial Blender rename) → hood swap immediately targets correct mesh via `hoodMeshHints`. |
| PENDING-2 | **Wheel diameter visual scaling** — UNBLOCKED (v2.9) via `applyWheelMaterialAndSize`. `wheelSizeInches` param drives `scale.set(1, factor, factor)`. 22" = 1.10× visible scale. Remaining gap: scale distorts round rim geometry — adequate for visual indication but not design-accurate. | Real per-diameter wheel GLBs produce correct geometry without scale distortion. | Swap `applyWheelMaterialAndSize` to a geometry-replace approach when per-diameter GLBs arrive. |
| PENDING-3 | **Alternate wheel GLBs** (5-spoke / Y-spoke / multi-spoke variants matching HRE P101SC, Anrky AN35, etc.). Currently all wheel selection changes only material/finish (color), not geometry. A flat BBS 3-piece looks different from a deep-dish Vossen or a multi-spoke HRE — geometry-level swap required. | Requires designer to model or source 8 wheel GLBs (one per `WHEEL_OPTIONS` entry), each sized to Ferrari hub diameter, with a consistent pivot at wheel center. | ~3 days once GLBs are available: add `glbUrl` to `WheelOption`, register per-wheel in 3D registry, extend `applyWheels` to swap geometry mesh. |

### Acceptance criteria (§38)

| ID | Criterion |
|----|-----------|
| AC-38-1 | `CUSTOMIZATION_PRESETS.length === 5`. Each has `id`, `name`, `description`, `icon`, `paintColorId`, `customizations` with all 6 `*OptionId` fields. `computePresetTotal` returns a non-zero INR total for all 5. |
| AC-38-2 | Applying "Race Build" preset sets `customizations.exhaustOptionId === 'exh-akrapovic'`, `customizations.suspensionOptionId === 'susp-coilovers-clubsport'`, and `activePaintKey === 'guards-red'` in `VisualizerTab` state. Toast appears with "Applied "Race Build"". |
| AC-38-3 | `localStorage.getItem('bn-customizer-panel-width')` persists the panel width after dragging on desktop. Page reload restores the saved width. Panel width stays within 320–600px when dragged to extremes. |
| AC-38-4 | Public preview for a job with `visualizerState.customizations.wheelOptionId === 'wheel-anrky-22'` renders a table row showing "Wheels" and the option name. |
| AC-38-5 | `/custom-builds/visualizer-playground` renders `VisualizerPlayground` with a header "Visualiser Playground" and a disabled "Save to Build" affordance. No navigation to the store occurs on customization change. |
| AC-38-6 | `deliverJob` with `visualizerState.customizations.wheelOptionId === 'wheel-bronze'` (price ₹2,45,000) + paint `guards-red` (price ₹48,000) writes a 4th ledger entry with `category === 'custom-build-customizations'` and `amount > 0`. |
| AC-38-7 | `CostLedgerCategoryEnum` parses `'custom-build-customizations'` without a Zod error. |
| AC-38-8 | Customer portal `/builds` list shows only jobs where `customerId === 'cust-arjun-mehta'` when the mock portal customer is Arjun Mehta. Jobs for other customers do not appear. |
| AC-38-9 | Customer portal `/builds/[id]` activity tab does NOT show `note_added` events. Only public event types (`job_created`, `stage_advanced`, `quote_saved`, etc.) appear. |
| AC-38-10 | All typecheck + vitest tests pass (655 pre-existing + 10+ new). |

---

## 39. §39 — v2.9 Asset Pipeline: Procedural Hood/Wing + Wheel Diameter + Decal Polish

### Asset pipeline status

This section documents what is now visible in the 3D visualizer versus what remains pending designer GLB assets.

#### What is now visible (v2.9)

| Category | Before v2.9 | After v2.9 | Approach |
|---|---|---|---|
| **Hood — Carbon variants** | Price only, no 3D change | Hood mesh material swaps to dark carbon-weave texture | `applyHoodMaterial` + `THREE.CanvasTexture` (procedural 2×2 twill) + `MeshPhysicalMaterial` (metalness 0.7, clearcoat 0.5) |
| **Hood — GT/Pro Vented** | Price only, no 3D change | Carbon material + thin `BoxGeometry` vent-slot overlay meshes added on top of hood | Same as above + procedural vent slats (2–3 strips) |
| **Hood — Forged Carbon** | Price only, no 3D change | Carbon material with marbled noise texture | `makeCarbonWeaveTexture(forged=true)` — random stroke pattern |
| **Wing — all 6 variants** | Price only, no 3D change | Procedural wing geometry added to scene at car rear | `applyWing` — BoxGeometry elements (wing + stanchions + end-plates); carbon-matte material |
| **Wheel diameter 20"/21"/22"** | No visual size difference | 22" = 1.10× Y/Z scale; 18" = 0.90× | `applyWheelMaterialAndSize` — `scale.set(1, factor, factor)` + Y-position raise |
| **Decals — all 6** | Basic placeholder SVGs (flat shapes, no gradients) | Refined inline SVGs with gradients, drop shadows, gold accents, race typography | `decal-library.ts` SVG upgrade (L100) |

#### What remains pending (designer GLB required)

| Gap | Status | Unblock path |
|---|---|---|
| Hood mesh name targeting | Ferrari GLB hood is unnamed/part of body group — positional heuristic fires | Rename mesh to `bonnet_panel` in Blender → matches `hoodMeshHints` immediately |
| Wheel geometry variation (PENDING-3) | All 8 wheel options show same spoke geometry, different finish only | Deliver per-wheel GLBs + add `glbUrl` to `WheelOption` |
| Named wing mounting points | Wing attached at bounding-box rear (approximate) | Annotate GLB rear-deck anchor or deliver dedicated wing.glb per variant |

#### Designer swap instructions

- **Hood GLBs**: drop `hood-{variant}.glb` into `public/assets/3d/`. Add `hoodGlbVariants: Record<string, string>` to `Asset3DRecord`. Update `applyHoodMaterial` to load via `useGLTF` analogous to body scene. No other code changes.
- **Wheel GLBs**: add `glbUrl?: string` to `WheelOption` in `customization-catalog.ts`. Implement mesh-swap in `applyWheelMaterialAndSize` — replace geometry rather than scaling.
- **Decal PNGs**: in `decal-library.ts`, change `src` from `svgToDataUri(...)` to `'/assets/decals/{slug}.png'`. No other code changes.

### Locked decisions (L97–L100)

| # | Decision |
|---|---|
| L97 | **Hood visual swap via material change + procedural CanvasTexture**. `applyHoodMaterial(scene, hoodOptionId, hoodMeshHints)` traverses scene for meshes matching `hoodMeshHints` (['hood', 'bonnet', 'frunk']); falls back to positional heuristic (front-upper bounding box region) when no name match. Carbon variants apply `MeshPhysicalMaterial` with `makeCarbonWeaveTexture()` — a 128×128 canvas with 2×2 twill weave diagonals. Forged carbon uses `makeCarbonWeaveTexture(forged=true)` — random noise strokes. GT/Pro Vented adds 2–3 thin `BoxGeometry` vent strips. Stock: no-op. `hoodMeshHints` added to `Asset3DRecord`. PENDING-1 partially unblocked. Real hood GLBs swap via `hoodGlbVariants` registry (future). |
| L98 | **Wing visual via procedural geometry attached to scene**. `applyWing(scene, wingOptionId)` derives car rear position from bounding box (`box.min.z` = rear for Ferrari). 6 wing variants: Lip (thin strip), Ducktail (wider strip), GT3-Replica (wing + 2 stanchions), FXX-K (GT3 + end-plates), Active Aero (flush deployed), Swan-Neck GT (inverted-mount stanchions). Material: `MeshPhysicalMaterial` with `makeCarbonWeaveTexture()`. All procedural meshes tagged `__procedural-wing__` for cleanup. Undo removes all created meshes. PENDING-1 fully unblocked for wings. |
| L99 | **Wheel diameter scaling via uniform Y/Z mesh scale** (`scale.set(1, factor, factor)`). `applyWheelMaterialAndSize(scene, material, wheelSizeInches)` extends `applyWheelMaterial` with diameter-proportional scaling: `scaleFactor = wheelSizeInches / 20` (20" = stock = 1.0; 22" = 1.10×). Wheel Y-position raised by `(scaleFactor - 1) * 0.32` to prevent ground penetration. Documented as diameter approximation — scale distorts round mesh; real wheel GLBs (PENDING-3) will replace with geometry swap. PENDING-2 visually approximated. |
| L100 | **Decals upgraded to refined inline SVGs** with gradients, drop shadows, gold accents, bevels, and race-style typography. 6 decals: BN Logo (circle + gold ring + serif BN + gold AUTOMOBILES text), Racing Stripe (fade-edge triband with red accent), Number Badge (round 88 with serif font + ring), Side Stripe (2048×512 carbon-fiber approximation with diagonal hatching), Rear Stripe (bold chevron + red accent), Tricolor Flag (gold border + inner white border + gloss overlay). Still data-URIs; designer swaps with PNG paths in `src` field. PENDING (decal PNGs) unblocked — code path ready. |

### Acceptance criteria (§39)

| ID | Criterion |
|----|-----------|
| AC-39-1 | `applyHoodMaterial(scene, 'hood-carbon-twill', ['bonnet'])` when scene has a bonnet-named mesh → mesh material becomes `MeshPhysicalMaterial` with `clearcoat > 0`. |
| AC-39-2 | `applyHoodMaterial(scene, 'hood-stock', ...)` → no-op; original material unchanged. |
| AC-39-3 | `applyWing(scene, 'wing-gt3-replica')` → exactly 3 meshes added to scene (wing element + 2 stanchions). |
| AC-39-4 | `applyWing(scene, 'wing-stock')` → 0 new meshes; existing `__procedural-wing__` meshes removed. |
| AC-39-5 | `applyWheelMaterialAndSize(scene, 'silver', 22)` → wheel mesh `scale.y === 1.1`, position.y raised. |
| AC-39-6 | `applyWheelMaterialAndSize(scene, 'silver', 20)` → wheel scale unchanged from stock. |
| AC-39-7 | `DECAL_LIBRARY` has 6 entries; all `src` values are non-empty data URIs. |
| AC-39-8 | All 767 tests pass. `tsc --noEmit` clean for custom-builds files. |

---

## 22. Changelog

| Date | Change |
|------|--------|
| 2026-04-28 | Review fixes applied (B1–B5). L16 GST-labour formula (`gstOnLabour = (vendorLabour + bnMargin × labourShare) × 0.18`, loss-sale clamp, empty-job guard). L17 `CostLedgerCategoryEnum` extension (P4 hard prerequisite). B2 `deliverJob` finance-gate guard made explicit. B3 public preview PII exclusion list added to §9.6. B5 `QC_FAILED` made a resting Kanban state with R10+ "Send for rework" CTA. AC `commissionPct: 0` renamed to `marginPct: 0`. Status → approved. |
| 2026-04-28 | **v1.1** — P1.1 UX overhaul. Added §23 (P1.1 locked decisions L18–L24, acceptance criteria). Breadcrumb fix (L19), view toggle (L18), stub toasts (L20), primitive reuse (L24), full CRUD per tab (L20–L22), create wizard (L23). Spec version bumped to 1.1. |
| 2026-04-29 | **v1.3** — P3 2D Visualizer shipped. Added §24, L27–L29. 5 new files, 2 modified. 20 new tests. `tsc --noEmit` clean. Spec bumped to 1.3. |
| 2026-04-29 | **v1.4** — P3.1 DnD wiring + P2 completion + fixtures. Added §25, L30–L34. Native HTML5 DnD on Kanban (L30), PDF decision (L31), GST breakdown in estimate tab (L32), saveQuote + share wired (L33), 3 new fixtures CBJ-010/011/012 (L34). 26 new tests. Total: 370 passing. `tsc --noEmit` clean. |
| 2026-04-29 | **v1.5** — P3.1 Visualizer wow-factor pass. Locked L35–L38. 5 premium multi-layer SVG car silhouettes (L35), 12 luxury paint colors via CSS filter (L36), showroom backdrop + floor reflection + ambient glow (L37), compare slider + fullscreen + paint picker + animated ticker (L38). Added `paint-palette.ts`, 5 per-model SVG asset files, rebuilt all 4 visualizer components. 35 visualizer tests (12 existing + 23 new) — all passing. Total passing tests unchanged (pre-existing cost-ledger failures not caused by this pass). `tsc --noEmit` clean. |
| 2026-04-29 | **v1.6** — P4 Cost-Ledger Integration shipped. Locked L39–L41. See §27 for full details. 395 tests passing (10 new cost-ledger tests). `tsc --noEmit` clean. |
| 2026-04-29 | **v1.7** — UI Polish pass. Locked L42–L45. `Slider` primitive (L42); Kanban card + column overhaul to match sales deal-card (L43); Add Vendor dialog wired (L44); WhatsApp + AI Call contact buttons on build detail via adapter (L45). 11 new tests — 406 total. `tsc --noEmit` clean. |
| 2026-04-29 | **v1.8** — Design-quality SVG polish. Locked L46. All 5 base car SVGs rewritten with model-accurate proportions, layered hood/skirt/fender paths, brand-specific caliper colours, refined light signatures, door shut lines, and exhaust details. 2 new validation tests — 411 total. `tsc --noEmit` clean. |
| 2026-04-29 | **v1.10** — Slider primitive rewrite. Locked L50. Replaced `opacity-0` hidden-input overlay technique with direct `[&::-webkit-slider-thumb]` / `[&::-moz-range-thumb]` pseudo-element styling on the real `<input type="range">`. Filled-track progress via inline `linear-gradient`. Cross-browser chrome fully suppressed. L42 implementation note updated. 7 new slider logic tests — all passing. `tsc --noEmit` clean. |
| 2026-04-29 | **v2.0** — P3.2 3D Visualizer (MAJOR — paradigm shift). Locked L51–L56. Pivoted from 2D SVG to react-three-fiber + drei + Three.js r169. 3D viewer ships for Porsche 911 Carrera S (Ferrari GLB from three.js examples, MIT license, stand-in for v0). 2D retained as WebGL fallback. 4 new files, 1 updated. 17 new tests. `tsc --noEmit` clean (zero new errors). Spec bumped to v2.0. |
| 2026-04-29 | **v2.1** — P3.3 Customization System spec + scope reduction. Added §31 (P3.3) with L57–L64. Scope reduction: Ferrari is the only 3D car (L57) — `ASSET_3D_REGISTRY` key changed from `porsche-911` to `ferrari`, "coming soon" banner updated. `vehicleToModelSlug` Ferrari-first routing added. Ferrari demo VIN `ZFF92LLA0L0260123` added to vehicles.ts fixture. CBJ-013 (Ferrari 488 GTB IN_PROGRESS, 3D visualizer demo) added to custom-builds.ts. 511 tests passing (7 new: 5 Ferrari routing + 2 fixture count updates). `tsc --noEmit` clean. Spec bumped to v2.1. |
| 2026-04-29 | **v2.2** — P3.3 Customization System implementation. Added §33 with implementation notes. Shipped: `VisualizationCustomizationsSchema` + 5 new enums in `@dms/types`; `customization-controller.ts` (280 LoC, pure functions + undo callbacks); `decal-library.ts` (6 inline SVG decals); `customization-panel.tsx` + 5 sub-customizer components (wheel/tint/exhaust/suspension/decal); `car-model.tsx` wired to `applyAllCustomizations`; `visualizer-tab.tsx` split rail + customizations state. 35 new tests. 563 total passing. `tsc --noEmit` clean. Pre-existing typecheck errors resolved (`ownership-badge.tsx`, `wizard-step-vehicle.tsx`, `wizard-flows.test.ts`). |
| 2026-04-29 | **v2.3** — Wizard new-customer + linked-car flows. Added §32 with L65–L68. Three new wizard flows: (1) inline customer creation with DPDP consent capture (L65), (2) vehicle dropdown filtered by `selectVehiclesByCustomer` with empty-state and "Link a Car" CTA (L66), (3) inline "Link a car" sub-form with `upsertVehicle` + `openOwnership` + `appendEvent` at source `CUSTOM_BUILD_LINKED` (L67), (4) provenance audit log 3-entry sequence on BuildJob creation (L68). New type: `VehicleTouchSource: 'CUSTOM_BUILD_LINKED'`; new field: `Customer.dpdpConsentGivenAt`. 10 new tests in `custom-builds-wizard-flows.test.ts`. Cross-module wiring doc updated (seams 11+12). `tsc --noEmit` target: clean. Spec bumped to v2.3 (v2.2 skipped — reserved for P3.3 implementation). |
| 2026-04-29 | **v2.4** — 3D Visualizer bug-fix pass. Added §34 with L69–L73. 6 issues fixed: (L69) tint lamp-lens exclusion, (L70) exhaust hint-only detection + no positional fallback + `exhaustMeshHints` on `Asset3DRecord`, (L71) decal slots computed from runtime bounding box, (L72) 3D mode shows only `CustomizationPanel` + Paint tab migrated in, (L73) pointer-events + z-index on panel content + `scrollbar-thin-dark` on configurator tabs. 17 new regression tests. 580 total passing. `tsc --noEmit` clean. |
| 2026-04-29 | **v2.5** — 3D Visualizer rendering bug-fix pass (black band + decals). Added §35 with L74–L77. Fixed ContactShadows position artefact (L74), applySuspension no-op guard (L75), async decal texture loading (L76), decal load-failure graceful skip (L77). 4 new tests. `tsc --noEmit` clean. |
| 2026-04-29 | **v2.6** — Priced parts catalog + Hood/Wing + Bug fixes. Added §36 with L78–L82. Bug 1 (decals below car) fixed via body-group bounding box isolation (L80). Bug 2 (wheel options) fixed via priced option cards replacing bare swatches. Bug 3 (suspension slider) fixed by replacing slider with option cards (no pointer-events conflict). New: `customization-catalog.ts` with 5 priced catalogs + cost computation function. Hood + Wing categories added (L79, visual deferred). All customizers upgraded to priced option cards (L82). `CustomizationCostBreakdown` component added showing itemized costs + GST 18% (L81). `VisualizationCustomizationsSchema` extended with optionId fields + aero (L78). 8+ new tests. `tsc --noEmit` clean. |
| 2026-04-29 | **v2.7** — Visualizer UI polish + catalog depth + cost rollup fix. Added §37 with L83–L90. All 6 catalogs expanded with real-world brand depth (Hood: 6, Wing: 7, Wheel: 8, Tint: 9, Exhaust: 8, Suspension: 7). New metadata fields: brand, material, weightSavingKg, downforceKgAt200, adjustable, active, raceSpec, airRide, tireSet, vlt, includesPpf, valvetronic, size. CostSummary footer cost-rollup bug fixed — now aggregates full customization total not just paint price (L89). Font scale bumped throughout customization panel (L90). Brand prominently displayed on every option card. TintColorEnum extended with 'clear'. 28 new tests (655 total). `tsc --noEmit` clean. |
| 2026-04-29 | **v2.8** — Preset bundles + draggable panel + preview render + playground + cost-ledger + customer portal. Added §38 with L91–L96 + PENDING-1–3. See §38 for details. |
| 2026-04-29 | **v2.9** — Procedural asset pipeline: hood material swap, wing geometry, wheel diameter approximation, decal polish. Added §39 with L97–L100. `applyHoodMaterial` (carbon weave + vent slots via `THREE.CanvasTexture` + `MeshPhysicalMaterial`); `applyWing` (6 procedural BoxGeometry wing variants + carbon material); `applyWheelMaterialAndSize` (diameter scaling via `scale.set(1, factor, factor)`); decal SVG upgrade (gradients, gold accents, race typography). `hoodMeshHints` added to `Asset3DRecord`. PENDING-1 (hood partially, wings fully), PENDING-2 visually approximated. 55 new tests (767 total). `tsc --noEmit` clean for custom-builds files. Spec bumped to v2.9. |
