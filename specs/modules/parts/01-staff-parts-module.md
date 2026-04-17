---
spec_id: SPEC-PARTS-001
domain: parts
status: approved
risk_level: medium
pii_sensitivity: low
flags: [parts-module, service-integration]
owners: [orchestrator]
depends_on: [SPEC-SERVICE-001, SPEC-INVENTORY-002]
---

# Staff Parts Module (S5)

Research inputs: Doc 02 §Parts, Doc 05 §6–7, Doc 09 (GRN/HSN/CKD/CBU/Landed Cost/Supersession), Doc 11 §15 (PO/GRN state machines), Doc 14 §R02/R03/R12/R13/R17/R19/R24. Design reference: stitch `parts_stock_list`, `parts_low_stock_detail`, `parts_grn_detail_pending_approval`. Component patterns: `design/04_staff_component_patterns.md`.

## 1. Summary

The Parts module is the back-office surface that keeps the workshop running. Luxury pre-owned parts have long lead times (OEM-only SKUs: 6–10 weeks for a Porsche PIWIS ECU or BMW control arm) and high unit cost (₹80k–₹4L per part is routine). Stock visibility, reorder discipline and landed-cost accuracy directly drive service SLA, warranty margin and working capital (Doc 05 §1, §6).

Scope for v1 covers the full PO → GRN → Stock flow, the Parts master, supplier directory, and the cross-module loop with Service: requisitions raised on a JobCard flow into a PO, and when the GRN posts, the corresponding Service PartsLine auto-flips REQUESTED → RESERVED.

## 2. Routes (6)

| Route | Purpose |
|---|---|
| `/parts` | Landing — 5 tabs: Stock List (default) / Low Stock / Purchase Orders / GRNs / Suppliers. URL-sync via `?view=low-stock\|po\|grn\|suppliers`. |
| `/parts/[partCode]` | Part detail — stock card, per-outlet stock, supersession chain (read-only), movement history, linked open POs, "Raise PO" CTA, open Service JobCards consuming this part |
| `/parts/po/new` | Create PO form. Accepts `?jobCard=&part=` pre-fill from the Service S4.1 "Create PO" affordance |
| `/parts/po/[id]` | PO detail + approval actions (Approve / Reject / Cancel / Mark Dispatched / Mark Received / Close) |
| `/parts/grn/new` | Create GRN form. Accepts `?po=` pre-fill — lines become a 3-way-match grid (ordered vs received qty per line) |
| `/parts/grn/[id]` | GRN detail + QC / discrepancy workflow / Post action (posts stock movements) |

## 3. Landing page tabs

Canonical underline tabs from design §2 with full ARIA. Each tab uses the DataTable primitive.

### 3.1 Stock List (default)
Columns: Part Code (mono) · Name · Brand · Fits (chips, up to 2) · Stock (per-outlet badges BLR/MUM/CHE) · Reorder Level · Avg Cost (₹) · MRP (₹) · Location · Status chip (OK / LOW / OUT).

Filter bar: Outlet / Brand / Category (Mechanical / Electrical / Trim / Consumable per Doc 05 §6.1) / Criticality (Routine / Common / Critical / Safety) / Search (code or name).

### 3.2 Low Stock
Only parts where `stock[outlet].qty <= reorderLevel` for at least one outlet. Extra columns: Shortfall, Days of Cover, Last PO Date, quick-action "Raise PO" button (→ `/parts/po/new?part=<code>`).

### 3.3 Purchase Orders
Columns: PO No (mono) · Supplier · Outlet · Status StateChip · Lines · Total ₹ (right-aligned mono) · Created By · Expected Delivery (red if past).

Filter: Status / Supplier / Outlet / Date range.

Row click → `/parts/po/[id]`.

### 3.4 GRNs
Columns: GRN No (mono) · PO No (link) · Supplier · Outlet · Status · Lines · Received/Ordered (mono fraction) · Received At · Received By · Discrepancy badge.

Filter: Status / Outlet / Date range / Has-discrepancy toggle.

### 3.5 Suppliers
Columns: Name · GSTIN · Payment Terms · Active POs · Lifetime Value ₹ · Last Order.

Click opens a read-only SlideInPanel with contact + address (v1). Supplier detail route deferred to v1.1.

## 4. Entities & Zod schemas

All in `packages/types/src/domain/parts.ts`. Infer TS types with `z.infer<typeof ...>`.

