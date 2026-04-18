---
spec_id: PLAN-PARTS-005
domain: parts
status: approved
risk_level: medium
pii_sensitivity: low
flags: [parts-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001, PLAN-PARTS-004]
---

# S5 P4.1 — Parts Enhancements (inline create + edit + split PO)

Four feature additions layered on top of the shipped P4 create forms, before
P5 Detail+Approvals. Keeps module momentum and unblocks demo paths that users
request reliably in luxury-car-parts workshops.

**Scope:**
1. **Add New Supplier** — inline Dialog creation, triggered from the PO form supplier select AND the Suppliers tab header
2. **Add New Part** — inline SlideInPanel creation, triggered from the PO line-builder part select AND the Stock List tab header
3. **Edit Part Master** — SlideInPanel edit flow triggered from the P3 Part Detail header; edits price + non-stock fields (stock qty stays immutable)
4. **Multi-outlet Split PO** — single form produces N sibling POs (one per non-zero outlet) linked by a shared `groupRef`

**Out of P4.1 scope (deferred):**
- Edit supplier master (CREATE only; edit lands v1.1 per §13)
- Bulk CSV upload of parts or suppliers
- Image upload for parts
- Combobox primitive (grouped native `<select>` continues)
- Supplier category field
- Per-outlet unit pricing on split POs (single supplier rate across outlets)
- Cancel-group atomic action on split POs (cancel each sibling individually in P5)
- Address picker / map integration
- Direct stock-qty edit (changes flow through GRN / adjust / transfer only)

## 1. Parent-spec amendments (SPEC-PARTS-001)

P4.1 requires THREE edits to the parent spec. All land in the same commit as P4.1 implementation.

### §4 PurchaseOrderSchema — add optional `groupRef`

```ts
export const PurchaseOrderSchema = z.object({
  // ... existing fields ...
  linkedJobCardId: z.string().optional(),
  groupRef: z.string().optional(),  // NEW — links sibling POs from a multi-outlet split
});
```

### §7 Role gates table — add three rows

| Action | R13 | R12 | R03 | R19 | R22 | R24 |
|---|---|---|---|---|---|---|
| Create supplier | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| Create part | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| Edit part master | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |

Split-PO draft uses the existing "Raise PO draft" row (all 6 roles). Approval thresholds in §6 apply per-sibling PO downstream in P5.

### §9 rollout — insert P4.1 row

| Phase | Scope |
|---|---|
| … | … |
| **P4.1** (NEW) | Inline create + edit + split PO: Add New Supplier dialog, Add New Part panel, Edit Part Master panel, Multi-outlet Split PO mode. Parent-spec §4 schema gets `groupRef`. §7 gains three role-gate rows. |
| P5 | Detail + approvals (next) |

### §13 non-goals clarification

Add: "Edit supplier master — out of v1. P4.1 adds CREATE but not EDIT (v1.1)."

### §15 parent-spec changelog

Append a row: `2026-04-17 — P4.1 enhancements: groupRef on PurchaseOrderSchema, three role-gate rows (Create supplier / Create part / Edit part master), §9 rollout row, edit-supplier clarification.`

### PLAN-PARTS-002 §3 cross-reference

PLAN-PARTS-002 §3 states "no filter URL persistence in P2". Two documented exceptions now: `?supplier=<id>` (read-once on PO tab, added P4.1 lineage from P2) and `?group=<ref>` (read-once on PO tab, new in P4.1). Both are one-shot deep-links seeded into initial filter state on mount and not written back. Update PLAN-PARTS-002 §3 with a one-line note listing both exceptions.

## 2. Store action additions

### 2.1 `createPart(input: Part, actor: Actor): Part` — NEW

File: `apps/staff-web/src/lib/parts/parts-store/slices/part-slice.ts` + type addition in `types.ts`.

```ts
createPart(input: Part, actor: Actor): Part
```

