---
audit_id: AUDIT-SALES-2026-05-07
module: sales
auditor: claude (sonnet-4-6)
date: 2026-05-07
related_specs:
  - SPEC-SALES-001
  - SPEC-INVENTORY-AGING-001
  - PLAN-VEHICLES-003
  - SPEC-ARCH-UI-001
  - ARCH-CROSS-MODULE-001
status: complete
severity_counts:
  P0: 5
  P1: 8
  P2: 11
  P3: 4
---

# AUDIT-SALES-2026-05-07 — Sales Module Critical-Gap Audit

---

## 1. Executive Summary

1. **SPEC-SALES-001 is in `draft` status** — the spec has never been transitioned to `approved` or `shipped` despite the surface being fully implemented. This violates CLAUDE.md §6 and means the module has no wave-2 reviewer sign-offs on record. Every compliance, security, and finance concern in the spec is unreviewed.
2. **43 `text-[NNpx]` violations** scattered across the 5 core sales files (pipeline page, enquiry detail, deal card, deal list view, lead capture form, AI call dialog). The drift test will block any CI that covers these files.
3. **"Assign Lead" button is a silent dead CTA** — no `onClick`, no `disabled`, no explicit stub notice (enquiry-detail-view.tsx:279–284). Violates CLAUDE.md §10 DoD #15 and §17 production checklist. Severity P0 (auto-rejected at review).
4. **Two unregistered cross-module seams**: (a) `use-report-data.ts` reads `useSalesDealsStore` for service-to-sale conversion without a registered seam number; (b) `staff/detail/efficiency-tab.tsx` reads `useSalesDealsStore.deals` with no seam entry — violates ARCH-CROSS-MODULE-001 core invariant.
5. **No "Deal Lost" reason-capture flow, no refund/cancellation UI, no win-rate analytics surface** — these are real-world flows that a luxury SA uses every day. The `cancellationReason` enum exists in types but is never surfaced to the user in the UI; advancing a deal to `lost` via drag-and-drop silently discards the reason field.

---

## 2. Spec-Drift Findings

SPEC-SALES-001 has **no L-tags at all** (the spec is `draft` with no Locked Decisions table). All L-tags relevant to the Sales surface are therefore spread across PLAN-VEHICLES-003 and SPEC-INVENTORY-AGING-001. L-tag drift is audited against those specs where they intersect with the Sales code surface.

| L-tag | Decision | Evidence / Contradiction | Severity | File:Line |
|---|---|---|---|---|
| PLAN-V003 L23 | `StaleListingChip` suppressed when deal stage = `reserved` | Honored: `stale-listing-chip.tsx` suppresses chip when `dealStage === 'reserved'` | OK | `stale-listing-chip.tsx` |
| PLAN-V003 L26 | `cancellationReason` captured on stage → `lost` | Store correctly persists field. **UI gap**: drag-to-lost in `handleMoveDeal` (`page.tsx:80`) calls `advanceStage(dealId, 'lost')` with no `opts.cancellationReason`. Reason is silently `undefined`. | P1 | `page.tsx:91` |
| PLAN-V003 L37 | Lazy reservation expiry runs once on mount per VIN | Honored: `sales-tab.tsx:110–136` useEffect with `[vehicle.vin]` dep | OK | `sales-tab.tsx:110` |
| SPEC-IA L2 | `suggestedPrice ≥ costBasis × 1.05` (non-negotiable guardrail) | Honored: `selectors.ts` enforces guardrail | OK | `aging/selectors.ts` |
| SPEC-IA L4 | Pure selectors only — no new store for aging | Honored. `AgingView` correctly reads `useSalesDealsStore(s => s.deals)` as base ref and passes to `useMemo` | OK | `aging-view.tsx:107` |
| SPEC-IA L6 | `applySuggestedPriceDrop` gated R10+ | Honored in store; `AgingRow` uses `<Gate role={['R10','R19','R22','R24']}>` | OK | `aging-view.tsx:404` |
| SPEC-IA L13 | i18n namespace `inventoryAging` top-level in both locale files | Honored: `en-IN.json:1807`, `hi-IN.json:832` | OK | messages files |
| CLAUDE.md §6 | No code lands without `approved` spec | **DRIFT**: SPEC-SALES-001 is `status: draft`. Code shipped. | P0 | `specs/modules/sales/01-staff-sales-module.md:5` |
| CLAUDE.md §17 | Every CTA wired to a real action | **DRIFT**: "Assign Lead" button has no `onClick` | P0 | `enquiry-detail-view.tsx:279` |
| CLAUDE.md §10 #12 | No `text-[NNpx]` in new code | **DRIFT**: 43 violations in sales components | P1 | (see §9) |

