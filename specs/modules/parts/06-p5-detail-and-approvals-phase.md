---
spec_id: PLAN-PARTS-006
domain: parts
status: approved
risk_level: medium
pii_sensitivity: low
flags: [parts-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001, PLAN-PARTS-003, PLAN-PARTS-004, PLAN-PARTS-005]
---

# S5 P5 — Parts Detail Pages + Approval Flows

Closes the workflow loop: two detail pages + 11 state-transition action
dialogs. Completes the 404 destinations that P4/P4.1 forms redirect to,
and delivers the demo script steps 4–9 (§14 parent spec).

**Scope:**
- `/parts/po/[id]` — PO detail page with 70/30 layout, timeline, lines with received-so-far cross-join, supplier/approval/GRNs/group-siblings/linked-JC sidebar cards, and 6 action dialogs (Submit / Approve / Reject / Cancel / Dispatch / Close).
- `/parts/grn/[id]` — GRN detail page with supplier+receipt card pair, 3-way-match lines table, timeline, linked-PO/QC/discrepancy/landed-cost sidebar cards, and 5 action dialogs (Submit for QC / Mark Matched / Reject / Record Discrepancy / Post).
- 2 `not-found.tsx` shells.
- Parent-spec amendments: export `ROLE_RANK` from `state-machine.ts`.

**Out of P5 (deferred):**
- Auto-reserve Service PartsLine on GRN POST (P6 — cross-store wiring)
- S4.1 jobcard-parts "Create PO" stub replacement (P6)
- Inventory refurb → `/parts/[partCode]` linking (P6)
- Inter-outlet transfer UI (P6)
- Cancel-group atomic action on P4.1 sibling POs (follow-up)
- 4-eyes dual-control workflow enforcement — **v1 is visual-only** (banner rendered, no second-approver check)
- PO edit (not in spec)
- Audit-log display / print / PDF export
- PurchaseOrder `receivedAt` / `closedAt` stamps (deferred parent-spec amendment — timeline gracefully degrades via latest GRN.postedAt + status chip)

## 1. Route surface

| Route | Behavior |
|---|---|
| `/parts/po/[id]/page.tsx` | Client component; `params: { id: string }` (plain object). Reads `usePartsStore(s => s.purchaseOrders.find(...))`; calls `notFound()` on miss; renders `<PurchaseOrderDetailView po={po} />`. |
| `/parts/po/[id]/not-found.tsx` | Mirror of `/parts/[partCode]/not-found.tsx` — "Purchase order not found" + back-to-POs link. |
| `/parts/grn/[id]/page.tsx` | Same pattern, keyed on `s.grns`. |
| `/parts/grn/[id]/not-found.tsx` | "GRN not found" + back-to-GRNs link. |
| `/parts/layout.tsx` | Unchanged. Hydrators (parts + service) already mounted from P1/P3. |

## 2. Store contract (verified)

Every action in P5 calls one of these pre-existing store methods. **Zero new store actions needed.**

- `transitionPurchaseOrder(id, next, { reason?, actor }): boolean` — returns `false` when the state machine denies; form toasts "Transition not allowed" in that defensive case.
- `transitionGrn(id, next, { reason?, actor }): boolean` — same.
- `postGrn(id, actor): boolean` — writes IN StockMovements, updates part.stock + weighted-avg avgCost, auto-transitions linked PO (via `allLinesFullyReceived` / `hasAnyReceipt`). Already idempotent inside the immer set() via `canTransitionGrn` guard.
- `updateGrn(id, patch, actor): void` — used by `record-discrepancy-dialog` to patch `threeWayMatchStatus: 'DISCREPANCY'` + `discrepancyNotes`.
- `updatePurchaseOrder(id, patch, actor): void` — not used in P5 (all PO mutations go through `transitionPurchaseOrder`).

## 3. Prerequisite code changes (minimal, non-breaking)