Input is a full `Part`. `Part` already is a minimal user-input shape — `PartStock` contains only `{ outletId, qty, reorderLevel, location }` with no server-assigned fields, so the form supplies everything. No `Omit<>` wrapper needed. Validation:
- Throw `new Error('PART_CODE_EXISTS')` when `state.parts.some(p => p.partCode === input.partCode)` — form catches and surfaces inline error under the partCode field.
- `PartSchema.parse(input)` defence-in-depth check (form's RHF already validates via Zod, this is belt + suspenders).
- No timeline event (parts have none in the domain model).
- Push to `state.parts` via immer; return the parsed Part for the form's auto-select callback.

Line count: +30 in part-slice.ts, +1 in types.ts `PartActions` interface.

### 2.2 `groupRef` field on PurchaseOrder (domain schema)

Single optional string. No store changes — `createPurchaseOrder` already passes `input` through verbatim; the new field simply flows through. +1 line in `packages/types/src/domain/parts.ts`.

### 2.3 Existing actions — reused as-is

- `createSupplier(input, actor): Supplier` — already in `supplier-slice.ts`.
- `updatePart(partCode, patch, actor)` — already in `part-slice.ts`, used by Edit Part dialog.
- `createPurchaseOrder` — unchanged (called N times for split PO).

## 3. Add New Supplier flow

### 3.1 Component tree

```
apps/staff-web/src/components/parts/new-supplier-dialog/
├── index.ts                       (~10)
├── new-supplier-dialog.tsx        (~90)   Dialog primitive wrapper + composer
├── new-supplier-form.tsx          (~210)  RHF + fields
├── new-supplier-schema.ts         (~70)   Zod + GSTIN regex
└── new-supplier-helpers.ts        (~60)   mapFormToCreateInput + deriveImportFromCurrency
```

Container: `<Dialog size="md">` (560px). 6 fields fit without a panel.

### 3.2 Schema (`new-supplier-schema.ts`)

```ts
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
z.object({
  name: z.string().min(2),
  gstin: z.string().optional().refine(v => !v || GSTIN_RE.test(v), 'Invalid GSTIN format'),
  address: z.string().min(4),
  contact: z.string().min(4),                         // phone OR email (free text)
  paymentTerms: z.enum(['NET_30','NET_45','ADVANCE']),
  currency: z.enum(['INR','EUR','USD','GBP']).default('INR'),
  active: z.boolean().default(true),
})
```

`isImport` is derived (`currency !== 'INR'`) in helpers at submit time — not a form field.

### 3.3 Entry points

**A. PO form supplier `<select>`** (delta in `new-po-header-section.tsx`):
Append a final `<optgroup label="—">` with one option `value="__add_new__"` and label `+ Add new supplier`. On select change, if value === `__add_new__` → open dialog + revert the select value (preserve previous selection). Dialog accepts `onCreated?: (s: Supplier) => void`; on success the parent calls `setValue('supplierId', supplier.id)`. The option appears automatically because the select reads live from `usePartsStore(s => s.suppliers)`.

**B. Suppliers tab header** — currently no per-tab CTA slot exists in `parts-landing-view.tsx`. Add one: the landing view's header already has global CTAs (New GRN / New PO). For per-tab CTAs, add a tab-scoped toolbar row above the DataTable when `activeTab === 'suppliers'`. Button: `+ New Supplier` on the right. Opens the same dialog.

### 3.4 Role gate

Both CTAs wrapped in `<Gate role={['R12','R19','R22','R24']} fallback="disable">`. R13 Parts Counter sees a disabled button. **Locked tooltip copy (consistent across all four P4.1 CTAs): "Requires Parts Manager role"**. Passed explicitly via `tooltipMessage` prop (or equivalent) so it overrides any primitive default.

## 4. Add New Part flow

### 4.1 Component tree

```
apps/staff-web/src/components/parts/new-part-dialog/
├── index.ts                       (~10)
├── new-part-dialog.tsx            (~100)  SlideInPanel wrapper + composer
├── new-part-form.tsx              (~330)  RHF + 4 sections
├── new-part-schema.ts             (~120)  Zod + partCode regex
└── new-part-helpers.ts            (~80)   parseFitsCsv, mapFormToCreateInput, defaultStockRows
```

Container: `<SlideInPanel width="60%">` — 4 sections + ~22 fields won't fit a Dialog. 60% at 1440 viewport ≈ 864px — comfortable.

### 4.2 Form sections

1. **Identity** — Part Code (required, mono uppercase, `/^[A-Z0-9-]+$/`), Name, Brand `<select>` (BMW / Audi / Mercedes-Benz / Porsche / Universal), Category enum, Criticality enum.
2. **Commercial** — UoM (default `EA`), HSN Code (`/^\d{4,8}$/`), MRP, avgCost, lastPurchasePrice (defaults to avgCost via `onBlur` sync).
3. **Stock (3 rows, fixed)** — BLR-01 / MUM-01 / CHE-01. Each: qty (default 0), reorderLevel, location. No add/remove — always exactly 3 rows.
4. **Supply & Misc** — Supplier IDs (checkbox list of existing suppliers — clearer than `<select multiple>` at panel width; **zero suppliers allowed — `z.array(z.string()).default([])`** so a fresh part with no supplier on file is valid). Fits Vehicles (textarea, comma-separated → `string[]`). Warranty Policy (optional textarea). supersededBy (optional free-text input).

### 4.3 Uniqueness check

Form catches `createPart` throw:
```ts
try {
  const newPart = usePartsStore.getState().createPart(input, actor);
  onCreated?.(newPart);
} catch (e) {
  if (e instanceof Error && e.message === 'PART_CODE_EXISTS') {
    setError('partCode', { type: 'manual', message: 'A part with this code already exists' });
    return;
  }
  throw e;
}
```

Plus an inline live check on partCode `onBlur`: `usePartsStore.getState().parts.some(p => p.partCode === value)` — sets the same error before submit.

### 4.4 Entry points

**A. PO line-builder part `<select>`** (delta in `new-po-line-builder.tsx`): same `__add_new__` sentinel pattern as supplier. Dialog's `onCreated(part)` callback sets `lines.{idx}.partCode = part.partCode` + `lines.{idx}.unitPrice = part.lastPurchasePrice`.

**B. Stock List tab header** — same per-tab toolbar pattern as Suppliers. `+ New Part` CTA on the right.

Both gated R12+R19+R22+R24.

## 5. Edit Part Master

### 5.1 Component tree

```
apps/staff-web/src/components/parts/edit-part-dialog/
├── index.ts                       (~10)
├── edit-part-dialog.tsx           (~110)  SlideInPanel composer
├── edit-part-form.tsx             (~280)  RHF; partCode read-only
├── edit-part-schema.ts            (~90)   Zod — new-part shape minus partCode regex
└── edit-part-helpers.ts           (~70)   mapFormToPatch, diffPart (for audit log later)
```

Container: SlideInPanel 60% width (same as New Part for visual consistency). `defaultValues = useMemo(() => mapPartToForm(part), [part])` re-seeds on open.

### 5.2 Editable vs read-only

**NOT editable**: `partCode` (shown as read-only mono chip at top for context), `stock[].outletId`, `stock[].qty`.

**Editable**: name, brand, category, criticality, uom, hsnCode, mrp, avgCost, lastPurchasePrice, warrantyPolicy, supersededBy, supplierIds, fitsVehicles, per-stock-row `reorderLevel` + `location`.

**Rationale for stock qty exclusion**: stock quantities reflect physical inventory. Direct edit violates the invariant that qty changes pair with a StockMovement (audit trail). GRN POST / adjustStock / transferStock are the canonical qty-change paths.

**Cannot add stock rows on Edit**: the 3 outlet rows are fixed (BLR/MUM/CHE per fixture convention). If a part ships without all 3 outlet rows populated, the Edit dialog shows only the rows that exist; adding a new outlet row is not a P4.1 feature. Documented v1 limitation — future `adjustStock(partCode, outletId, 0, reason, actor)` path would create the row implicitly.

### 5.3 Submit

Builds `Partial<Part>` via `diffPart(original, formValues)` — only changed fields. Calls `updatePart(partCode, patch, actor)`. Toast `"Part {partCode} updated"` (matches existing PO/GRN toast style `"{poNo} created as Draft"`). Panel closes; the P3 Part Detail re-renders with new values (Zustand subscription).

**Save button disabled when `!formState.isDirty`** — prevents accidental no-op toasts when user opens Edit to inspect and closes without changes.

`diffPart` rationale: minimizes immer patch size + keeps form-to-store payload focused on actual changes. Future audit-log wiring benefits from the same helper.

### 5.4 Entry point + gate

P3 Part Detail header (`apps/staff-web/src/components/parts/detail/part-header.tsx`) gets a third CTA, an outlined Edit button placed between the existing "New GRN" and "Raise PO" CTAs:

```
[ New GRN ] [ Edit ] [ Raise PO ]
```

Wrapped in `<Gate role={['R12','R19','R22','R24']} fallback="disable">`. R13 Parts Counter sees the button disabled with a tooltip.

### 5.5 Shared form components with New Part?

**Keep separate for P4.1**. Schemas diverge (uniqueness + regex on create; partCode read-only on edit; stock qty editable on create but not on edit). Premature extraction creates a brittle component juggling create-vs-edit branches in every section. Total duplication: ~250 LoC across two form files — acceptable. Follow-up `extract-part-master-form` if a third caller surfaces.

## 6. Multi-outlet Split PO

### 6.1 Design choice

Approach B from the plan: **one form → N sibling POs linked by `groupRef`**. Rationale:
- Schema delta is a single optional string field. Approach A (schema-level splits on PurchaseOrderLine) forces invasive changes through GrnLine, match grid, stock movement attribution, and the Service auto-reserve loop — six surfaces vs one.
- Each sibling PO is separately-actionable — approvals, dispatch, receipts, GRNs all stay single-outlet. P5 ships unchanged.
- GRN flow needs zero changes.

### 6.2 Form-mode toggle

Top of the PO form (above Header section) adds a segmented control:

```
[  Single outlet  ] [  Split across outlets  ]
```

- **Single mode** (default): existing PO form exactly as shipped in P4.
- **Split mode**: Outlet field hidden in Header; a chip below reads "Splitting across BLR / MUM / CHE — N PO(s) will be created on submit."

### 6.3 Line builder in split mode

Row layout changes from:
```
[part][qty][unitPrice][lineTotal][×]
```
to:
```
[part][qty BLR][qty MUM][qty CHE][unitPrice][lineTotal][×]
```

- Line total = `(qtyBLR + qtyMUM + qtyCHE) * unitPrice`.
- `unitPrice` is shared across outlets — v1 simplification (supplier charges one rate regardless of destination).
- Per-cell `aria-label` carries "<Outlet> qty for line N" for SR parity.

### 6.4 Schema changes (`new-po-schema.ts`)

```ts
export const NewPoFormSchema = z.object({
  mode: z.enum(['single','split']).default('single'),
  supplierId: z.string().min(1),
  outletId: z.enum(['BLR-01','MUM-01','CHE-01']),   // used in single mode
  expectedDeliveryAt: z.string().min(1),
  isImport: z.boolean(),
  fxRate: z.number().positive().optional(),
  notes: z.string().optional(),
  linkedJobCardId: z.string().optional(),
  lines: z.array(z.object({
    partCode: z.string().min(1),
    qty: z.number().int().min(0).optional(),         // used in single mode
    qtyByOutlet: z.object({
      'BLR-01': z.number().int().min(0),
      'MUM-01': z.number().int().min(0),
      'CHE-01': z.number().int().min(0),
    }).optional(),                                    // used in split mode
    unitPrice: z.number().min(0),
  })).min(1),
})
.refine(v => !v.isImport || (v.fxRate && v.fxRate > 0), { message: 'FX rate required', path: ['fxRate'] })
.refine(v => v.mode === 'single'
  ? v.lines.every(l => (l.qty ?? 0) >= 1)
  : v.lines.every(l => l.qtyByOutlet && Object.values(l.qtyByOutlet).some(q => q > 0)),
  { message: 'Each line needs at least one unit' });
```

### 6.5 Submit handler (`new-purchase-order-form.tsx`)

```ts
onSubmit(values) {
  if (values.mode === 'single') {
    const newPo = createPurchaseOrder(mapFormToCreateInput(values, …), actor);
    toast(`${newPo.poNo} created as Draft`);
    router.push(`/parts/po/${newPo.id}`);
    return;
  }
  // Split mode: derive N POs
  const groupRef = makeId('pogroup');
  const outlets: OutletId[] = ['BLR-01','MUM-01','CHE-01'];
  const siblings: PurchaseOrder[] = [];
  for (const outlet of outlets) {
    const linesForOutlet = values.lines
      .filter(l => (l.qtyByOutlet?.[outlet] ?? 0) > 0)
      .map(l => ({
        partCode: l.partCode,
        qty: l.qtyByOutlet![outlet],
        unitPrice: l.unitPrice,
      }));
    if (linesForOutlet.length === 0) continue;  // skip outlets with no non-zero lines
    const input = mapFormToCreateInput({ ...values, outletId: outlet, lines: linesForOutlet }, …);
    const newPo = createPurchaseOrder({ ...input, groupRef }, actor);
    siblings.push(newPo);
  }
  toast(`Created ${siblings.length} POs (${siblings.map(p => p.poNo).join(' · ')}) under group`);
  router.push(`/parts?tab=po&group=${groupRef}`);
}
```

### 6.6 Summary rail in split mode

Rail shows aggregate + breakdown:

```
Lines              4
Subtotal      ₹ 82,400
GST (28%)     ₹ 23,072
─────────────────
GRAND TOTAL   ₹ 1,05,472

PER-OUTLET
BLR       1 line   ₹ 21,504
MUM       2 lines  ₹ 43,008
CHE       1 line   ₹ 40,960

[Cancel]  [Submit (3 POs)]
```

Submit label dynamically reflects non-zero outlet count.

### 6.7 PO tab `?group=` filter

`/parts?tab=po&group=<ref>` filters PO rows to `po.groupRef === group`. Banner above the table: "Showing N POs in group GRP-... [Clear filter]". Read-once like `?supplier=` (spec P2 §3).

### 6.8 Known v1 simplifications

- Single supplier rate across all outlets (unit price identical per line).
- Shared `expectedDeliveryAt` (supplier ships consolidated then breaks down at receipt — reality is often per-outlet shipment dates).
- No atomic cancel-group action (user cancels each sibling individually in P5).
- `groupRef` has no DB-side index or uniqueness — it's a client-assigned label (mock store doesn't care).

