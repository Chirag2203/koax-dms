---
spec_id: PLAN-PARTS-004
domain: parts
status: approved
risk_level: low
pii_sensitivity: low
flags: [parts-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001, PLAN-PARTS-002, PLAN-PARTS-003]
---

# S5 P4 — Parts Create Forms

Ships `/parts/po/new` and `/parts/grn/new`. Both complete the deep-link
promises made by earlier phases:
- P2 Low Stock "Raise PO" → `/parts/po/new?part=<code>` (currently 404)
- P2 + P3 header "Raise PO" / "New GRN" CTAs (currently 404)
- P3 Part Detail "Raise PO" (currently 404)
- Spec §11.1 Service-originated PO loop (`?jobCard=`)

**Scope:** two create-path forms (DRAFT-only). Both use React Hook Form +
Zod resolver; submit calls the existing P1 store actions
`createPurchaseOrder` / `createGrn`, which assign `id` / `poNo` / `grnNo` /
`createdAt` / `status=DRAFT` automatically.

**Out of P4 scope (deferred to P5):**
- PO state transitions (Submit / Approve / Reject / Cancel / Dispatch / Receive / Close)
- GRN state transitions (Submit / Match / Reject / Post → stock movements)
- Walk-in GRN (no PO) — P4 requires `?po=`
- Approval threshold gating on Submit (all 4 thresholds from §6)
- Combobox primitive (P4 uses grouped native `<select>`)

**Out of P4 scope (deferred to P6):**
- Auto-reserve Service PartsLine on GRN POST
- S4.1 jobcard-parts "Create PO" stub replacement
- Inventory vehicle-detail refurb parts → `/parts/[partCode]` linking

## 1. Route surface

| Route | P4 change |
|---|---|
| `/parts/po/new` | **New.** Client component. Reads `?part=<code>` + `?jobCard=<id>` via `useSearchParams`. Renders `<NewPurchaseOrderForm>` with pre-fills. |
| `/parts/grn/new` | **New.** Client component. Reads `?po=<id>`. If absent / unknown → renders `<GrnPickerEmpty>` placeholder; else `<NewGrnForm>`. |
| `/parts/layout.tsx` | Unchanged. Hydrators (parts + service) already mounted in P3. |
| `/parts/po/[id]` | Still 404 (P5). Submit redirects here — accepted per service precedent. |
| `/parts/grn/[id]` | Still 404 (P5). Same. |

Both page files are `'use client'` and wrap the form in `<Suspense fallback={<FormSkeleton/>}>` — Next 14 requires Suspense boundaries around any `useSearchParams()` consumer at build time.

## 2. Form shape — decisions locked

| Form | Shape | Rationale |
|---|---|---|
| **New PO** | Single-page, 3 sections + sticky right-rail summary | Money-dense — users watch totals update as they add lines. Matches inventory new-vehicle-wizard's right-rail pattern. |
| **New GRN** | Single-page, 2 sections + inline summary | 3-way match grid is the focus; no room for a rail. Totals are informational. |

Both forms reject a wizard layout — the field count is low (4–6 header + N lines) and users expect to see everything at once.

## 3. Component tree

```
apps/staff-web/src/components/parts/
├── new-po/
│   ├── index.ts                         (barrel)
│   ├── new-purchase-order-form.tsx      (composer: RHF + onSubmit + chrome)
│   ├── new-po-schema.ts                 (Zod form schema + defaults factory)
│   ├── new-po-header-section.tsx        (Supplier / Outlet / Expected Delivery / isImport + fxRate)
│   ├── new-po-line-builder.tsx          (useFieldArray rows + "+ Add line")
│   ├── new-po-summary-rail.tsx          (sticky right-rail: subtotal / GST / total / Submit / Cancel)
│   └── new-po-helpers.ts                (computeLineTotal, computePoTotals, mapFormToCreateInput, deriveImportFromSupplier)
└── new-grn/
    ├── index.ts                         (barrel)
    ├── new-grn-form.tsx                 (composer)
    ├── new-grn-schema.ts                (Zod form schema)
    ├── new-grn-header-section.tsx       (read-only PO/supplier/outlet + GRN date + notes)
    ├── new-grn-match-grid.tsx           (tabular line match: ordered/received/condition/batch/serials)
    ├── new-grn-empty-picker.tsx         (fallback when ?po= missing or unknown)
    └── new-grn-helpers.ts               (seedLinesFromPo, mapFormToCreateInput, validateGrnEligibility)
```

Target LoC per file: ≤ 350. Heaviest expected: line-builder and match-grid at ~240 each.

Route files (minimal shells):
```
apps/staff-web/app/(shell)/parts/
├── po/new/page.tsx       (~40)
└── grn/new/page.tsx      (~50)
```

## 4. Zod form schemas (separate from domain schemas)

Form schemas capture USER INPUT ONLY. The store fills the rest (`id`, `poNo`, `createdAt`, `status`, per-line `id`, `subtotal`, `gst`, `total`, `lineTotal`) — see `mapFormToCreateInput` in `new-po-helpers.ts`.

### 4.1 `NewPoFormSchema`