```ts
export const PartCategoryEnum = z.enum([
  'MECHANICAL', 'ELECTRICAL', 'TRIM', 'CONSUMABLE'
]);
export const PartCriticalityEnum = z.enum([
  'ROUTINE', 'COMMON', 'CRITICAL', 'SAFETY'
]);
export const PartStockStatusEnum = z.enum(['OK', 'LOW', 'OUT']);

export const PurchaseOrderStatusEnum = z.enum([
  'DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED',
  'DISPATCHED','PARTIALLY_RECEIVED','RECEIVED','CLOSED',
]);
export const GrnStatusEnum = z.enum([
  'DRAFT','PENDING_QC','MATCHED','REJECTED','POSTED',
]);
export const StockMovementTypeEnum = z.enum(['IN','OUT','ADJUST','TRANSFER']);

// Part master
export const PartStockSchema = z.object({
  outletId: z.string(),
  qty: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  location: z.string(), // rack/shelf
});
export const PartSchema = z.object({
  partCode: z.string(), // OEM number, PK
  name: z.string(),
  brand: z.string(), // BMW / Audi / Mercedes / Porsche / …
  fitsVehicles: z.array(z.string()), // model-year tuples
  category: PartCategoryEnum,
  criticality: PartCriticalityEnum,
  uom: z.string().default('EA'),
  hsnCode: z.string(), // typ. 8708
  mrp: z.number(),
  avgCost: z.number(),
  lastPurchasePrice: z.number(),
  warrantyPolicy: z.string().optional(),
  supersededBy: z.string().optional(), // newer partCode, Doc 09
  stock: z.array(PartStockSchema), // one row per outlet
  supplierIds: z.array(z.string()),
});

// Supplier
export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  gstin: z.string().optional(),
  address: z.string(),
  contact: z.string(),
  paymentTerms: z.string(), // 'NET_30', 'ADVANCE', etc.
  currency: z.enum(['INR','EUR','USD','GBP']).default('INR'),
  active: z.boolean().default(true),
});

// PO
export const PurchaseOrderLineSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  qty: z.number().int().min(1),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export const PurchaseOrderSchema = z.object({
  id: z.string(),
  poNo: z.string(), // PO-2026-00001
  supplierId: z.string(),
  outletId: z.string(),
  status: PurchaseOrderStatusEnum,
  createdBy: z.string(),
  createdAt: z.string(),
  submittedAt: z.string().optional(),
  approverId: z.string().optional(),
  approvedAt: z.string().optional(),
  rejectedReason: z.string().optional(),
  dispatchedAt: z.string().optional(),
  lines: z.array(PurchaseOrderLineSchema),
  subtotal: z.number(),
  gst: z.number(),
  total: z.number(),
  expectedDeliveryAt: z.string(),
  isImport: z.boolean().default(false),
  fxRate: z.number().optional(),
  notes: z.string().optional(),
  linkedJobCardId: z.string().optional(), // Service-originated PO
});

// GRN
export const GrnLineSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  orderedQty: z.number().int().min(0),
  receivedQty: z.number().int().min(0),
  unitPrice: z.number(),
  condition: z.enum(['OK','DAMAGED','WRONG']),
  batchNo: z.string().optional(),
  serialNos: z.array(z.string()).optional(),
});
export const GrnSchema = z.object({
  id: z.string(),
  grnNo: z.string(), // GRN-2026-00001
  poId: z.string().optional(), // walk-in/emergency receipts allowed
  supplierId: z.string(),
  outletId: z.string(),
  status: GrnStatusEnum,
  receivedBy: z.string(),
  receivedAt: z.string(),
  qcBy: z.string().optional(),
  qcAt: z.string().optional(),
  postedAt: z.string().optional(),
  rejectedReason: z.string().optional(),
  lines: z.array(GrnLineSchema),
  landedCostAdders: z.object({
    freight: z.number().default(0),
    customs: z.number().default(0),
    igst: z.number().default(0),
    clearing: z.number().default(0),
  }).optional(),
  discrepancyNotes: z.string().optional(),
  threeWayMatchStatus: z.enum(['MATCHED','DISCREPANCY']).optional(),
});

// Stock movement
export const StockMovementSchema = z.object({
  id: z.string(),
  partCode: z.string(),
  outletId: z.string(),
  type: StockMovementTypeEnum,
  qty: z.number().int(), // signed: IN positive, OUT negative
  refType: z.enum(['GRN','JOBCARD','ADJUST','TRANSFER']),
  refId: z.string(),
  at: z.string(),
  actorId: z.string(),
  reason: z.string().optional(),
});
```