Each of the above is documented in §11 Risks.

## 7. Component decomposition summary

```
NEW FILES (~2100 LoC across 3 dialog dirs)
apps/staff-web/src/components/parts/new-supplier-dialog/     ~440 LoC  (5 files)
apps/staff-web/src/components/parts/new-part-dialog/         ~640 LoC  (5 files)
apps/staff-web/src/components/parts/edit-part-dialog/        ~560 LoC  (5 files)

DELTAS TO EXISTING FILES
apps/staff-web/src/components/parts/new-po/new-po-header-section.tsx  +70  (segmented mode toggle + supplier `__add_new__` sentinel)
apps/staff-web/src/components/parts/new-po/new-po-line-builder.tsx    +120 (split-mode triple qty + part `__add_new__` sentinel)
apps/staff-web/src/components/parts/new-po/new-po-schema.ts           +30  (mode + qtyByOutlet + refines)
apps/staff-web/src/components/parts/new-po/new-po-summary-rail.tsx    +50  (split per-outlet breakdown)
apps/staff-web/src/components/parts/new-po/new-purchase-order-form.tsx +60 (split submit loop + groupRef)
apps/staff-web/src/components/parts/new-po/new-po-helpers.ts          +40  (deriveSplitPos, pogroup id)

apps/staff-web/src/components/parts/parts-landing-view.tsx           +35  (per-tab CTA slot)
apps/staff-web/src/components/parts/tabs/purchase-orders-tab.tsx     +25  (?group= filter + banner)
apps/staff-web/src/components/parts/tabs/suppliers-tab.tsx           +25  (header CTA)
apps/staff-web/src/components/parts/tabs/stock-list-tab.tsx          +25  (header CTA)
apps/staff-web/src/components/parts/detail/part-header.tsx           +25  (Edit button)

STORE
apps/staff-web/src/lib/parts/parts-store/slices/part-slice.ts        +30  (createPart)
apps/staff-web/src/lib/parts/parts-store/types.ts                    +3   (PartActions.createPart)

DOMAIN SCHEMA
packages/types/src/domain/parts.ts                                   +1   (groupRef field)

PARENT SPEC EDITS
specs/modules/parts/01-staff-parts-module.md                         ~+20 (§4 / §7 / §9 / §13 amendments)
```

