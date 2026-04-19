---
spec_id: PLAN-PARTS-007
domain: parts
status: approved
risk_level: low
pii_sensitivity: low
flags: [parts-module, service-module]
owners: [orchestrator]
depends_on: [SPEC-PARTS-001, PLAN-PARTS-006, PLAN-SERVICE-002]
---

# S5 P6 — Cross-module wiring + role switcher

Closes the three cross-module seams that P5 listed as "out of scope / P6"
follow-ups, plus adds a dev-affordance role switcher in the sidebar so the
demo can exercise every role-gated path without editing localStorage.

**Scope:**

1. **Auto-reserve Service `PartsLine` on GRN POST** — the documented TODO in
   `grn-slice.ts` step (5). When `postGrn` succeeds and the linked PO has a
   `linkedJobCardId`, walk the job card's PartsLines and flip any
   `REQUESTED → RESERVED` rows whose `partCode` matches the posted GRN line's
   partCode (with enough available qty).

2. **Replace "Create PO (S5)" stub** in `service/tabs/jobcard-parts-tab.tsx` —
   remove the `preventDefault + toast('coming soon')` and let the `<a>` navigate
   to `/parts/po/new?jobCard={id}&part={partCode}` (P4/P4.1 deep-link route).

3. **Cross-link partCodes from Service → Parts** — render `partCode` in the
   jobcard parts tab as a `<Link>` to `/parts/{partCode}`. Refurb cost-entry
   modal remains untouched (refurb entries are cost categories, not parts —
   linking is not meaningful there).

4. **Role switcher in sidebar** — add a sub-menu under the existing user card
   that lists the 8 `MOCK_STAFF_PROFILES` (R24, R22, R19, R12, R10, R09, R05,
   R16). Clicking switches the active role via existing `switchRole(code)` and
   immediately re-renders role-gated UI. Parent menu shows "Switch role →".

## 1. Store contract (verified, minimal delta)

- `postGrn` gains one pure helper call at the end of the existing
  side-effect chain (step 5 in the spec), using a **cross-store** handle via
  a new non-mutation entry-point on the service store: `reserveJobCardParts(
  jobCardId, parts: Array<{ partCode: string; qty: number }>, actor): void`.
- The parts store `grn-slice.ts` takes an optional 2nd arg (already in scope
  via zustand middleware composition), so the simplest wire is: `postGrn`
  returns `boolean` (unchanged); the **caller** (post-grn-dialog) on success,
  if `po.linkedJobCardId` is set, calls `useServiceStore.getState()
  .reserveJobCardParts(jobCardId, postedDeltas, actor)`. This keeps the parts
  store free of a hard service-store import.

## 2. Service-store delta

New action in `apps/staff-web/src/lib/service/service-store.ts`:

```ts
reserveJobCardParts(
  jobCardId: string,
  deltas: Array<{ partCode: string; qty: number }>,
  actor: Actor,
): void;
```

Behavior:
- For each delta, find REQUESTED partsLines on that job card where `line.partCode === delta.partCode` (order by line index; earliest-requested-first).
- Flip status REQUESTED → RESERVED up to `delta.qty` units (qty is tracked
  at the line level, not per-unit, so a single REQUESTED line flips to
  RESERVED in one shot if `delta.qty >= line.qty`; otherwise leave REQUESTED
  for now — spec v1 keeps partial reservations simple).
- Emit a `TimelineEvent` per flipped line: "Parts reserved from GRN posting."

## 3. Role switcher UI

Location: `staff-sidebar.tsx`, inside the existing user dropdown.

Add a new menu item above "Profile": **"Switch role ▸"**. Clicking opens a
second-level dropdown positioned to the side (mirror of the outlet dropdown
open-to-side when collapsed).

Each row: `{avatarInitials} {name} · {roleCode} — {roleName}` · current is
marked with a `<Check>` icon (same pattern as outlet dropdown).

Click → `switchRole(roleCode)` + close both dropdowns. Toast: `"Signed in as
{roleName} ({roleCode})"`.

## 4. Acceptance criteria

1. Posting GRN-002 (linked to po-007, which has `linkedJobCardId`) flips the
   job card's REQUESTED parts matching BMW-BATTERY/WIPER/COOLANT to RESERVED.
2. "Create PO (S5)" link in jobcard parts tab navigates to `/parts/po/new?...`
   and the form pre-fills jobCard + part fixtures per P4 spec.
3. Clicking a `partCode` in jobcard parts tab opens `/parts/{partCode}` detail.
4. Sidebar user dropdown shows "Switch role ▸"; switching to R13 (Parts
   Counter) immediately greys out the PO Approve button on a ₹3.72L PO.
5. Typecheck clean.
6. Zero new primitives, zero new deps.

## 5. Scenarios (GPA)

- **S-P6-1 (auto-reserve)**: Navigate to grn-002 (PENDING_QC linked to po-007).
  Mark Matched → Post. Navigate to `/service/jobcards/{po-007.linkedJobCardId}`
  parts tab. REQUESTED → RESERVED for the matching partCodes.
- **S-P6-2 (Create PO link)**: From jobcard parts tab, click "Create PO" on a
  REQUESTED shortage row. URL = `/parts/po/new?jobCard=jc-xxx&part=BMW-...`;
  PO form renders with part + supplier + linked JC pre-filled.
- **S-P6-3 (partCode link)**: Click partCode `BMW-BATTERY-90AH-AGM` in parts
  tab → navigates to `/parts/BMW-BATTERY-90AH-AGM` detail.
- **S-P6-4 (role switcher)**: Sidebar → avatar → "Switch role ▸" → R13. Go to
  `/parts/po/po-004` (PENDING_APPROVAL, total > ₹2L). Approve button is
  disabled with "Requires approval role…" tooltip.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Cross-store import cycle | post-grn-dialog (component layer) calls service store directly via `useServiceStore.getState()`. Parts store never imports service store. |
| Role switcher persists in localStorage across reloads | Expected — localStorage seed logic already in auth provider. |
| Partial-reservation semantics for REQUESTED with qty > delta | v1 flips whole line atomically; partial left for v2 (service store already supports single-line status) |
| Sidebar dropdown overflow in collapsed mode | Follows existing outlet-dropdown "open-to-side" pattern |

## 7. Changelog

| Date | Change |
|------|--------|
| 2026-04-18 | P6 spec drafted + approved. Closes 3 P5 follow-ups + adds sidebar role switcher. |