**Required for P5:**
1. **Export `ROLE_RANK`** from `apps/staff-web/src/lib/parts/state-machine.ts` — currently a module-private `const`. P5 UI needs it to gate non-approval actions (e.g. Cancel requires R12+ for APPROVED POs). One-line export addition.

**Deferred (optional):**
2. Optional `receivedAt?` / `closedAt?` stamps on `PurchaseOrderSchema` so the timeline shows those events with crisp timestamps. If rejected, timeline derives from the most-recent linked `grn.postedAt` (for RECEIVED) and falls back to "Status is {STATUS}" for CLOSED. P5 ships without these additions; timeline gracefully degrades.
3. Finance-reviewer confirmation: dual-control visual banner uses **₹2,00,000 threshold** (reuses existing `APPROVAL_THRESHOLDS`, not the ₹5L from the Stitch mock). Rationale: avoids threshold drift between PO and GRN; spec §6 locked the thresholds; Stitch's "₹5L" is a designer sketch, not a spec value. Flag in §17 for sign-off.

## 4. PO Detail page — `/parts/po/[id]`

### 4.1 Layout

- Container: `mx-auto max-w-[1440px] px-6 pb-12 pt-6` (matches P3).
- Breadcrumb: `Parts › Purchase Orders › PO-2026-00007`.
- Header h1: PO No in `font-mono`; status StateChip via `poStatusToChip`; subtitle: `{supplier.name} · {outlet} · {N} lines · ₹{total}`.
- 70/30 grid: `grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6`.

### 4.2 Primary column

1. **PartHeader actions row** (right-aligned on h1): role-gated buttons per §5.
2. **PoOverviewCard** — stat grid `grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5`. Tiles: Subtotal, GST, Grand Total (AmountCell), Expected Delivery, Lines count, Created By + createdAt, Approved By + approvedAt (when APPROVED), Dispatched At (when DISPATCHED+).
3. **PoSupersessionRow is NOT rendered** — that's a P3 concern. P5 replaces with timeline below.
4. **PoLinesTable** — 7 cols: `# · Part Code · Qty · Unit Price · Line Total · Received / Ordered · Condition status`.
   - Received column shows `{receivedSoFar} / {orderedQty}` in `font-mono tabular-nums`. Tinted amber when partial, green when complete. Hidden entirely when status ∉ `{DISPATCHED, PARTIALLY_RECEIVED, RECEIVED, CLOSED}`.
   - Cross-join via `receivedQtyForLine(line, po.id, grns)` in `po-detail-helpers.ts`.
5. **PoTimelineCard** — vertical timeline. Events derived from PO timestamps + linked-GRN events.

### 4.3 Sidebar cards (right column)

- **PoSupplierCard** — name, GSTIN, contact (tel:/mailto: link), payment terms, currency + EUR chip if import. "View in Suppliers tab" link.
- **PoApprovalCard** — conditional: when PENDING_APPROVAL, shows `requiredApproverRole(po.total)` ("Requires R19+") + Approve + Reject buttons (Gate-gated duplicates of header). When APPROVED/REJECTED, shows approver name + timestamp + rejection reason.
- **PoGrnsCard** — list of GRNs with `poId === po.id`. Each row: GRN No (mono link), status chip, received-at. Rendered when `status ∈ {DISPATCHED, PARTIALLY_RECEIVED, RECEIVED, CLOSED}`. Empty state (no GRNs yet but status is DISPATCHED+): `"No GRNs filed yet."`
- **PoGroupSiblingsCard** — when `po.groupRef` set (P4.1 split submissions). Lists other POs in the same group. Max 3 visible + "+N more" link to `/parts?tab=po&group=<ref>`.
- **PoLinkedJobCardCard** — when `po.linkedJobCardId` set. Links to `/service/jobcards/{id}` (requires ServiceStoreHydrator — already mounted per P3).

### 4.4 Header action buttons (role-gated)

Rendered per PO status + actor role. Hidden when not applicable; Gate-disabled with tooltip when role insufficient.