All files projected ≤ 350 LoC. The heaviest (new-part-form.tsx at ~330) is near the cap. Heaviest post-delta is `new-po-line-builder.tsx` at ~360 — will extract a `<SplitQtyCells>` helper (~80 LoC) into the same folder to stay under 350.

## 8. Sentinel option pattern — UX spec

Both supplier and part `<select>`s append a final `<optgroup label="—">` (em-dash) with one option:

```html
<optgroup label="—">
  <option value="__add_new__">+ Add new supplier</option>
</optgroup>
```

Native `<select>` renders optgroup labels grayed; the em-dash + `+` prefix parses as "action" visually. No accent color (not supported by native `<option>`). If usability review flags this as too subtle, fallback is a dedicated `+` icon button adjacent to the select — file `parts-combobox-primitive` follow-up (already tracked from P4).

On change:
```ts
onChange={(e) => {
  if (e.target.value === '__add_new__') {
    e.preventDefault();
    setOpen(true);         // open dialog
    setValue('supplierId', previousValue);  // revert select
    return;
  }
  // normal flow
}}
```

## 9. Scenarios (GPA — acceptance)

### S1: Create supplier from PO form
- **Given** PO form open, supplier select showing existing suppliers
- **When** user selects `+ Add new supplier`
- **Then** `<NewSupplierDialog>` opens; select value reverts to whatever was selected before
- **When** user fills Name / Address / Contact, Payment Terms NET_30, Currency INR, Submit
- **Then** toast "Supplier created"
- **And** dialog closes
- **And** PO form's supplier select NOW shows the new supplier AND has it selected