## 5. State machines

### 5.1 Purchase Order

```
DRAFT ─submit─> PENDING_APPROVAL ─approve─> APPROVED ─dispatch─> DISPATCHED ─receive─> PARTIALLY_RECEIVED ─receive*─> RECEIVED ─close─> CLOSED
                       │                        │
                       └─reject─> REJECTED      └─cancel─> CANCELLED
DRAFT ─cancel─> CANCELLED
```

### 5.2 GRN

```
DRAFT ─submit─> PENDING_QC ─match─> MATCHED ─post─> POSTED
                    │
                    └─reject─> REJECTED
```

Posting a GRN:
1. Writes one `StockMovement` (type IN) per GRN line into `movements[]`.
2. Updates `part.stock[outlet].qty += receivedQty` per line.
3. Recalculates `part.avgCost` using weighted-average over all prior IN movements (Doc 05 §6.3 landed-cost rule).
4. Updates `part.lastPurchasePrice` to the latest GRN line's `unitPrice`.
5. If the GRN's `poId` matches an open Service PartsLine in status REQUESTED, auto-flips it to RESERVED and appends a `part_reserved` timeline event on that JobCard (stretch — see §11).
6. If GRN fills all PO lines fully, auto-transitions the PO to RECEIVED (else PARTIALLY_RECEIVED).

Single source of truth: `apps/staff-web/src/lib/parts/state-machine.ts` exports `canTransitionPo(from,to)`, `allowedNextPo(from)`, `canTransitionGrn(from,to)`, `allowedNextGrn(from)`, plus capability tables keyed by role code + PO total (for dual-approval threshold gating).

## 6. Approval thresholds (LOCKED 2026-04-17)

| PO Total | Required approver role |
|---|---|
| ≤ ₹10,000 | R13 Parts Counter can submit |
| ₹10,001 – ₹50,000 | R12 Parts Manager (submits + approves) |
| ₹50,001 – ₹2,00,000 | R03 Outlet Manager or higher |
| > ₹2,00,000 | R02 Org Admin / R19 GM / R24 CEO |

These mirror the Service warranty-claim thresholds (PLAN-SERVICE-002) and slot into the same Gate primitive pattern.

## 7. Role gates

| Action | R13 | R12 | R03 | R19 | R22 | R24 |
|---|---|---|---|---|---|---|
| View stock (own outlet) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cross-outlet stock | ⛔ | ✅ | 🔶 cluster | ✅ | ✅ | ✅ |
| Raise PO draft | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit PO ≤ ₹10k | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve PO ≤ ₹50k | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve PO ≤ ₹2L | ⛔ | ⛔ | ✅ | ✅ | ✅ | ✅ |
| Approve PO > ₹2L | ⛔ | ⛔ | ⛔ | ✅ | ✅ | ✅ |
| Record GRN | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ✅ |
| QC + Post GRN | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Adjust stock | ⛔ | 📝 + Finance co-sign | ⛔ | ✅ | ✅ | ✅ |
| Inter-outlet transfer | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Issue parts to JobCard | ✅ | ✅ | ⛔ | ⛔ | ⛔ | ✅ |

Default user is R24 Meera Iyer — sees all actions. Gates remain in code for later role-switcher testing.

## 8. Fixture seed plan

- **60 parts**: ~20 BMW, ~15 Audi, ~15 Mercedes, ~10 Porsche, 5 shared consumables. At least 6 safety-critical (airbag module, seatbelt pretensioner, EV HV cable, ABS pump, ECU, ADAS camera). Spread stock across all 3 outlets, with ~10 parts in LOW and 3 in OUT on at least one outlet.
- **8 suppliers**: BMW India Parts Distribution, Audi India Parts, Mercedes-Benz India, Porsche Centre Mumbai (OEM captives); Bosch India, Mahle Filtersysteme, Sachs India (aftermarket tier-1); LuxeAuto Imports (import broker for Doc 05 §6.4 imports).
- **10 POs** across statuses: 2 DRAFT, 2 PENDING_APPROVAL (one > ₹50k showing escalation), 2 APPROVED, 1 DISPATCHED, 1 PARTIALLY_RECEIVED, 1 RECEIVED, 1 CLOSED.
- **5 GRNs**: 1 DRAFT, 1 PENDING_QC, 1 with discrepancy (short-received), 1 MATCHED, 2 POSTED.
- **~200 StockMovements** = GRN-generated IN + back-fill of OUT events consuming existing Service PartsLines.
- IDs deterministic (`part-BMW-BRK-PAD-F30`, `sup-001`, `po-001`, `grn-001`, `mov-00001`).