---

## 3. Missing or Stub Scenarios

SPEC-SALES-001 does not define numbered scenarios (it is `draft`). SPEC-INVENTORY-AGING-001 scenarios are mostly covered. Gaps below are derived from documented behavior in the spec and from the DoD.

| Scenario ID | Expected Behavior | Actual Code State | Severity |
|---|---|---|---|
| SPEC-SALES §4.3 | Invalid drop (skip-stage forward) shows warning toast but allows | `handleMoveDeal` calls `advanceStage` + `emitSalesEvent` but fires no toast on skip-stage. Spec says "show toast warning but allow" | P1 | `page.tsx:80–121` |
| SPEC-SALES §5 | On submit, POST to `/api/staff/sales/leads`, returns `{id}`, redirects to `/sales/leads/${id}` | Implemented correctly | OK | `leads/new/page.tsx` |
| SPEC-SALES §3 | `LOST` stage with reason tracked | `advanceStage` to `lost` from drag-drop passes no `cancellationReason` | P1 | `page.tsx:91` |
| SPEC-SALES §3 | `ON_HOLD` side state with UI flow | No UI path to set a deal to `on-hold`. Stage exists in enum and Kanban excludes it from ACTIVE_STAGES but no CTA exists | P2 | `page.tsx:19–26` |
| SPEC-IA S-IA-06 | RESERVED suppressed in SalesTab chip, but row present in reports | Honored | OK | |
| SPEC-IA S-IA-07 | `applySuggestedPriceDrop` throws `InsufficientRoleError` for < R10 | Honored in store | OK | |
| SPEC-IA S-IA-09 | Empty state when no active listings | Honored: `AgingView` renders empty-state card | OK | `aging-view.tsx:175` |
| §6.5 (spec) | `call-ai` in `InteractionTypeEnum` | Honored: types `sales.ts:84` | OK | |
| DPDP Act consent | Lead capture must show DPDP consent purpose text | **Missing**: `leads/new/page.tsx` has no consent text or purpose statement for PII collection. CLAUDE.md §9 / Doc 06 | P0 | `leads/new/page.tsx` |

---

## 4. Critical User-Flow Gaps

**1. Deal Lost — no reason-capture UI (P0)**
An SA moving a deal to `lost` via drag-and-drop (`page.tsx:80`) invokes `advanceStage(dealId, 'lost')` with no reason. The `cancellationReason` enum (`EXPIRED`, `BUYER_WITHDREW`, `INVENTORY_SOLD`, `MANUAL_CANCEL`) exists in types but no dialog asks for it. A luxury SA cannot capture why a deal was lost, breaking win-rate analytics and making the data useless for retrospectives. Recommended fix: intercept `toStage === 'lost'` in `handleMoveDeal` and open an inline dialog capturing `cancellationReason` + optional free-text before committing the stage change.

**2. "Assign Lead" is a silent dead CTA (P0)**
`enquiry-detail-view.tsx:279–284` renders a `<button type="button">Assign Lead</button>` with no `onClick`. Clicking does nothing. CLAUDE.md §10 DoD #15 is explicit: "Silent no-ops are auto-rejected. If a behavior is genuinely deferred, render an explicit `info`-toast or 'coming in vN.N' notice." Recommended fix: either implement an assign modal or replace with a stub toast `"Assign Lead — coming in v1.1"`.