```ts
z.object({
  supplierId: z.string().min(1, 'Supplier required'),
  outletId: z.enum(['BLR-01','MUM-01','CHE-01']),
  expectedDeliveryAt: z.string().min(1, 'Expected delivery required'),
  isImport: z.boolean(),
  fxRate: z.number().positive().optional(),
  notes: z.string().optional(),
  linkedJobCardId: z.string().optional(),
  lines: z.array(z.object({
    partCode: z.string().min(1, 'Part required'),
    qty: z.number().int().min(1, 'Qty ≥ 1'),
    unitPrice: z.number().min(0, 'Unit price ≥ 0'),
  })).min(1, 'At least one line required'),
})
.refine(
  v => !v.isImport || (v.fxRate != null && v.fxRate > 0),
  { message: 'FX rate required for imports', path: ['fxRate'] },
);
```

### 4.2 `NewGrnFormSchema`

```ts
z.object({
  poId: z.string().min(1),
  receivedAt: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(z.object({
    partCode: z.string(),
    orderedQty: z.number().int().min(0),     // mirrored from PO — read-only in UI
    receivedQty: z.number().int().min(0),
    unitPrice: z.number().min(0),
    condition: z.enum(['OK','DAMAGED','WRONG']),
    batchNo: z.string().optional(),
    serialNos: z.array(z.string()).optional(),
  })).min(1),
})
.refine(
  v => v.lines.some(l => l.receivedQty > 0),
  { message: 'Receive at least one unit', path: ['lines'] },
);
```

## 5. URL contract

| URL | Behavior |
|---|---|
| `/parts/po/new?part=BMW-BRK-PAD-F30&jobCard=jc-001` | Pre-fills 1 line (qty 1, unitPrice = `part.lastPurchasePrice`), `supplierId = part.supplierIds[0]`, `outletId = jobCard.outletId`, `linkedJobCardId = jc-001`. Unknown codes silently ignored. |
| `/parts/po/new?part=BMW-BRK-PAD-F30` | Pre-fills 1 line + supplier. `outletId` defaults to user's home outlet via `staffOutletToOutletId(user.outlet)`. Staff fixture stores `outlet: 'bangalore' \| 'mumbai' \| 'chennai' \| 'all'`; the mapper converts `bangalore→'BLR-01'`, `mumbai→'MUM-01'`, `chennai→'CHE-01'`, `all→'BLR-01'` (fallback). Helper lives in `new-po-helpers.ts`. |
| `/parts/po/new` | Empty form with 1 empty line row. |
| `/parts/grn/new?po=po-007` | Loads PO from store. Seeds supplier, outlet, lines: each line `orderedQty = po.line.qty`, `receivedQty = orderedQty` (user edits down for shortfalls), `unitPrice = po.line.unitPrice`, `condition = 'OK'`. Shows status banner if `po.status ∉ {DISPATCHED, PARTIALLY_RECEIVED}` — "This PO is not yet dispatched; proceed only if stock has physically arrived." |
| `/parts/grn/new?po=unknown-id` | `<GrnPickerEmpty>` with "Unknown PO `unknown-id`" variant. |
| `/parts/grn/new` | `<GrnPickerEmpty>` with generic "Select a PO to receive against" copy + link back to `/parts?tab=po`. |

Filter URL persistence: N/A (these are forms, not lists).

## 6. Submission behavior

1. Validate via RHF + Zod. Submit button `disabled || aria-busy` while submitting.
2. PO: `createPurchaseOrder(input, actor)` → returns new PO. Toast `"{po.poNo} created as Draft"`. `router.push('/parts/po/${po.id}')` — P5 404 until P5.
3. GRN: `createGrn(input, actor)` → returns new GRN. Toast `"{grn.grnNo} created as Draft"`. `router.push('/parts/grn/${grn.id}')` — P5 404 until P5.
4. Cancel: if `formState.isDirty` → `<AlertDialog>` confirm; else `router.back()`.
   **AlertDialog copy (locked):** title "Discard changes?", body "Your unsaved entries will be lost.", destructive primary "Discard", secondary "Keep editing".
5. No auto-save. No `beforeunload` warning.

### 6.1 Toast mount + navigation behavior

The current `useToast` hook (`src/hooks/use-toast.ts`) is **per-component** — each mount gets its own `useState` toast list. Lifting `<ToastContainer>` to the route layout would require a refactor of the hook into a global context or store primitive. That's out of P4 scope.

**P4 decision: match service precedent** — mount `<ToastContainer>` inline inside each form component, call `toast(msg)` BEFORE `router.push(...)`, and navigate.

Tradeoff: after `router.push`, the form unmounts → toast primitive unmounts → toast is briefly visible then disappears with the navigation. For P5's 404 destination this is acceptable (user lands on a stub page). For P4's visible submit feedback, the interim: call `toast(msg)` and then use `setTimeout(() => router.push(...), 600)` so the toast has 600ms visibility on the form page before navigation. Small UX cost, zero architectural debt.

Follow-up `toast-primitive-lift-to-global-store` tracked for a later polish phase that refactors `useToast` to a `zustand`-backed store so `<ToastContainer>` can mount once in the app shell.