### S2: Create supplier from Suppliers tab header
- **Given** `/parts?tab=suppliers`
- **When** clicking `+ New Supplier` top-right
- **Then** dialog opens
- **When** submit succeeds
- **Then** new row appears in the Suppliers table
- **And** `LifetimeValue` column shows ₹0 (no POs yet)

### S3: GSTIN validation
- **Given** New Supplier dialog open
- **When** entering GSTIN "invalid-format"
- **Then** inline error "Invalid GSTIN format" appears under the field
- **When** clearing the field
- **Then** error clears (optional field)

### S4: Import supplier auto-flag
- **Given** New Supplier dialog open
- **When** selecting Currency = EUR
- **Then** `isImport` is derived as `true` at submit (not shown in UI as a field)
- **And** the created supplier appears in the PO form's supplier select under the "Imports" optgroup

### S5: Create part from PO line builder
- **Given** PO form with 1 empty line
- **When** on that line's part select, choosing `+ Add new part`
- **Then** `<NewPartDialog>` slides in (60% width)
- **When** filling all 4 sections and submit
- **Then** toast "Part created"
- **And** panel closes
- **And** the current line's partCode is set to the new part
- **And** unitPrice auto-fills to the new part's lastPurchasePrice

### S6: Create part from Stock List header
- **Given** `/parts?tab=stock-list`
- **When** clicking `+ New Part` header CTA
- **Then** panel opens
- **When** submit
- **Then** new row appears in the Stock List table (default 0 qty per outlet → status chip = OUT)