**3. Concurrent reservation on same VIN — no guard (P1)**
`advanceStage` to `reserved` does not check whether another deal for the same VIN is already at `reserved` or `sales-order`. Two SAs can independently drag two deals for the same VIN to `reserved`. The store has `selectActiveDeals(vin)` but the Kanban `handleMoveDeal` never calls it before advancing. Recommended fix: call `useSalesDealsStore.getState().selectActiveDeals(vin)` before committing a reservation; if a conflicting active deal exists, show an AlertDialog warning.

**4. "Deal Lost" skip-stage toast missing (P1)**
Spec §4.3 says skip-stage forward drops should "show toast warning but allow". The `handleMoveDeal` function never emits a toast for skip-stage drops. A silent stage jump from `new-lead` to `delivered` is invisible to the SA.

**5. No refund / cancellation flow anywhere in the Sales surface (P1)**
There is no UI to reverse a sale, capture a refund, or move a deal back from `sales-order` or `delivered` to `on-hold` or `lost`. The `DealStage` type supports `lost` and `on-hold` but there is no form or dialog to trigger these from the enquiry detail page header. The customer-facing refund scenario has zero coverage.

**6. Quote PDF generation not present (P1)**
Spec §3 mentions a `QUOTED` intermediate state and the customer-visible quote. No quote PDF generation exists anywhere in the Sales surface. There is no `QUOTED` stage in `DealStageEnum`. The WhatsApp template "Pricing Quote" (`whatsapp-dialog.tsx:31`) sends a text message but generates no PDF document. The customer has no formal quote artifact.

**7. DPDP Act consent missing from lead capture (P0)**
`leads/new/page.tsx` collects `clientName`, `phone`, and `email` without displaying any DPDP-compliant consent text or purpose statement. CLAUDE.md §9 and Doc 06 §DPDP mandate purpose text at every PII collection point. Recommended fix: add a consent checkbox with copy "By submitting this form you consent to BN Automobiles storing and using your contact information for sales follow-up" + link to privacy policy.

**8. "Book Test Drive" and "Schedule Test Drive" are duplicated CTAs (P2)**
The enquiry detail header has both a "Book Test Drive" button (opens `/test-drives/new`) and a "Schedule Test Drive" button (opens `ScheduleTestDriveModal`). These appear to be two different implementations of the same intent. The `ScheduleTestDriveModal` does not seem to create a TestDrive booking via `useTestDriveStore` (check needed), potentially making one of them orphaned. Recommended fix: consolidate to one CTA wired to the official Test Drive store.

---

## 5. Money / Regulatory Issues

| Issue | Location | Severity |
|---|---|---|
| TCS computation in `so-complete-dialog.tsx:142`: `tcsApplicable = finalPrice > 1_000_000`. Correct per Doc 06 (> ₹10L threshold). **PASS** | `so-complete-dialog.tsx:142` | OK |
| MARGIN_SCHEME flow field set correctly on SOLD event (`flow: 'MARGIN_SCHEME'`) | `so-complete-dialog.tsx:154` | OK |
| `hasRank` correctly used for TCS waiver gate (R12+) per L18; `Gate` primitive not used here — but `hasRank` in component logic (not JSX directly) is acceptable per the spec comment | `so-complete-dialog.tsx:76` | OK (minor: see §9) |
| **No e-invoicing IRN/QR placeholder** on the sale-complete flow. CLAUDE.md §9 / Doc 06 §e-invoicing: B2B invoices above threshold must initiate IRP flow. `SoCompleteDialog` emits `SOLD` event but has no IRN request stub or explicit "P4 deferred" notice. | `so-complete-dialog.tsx` | P1 |
| **TCS line breakdown not shown to customer / in the deal detail view.** The `SoCompleteDialog` computes TCS and embeds it in `SOLD` event payload but no SA-facing UI displays the TCS breakdown line item before the SA confirms. The SA cannot see "TCS = ₹X" until after the event is emitted. | `so-complete-dialog.tsx:253–258` | P2 |
| **DPDP consent absent at lead capture** — PII collected without consent text (repeat of §4 item 7) | `leads/new/page.tsx` | P0 |
| GST margin scheme math: no pre-sale GST breakdown visible to SA in deal detail. Customer cannot see post-margin GST before invoice. | No surface found | P2 |