Toast config: success variant, 3.5s dwell (inherits primitive default), top-right anchor, `aria-live="polite"`.

## 7. Store contract (verified against P1 implementation)

`createPurchaseOrder(input: Omit<PurchaseOrder,'id'|'poNo'|'createdAt'|'status'>, actor: Actor): PurchaseOrder`
- Store sets `id = makeId('po')`, `poNo = nextPoNo(state.purchaseOrders)`, `status = 'DRAFT'`, `createdAt = now()`.
- Lines pass through as-is — **the form is responsible for per-line `id` generation** (verified: `po-slice.ts:17-30` does not rewrite line ids).
- Form uses `line-${Date.now()}-${idx}` for uniqueness. The line IDs stay unique within a PO by construction.

`createGrn(input: Omit<Grn,'id'|'grnNo'|'receivedAt'|'status'>, actor: Actor): Grn`
- Store sets `id = makeId('grn')`, `grnNo = nextGrnNo(state.grns)`, `status = 'DRAFT'`, `receivedAt = now()`.
- Lines pass through — form generates `line-${Date.now()}-${idx}` IDs.
- `poId` is passed verbatim from form.

Actor: `const { user } = useStaffAuth(); const actor = { id: user.id, name: user.name };`. Default R24 Meera Iyer.

## 8. Derivations (helpers)

### 8.1 `computeLineTotal(qty, unitPrice): number`
`Math.round(qty * unitPrice)` — matches fixture convention.

### 8.2 `computePoTotals(lines): { subtotal, gst, total }`
- `subtotal = sum(computeLineTotal(l.qty, l.unitPrice))`
- `gst = Math.round(subtotal * 0.28)` — **HSN 8708 slab (28%)**. Single flat rate across the whole PO per spec §4 schema which stores `gst` as a single PO-level number.
- `total = subtotal + gst`

**v1 demo assumption — flat 28% is a known simplification.** Real GST is per-HSN (2710 engine oil = 18%, 8512 wipers = 28%, 8507 batteries = 28%, 3820 coolant = 18%, etc.). A PO mixing HSN codes would produce a slightly wrong `gst` figure under this simplification. The domain schema (SPEC-PARTS-001 §4) stores `gst` as a single PO-level number, so per-HSN breakdown would require a schema change. Out of P4 scope; tracked as Risks row + follow-up `parts-gst-per-line-hsn`.

This matches the P1 fixture builder `totals()` in `purchase-orders.ts:35-43`. Consistency check: rendered values in the summary rail must equal what `createPurchaseOrder` stores. Form passes `subtotal`/`gst`/`total` directly at submit (not re-derived in the store).

### 8.2a Line ID generation (form-side)