### S7: Duplicate partCode on create
- **Given** New Part panel open
- **When** entering partCode = "BMW-BRK-PAD-F30" (already exists)
- **Then** on blur, inline error "A part with this code already exists" appears
- **And** Submit is disabled
- **When** changing partCode to a fresh code
- **Then** error clears

### S8: Edit Part Master — update MRP
- **Given** `/parts/BMW-BRK-PAD-F30` as R24 user
- **When** clicking Edit in the header
- **Then** `<EditPartDialog>` slides in with all editable fields pre-filled
- **And** partCode is read-only mono chip at top
- **When** changing MRP from 18500 to 19500
- **When** clicking Save
- **Then** toast "Part updated"
- **And** panel closes
- **And** Part Detail re-renders with MRP ₹19,500 in the Overview card

### S9: Edit Part Master — gate disables for R13
- **Given** `/parts/BMW-BRK-PAD-F30` as R13 Parts Counter
- **Then** the Edit button renders disabled with tooltip "Requires Parts Manager role"
- **And** the tooltip is keyboard-reachable (focus-visible + aria-describedby)

### S10: Split PO form — toggle
- **Given** `/parts/po/new`
- **When** clicking the "Split across outlets" segment
- **Then** the Outlet field disappears from Header section
- **And** the Line Builder row layout now has 3 qty inputs (BLR / MUM / CHE) instead of 1
- **And** the rail shows "PER-OUTLET" breakdown block
- **And** Submit button label becomes "Submit (N POs)" where N is the count of non-zero outlets

### S11: Split PO submit — 3 outlets non-zero
- **Given** Split mode, 1 line: BMW-BRK-PAD-F30 qty BLR=2, MUM=3, CHE=1, unitPrice 12400
- **When** Submit
- **Then** 3 POs are created with shared `groupRef`
- **And** toast "Created 3 POs (PO-... · PO-... · PO-...) under group"
- **And** router navigates to `/parts?tab=po&group=<groupRef>` showing the 3 POs