---

## 6. Cross-Module Wiring Violations

| Seam | Consumer | Producer | Status |
|---|---|---|---|
| Seam 44 | `useTestDriveStore.createBooking` → `useSalesDealsStore.upsertDealFromTestDrive` | Registered in `cross-module-wiring.md:86` | OK |
| **UNREGISTERED** | `use-report-data.ts:101` reads `useSalesDealsStore(s => s.deals)` for service-to-sale conversion | `useSalesDealsStore` → Reports | **P1 gap** — Seam 31 documents `selectServiceToSaleConversion` reading `state.salesDeals` in the selector, but the React-component-level hook usage in `use-report-data.ts` is not registered as a named seam. Violates ARCH-CROSS-MODULE-001 invariant. |
| **UNREGISTERED** | `staff/detail/efficiency-tab.tsx:149` reads `useSalesDealsStore(s => s.deals)` to show deals-closed metric | `useSalesDealsStore` → Staff Efficiency | **P1 gap** — no seam registered for this dependency. Violates ARCH-CROSS-MODULE-001 core invariant §1. |
| Seam 13 | `sales-tab.tsx` "Put on Sale" → `/inventory/new?mode=existing&vin=` | Registered | OK |
| Seam 6 | `SoCompleteDialog` → `vehicles.transferOwnership` | Registered | OK |

---

## 7. RBAC / Security Gaps

| Issue | File:Line | Severity |
|---|---|---|
| **"Assign Lead" button has no RBAC gate.** Any role (R05+) can see and click the button. The spec implies assignment should be R10+. Even as a stub, the button should be wrapped in `<Gate>`. | `enquiry-detail-view.tsx:279` | P1 |
| `SoCompleteDialog` uses `hasRank` in component logic (not JSX conditional) to derive `canWaiveTcs`. This is acceptable per SPEC-ARCH-UI-001 L49 which says "use `Gate` primitive" for JSX gating — but here `hasRank` is used to derive a boolean that controls `{canWaiveTcs && (...)}` JSX block (line 246). This is an inline hasRank-driven conditional in JSX, which L49 prohibits. | `so-complete-dialog.tsx:76,246` | P2 |
| Contact details `ContactDetailsPanel` defaults `showPii = roleNum >= 10`. This bypasses the `Gate` primitive (which compares roles via centralized `ROLE_RANK`). A manual `parseInt(user.role.replace('R',''))` comparison is fragile — if a non-standard role code is introduced it parses as `NaN` and `NaN >= 10` is `false`, accidentally masking for all unknown roles. Low risk now but should use `hasRank`. | `contact-details-panel.tsx:69` | P2 |
| No confirmation dialog on moving a deal to `delivered` (irreversible state change) — violates CLAUDE.md §17 "Confirmation dialog on destructive actions". | `page.tsx:80–121` | P1 |

---

## 8. Test Coverage Gaps

| Missing Test | Target | Scenario / Action | Severity |
|---|---|---|---|
| `cancellationReason` captured when deal moved to `lost` via drag | `page.tsx` / `sales-deals-store` | PLAN-V003 L26 path | P1 |
| Skip-stage forward toast fires | `kanban-column.tsx` / `page.tsx` | Spec §4.3 | P1 |
| Concurrent reservation guard (two deals for same VIN both try to advance to `reserved`) | `sales-deals-store.ts` | Missing guard | P1 |
| `Assign Lead` button stub behavior (when implemented) | `enquiry-detail-view.tsx` | DoD §10 #15 | P2 |
| DPDP consent checkbox required before form submit | `leads/new/page.tsx` | CLAUDE.md §9 | P0 |
| E2E: full lead → delivered flow (happy path) | Playwright | Spec §3 | P1 |
| `SoCompleteDialog` TCS waiver blocks submit when reason < 10 chars | `so-complete-dialog.tsx` | L18 | P1 (exists for manual TCS but no automated test found in sales tests) |
| Deal list view filter combinations (outlet + source + assignedToMe) | `page.tsx` | Spec §4.4 | P2 |
| Storybook stories for `DealCard`, `EnquiryDetailView`, `KanbanColumn`, `ContactDetailsPanel` | DoD §10 #8 | — | P2 |