`makeLineId(idx): string` → `line-${crypto.randomUUID().slice(0, 8)}-${idx}`. Using a UUID fragment + line index guarantees uniqueness even under rapid back-to-back submits in the same millisecond. Falls back to `line-${Date.now()}-${Math.random().toString(36).slice(2,7)}-${idx}` if `crypto.randomUUID` is absent (older browsers; modern evergreen staff-web targets don't need the fallback).

### 8.2b Number input empty → `undefined`, not `NaN`

Zod `.number().int().min(1)` on `NaN` produces a confusing "expected number" error. Form uses `setValueAs: (v) => (v === '' ? undefined : parseInt(v, 10))` (integer fields) and `(v === '' ? undefined : parseFloat(v))` (price fields). Zod field messages remain clean.

### 8.3 `deriveImportFromSupplier(supplier): { isImport, fxRate? }`
- Returns `{ isImport: supplier.currency !== 'INR' }`.
- When `isImport=true`, leaves `fxRate` undefined (user must enter — Zod refine enforces).
- `useEffect` on `watch('supplierId')` auto-syncs this when supplier changes.

### 8.4 `seedLinesFromPo(po): GrnFormLine[]`
```ts
po.lines.map((l) => ({
  partCode: l.partCode,
  orderedQty: l.qty,
  receivedQty: l.qty,          // assume full receipt; user edits down
  unitPrice: l.unitPrice,
  condition: 'OK' as const,
  batchNo: undefined,
  serialNos: undefined,
}))
```

### 8.5 `validateGrnEligibility(po): { ok: boolean; warning?: string }`
- `DISPATCHED` or `PARTIALLY_RECEIVED` → `{ ok: true }`
- Any other status → `{ ok: false, warning: 'This PO is not yet dispatched — proceed only if stock has physically arrived.' }`
- Never blocks submit. This is a UX safety rail, not a hard gate (P5 adds hard gates on transitions).

## 9. Line builder (PO form — section 2)

A dynamic table backed by RHF `useFieldArray`. Each row:

```
[Part select (grouped by brand)]  [Qty]  [Unit Price ₹]  [Line Total ₹]  [× Remove]
```

- **Part select**: native `<select>` grouped by `<optgroup label="BMW">` etc. Sorted: `partCode` within each optgroup. Native keyboard-nav and a11y. Filing a follow-up for a proper combobox primitive.
- **Qty input**: `<input type="number" step="1" min="1" inputMode="numeric">`. `parseInt` on `setValueAs`.
- **Unit Price input**: `<input type="number" step="0.01" min="0">`. `parseFloat` on `setValueAs`. Pre-filled with `part.lastPurchasePrice` on part change (via `watch` + `setValue`).
- **Line Total**: read-only display, computed via `watch` in the row. `<AmountCell>` (align left, size sm).
- **Remove**: icon button `aria-label="Remove line {idx+1}"`. Disabled when `lines.length === 1` (last row stays as an empty placeholder).

Footer: `[+ Add line]` button (secondary outline, width full) appends an empty line row. Keyboard users can reach via Tab and trigger via Enter.

Soft warnings (non-blocking inline chips):
- Duplicate `partCode` across rows → chip "Already on line N" next to row.
- No warnings for same-supplier / outlet mismatch.

## 10. Match grid (GRN form — section 2)

Seeded from PO lines (§8.4). Columns:

| PART | ORDERED | RECEIVED | UNIT PRICE ₹ | CONDITION | BATCH NO | SERIAL NOS |
|---|---|---|---|---|---|---|
| `BMW-OIL-FLTR-N20` | 20 | `[input]` 20 | `[input]` 810 | `[select]` OK | `[input]` — | `[input]` — |

- **Part**: read-only, mono.
- **Ordered**: read-only, mono right-aligned.
- **Received**: `<input type="number" min="0">`. If `receivedQty > orderedQty` → inline warning chip "Over-receipt" (amber, non-blocking).
- **Unit Price**: `<input type="number" step="0.01" min="0">` — usually unchanged, editable in case of price adjustment at receipt.
- **Condition**: `<select>` OK / DAMAGED / WRONG. Default OK.
- **Batch No**: free-text `<input>`, optional.
- **Serial Nos**: free-text `<input>`, comma-separated. Parsed to `string[]` on submit (split + trim + filter empty).

Row remove is NOT available — a GRN line count always matches the PO line count. User edits `receivedQty=0` to "skip" a line.

## 11. Empty / error states

| Condition | Treatment |
|---|---|
| PO: zero lines | Submit disabled; inline hint under line list "At least one line required". |
| PO: import supplier chosen, no fxRate | Zod refine blocks; inline error under fxRate input "FX rate required for imports". |
| GRN: `?po=` missing | `<GrnPickerEmpty>` — centered card with copy + link to `/parts?tab=po`. Form never mounts. |
| GRN: `?po=` unknown | `<GrnPickerEmpty>` with "Unknown PO `<id>`" variant. |
| GRN: PO has zero lines (defensive) | "This PO has no lines — cannot receive." — form does not mount. |
| GRN: all `receivedQty = 0` | Submit disabled; Zod refine triggers "Receive at least one unit". |
| Unknown `?part=<code>` on PO | Silently ignored — form starts empty. |
| Unknown `?jobCard=<id>` on PO | `linkedJobCardId` silently dropped — no visible error. |

## 12. Accessibility

- Form element: `<form aria-label="New Purchase Order">` / `<form aria-label="New Goods Receipt Note">`.
- Section headings: `<h2 className="text-[11px] uppercase tracking-wide">` semantic.
- Explicit `<label htmlFor>` → `<input id>` pairing for every field.
- Submit: `disabled` + `aria-busy` while submitting.
- Line-builder row remove: `aria-label="Remove line {idx+1}"`.
- `+ Add line` button: `aria-label="Add another line"`.
- Confirmation on Cancel: `<AlertDialog>` primitive handles focus trap + Escape.
- Toast announcements on submit success: `<ToastContainer>` primitive uses `aria-live="polite"`.
- `<GrnPickerEmpty>` back link uses standard focus treatment: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1`.

## 13. Cross-module consistency

| Dimension | Reference | P4 match |
|---|---|---|
| Page container | `mx-auto max-w-[1440px] px-6 pb-12 pt-6` (service forms) | ✓ |
| Breadcrumb | `font-mono text-[13px] text-accent` with ChevronRight (jobcard-detail / new-appointment) | ✓ |
| h1 | `text-[28px] font-semibold leading-[1.25]` | ✓ |
| Section cards | `rounded-md border border-line bg-bg-surface p-6` | ✓ |
| Section eyebrow | `text-[11px] uppercase tracking-widest text-ink-muted mb-4` | ✓ |
| Input height | h-10 (per design §4) | ✓ |
| Label style | uppercase `text-[11px] tracking-wide text-ink-muted` above control | ✓ |
| Primary CTA | filled accent, h-10 | ✓ |
| Secondary CTA (Cancel) | outline border-line bg-bg-surface | ✓ |
| Right-rail (PO) | `w-[320px] sticky top-6` | mirror inventory new-vehicle-wizard |
| ToastContainer | inline per-form + `setTimeout(push, 600)` so toast is visible before navigation — see §6.1 | matches service; global-store lift tracked as follow-up |
| Breadcrumb (PO) | `Parts › Purchase Orders › New` | spelled-out (matches "Service › Appointments › New") |
| Breadcrumb (GRN) | `Parts › GRNs › New` | short + unambiguous |

## 14. Scenarios (GPA format — acceptance)

### S1: PO form empty path
- **Given** navigating to `/parts/po/new`
- **When** the page mounts
- **Then** breadcrumb "Parts › Purchase Orders › New" renders
- **And** h1 shows "New Purchase Order"
- **And** Submit button is disabled (Zod "lines required")
- **And** an empty line row is visible

### S2: PO form deep-link pre-fill from Low Stock
- **Given** navigating to `/parts/po/new?part=BMW-BRK-DISC-F30`
- **Then** Supplier pre-fills to BMW India Parts Distribution (part.supplierIds[0])
- **And** one line is present: partCode=BMW-BRK-DISC-F30, qty=1, unitPrice=16800 (lastPurchasePrice)
- **And** lineTotal displays 16,800
- **And** right-rail shows Subtotal ₹16,800 · GST ₹4,704 · Total ₹21,504

### S3: PO form deep-link pre-fill from Service loop
- **Given** navigating to `/parts/po/new?part=BMW-BRK-PAD-F30-V2&jobCard=jc-001`
- **Then** partCode, supplier, outlet all pre-filled
- **And** linkedJobCardId = 'jc-001' (read-only chip visible)

### S4: PO form add/remove lines
- **Given** PO form open
- **When** clicking "+ Add line" twice
- **Then** 3 line rows are visible
- **When** clicking Remove on line 2
- **Then** 2 line rows remain, line numbering updates

### S4b: PO form duplicate-partCode soft warning
- **Given** PO form with 2 lines
- **When** selecting the same partCode on both lines
- **Then** an amber soft-warning chip "Already on line 1" appears inline under the second row
- **And** Submit remains enabled (non-blocking)

### S5: PO form import supplier auto-toggle
- **Given** PO form open
- **When** selecting Supplier = LuxeAuto Imports GmbH (currency EUR)
- **Then** isImport toggles to ON
- **And** fxRate input becomes visible
- **And** Submit is disabled until fxRate entered (Zod refine)

### S6: PO form submit happy path
- **Given** PO form with valid data (supplier, outlet, expected date, 2 lines)
- **When** clicking Submit
- **Then** toast appears: "{poNo} created as Draft"
- **And** router navigates to `/parts/po/{id}` (P5 404 — acceptable)
- **And** the new PO is visible in `/parts?tab=po` (DRAFT status)

### S7: PO form Cancel with dirty state
- **Given** PO form with ≥1 modified field
- **When** clicking Cancel
- **Then** `<AlertDialog>` confirm modal opens
- **When** confirming "Discard"
- **Then** `router.back()` navigates away

### S8: GRN form no query param
- **Given** navigating to `/parts/grn/new`
- **Then** `<GrnPickerEmpty>` renders
- **And** body copy says "Select a PO to receive against"
- **And** a link to `/parts?tab=po` is visible

### S9: GRN form unknown PO
- **Given** navigating to `/parts/grn/new?po=po-999`
- **Then** `<GrnPickerEmpty>` renders with "Unknown PO `po-999`"

### S10: GRN form with DISPATCHED PO (happy path)
- **Given** navigating to `/parts/grn/new?po=po-007` (DISPATCHED)
- **Then** form mounts
- **And** supplier (BMW India) + outlet (BLR) are read-only display
- **And** 3 line rows seeded from po-007 with receivedQty equal to orderedQty
- **And** NO status warning banner
- **And** Submit is enabled

### S11: GRN form with non-dispatched PO (warning)
- **Given** navigating to `/parts/grn/new?po=po-001` (DRAFT)
- **Then** form mounts
- **And** a warning banner renders: "This PO is not yet dispatched — proceed only if stock has physically arrived."
- **And** Submit is still enabled (warning is non-blocking)

### S12: GRN form short-receipt
- **Given** GRN form open for po-007
- **When** editing line 1 receivedQty from 6 down to 4
- **Then** the receivedQty input border + text shift to `--state-overdue` (amber) — signals partial fulfillment at a glance
- **And** no warning chip (short receipt is a normal operational outcome)
- **When** setting line 3 receivedQty to 0
- **Then** the entire line row renders at `opacity-60` to signal "skipped — no stock movement"
- **When** editing line 2 receivedQty from 12 up to 14
- **Then** an amber "Over-receipt (+2)" warning chip appears inline under the receivedQty input
- **And** Submit is still enabled (non-blocking)

### S13: GRN form condition = DAMAGED
- **Given** GRN form open for po-007
- **When** selecting Condition = DAMAGED on line 3
- **Then** the select value updates
- **And** Submit is still enabled
- **And** upon submit, the GRN has that line with `condition: 'DAMAGED'`

### S14: GRN form submit happy path
- **Given** valid GRN form state
- **When** clicking Submit
- **Then** toast appears: "{grnNo} created as Draft"
- **And** router navigates to `/parts/grn/{id}` (P5 404)
- **And** the new GRN is visible in `/parts?tab=grn`

### S15: Typecheck + build
- `pnpm -F staff-web typecheck` exits 0.

### S16: Zustand selector safety
- **Given** PO form or GRN form mounted
- **Then** browser console shows no "getSnapshot should be cached" warning
- **And** every `usePartsStore(...)` / `useServiceStore(...)` call uses a stable base-array selector
- **And** all filter/find derivations pass through `useMemo` after a scalar selector (matches P1/P2/P3 pattern)

## 15. Acceptance criteria

1. Scenarios S1–S15 behave as specified (manual smoke via preview).
2. Typecheck clean on staff-web.
3. Every file ≤ 350 LoC. No exceptions.
4. Zero `bg-[var(--color-*)]` / hex literals in new code.
5. Zero new npm dependencies.
6. No new primitives (no combobox component).
7. Both forms mount `<ToastContainer>` locally (service precedent).
8. Cancel-with-dirty confirmation uses the existing `<AlertDialog>` primitive.
9. Submit button `disabled` when form invalid; `aria-busy` during submission.
10. PO right-rail is `sticky` and remains visible as the line list scrolls.
11. Submit → new entity is visible in the P2 landing tab (stored correctly).
12. Code-reviewer report lists no BLOCKERs.

## 16. Risks + known gaps

| Risk | Mitigation |
|---|---|
| `useSearchParams` without Suspense | Each page wraps form in `<Suspense fallback={<FormSkeleton/>}>`. |
| Line ID generation timing | Form generates `line-${Date.now()}-${idx}` — unique within the PO/GRN by construction. Store does not rewrite. |
| `useEffect` loop on supplier-driven `isImport` auto-toggle | Only `setValue` when `supplier.currency !== current.isImport` — compare prev. |
| Decimal qty leaking past HTML constraint | `setValueAs: (v) => parseInt(v, 10)` (or NaN→empty). |
| Post-submit 404 | Accepted; P5 ships detail pages. |
| Combobox absent | Follow-up ticket `parts-combobox-primitive`. Native `<select>` grouped by brand is the P4 UX; reviewer signs off. |
| Stale `.next` cache after adding many files | `rm -rf apps/staff-web/.next` if dev server shows module-not-found. |
| Default-user resolution | `useStaffAuth().user` — always present (mock auth). |
| GRN over-receipt semantics | Non-blocking inline chip; P5 may tighten when QC/Post lands. |
| Dirty-form browser close | No `beforeunload` warning — matches service. |

## 17. Visual design decisions (design-agent open questions resolved)

1. **Top-right CTAs vs footer CTAs** — keep top-right `[Cancel][Submit]` on both forms. PO rail mirrors them at the bottom for scroll-reach. GRN has no rail but match-grid fits within one viewport at 1440; top-right is sufficient. **Footer CTA mirror on GRN deferred** (reviewer recommendation accepted).
2. **Linked Job Card chip** — visible in PO Header section as a read-only mono pill. Non-removable. Signals the Service→Parts loop context.
3. **Supplier meta in rail** (`NET_30 · INR`) — **keep**. Adds useful signal (payment terms + currency) without clutter.
4. **Import checkbox** — visible in Header. Read-only once auto-driven by supplier currency; user can still uncheck to mark a non-standard import case. `fxRate` input reveals conditionally below.
5. **GRN Received At default** — **editable** `<input type="datetime-local">`, defaults to `new Date().toISOString().slice(0,16)`. Users can back-date when logging a physical receipt recorded earlier. Store's `createGrn` will overwrite with `now()` — so the form sets `receivedAt` in the submitted payload AFTER calling the store, via `updateGrn({ receivedAt: formValues.receivedAt })`. (Alternative: bypass store-time stamp by passing `receivedAt` in input; but store overwrites. Cleanest: accept store-time and remove the field — but users expect control. Final call: show input, patch after create via `updateGrn`.)
6. **Amber token** — all "warning/attention" uses `--state-overdue` (the existing amber token). No `--state-warning` exists; no new tokens introduced.
7. **Part description line in PO line builder** — include inline under the part code row (`↳ Brake Disc — Front Ventilated · HSN 8708` at `text-[11px] text-ink-muted ml-11 -mt-1`). Removes cross-reference cost.

## 18. Visual design — wireframes

Produced by design agent 2026-04-17. Dark theme default. All tokens flip via `[data-theme]`.

### 18.1 NewPurchaseOrderForm at 1440px (`?part=BMW-BRK-DISC-F30`)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Parts › Purchase Orders › New                              [ Cancel ]  [ Submit ]    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ New Purchase Order                                                                    │
│ ────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                       │
│ ┌──────────────────────────────────────────────────┐ ┌────────────────────────┐     │
│ │ HEADER                                           │ │ SUMMARY       [sticky] │     │
│ │                                                  │ │                        │     │
│ │ SUPPLIER *             OUTLET *                  │ │ Supplier               │     │
│ │ [BMW India ... ▾]      [Bangalore ▾]             │ │ BMW India Parts Distr. │     │
│ │                                                  │ │ NET_30 · INR           │     │
│ │ EXPECTED DELIVERY *    IMPORT                    │ │                        │     │
│ │ [ 2026-04-24  📅]      [ ] This is an import PO  │ │ Outlet                 │     │
│ │                                                  │ │ Bangalore (BLR-01)     │     │
│ │ LINKED JOB CARD        NOTES                     │ │ ──────────             │     │
│ │ JC-2026-00001 (mono)   [                      ]  │ │ Lines         1        │     │
│ │                                                  │ │ Subtotal  ₹ 16,800     │     │
│ └──────────────────────────────────────────────────┘ │ GST (28%) ₹  4,704     │     │
│                                                      │ ──────────             │     │
│ ┌──────────────────────────────────────────────────┐ │ GRAND TOTAL ₹ 21,504   │     │
│ │ LINE ITEMS                          [+ Add line] │ │                        │     │
│ │                                                  │ │ [Cancel]  [Submit]     │     │
│ │  #  PART                  QTY  UNIT ₹  TOTAL  ✕ │ │                        │     │
│ │  1  [BMW-BRK-DISC-F30 ▾] [ 1] [16800] 16,800  ✕ │ └────────────────────────┘     │
│ │     ↳ Brake Disc Front · HSN 8708                │                                 │
│ │  ──────────────────────────────────────────────  │                                 │
│ │          [+ Add line] (secondary outline)        │                                 │
│ └──────────────────────────────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Grid: `grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6`. Rail: `xl:sticky xl:top-6 rounded-md border border-line bg-bg-surface p-5` (NOT rounded-xl — matches section card radius).

### 18.2 PO Header section — field specs

- Card `rounded-md border border-line bg-bg-surface p-6`. Eyebrow "HEADER" `text-[11px] uppercase tracking-widest text-ink-muted mb-4`.
- Fields in 2-col grid `grid grid-cols-2 gap-x-6 gap-y-5`:
  - **Supplier** `<select>` grouped by OEM/Tier-1/Import — sorted alphabetically within each `<optgroup>`. Required.
  - **Outlet** `<select>` BLR/MUM/CHE. Required enum.
  - **Expected Delivery** `<input type="date">`. Required. Min = today.
  - **Import** checkbox. Auto-toggled by supplier currency. User can override.
  - **FX Rate** (conditional, renders below Import row) — required when `isImport=true`. `<input type="number" step="0.01">`.
  - **Linked Job Card** (read-only chip, renders only when pre-filled via `?jobCard=`).
  - **Notes** `<textarea rows={3}>` `col-span-2`.

### 18.3 PO Line Builder — row layout

Row grid `grid grid-cols-[32px_1fr_80px_140px_140px_40px] gap-3 items-center py-3 border-t border-line`:
- `#` index: `w-8 text-[11px] font-mono text-ink-muted`
- **Part select**: native grouped `<optgroup>`, option format `{partCode} — {name}`.
- **Qty**: `w-20 h-10 text-right font-mono` (`type=number` step=1 min=1).
- **Unit Price**: `w-[140px] h-10 text-right font-mono` (step=0.01 min=0). Pre-fills to `part.lastPurchasePrice` on part change.
- **Line Total**: read-only right-aligned display via `<AmountCell align="left" size="sm">`.
- **Remove**: icon button (lucide `X`), `aria-label="Remove line N"`, disabled when `lines.length === 1`.
- **Part description inline** under the row: `text-[11px] text-ink-muted ml-11 -mt-1` — `↳ {name} · HSN {hsnCode}`.
- **Duplicate soft warning**: inline amber chip `rounded-full border border-[rgb(var(--state-overdue))/0.4] bg-[rgb(var(--state-overdue))/0.1] text-[11px] text-[rgb(var(--state-overdue))] px-2 py-0.5 ml-11 mt-1` with copy "Already on line N".

### 18.4 PO Summary Rail

```
┌─────────────────────────────┐
│ SUMMARY                     │
│                             │
│ SUPPLIER                    │
│ BMW India Parts Distribution│
│ NET_30 · INR                │
│                             │
│ OUTLET                      │
│ Bangalore (BLR-01)          │
│                             │
│ ────────────────            │
│ Lines              1        │
│ Subtotal   ₹ 16,800         │
│ GST (28%)  ₹  4,704         │
│ ────────────────            │
│ GRAND TOTAL ₹ 21,504        │
│                             │
│ [Cancel]    [Submit]        │
└─────────────────────────────┘
w-[320px] sticky top-6
```

Empty state: "Pick a supplier and add lines to see the total." in `text-xs text-ink-muted` centered. Subtotal / GST / Total show em-dashes.

### 18.5 NewGrnForm at 1440px (`?po=po-007`)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Parts › GRNs › New                                            [ Cancel ]  [ Submit ] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ New Goods Receipt Note                                                                │
│ ────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│ │ HEADER                                                                          │  │
│ │  PO REFERENCE       SUPPLIER                OUTLET            RECEIVED AT       │  │
│ │  [PO-2026-00007 ↗]  BMW India Parts...     Bangalore (BLR)   [2026-04-17 14:30] │  │
│ │                                                                                  │  │
│ │  NOTES  [                                                                     ]  │  │
│ └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│ │ MATCH GRID                                                                      │  │
│ │  PART                 ORDERED  RECEIVED  UNIT ₹   CONDITION  BATCH  SERIALS    │  │
│ │  BMW-BATTERY-90AH-AGM    6     [    6]  [15100]  [OK     ▾] [    ] [         ] │  │
│ │  BMW-WIPER-F30-FR       12     [   12]  [ 2450]  [OK     ▾] [    ] [         ] │  │
│ │  BMW-COOLANT-G48        10     [   10]  [ 2700]  [OK     ▾] [    ] [         ] │  │
│ └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│ │ LINES 3 · ORDERED TOTAL 28 · RECEIVED TOTAL 28 · RECEIPTS 3                     │  │
│ └─────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 18.6 GRN status warning banner (when PO ∉ DISPATCHED/PARTIALLY_RECEIVED)

Above the Header card: `rounded-md border border-[rgb(var(--state-overdue))/0.4] bg-[rgb(var(--state-overdue))/0.1] px-4 py-3 mb-6 flex items-start gap-3`. Icon `<AlertTriangle className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5" />`. Body `text-sm text-ink-primary`: "This PO is not yet dispatched — proceed only if stock has physically arrived." Sub-line: "Current PO status: `<status>`".

### 18.7 Match-grid row treatments

- **Normal row** (receivedQty == orderedQty, condition=OK): neutral.
- **Short-receipt** (receivedQty < orderedQty, not 0): receivedQty input border + text in `text-[rgb(var(--state-overdue))]`. No chip.
- **Skipped** (receivedQty === 0): whole row `opacity-60`.
- **Over-receipt** (receivedQty > orderedQty): amber chip "Over-receipt (+N)" below the received input.
- **Damaged/Wrong** (condition ≠ OK): CONDITION select gets amber/red border + text accent. Row NOT tinted (signals stay scoped per column).

### 18.8 GrnPickerEmpty placeholder

Centered card `max-w-[480px] mx-auto mt-16 py-12 px-8 rounded-md border border-line bg-bg-surface text-center`.

- **Variant A (no `?po=`)**: `Package` icon (h-10 w-10 text-ink-muted), "Select a PO to receive against", body copy "GRNs are always tied to an existing purchase order. Open a PO from the list to begin receiving.", primary button "← Back to Purchase Orders" → `/parts?tab=po`.
- **Variant B (unknown `?po=<id>`)**: `AlertTriangle` icon text-[rgb(var(--state-overdue))], "Unknown PO `<id>`" (id in mono pill), body "That purchase order could not be found. It may have been deleted or the link may be incorrect.", same back button.

### 18.9 Responsive degradation

| Breakpoint | PO form | GRN form |
|---|---|---|
| ≥ xl (1280+) | 70/30 grid | full-width |
| lg (1024–1279) | rail narrows; 2-col grid holds | full-width, match-grid may horizontal-scroll |
| md (768–1023) | rail stacks below | match-grid horizontal-scroll |
| < md | sections stack; line-builder rows collapse to mini-cards; remove button at top-right | horizontal-scroll only |

Desktop-first per Doc 00. No bespoke mobile polish.

## 19. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | P4 phase spec written. Pending spec-reviewer sign-off. |
| 2026-04-17 | **P4 code review.** Opus reviewer returned 4 CONCERN + 10 NIT, 0 BLOCKER. Fixes applied: (#01 a11y) `Field` helper in both PO and GRN header sections now uses `useId()` + `cloneElement` to inject `id` into the child and wire `<label htmlFor>` — proper semantic label-control linking per spec §12; line-builder + match-grid keep the WAI-ARIA tabular pattern (column headers + per-input aria-label with 1-indexed line number) documented inline. (#02) `serialNosRaw` form-only field JSDoc'd — form convenience, parsed to `serialNos: string[]` at submit. (#03) datetime-local storage format documented inline — accepted as local-time string, downstream normalization noted. (#05/#06) unused destructures in line-builder + match-grid removed. (#13) no-op `appearance-auto` class dropped. Remaining NITs (supplier grouping hardcoded IDs, rail Submit not pre-disabled on invalid form, Suspense skeleton minimal, optional InlineSummary extraction) accepted as-is for P4 — flagged as follow-ups (`parts-supplier-category-field`, `parts-form-pre-disable-submit`). |
| 2026-04-17 | **Spec review + design-agent integration.** Spec reviewer returned 4 CONCERN + 8 NIT (no BLOCKER). Design agent returned wireframes + 7 open questions. All resolved in-spec: (#01) staff outlet mapper added for pre-fill URL handling; (#02) ToastContainer mount moved to `/parts/layout.tsx` to survive navigation — service precedent had the same subtle bug, now unlinked; (#03) GST flat 28% documented as v1 demo simplification + risk row; (#04) line ID generator uses UUID fragment for collision safety; (#05) empty-input → undefined pattern locked; (#06) S4b duplicate-partCode scenario added; (#07) GrnPickerEmpty focus treatment locked; (#08) breadcrumb copy pinned in cross-module table; (#09) AlertDialog copy locked verbatim; (#10) S16 Zustand selector-safety scenario added; (#11) toast config documented; (#12) S12 amber semantics locked — short-receipt uses `--state-overdue` on the input, zero-qty row uses `opacity-60`. Design open questions resolved in §17: top-right CTAs only, visible linked-JC chip, supplier meta in rail, visible Import checkbox, editable GRN datetime (patch via updateGrn after create), `--state-overdue` token (no new tokens), inline part-description row. Wireframes integrated as §18. Status: approved. |