## 9. Rollout phases

| Phase | Scope | Files |
|---|---|---|
| **P1 — Foundations** | Zod types + fixtures + state-machine helper + Zustand store + layout provider. No UI. Route `/parts/page.tsx` stays placeholder. | `packages/types/src/domain/parts.ts`, `packages/mocks/src/fixtures/parts.ts`, `packages/mocks/src/handlers/parts.ts`, `apps/staff-web/src/lib/parts/{state-machine,parts-store,parts-store-hydrator}.ts(x)`, `apps/staff-web/app/(shell)/parts/layout.tsx` |
| **P2 — Landing** | `/parts/page.tsx` with 5 tabs, filter bars, DataTables, URL-sync, empty/loading/error states, per-outlet stock badges, "Raise PO" quick action on Low Stock rows | `parts-landing-view.tsx`, `tabs/{stock-list,low-stock,purchase-orders,grns,suppliers}-tab.tsx` |
| **P3 — Part detail** | `/parts/[partCode]` — stock card with per-outlet breakdown, supersession chain row (read-only), Movement History (paginated DataTable), Open POs, Suppliers, linked Service JobCards | `parts/[partCode]/page.tsx`, `part-detail-view.tsx` |
| **P4 — Create flows** | `/parts/po/new` (supplier + outlet + line builder with part search combobox, pre-fill from `?jobCard=&part=`) + `/parts/grn/new` (PO pre-fill grid, QC fields) | `new-po-form.tsx`, `new-grn-form.tsx` |
| **P5 — Detail + approvals** | `/parts/po/[id]` (role+threshold-gated Approve / Reject / Cancel / Dispatch / Receive / Close) + `/parts/grn/[id]` (QC + Discrepancy + Post — triggers stock movements) | `po-detail-view.tsx`, `grn-detail-view.tsx`, `action-flows/{approve-po,reject-po,cancel-po,dispatch-po,post-grn,reject-grn,record-discrepancy}-dialog.tsx` |
| **P6 — Integration** | Replace S4 "Create PO (coming in S5)" stub with real link. Auto-reserve Service PartsLine on GRN POST (see §11). Update inventory vehicle detail refurb parts list to `/parts/[partCode]`. | Service tabs file edits; parts-store.postGrn hook |

Stretch (locked in per user answer 2026-04-17):
- **Auto-reserve** (§11) — IN P6 baseline, not stretch.
- **Inter-outlet transfer** — implement in P6 as a separate "Transfer" dialog on Part detail. Creates two linked StockMovements (OUT + IN). R12+ gate.

## 10. Fixture data deep-clone + store patterns

Same pattern as S4:
- `parts-store.ts` uses Zustand + immer middleware; `structuredClone(fixtureArray)` on mount so fixtures stay pristine.
- All mutations stamp actor `{ id, name }` and emit the appropriate stock movement / audit entries.
- Derived selectors MUST use `useMemo` after a stable selector (e.g. `const allMovements = useServiceStore(s => s.movements); const forPart = useMemo(...)`). Fixed the same re-render bug in S4 photos/attachments panels; do not repeat.
- `params` in detail-route client components is a plain object, **not** a `Promise`.

## 11. Service integration (cross-module)

### 11.1 Create PO from Service PartsLine
In `apps/staff-web/src/components/service/tabs/jobcard-parts-tab.tsx`, the current shortage PO stub currently shows a "coming in S5" toast. P6 replaces that with:

```tsx
<Link href={`/parts/po/new?jobCard=${jobCard.id}&part=${line.partCode}`}>
  Create PO
</Link>
```

The new-PO form reads those query params and pre-fills:
- Supplier: `part.supplierIds[0]` (user can change)
- Outlet: `jobCard.outletId`
- Line: `{ partCode, qty: line.qty, unitPrice: part.lastPurchasePrice }`
- `linkedJobCardId` on the PO payload

### 11.2 Auto-reserve on GRN POST
In `parts-store.ts` → `postGrn(grnId, actor)`:
1. Resolve the GRN's lines.
2. For each line where `grn.poId` is set and the PO has `linkedJobCardId`:
   - Find service PartsLines on that JobCard where `partCode` matches and `status === 'REQUESTED'`.
   - Dispatch to the Service store: `useServiceStore.getState().updatePart(partsLineId, { status: 'RESERVED' }, actor)`.
   - The Service store already emits `part_reserved` timeline events; no change there.