No tests exist for the Sales pipeline page itself (`apps/staff-web/src/tests/` has `p2-sales-events.test.ts`, `sales-aging.test.ts`, `service-to-sale.test.ts`, `test-drive-sales-integration.test.ts` but none covers the Kanban page component logic, filter behavior, or the enquiry detail view actions).

---

## 9. Code Quality Issues

### text-[NNpx] violations (43 total — blocks drift test)

| File | Count | Examples |
|---|---|---|
| `src/components/sales/ai-call-dialog.tsx` | 5 | `:448 text-[18px]`, `:451 text-[12px]`, `:484 text-[18px]`, `:513 text-[13px]`, `:531 text-[13px]` |
| `src/components/sales/enquiry-detail-view.tsx` | 6 | `:253 text-[11px]`, `:265 text-[32px]`, `:402 text-[11px]`, `:409 text-[13px]`, `:495 text-[28px]` + others |
| `src/components/sales/deal-card.tsx` | 5 | `:81 text-[10px]`, `:91 text-[13px]`, `:95 text-[15px]`, `:104 text-[11px]`, `:110 text-[10px]` |
| `src/components/sales/deal-list-view.tsx` | 2+ | `:66 text-[11px]`, `:108 text-[10px]` |
| `app/(shell)/sales/page.tsx` | 1 | `:144 text-[28px]` |
| `app/(shell)/sales/leads/new/page.tsx` | 8 | `:84 text-[10px]`, `:142 text-[10px]`, `:204 text-[10px]`, `:293 text-[10px]`, `:299 text-[28px]`, `:302 text-[11px]`, `:434 text-[10px]`, `:539 text-[10px]` |

### Inline hasRank in JSX (P2)
- `so-complete-dialog.tsx:246`: `{canWaiveTcs && (...)}` is driven by `hasRank` result, not `<Gate>`. Violates SPEC-ARCH-UI-001 L49.

### i18n violations (P1)
The following Sales surfaces do **not** use `useTranslations`:
- `app/(shell)/sales/page.tsx` — all strings hardcoded ("Sales Pipeline", "New Lead", "Kanban", "List", "My deals only", "active deals", "pipeline", "delivered this month")
- `src/components/sales/enquiry-detail-view.tsx` — all strings hardcoded ("Interaction Ledger", "Assign Lead", "Update Lead", "Add Note", "Log Call", "WhatsApp", "AI Call", "Schedule Test Drive", "Book Test Drive", "Compliance & KYC", etc.)
- `src/components/sales/deal-card.tsx` — stage labels and status strings hardcoded
- `src/components/sales/deal-list-view.tsx` — column headers hardcoded

Only `test-drives-for-deal-card.tsx` and the aging sub-module use `useTranslations`. The core Sales pipeline (the highest-traffic surface) has zero i18n.

### SPEC-SALES-001 status still `draft` (P0)
`specs/modules/sales/01-staff-sales-module.md:5` — spec was never promoted to `in-review` or `approved`. Wave-2 review (security, finance, qa) never ran. The finance reviewer has not signed off on TCS flows, PAN handling, or e-invoicing stubs. This is a fundamental process violation per CLAUDE.md §6.

### Duplicate "test drive" CTAs (P2)
`enquiry-detail-view.tsx:323–337` — both "Book Test Drive" (navigates to `/test-drives/new`) and "Schedule Test Drive" (opens `ScheduleTestDriveModal`) appear in the same header. These should be consolidated. The `ScheduleTestDriveModal` may not wire into `useTestDriveStore` (not verified in this audit), making it potentially a dead path.