### S12: Split PO submit — 2 outlets non-zero (1 skipped)
- **Given** Split mode, 1 line: BLR=2, MUM=0, CHE=1
- **When** Submit
- **Then** 2 POs created (MUM skipped because all its lines are 0)
- **And** toast "Created 2 POs ..."
- **And** landing shows only 2 POs under the group

### S12a: Split PO — degenerate single-outlet case
- **Given** Split mode with all lines having qty only on BLR (MUM=0, CHE=0 across all lines)
- **Then** rail per-outlet breakdown dims MUM and CHE rows (opacity-50)
- **And** Submit label shows "Submit (1 PO)" and is NOT disabled
- **And** a soft-warning chip under the mode toggle reads "Only 1 outlet has quantities — consider Single mode for faster entry"
- **When** Submit
- **Then** 1 PO is created (behavior correct; warning is a UX nudge, not a block)

### S12b: Split PO — N=0 (all qty across all lines are 0)
- **Given** Split mode, all qty inputs are 0
- **Then** Submit button is disabled
- **And** Submit label reads "Submit" (no count)
- **And** Zod refine blocks submission anyway

### S13a: Cancel-with-dirty flow (locked copy — matches P4)
- **Given** any of the three dialogs/panels open with user-typed changes
- **When** clicking Cancel
- **Then** an AlertDialog opens with title "Discard changes?", body "Your unsaved entries will be lost.", destructive primary "Discard", secondary "Keep editing"
- **When** confirming Discard
- **Then** the dialog/panel closes without saving

### S13b: Sentinel auto-select timing
- **Given** PO form with empty supplier; user opens `+ Add new supplier`
- **When** user submits the new supplier
- **Then** within the same React render cycle, the `setValue('supplierId', newSupplier.id)` successfully targets the newly-appeared `<option>` (Zustand is synchronous; options list includes the new id by the time the callback fires)
- **And** no "value not matched" console warning

### S13: Typecheck + build
- `pnpm -F staff-web typecheck` exits 0.

### S14: Zustand selector safety
- **Given** any of the three dialogs open
- **Then** no "getSnapshot should be cached" console warnings
- **And** every `usePartsStore(...)` / `useServiceStore(...)` call uses stable base-array selectors

## 10. Accessibility

- All dialog/panel mounts use existing primitives with documented focus trap + restore + Escape (`Dialog`, `SlideInPanel`).
- Submit buttons: `disabled` when form invalid; `aria-busy` while submitting.
- Gate-disabled CTAs: `aria-disabled="true"` + tooltip (native `title` attr + visible hint) so SR users hear the gate reason.
- `__add_new__` sentinel option: `<option>` is native; screen readers will read the label "Add new supplier" correctly.
- Split-mode qty cells: each input has `aria-label="<Outlet> qty for line N"`.
- Edit dialog: partCode read-only chip uses `aria-readonly="true"`.
- Live part-code uniqueness error: `aria-live="polite"` on the error paragraph.

## 11. Risks + known gaps

| Risk | Mitigation |
|---|---|
| Sentinel option UX subtlety | Documented; follow-up `parts-combobox-primitive` tracked from P4 as the long-term fix |
| PartCode uniqueness race | `createPart` throws; form catches and sets field error. Synchronous mock store — no true race |
| Split-PO shared unit price | v1 simplification; flagged in §6.8 |
| Split-PO shared expected delivery | v1 simplification; flagged in §6.8 |
| Split-PO non-atomic submit | Sync mock store — either all succeed or all throw. No network failures modelled |
| Edit stale data (concurrent edits) | Mock single-user — N/A; documented |
| Stock qty not editable via Edit dialog | By design — qty changes go through GRN / adjust / transfer only. Explicit spec note |
| GST flat 28% still applies in split mode | Same v1 simplification as P4; each sibling PO computes its own totals |
| Summary rail breakdown correctness | Submit payload + rail render use SAME `deriveSplitPos` helper — single source of truth |
| Gate "disable" vs "hide" | Chose `disable` for feature discovery + tooltip explanation. Consistent across P4.1 CTAs |
| SlideInPanel footer stickiness | Primitive supports vertical scroll; footer `[Cancel][Save]` renders as `position: sticky; bottom: 0` inside panel body |
| `.next` cache after adding many files | `rm -rf apps/staff-web/.next` if module-not-found errors appear |
| Sentinel auto-select race (setValue on not-yet-rendered option) | Zustand sync update means the store `.suppliers` array includes the new row by the time `setValue` fires — React hasn't re-rendered yet but RHF's setValue queues the update; by the time the next render flushes, both store state and form state are in sync. Documented in S13b. |
| Split-mode degenerate single-outlet | Allowed with soft-warning chip ("Only 1 outlet has quantities — consider Single mode for faster entry"); Submit NOT blocked. Rail breakdown dims zero-qty outlet rows. |
| Dialog/SlideInPanel dirty-guard | Neither primitive has a built-in dirty prop. Each form wires its own AlertDialog on cancel-with-dirty — matches P4 precedent. Locked AlertDialog copy: title "Discard changes?", body "Your unsaved entries will be lost.", primary "Discard" (destructive), secondary "Keep editing". |