3. Toast: "3 Service parts auto-reserved from GRN-2026-00002".

This is the flow that closes the S4↔S5 loop visibly in the demo.

### 11.3 Inventory linkage (read-only)
Inventory vehicle detail → refurb "parts consumed" list: each row becomes a `<Link href={`/parts/${partCode}`}>`. No new fixture work — Inventory already tracks which parts were used in refurb.

## 12. Design / component compliance

Every new Dialog, SlideInPanel, AlertDialog, form section in this module MUST follow design doc §1 (card padding p-3/p-4/p-6), §2 (canonical underline tabs + full ARIA), §4 (h-10 inputs, uppercase labels), §5 (buttons), §8 (typography). No `bg-[var(--color-*)]` or hex literals. Reuse existing primitives from `@/src/components/primitives`.

## 13. Non-goals (OUT of v1)

- Barcode / QR scan at GRN receipt (noted by Doc 05 §6.3 but not required for v1)
- Multi-warehouse within one outlet (single stock pool per outlet)
- Wholesale / OTC parts sale (Doc 14 §R13 — off by default)
- Auto-replenishment engine / nightly reorder suggestions
- Supplier invoicing / AP 3-way match (Finance module territory)
- Supplier performance scorecards
- Live FX feed (fixture FX rate only)
- Tally sync of parts COGS
- Physical inventory reconciliation / cycle count
- Recall-driven pre-positioning (Doc 05 §9, v1.5)
- Supplier detail route (v1.1)
- Supersession chain auto-rewriting Service PartsLines (v1.1; v1 shows chain read-only)

## 14. Demo script (acceptance)

1. Land on `/parts` (default user R24). Stock List shows 60 parts across 3 outlets. Per-outlet stock badges visible.
2. Switch to Low Stock tab. ~10 parts listed. Click "Raise PO" on a row → opens `/parts/po/new?part=<code>` pre-filled.
3. Fill supplier + expected delivery → Submit. PO created in DRAFT.
4. Open PO detail → Submit for Approval → Approve (R24 allowed). Status → APPROVED.
5. Click "Mark Dispatched". Status → DISPATCHED.
6. Go to `/parts/grn/new?po=<id>`. Qty grid pre-filled. Mark received qty (test 1 short-received line). Submit. Status DRAFT → PENDING_QC.
7. Open GRN detail. Run QC. Mark MATCHED. Post. Status → POSTED.
8. Verify: part detail page shows new IN StockMovement, updated qty, updated avgCost.
9. Open the linked Service JobCard (if the PO had `linkedJobCardId`): that PartsLine should now be RESERVED, with a `part_reserved` timeline event.
10. Switch role to R13 Parts Counter — confirm "Approve" / "Post GRN" / "Adjust Stock" are hidden.
11. Typecheck + build both pass. No dev console errors.

## 15. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | Spec written from research. Approval thresholds locked (₹10k / ₹50k / ₹2L). Auto-reserve + inter-outlet transfer added to P6 per user decision. |
| 2026-04-17 | **P1 shipped.** Types + state-machine + fixtures + handlers + Zustand store (slice-decomposed) + hydrator + layout all landed. §8 clarified — fixture count is 65 parts (20 BMW + 15 Audi + 15 MB + 10 Porsche + 5 shared) matching the per-brand breakdown; the earlier "60" summary was a round figure. Two new staff records seeded to back parts fixtures: `staff-r13-001` Harish Naidu (R13 Parts Counter, Bangalore) and `staff-r03-001` Neha Kapoor (R03 Outlet Manager, Mumbai). `grn-003` repositioned as a walk-in (no poId) since its original target PO was PENDING_APPROVAL — fixture invariant now holds that any GRN with a poId references a PO at DISPATCHED or beyond. Store decomposed into slices: `types.ts` + `id-helpers.ts` + `post-grn-logic.ts` (pure) + 5 slices (`part/supplier/po/grn/stock`) + `index.ts` composer; public entry `parts-store.ts` is a thin re-export preserving `@/src/lib/parts/parts-store` imports. `postGrn` pre-aggregates OK-condition lines by partCode before the weighted-avg recompute (avoids compounding when one GRN has multiple lines for the same part). PO auto-transition (`allLinesFullyReceived` / `hasAnyReceipt`) filters `condition === 'OK'` so damaged/wrong stock never flips PO status. §11.2 auto-reserve hook marked TODO at the postGrn seam — wire in P6. |