---

## 10. Recommended Fix Waves

### P0 — Must fix before this module can be considered production-grade

| # | Fix | Files |
|---|---|---|
| P0-1 | Promote SPEC-SALES-001 to `in-review` and complete wave-2 review (security + finance + QA sign-off) | `specs/modules/sales/01-staff-sales-module.md` |
| P0-2 | Wire "Assign Lead" button — implement assign dialog or replace with explicit stub toast | `src/components/sales/enquiry-detail-view.tsx:279` |
| P0-3 | Add DPDP consent text + purpose statement to lead capture form before any PII input | `app/(shell)/sales/leads/new/page.tsx` |

### P1 — Should fix this sprint

| # | Fix | Files |
|---|---|---|
| P1-1 | Fix 43 `text-[NNpx]` violations across sales components to use canonical Tailwind text-size classes | All sales component files (see §9) |
| P1-2 | Add i18n (`useTranslations`) to `page.tsx`, `enquiry-detail-view.tsx`, `deal-card.tsx`, `deal-list-view.tsx`; add keys to `messages/en-IN.json` and `messages/hi-IN.json` under a top-level `"sales"` namespace | All sales page/component files |
| P1-3 | Intercept drag-to-`lost` in `handleMoveDeal` with an inline reason-capture dialog | `app/(shell)/sales/page.tsx:80–121` |
| P1-4 | Add confirmation dialog for advancing to `delivered` (irreversible) | `page.tsx` / `kanban-column.tsx` |
| P1-5 | Add skip-stage warning toast to `handleMoveDeal` | `app/(shell)/sales/page.tsx:80` |
| P1-6 | Register two missing cross-module seams (Reports → SalesDeals, Staff Efficiency → SalesDeals) in `cross-module-wiring.md` | `specs/architecture/cross-module-wiring.md` |
| P1-7 | Add explicit e-invoicing IRN stub notice in `SoCompleteDialog` ("IRN generation — coming in P4") | `src/components/sales/so-complete-dialog.tsx` |
| P1-8 | Consolidate "Book Test Drive" and "Schedule Test Drive" into one CTA | `src/components/sales/enquiry-detail-view.tsx` |

### P2 — Can defer to next sprint

| # | Fix | Files |
|---|---|---|
| P2-1 | Replace inline `hasRank` JSX gate in `SoCompleteDialog` with `<Gate>` primitive | `so-complete-dialog.tsx:246` |
| P2-2 | Harden `ContactDetailsPanel` PII toggle to use `hasRank` from `@dms/types` instead of manual `parseInt` | `contact-details-panel.tsx:69` |
| P2-3 | Add UI path to set a deal to `on-hold` (sidebar action or header CTA) | `enquiry-detail-view.tsx` |
| P2-4 | Show TCS breakdown to SA before confirming sale in `SoCompleteDialog` | `so-complete-dialog.tsx` |
| P2-5 | Add GST margin scheme preview line in deal detail sidebar | `enquiry-detail-view.tsx` |
| P2-6 | Add Storybook stories for `DealCard`, `KanbanColumn`, `EnquiryDetailView`, `ContactDetailsPanel` | DoD §10 #8 |
| P2-7 | Add integration tests for deal list view filter combinations | `src/tests/` |
| P2-8 | Track `cancellationReason` in fixture data for `lost` deals (currently all `undefined`) | `packages/mocks/src/fixtures/deals.ts` |

### P3 — Nice to have

| # | Fix |
|---|---|
| P3-1 | Win-rate analytics surface (% of deals closed-won by source, SA, outlet) |
| P3-2 | Quote PDF generation (or explicit DEF-SALES-N deferred item in spec) |
| P3-3 | Per-PAN TCS threshold tracker visible inside deal detail (customer approaching ₹10L limit) |
| P3-4 | Re-listing counter (track how many times a VIN has been listed/returned/re-listed) |