| Action | Visible when | Role gate |
|---|---|---|
| Submit for Approval | status === 'DRAFT' | rank ≥ R13 |
| Approve | status === 'PENDING_APPROVAL' | `canApprove(actor.role, po.total)` |
| Reject | status === 'PENDING_APPROVAL' | same as Approve |
| Cancel | status ∈ {DRAFT, APPROVED} | rank ≥ R13 if DRAFT, rank ≥ R12 if APPROVED (R12+ = rank ≥ 2 = Parts Mgr, Outlet Mgr, GM, CFO, CEO — **R13 Counter cannot cancel approved POs**) |
| Mark Dispatched | status === 'APPROVED' | rank ≥ R13 |
| Close | status === 'RECEIVED' | rank ≥ R13 |

No button for `PARTIALLY_RECEIVED → RECEIVED` (auto via `postGrn`).

## 5. GRN Detail page — `/parts/grn/[id]`

### 5.1 Layout

- Container + breadcrumb + 70/30 split identical to PO detail.
- Header: GRN No (mono) + status StateChip + subtitle: `{supplier.name} · {outlet} · PO-{po.poNo ?? '—'} · received {dd MMM HH:mm}`.

### 5.2 Primary column

1. **GrnSupplierReceiptCard** — 2-col card pair mirroring Stitch layout:
   - Left: Supplier Details (name, GSTIN, address, contact).
   - Right: Receipt Details (PO Reference link, Received By staff name, Received At timestamp, Notes).
2. **GrnLinesTable** — 6 cols: `Part Code · Ordered · Received · Unit Price · Line Total · Condition`. Tints:
   - Row-level: `bg-bg-subtle` when `condition === 'DAMAGED' || 'WRONG'`.
   - Cell-level: amber text on `Received` column when `receivedQty < orderedQty`; red text when `0`.
   - Line Total displayed via `AmountCell`.
3. **GrnLandedCostCard** — only when `grn.landedCostAdders` present (import GRNs). Shows freight / customs / igst / clearing + total landed cost add-on.
4. **GrnTimelineCard** — vertical timeline from `receivedAt → qcAt (if MATCHED) → postedAt (if POSTED)`. Rejection reason shown inline at the rejection node.

### 5.3 Sidebar cards

- **GrnLinkedPoCard** — PO No (link), supplier, status chip, PO total. "View PO →" link.
- **GrnQcCard** — the action center.
  - Dual-control banner (visual only) when `grn.total >= 200_000`: amber card with AlertTriangle icon, copy `"Dual-control authorization required — total ₹{inr(grn.total)} exceeds ₹2,00,000. Second approver visual-only in v1."`
  - QC metadata: QC By + QC At + Posted By + Posted At (when present).
  - Action buttons per status: Submit for QC / Mark Matched / Reject / Record Discrepancy / Post.
- **GrnDiscrepancyCard** — only when `grn.threeWayMatchStatus === 'DISCREPANCY'`. Shows notes + short-receipt line count + damaged line count.

### 5.4 Header action buttons (role-gated)

| Action | Visible when | Role gate |
|---|---|---|
| Submit for QC | status === 'DRAFT' | rank ≥ R13 |
| Mark Matched | status === 'PENDING_QC' | rank ≥ R12 (includes R03 Outlet Mgr per parent §7 QC+Post row) |
| Reject | status === 'PENDING_QC' | rank ≥ R12 |
| Record Discrepancy | status ∈ {PENDING_QC, MATCHED} | rank ≥ R12 |
| Post | status === 'MATCHED' | rank ≥ R12 (includes R03 Outlet Mgr per parent §7) |

Terminal statuses (REJECTED, POSTED) show no actions.

## 6. Action dialogs — PO (6 files)

All under `apps/staff-web/src/components/parts/po-detail/action-flows/`.

**Submit (`submit-po-dialog.tsx`)** — Dialog primitive. Shows summary "PO total ₹{inr} will route to {requiredApproverRole} for approval." Confirm button calls `transitionPurchaseOrder(poId, 'PENDING_APPROVAL', { actor })`.