## 12. Acceptance criteria

1. Scenarios S1–S14 pass.
2. Typecheck clean on both `@dms/staff-web` and `@dms/types`.
3. Every new file ≤ 350 LoC. Heaviest post-delta file (`new-po-line-builder.tsx`) ≤ 350 via `<SplitQtyCells>` extraction.
4. No new npm dependencies.
5. Parent spec (`SPEC-PARTS-001`) updated with §4 groupRef, §7 three role-gate rows, §9 rollout row, §13 edit-supplier clarification — all in the same commit.
6. All P4.1 CTAs wrapped in `<Gate role={['R12','R19','R22','R24']} fallback="disable">` where appropriate.
7. Post-create navigation works: supplier created from PO form auto-selects; part created from PO line auto-assigns + unit price pre-fills; split submit navigates to `/parts?tab=po&group=<ref>`.
8. Code-reviewer report lists no BLOCKERs.
9. Visual smoke across these 5 named scenarios, zero console errors on each: S1 (create supplier from PO dialog), S5 (create part from PO line builder), S8 (edit part from Part Detail), S10 (split-mode toggle), S11 (split submit 3 POs). Screenshots captured via `preview_screenshot` where feasible.

## 13. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | P4.1 phase spec written. Pending spec-reviewer sign-off. |
| 2026-04-17 | **P4.1 code review.** Opus reviewer returned 2 BLOCKER + 5 CONCERN + 7 NIT. Fixes applied: (#01 BLOCKER) PO supplier sentinel — dropped the `previousSupplierId` state that caused a stale-value revert; now reverts to the currently-watched `supplierId`; (#02 BLOCKER) New Part onBlur live uniqueness check wired via `register('partCode', { onBlur, onChange })`, sets/clears inline error immediately; (#03 CONCERN) top-header Submit in split mode now consumes the same `nonZeroOutletCount` as the rail so N=0 disables both; label dynamically reads `"Submit (N POs)"`; (#06) EditPartStockRowSchema outletId tightened from `z.string()` to `z.enum(['BLR-01','MUM-01','CHE-01'])` — `mapPartToForm` filters to canonical outlets; (#12) avgCost onBlur helper reads via `getValues` instead of closure. Remaining CONCERN/NITs accepted as-is or withdrawn by reviewer on re-read (spread-safe line reshape, async throw defensive handling, setTimeout DX) — tracked as follow-ups. |
| 2026-04-17 | **Spec review + design-agent integration.** Spec reviewer returned 2 BLOCKER-tagged items (both resolved as "no primitive dirty-guard — wire AlertDialog per form, matches P4 precedent") + 7 CONCERN + 7 NIT. Design agent returned full wireframes + 8 open questions. All resolved in-spec: (#01/#02) cancel-with-dirty via AlertDialog per form, locked copy, S13a scenario added; (#03) `createPart` input kept as `Part` — already minimal (PartStock has no server-only fields); (#04) supplierIds defaults to `[]` (zero allowed); (#05) Edit cannot add stock rows — documented as intentional v1 limitation; (#06) Split-PO degenerate case: soft-warning chip + dimmed rail breakdown, S12a added; (#07) Submit label N=0 clarified disabled, S12b added; (#08) sentinel auto-select timing documented, S13b added; (#09) `?group=` + `?supplier=` exception list amended to PLAN-PARTS-002 §3; (§15) parent spec changelog row locked; (#12) toast copy locked "Part {partCode} updated"; (#13) tooltip copy locked "Requires Parts Manager role"; (#14) visual smoke scenarios enumerated as S1/S5/S8/S10/S11; (Save-disabled-when-not-dirty) added to §5.3. Status: approved. |