**Approve (`approve-po-dialog.tsx`)** — Dialog. Shows "Approving ₹{inr} for {supplier.name}." Optional note textarea. Confirm → `transitionPurchaseOrder(poId, 'APPROVED', { actor })` (note is future-scope — store doesn't persist it). `canApprove(actor.role, po.total)` verified pre-render.

**Reject (`reject-po-dialog.tsx`)** — AlertDialog destructive. Mandatory "Reason for rejection" textarea (min 4 chars). Confirm → `transitionPurchaseOrder(poId, 'REJECTED', { reason, actor })` — store stamps `rejectedReason`.

**Cancel (`cancel-po-dialog.tsx`)** — AlertDialog destructive. Mandatory reason. Type-to-confirm if `po.total >= 200_000`. Confirm → `transitionPurchaseOrder(poId, 'CANCELLED', { reason, actor })`.

**Dispatch (`dispatch-po-dialog.tsx`)** — Dialog. Optional tracking-note textarea. Confirm → `transitionPurchaseOrder(poId, 'DISPATCHED', { actor })`.

**Close (`close-po-dialog.tsx`)** — Dialog. Simple confirmation. Confirm → `transitionPurchaseOrder(poId, 'CLOSED', { actor })`.

All dialogs: `busy` local state, disable confirm during submission, toast `"{po.poNo} → {newStatus}"` on success, navigate `router.refresh()` (or do nothing — Zustand subscription re-renders).

## 7. Action dialogs — GRN (5 files)

All under `apps/staff-web/src/components/parts/grn-detail/action-flows/`.

**Submit for QC (`submit-qc-dialog.tsx`)** — Dialog. Confirmation only. → `transitionGrn(id, 'PENDING_QC', { actor })`.

**Mark Matched (`mark-matched-dialog.tsx`)** — Dialog. Shows 3-way-match summary (lines count, total ordered vs received, any short-receipts / damages count). Confirm → `transitionGrn(id, 'MATCHED', { actor })` — store also stamps `threeWayMatchStatus: 'MATCHED'` when it's not already set.

**Reject (`reject-grn-dialog.tsx`)** — AlertDialog destructive. Mandatory reason. → `transitionGrn(id, 'REJECTED', { reason, actor })`.

**Record Discrepancy (`record-discrepancy-dialog.tsx`)** — Dialog (not a transition). Textarea for `discrepancyNotes` (min 4 chars). Submit calls `updateGrn(id, { threeWayMatchStatus: 'DISCREPANCY', discrepancyNotes: text }, actor)`. Idempotent — can be re-opened to edit notes. **Every save sets `threeWayMatchStatus='DISCREPANCY'`; there is no "undo discrepancy" UI in P5** (clear only by admin / deferred to v2).

**Post (`post-grn-dialog.tsx`)** — Dialog. **The big one.** Shows a preview panel computed by `previewPostEffects(grn, po, parts)`:
- "3 IN stock movements across 3 parts"
- "BLR-01 stock +4 for BMW-BATTERY-90AH-AGM" (list up to 5, "+N more" if needed)
- "PO-2026-00007 will auto-transition to RECEIVED" (or PARTIALLY_RECEIVED)
- If no linked PO, show "Not linked to any PO."

Confirm button has `busy` state during call. Call → `postGrn(id, actor)`. On success: close dialog, toast `"{grnNo} posted · {N} stock movements written"`. **On failure** (`postGrn` returns `false` — state-machine denies): keep dialog open, show inline error banner `"Transition not allowed from current state."`, re-enable the Confirm button, also fire an error toast. User can close dialog manually.

**No auto-reserve of Service PartsLine** in P5 — deferred to P6 (spec §2.3 out-of-scope list).

## 8. Role gating predicates

Helper added in `po-detail-helpers.ts`:

```ts
export function hasRank(actorRole: string, minRole: 'R13' | 'R12' | 'R03' | 'R19'): boolean {
  const actorRank = ROLE_RANK[actorRole] ?? 0;
  const requiredRank = ROLE_RANK[minRole] ?? 999;
  return actorRank >= requiredRank;
}
```

Imports `ROLE_RANK` from `state-machine.ts` (parent-spec amendment §3).

Gating is DEFENSIVE (state machine + `canTransitionPo`/`canTransitionGrn` already block at the store level). UI gating is UX quality-of-life — prevents dead-clicks.

Buttons not permitted by role: **Gate-disabled** with tooltip "Requires {minRole} or higher". No hiding.

## 9. Dual-control banner (visual-only v1)

Rendered inside `GrnQcCard` when `grn.total >= 200_000`:

```tsx
<div className="rounded-md border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.1)] px-4 py-3 mb-4 flex items-start gap-3">
  <AlertTriangle className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5" />
  <div className="text-sm text-ink-primary">
    <p className="font-medium">Dual-control authorization required</p>
    <p className="text-[12px] text-ink-muted mt-0.5">
      Total ₹{formatINR(grn.total)} exceeds ₹2,00,000. v1 is visual-only — a second approver workflow is planned for v2.
    </p>
  </div>
</div>
```

## 10. Timeline component

**Not a shared primitive** — event shapes differ between PO and GRN. Each detail has its own lightweight inline timeline.

Visual pattern:
```
  ●─── 18 Apr 2026 · Meera Iyer
  │    Approved — ₹3,72,000
  │
  ●─── 19 Apr 2026 · Harish Naidu
  │    Marked dispatched
  │
  ○─── (current step indicator)
```

`●` = solid accent dot; vertical `│` line connecting; `○` = current step outline.

Classes: container `pl-5 relative`, each event's bullet is an absolutely-positioned `w-2.5 h-2.5 rounded-full bg-accent`. Vertical line: `before:absolute before:left-[4px] before:top-0 before:bottom-0 before:w-px before:bg-line`.

Empty state: "No activity yet." (unlikely — every PO has `createdAt`).

## 11. Helpers (pure, testable)

### `po-detail-helpers.ts`

```ts
hasRank(actorRole, minRole): boolean
deriveTimeline(po, grns): TimelineEvent[]
receivedQtyForLine(line, poId, grns): number
summariseApprovalRoute(po): { requiredRole: string; thresholdLabel: string }
getGrnsForPo(poId, grns): Grn[]
getGroupSiblings(po, pos): PurchaseOrder[]
```

### `grn-detail-helpers.ts`

```ts
deriveGrnTimeline(grn): TimelineEvent[]
previewPostEffects(grn, po, parts): {
  movementCount: number;
  perOutletDeltas: Array<{ outletId: string; delta: number }>;
  perPartDeltas: Array<{ partCode: string; delta: number }>;
  poTransition: 'RECEIVED' | 'PARTIALLY_RECEIVED' | null;
}
getLinkedPo(grn, pos): PurchaseOrder | undefined
getShortReceiptCount(grn): number
getDamagedLineCount(grn): number
isDualControl(grn): boolean
```

## 12. Toast + navigation behavior

- Action dialogs close immediately on successful confirm; toast fires; Zustand subscription re-renders the detail page with the new status. **No `router.push` on transition** — staying on the detail page is the expected UX.
- After Post on a linked-PO GRN, the PO auto-transitions; if the user is on the GRN page, `GrnLinkedPoCard` re-renders showing the PO's new status chip (RECEIVED / PARTIALLY_RECEIVED).
- Post dialog: same (no navigation). User stays on GRN detail and sees `status = POSTED`.
- Reject dialog: same.
- Cancel dialog: same (the PO detail renders with `status = CANCELLED`, no redirect).

Toast copy locked:
- `"{po.poNo} → {newStatus}"` (e.g. "PO-2026-00001 → Pending Approval")
- `"{grn.grnNo} posted · {N} stock movements written"`
- `"{grn.grnNo} → Pending QC"` / `"{grn.grnNo} → Matched"`
- `"{grn.grnNo} marked with discrepancy"` (for Record Discrepancy — not a transition)
- Error: `"Transition not allowed"` (defensive — should not fire given `allowedNextPo` pre-filter)

## 13. Component file tree

### PO detail (~1840 LoC across 18 files)

```
apps/staff-web/src/components/parts/po-detail/
├── index.ts
├── purchase-order-detail-view.tsx    — composer (~240)
├── po-detail-helpers.ts              — pure (~150)
├── po-header.tsx                     — breadcrumb + h1 + actions (~180)
├── po-overview-card.tsx              — stat grid (~120)
├── po-lines-table.tsx                — 7-col table with received-so-far (~160)
├── po-timeline-card.tsx              — vertical timeline (~140)
├── po-supplier-card.tsx              — sidebar (~100)
├── po-approval-card.tsx              — sidebar with gated actions (~160)
├── po-grns-card.tsx                  — sidebar (~120)
├── po-group-siblings-card.tsx        — sidebar when groupRef (~110)
├── po-linked-jobcard-card.tsx        — sidebar when linkedJobCardId (~90)
└── action-flows/
    ├── index.ts
    ├── submit-po-dialog.tsx          — (~90)
    ├── approve-po-dialog.tsx         — (~130)
    ├── reject-po-dialog.tsx          — (~110)
    ├── cancel-po-dialog.tsx          — (~120)
    ├── dispatch-po-dialog.tsx        — (~90)
    └── close-po-dialog.tsx           — (~80)
```

### GRN detail (~1830 LoC across 17 files)

```
apps/staff-web/src/components/parts/grn-detail/
├── index.ts
├── grn-detail-view.tsx               — composer (~240)
├── grn-detail-helpers.ts             — pure (~150)
├── grn-header.tsx                    — breadcrumb + h1 + actions (~170)
├── grn-supplier-receipt-card.tsx     — 2-col Stitch layout (~130)
├── grn-lines-table.tsx               — 6-col 3-way match (~180)
├── grn-line-columns.ts               — safety split if lines-table >350 (~80)
├── grn-landed-cost-card.tsx          — imports only (~80)
├── grn-timeline-card.tsx             — (~120)
├── grn-linked-po-card.tsx            — sidebar (~100)
├── grn-qc-card.tsx                   — sidebar with actions + dual-control banner (~180)
├── grn-discrepancy-card.tsx          — sidebar when DISCREPANCY (~110)
└── action-flows/
    ├── index.ts
    ├── submit-qc-dialog.tsx          — (~90)
    ├── mark-matched-dialog.tsx       — (~100)
    ├── reject-grn-dialog.tsx         — (~110)
    ├── record-discrepancy-dialog.tsx — (~130)
    └── post-grn-dialog.tsx           — (~170)
```

### Route pages (4 files)

```
apps/staff-web/app/(shell)/parts/po/[id]/page.tsx              — (~30)
apps/staff-web/app/(shell)/parts/po/[id]/not-found.tsx         — (~20)
apps/staff-web/app/(shell)/parts/grn/[id]/page.tsx             — (~30)
apps/staff-web/app/(shell)/parts/grn/[id]/not-found.tsx        — (~20)
```

### Store amendment

- `apps/staff-web/src/lib/parts/state-machine.ts` — **export** the existing `ROLE_RANK` const (currently module-private). One-line change.

All files projected ≤ 350 LoC. At-risk: `grn-lines-table.tsx` (~180, could balloon if 3-way-match tints become complex) — pre-planned split into `grn-line-columns.ts`.

## 14. Scenarios (GPA — acceptance)

**S-PO-1**: Navigate to `/parts/po/po-001` (DRAFT). Header shows [Submit for Approval] + [Cancel]. Approve/Reject/Dispatch/Close hidden. Click Submit → dialog shows "₹{inr} will route to R13+ Parts Counter for approval" → confirm → toast "PO-2026-00001 → Pending Approval" → page re-renders with status = PENDING_APPROVAL.

**S-PO-2**: As R24 CEO, navigate to a PENDING_APPROVAL PO below ₹50k. [Approve] + [Reject] visible + enabled. Click Approve → dialog → confirm → toast → status APPROVED.

**S-PO-3**: As R13 Parts Counter, navigate to po-004 (PENDING_APPROVAL, total > ₹2L). [Approve] visible but Gate-disabled with tooltip "Requires R19 or higher".

**S-PO-4**: Navigate to po-007 (DISPATCHED). No [Mark Dispatched], no [Cancel], no "Receive" button. Sidebar shows GRNs filed (grn-002 PENDING_QC linked).

**S-PO-5**: Timeline renders chronologically: Draft → Submitted → Approved → Dispatched, each with actor + timestamp.

**S-PO-6**: On po-008, click the linked GRN (grn-005) in sidebar → navigates to `/parts/grn/grn-005`.

**S-PO-7**: Open a PO with `groupRef` set. Sidebar shows `PoGroupSiblingsCard` listing other POs in the group with "Clear filter" link.

**S-PO-8**: Navigate to a REJECTED / CANCELLED PO. Status chip + rejection/cancel reason displayed prominently. No action buttons.

**S-GRN-1**: Navigate to `/parts/grn/grn-002` (PENDING_QC). Header shows [Mark Matched] + [Reject] + [Record Discrepancy]. [Post] hidden. QcCard shows metadata.

**S-GRN-2**: Navigate to grn-004 (POSTED). All action buttons hidden. Timeline shows full chain Received → QC → Posted. Sidebar QcCard shows posted-by + posted-at.

**S-GRN-3**: Open a GRN with `grn.total >= ₹2L` (grn-005 qualifies — ₹8,74,500). Dual-control banner visible inside QcCard. Actions still functional (visual-only enforcement).

**S-GRN-4**: Post a MATCHED GRN. Setup: navigate to grn-002 (PENDING_QC, linked to po-007 DISPATCHED at BLR-01). Click Mark Matched → status MATCHED. Click Post → dialog preview shows (GRN has a single outletId, so all deltas are at that outlet):
- "3 IN stock movements across 3 parts"
- "BLR-01 +6 BMW-BATTERY-90AH-AGM"
- "BLR-01 +12 BMW-WIPER-F30-FR"
- "BLR-01 +10 BMW-COOLANT-G48"
- "PO-2026-00007 will auto-transition to RECEIVED"
Click Post → toast "GRN-2026-00002 posted · 3 stock movements written" → status POSTED → Part.stock incremented at BLR-01 → linked po-007 auto-transitions to RECEIVED (visible if user navigates back to PO).

**S-GRN-5**: Click Record Discrepancy → dialog → enter notes → confirm → GRN card shows DiscrepancyCard with notes + short-receipt count.

**S-GRN-6**: Preview-vs-actual consistency check: the `previewPostEffects` output matches the actual store state diff after `postGrn` fires (spot-check one fixture).

**S-GRN-7**: Navigate to grn-003 (MATCHED with DISCREPANCY). Both matched-status timeline and DiscrepancyCard visible. Post button enabled (discrepancy is a note, not a block).

**S-Typecheck**: `pnpm -F staff-web typecheck` exits 0 after P5.

## 15. Acceptance criteria

1. Scenarios S-PO-1..8 + S-GRN-1..7 + S-Typecheck pass.
2. Every new file ≤ 350 LoC. `grn-lines-table.tsx` stays under cap via `grn-line-columns.ts` extraction if it grows during implementation.
3. Zero new npm dependencies.
4. No new primitives.
5. Zero `bg-[var(--color-*)]` / hex literals in new code.
6. `ROLE_RANK` exported from state-machine.ts; no other store or schema changes.
7. Auto-reserve TODO in `grn-slice.ts` remains intact (deferred to P6).
8. Every action button is role-gated via `canApprove` or `hasRank` with tooltip fallback.
9. Dual-control banner visible on GRNs with `total >= 200_000`; documented as visual-only in v1.
10. Post dialog preview matches actual store effect (S-GRN-6).
11. No `router.push` after successful transition — Zustand re-render handles it.
12. Code-reviewer report lists no BLOCKERs.

## 16. Cross-module consistency

| Dimension | Reference | P5 match |
|---|---|---|
| Container | `max-w-[1440px] px-6 pb-12 pt-6` (P3) | ✓ |
| Breadcrumb | P3/P4 pattern | ✓ |
| h1 | `text-[28px] font-semibold` mono for identifiers | ✓ |
| 70/30 grid | `xl:grid-cols-[minmax(0,1fr)_380px]` (P3) | ✓ |
| Primary card padding | `p-6` | ✓ |
| Sidebar card padding | `p-4` | ✓ |
| AlertDialog copy | "Discard changes?" / "Your unsaved entries..." (P4 + P4.1) | Reused for Cancel/Reject |
| Toast format | "{id} → {status}" | New, consistent across P5 |
| Action buttons | Primary accent filled + outline secondary | ✓ |
| Timeline | Inline component per entity (no shared primitive) | New pattern in P5 |
| Dual-control banner | Amber (`--state-overdue`) card with AlertTriangle | New, in GRN sidebar only |

## 17. Open items for sign-off

1. **Finance-reviewer**: confirm dual-control threshold = ₹2,00,000 (reuse APPROVAL_THRESHOLDS) vs Stitch's ₹5,00,000. Current recommendation: ₹2L.
2. **Security-reviewer**: confirm all transition paths go through state-machine validators (they do — every dialog calls `transitionPurchaseOrder`/`transitionGrn`/`postGrn` which pre-check via `canTransitionPo`/`canTransitionGrn`).
3. **QA-planner**: S-GRN-6 preview consistency test — suggest automation if Playwright is configured (not currently; manual spot-check OK for v1).

## 18. Risks + gotchas

| Risk | Mitigation |
|---|---|
| Double-submit on Post | `busy` local state in post-dialog + `postGrn` internally idempotent via `canTransitionGrn` |
| Timeline missing stamps for RECEIVED/CLOSED PO | Derive RECEIVED from latest linked GRN.postedAt; CLOSED shows status-only node |
| ROLE_RANK not exported | Parent-spec amendment §3 (one-line export) |
| `grn-lines-table.tsx` > 350 LoC | Pre-planned split to `grn-line-columns.ts` |
| Preview drift from actual post | Preview helper imports + reuses `totalOnHand` / `allLinesFullyReceived` / `hasAnyReceipt` from `post-grn-logic.ts` — single source of truth |
| Zustand selector trap (P4+P4.1 pattern) | All store reads use stable base-array selectors + `useMemo` for derived lists |
| `.next` cache stale after adding ~33 files | `rm -rf apps/staff-web/.next` if module-not-found errors |
| Post triggers auto-transition of PO status — UI might show stale PO if user navigates back | Zustand subscription on PO detail renders fresh state; no cache layer |
| Action dialog closes immediately on success | Intentional — the detail page shows the new state; no confusing delay |

## 19. Changelog

| Date | Change |
|------|--------|
| 2026-04-17 | P5 phase spec written. Pending spec-reviewer sign-off. |
| 2026-04-17 | Spec-reviewer MINOR FIXES applied: S-GRN-4 rewritten for single-outlet BLR deltas (po-007 lines), Post-failure behavior locked (keep dialog open + inline error), Cancel R12+ footnote added, GRN R12+ gate R03 clarification, Record Discrepancy "every save sets DISCREPANCY" lock, PoGrnsCard status-range + empty state fixed, §3 renamed to "Prerequisite code changes", §12 PoStatus re-render note added. Design agent wireframes integrated as visual anchor. Dual-control threshold locked at ₹2L. Status → approved. |
