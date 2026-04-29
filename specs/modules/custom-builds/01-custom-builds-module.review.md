---
review_id: REVIEW-CUSTOM-BUILDS-001
spec_id: SPEC-CUSTOM-BUILDS-001
reviewer: orchestrator (security + finance/GST + QA hats)
review_date: 2026-04-28
verdict: APPROVE WITH FIXES
blockers: 5
patch_estimate: ~40 lines across spec + helper pseudocode
---

# Review — SPEC-CUSTOM-BUILDS-001 Custom Builds Module

## Verdict

**APPROVE WITH FIXES** — 5 blockers are all patchable in-spec (no architecture rethink needed). All blockers must be resolved before status moves to `approved`. GST formula has one structural correctness issue (Blocker 1) and one missing test branch. Finance gate placement is correct. No security blockers; one PII concern on public preview.

---

## Top 5 Blockers

### B1 — GST on labour formula is wrong: margin included in base (HIGH — Finance hat)

**Location:** §10, estimator formula block; §15 para 2.

**Current formula:**
```
gstOnLabour = vendorLabour × 0.18
```

**Problem:** Per Doc 06 §service-invoice and PLAN-VEHICLES-003 L25 (the cross-spec authority):
> "Commission GST is additive (tax-exclusive): `commissionGst = round(commissionEarned × 18/100)`. Service fees per Doc 06 — GST added on top of invoice value, not extracted."

The vendor labour line is correct at `vendorLabour × 0.18`. However the spec's `total` formula conflates this:

```
total = partsSubtotal + vendorLabour + bnMargin + gstOnLabour + gstOnPartsMargin
```

`gstOnLabour` is computed on `vendorLabour` alone but `bnMargin` includes a labour component. The margin attributable to labour (`bnMargin × labourShare`) should also carry 18% additive GST (it is a service charge billed to the customer on top of the labour service line). Currently that portion is untaxed — under-collection of GST.

**Required fix (L6 + new L16):** The total line should read:
```
labourBase    = vendorLabour + bnMargin × (vendorLabour / (partsSubtotal + vendorLabour))
gstOnLabour   = labourBase × 0.18                        // full-value additive (Doc 06 §service-invoice)
partsMarginShare = bnMargin × (partsSubtotal / (partsSubtotal + vendorLabour))
gstOnPartsMargin = partsMarginShare × 18 / 118           // margin scheme (Doc 06 §GST.margin)
total         = partsSubtotal + vendorLabour + bnMargin + gstOnLabour + gstOnPartsMargin
```

Add a locked decision L16 capturing this split and reference Doc 06 §service-invoice + L25.

**This is a material GST under-collection bug. OQ-1 flag is appropriate but the formula must still be internally consistent with Doc 06 in v1.**

---

### B2 — Finance gate blocks wrong transition; APPROVED → PARTS_ORDERING not enforced at store level for the general case (HIGH — Finance hat)

**Location:** §4 transition table; §4 Finance gate block.

The transition table (§4) lists the R12 condition on APPROVED → PARTS_ORDERING. The §4 Finance gate prose says:
> "Store action throws `FinanceApprovalRequiredError` if `financeApprovalAt` is null."

The store action table (§14.2) lists `advanceStage(jobId, next, actorId)` as the unified transition actor. But the `deliverJob` action (§14.2) is listed separately and bypasses `advanceStage`. There is no explicit statement that `deliverJob` also checks the finance gate.

**Required fix:** Add to §4 Finance gate and §14.2:
> "The `advanceStage` action is the single enforcer of the finance gate. `deliverJob` must route through `advanceStage` (or call the same guard) — it is not a direct state mutation."

Also: the AC (§21) says "the `deliverJob` finance gate blocks correctly at > ₹2L" which implies deliverJob has its own gate check. Reconcile: either deliverJob calls advanceStage internally or it duplicates the guard. The spec must be explicit. Ambiguity here is a security/finance bypass risk if `deliverJob` goes direct.

---

### B3 — Public preview page leaks quote total to unauthenticated users with no PII caveat (MEDIUM-HIGH — Security hat)

**Location:** §9.6; L13.

§9.6 states the public preview renders:
> "job title, vehicle name, selected parts list, **quote total**"

L13 confirms no auth required. The spec does **not** enumerate what is excluded from the public page. The reviewer mandate specifies "customer phone/email/address must NOT be on the public preview". The spec is silent on this — it does not say those fields are excluded.

**Required fix:** Add an explicit enumeration under §9.6 Public Preview Page:
> "**Excluded from public preview (never rendered, not in API response):** customer name, customer phone, customer email, customer address, `bnCost` values, `techNotes`, activity log, vendor contact details. The page receives only: job title, model slug, visualizer state layers, parts display names and list prices, quote total."

This needs a matching AC bullet in §21.

---

### B4 — `CostLedgerCategoryEnum` extension not specified; three new enum values underdefined (MEDIUM — QA/Finance hat)

**Location:** L9; §11.3; §14.2 `deliverJob`.

L9 says categories `custom-build-parts`, `custom-build-labour`, `custom-build-vendor-fee` are written on DELIVERED. PLAN-VEHICLES-003 L24 says "full `CostLedgerCategoryEnum` allowed" for manual entries.

**Gap:** The spec never specifies that `CostLedgerCategoryEnum` (defined in `@dms/types`) must be extended with these three new values. Without this:
- TypeScript will reject the `deliverJob` ledger write at compile time.
- The Costs tab category filter in the vehicles store will not recognize the new categories.

**Required fix:** Add a locked decision (or note in §11.3):
> "L[new]: `CostLedgerCategoryEnum` in `packages/types/src/domain/vehicles-aggregate.ts` is extended with three new members: `'custom-build-parts' | 'custom-build-labour' | 'custom-build-vendor-fee'`. This is the only schema change required in the vehicles domain. PLAN-VEHICLES-003 L24 governs the existing enum; these additions are additive."

Also add a P1/P4 task to the phase plan: "extend `CostLedgerCategoryEnum` before store wiring."

---

### B5 — `QC_FAILED → IN_PROGRESS` reverse transition is listed as "automatic" but has no defined trigger or guard (MEDIUM — QA hat)

**Location:** §4 transition table row for QC_FAILED.

The table says:
> `QC_FAILED | IN_PROGRESS | automatic (emits qc_failed activity event)`

**Problems:**
1. "Automatic" is undefined — what triggers it? Does the store advance immediately when QC_FAILED is set, or does a human confirm rework?
2. If automatic, there is no role gate — any state write to QC_FAILED simultaneously writes IN_PROGRESS, making QC_FAILED a transient pseudo-state rather than a resting state. The Kanban board shows a QC_FAILED column but if the transition is immediate there are no cards in it.
3. The AC does not test the QC_FAILED → IN_PROGRESS path explicitly.

**Required fix:** Choose one and document it:
- **Option A (recommended):** QC_FAILED is a resting state. R10+ must manually confirm "Send for rework" CTA → advances to IN_PROGRESS. Add role gate `R10+` in transition table. Update AC.
- **Option B:** QC_FAILED is instantaneous (no resting state). Remove it from the Kanban column list (§5.1 only shows 7 columns today, which already includes QC but not QC_FAILED — this option requires verifying column count).

Either way: update AC §21 to cover `QC → QC_FAILED → IN_PROGRESS` as an explicit test case.

---

## Concerns (non-blocking, must address before P2 ship)

### C1 — `partsMarginShare` formula: division-by-zero when job has no parts (QA)
**Location:** §10, `partsMarginShare` definition.

If `partsSubtotal === 0` (labour-only job), the formula `partsSubtotal / (partsSubtotal + vendorLabour)` returns `0/N = 0` which is fine. But if BOTH are zero (empty job), it is `0/0 = NaN`. The `computeGstBreakdown` helper must guard: if `partsSubtotal + vendorLabour === 0` return all zeros. Add to test plan: "empty job (no parts, no labour) → all outputs 0, no NaN/Infinity."

### C2 — Loss-sale branch for parts GST: spec says `margin × 18/118` but what if `bnMargin < 0`? (Finance)
**Location:** §10; L6.

The spec (following Doc 06 §GST.margin) should apply the PLAN-VEHICLES-003 L4 pattern: "Clamped to 0 on loss sale." The spec does not state this for the custom-builds estimator. Add: "If `partsMarginShare ≤ 0`, `gstOnPartsMargin = 0`." Required as a test case branch per the review mandate ("loss-sale branch, `margin === 0 → gstParts === 0`").

### C3 — Visualizer fallback when asset PNG is missing is unspecified for individual layers (Security/UX)
**Location:** §9.3; §18 error states.

§18 error states for Visualizer says "Asset load error with fallback message" but this is described as a full-canvas failure. Individual layer 404s (a single PNG missing for one overlay) have no specified fallback. A missing PNG should silently suppress that layer (not break the canvas). Spec must state: "If a layer PNG returns 404, that `<motion.img>` is hidden with `visible: false`; no error toast for individual layer misses."

### C4 — Fixture stub VINs are not real VINs from `vehicles-store` (QA/FK integrity)
**Location:** §13.1 fixtures table.

CBJ-002 through CBJ-005 use stub VINs like `WBA3C1C50FK…(stub VIN 2)`. L14 requires "All customer IDs and VINs must resolve against existing `customers-store` and `vehicles-store` fixtures (no orphan FKs)." The spec contradicts itself: stubs are by definition not real entities. The implementation phase will need real VINs from `vehicles-store`. Add a note: "Fixture authors must replace stub VINs with verified entries from `packages/mocks/src/fixtures/vehicles.ts` before P1 ships. The review gate for P1 includes FK validation."

### C5 — `shareToken` vs `quoteToken` naming inconsistency (QA)
**Location:** L8 (`quoteToken`); §6 Tab 2 (`quoteToken`); §9.6 (`shareToken`, `shareExpiresAt`); §14.2 `generateShareToken`.

The spec uses `quoteToken`/`quoteExpiresAt` in §6 (Parts & Estimate) and `shareToken`/`shareExpiresAt` in §9.6 (Visualizer share). L8 says quote tokens expire in 14 days and the share link uses "same 14-day expiry as quote." Are these the same token or two separate tokens per job? If same: the `BuildJob` entity has one token field — unify to `shareToken`. If different: the entity needs both fields and the public preview route must decide which one is checked. **Spec must be explicit.** This is a type-safety issue in `BuildJob`.

---

## Traps

### T1 — `useReducedMotion` placement
§17 says the hook disables visualizer fade. If `useReducedMotion()` is only called at the `VisualizerCanvas` level and the Framer Motion `transition` prop is on individual `<motion.img>` elements, the override must be passed down as a prop or context — it cannot be read inside a non-component helper. Spec should note: "Pass `prefersReducedMotion` as a prop to each layer component; do not read the hook deep inside a render loop." Prevents accidental no-op if the hook is called in the wrong scope.

### T2 — `computeGstBreakdown` commissionPct: 0 edge case (AC test named but formula path unclear)
AC §21 names `commissionPct: 0` as a test case. Per PLAN-VEHICLES-003 L36: "`0` is a valid explicit value and MUST NOT fall through to default." The custom-builds estimator uses `marginPct` (not `commissionPct`) — ensure the AC test name aligns with the actual parameter name in the helper. Rename to `marginPct: 0` in the AC, or add a note that this maps to `marginPct`.

### T3 — `quoteTotal` stored as snapshot vs. recomputed
`BuildJob.marginPct` is stored (L7) but the spec does not store the full quote line breakdown. If `bnCost` or `vendor.dayRate` changes after a quote is saved, recomputing from the job record will give a different total. The AC checks `quoteTotal > 200_000` for the finance gate — it must use the snapshotted total, not a live recompute. Add: "`BuildJob.quoteSnapshot` stores the full estimator output at `saveQuote` time. Finance gate reads `quoteSnapshot.total`, never live-recomputes."

### T4 — Cost-ledger write on re-delivery attempt
If `deliverJob` is called twice (bug, replay), it would write duplicate ledger entries to `vehicles-store`. The spec says DELIVERED is terminal but a guard at the `deliverJob` action level must be explicit: "If `job.stage === DELIVERED`, throw `JobAlreadyDeliveredError`; do not write ledger entries again."

---

## Missing Acceptance Criteria

The following AC items should be added to §21:

- [ ] `computeGstBreakdown` returns all-zeros (no NaN) for an empty job (zero parts, zero labour).
- [ ] `computeGstBreakdown` clamps `gstOnPartsMargin` to 0 when `partsMarginShare ≤ 0` (loss-sale branch).
- [ ] `QC → QC_FAILED → IN_PROGRESS` rework flow is exercisable in the UI; role gate enforced.
- [ ] Public preview page does not render customer name, phone, email, address, or `bnCost` values.
- [ ] `deliverJob` called twice on a DELIVERED job throws `JobAlreadyDeliveredError`; no duplicate ledger entries.
- [ ] Finance gate reads `quoteSnapshot.total`, not a live recompute; verified by changing `vendor.dayRate` after quote save and confirming gate threshold is unchanged.
- [ ] Individual visualizer layer 404 silently suppresses that layer; no console error; rest of canvas renders normally.

---

## Open Questions (additions to §20)

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| OQ-6 | Is `quoteToken` and `shareToken` the same field or two separate fields on `BuildJob`? Decide before P2 entity work. | Product + Dev | High |
| OQ-7 | Is the BN margin (bnMargin) amount on the labour portion a service charge subject to GST at 18% additive, or is it rolled into the parts margin scheme? This determines Blocker B1 resolution. Tax counsel should confirm before P2 ships. | Finance + Tax | High |
| OQ-8 | QC_FAILED resting state vs. instant flip to IN_PROGRESS — which model does the business prefer? (Kanban column implications.) | Product | Medium |

---

## Suggested Locked Decisions

The following should be added to §2 before `approved` status:

| # | Decision |
|---|----------|
| L16 | GST on labour includes BN margin's labour-attributed portion: `labourBase = vendorLabour + bnMargin × labourShare`; `gstOnLabour = labourBase × 0.18`. Cross-ref Doc 06 §service-invoice + PLAN-VEHICLES-003 L25. |
| L17 (renumber) | `CostLedgerCategoryEnum` in `@dms/types` extended with `'custom-build-parts'`, `'custom-build-labour'`, `'custom-build-vendor-fee'`. Additive only; no existing values changed. |
| L18 | Public preview page field exclusion list (customer PII, bnCost, techNotes, activity log, vendor contacts). |
| L19 | `BuildJob` carries one `shareToken` + `shareExpiresAt` (unified). Quote PDF flow sets the same token. `quoteToken` alias removed. |
| L20 | `deliverJob` is idempotent-guarded: throws `JobAlreadyDeliveredError` if `job.stage === DELIVERED`. |
| L21 | `BuildJob.quoteSnapshot` stores full estimator output at `saveQuote` time. Finance gate + PDF use snapshot; no live recompute. |

---

## Per-Hat Findings Summary

### Security hat

| Severity | Finding | Location |
|----------|---------|----------|
| High | Public preview PII exclusion list absent — customer fields could leak | §9.6, L13 |
| Medium | `deliverJob` can bypass `advanceStage` finance gate | §14.2 |
| Low | `shareToken` is UUID v4 — adequate for 14-day expiry; no entropy concern | §9.6 |
| Low | `bnCost` blur treatment for sub-R10 roles specified; DOM-present pattern consistent with prior modules | §7.4 |
| Low | Vendor `contactPhone`/`contactEmail` on public preview — excluded by C3 fix | §9.6 |
| OK | RBAC gates are slice-level for all transitions (L10, L15 pattern) | §14.2 |
| OK | Token-gated route is public by design; no auth bypass | §3, §9.6 |

### Finance / GST hat

**GST formula verification:**

| Formula | Spec text | Verdict |
|---------|-----------|---------|
| Parts margin GST | `partsMarginShare × 18/118` | Correct formula (Doc 06 §GST.margin, PLAN-VEHICLES-003 L4). Tax-inclusive extraction. |
| Labour GST base | `vendorLabour × 0.18` | Partially correct — see Blocker B1. Labour-attributed BN margin must also carry 18% additive. |
| Loss-sale clamp | Not stated | Missing — Concern C2. Must clamp to 0. |
| Division by zero | Not guarded | Missing — Concern C1. |
| `gstOnPartsMargin` displayed separately | "GST breakdown is shown as two lines" (§10) | Correct — two-line mandate satisfied. |
| `commissionPct: 0` branch | Named in AC §21 | Present in AC but parameter name mismatch (should be `marginPct: 0`). |
| Finance gate ₹2L | Store-action level throw (§4, §14.2) | Correct placement. |
| Cost-ledger categories | L9 names them | Correct — but enum extension missing (Blocker B4). |

### QA hat

| Area | Status |
|------|--------|
| State machine reverse transitions | B5 — QC_FAILED transition undefined |
| Test plan P2 100% branch coverage | Partly covered in AC §21; missing empty-job + loss-sale + NaN branches |
| Fixture FK integrity | L14 mandated; stub VINs violate it (C4) |
| Token naming consistency | C5 — `quoteToken` vs `shareToken` ambiguity |
| Duplicate ledger write guard | T4 — not specified |
| Phase plan ordering | P1–P4 is logical; P3 can ship without P4 per spec — confirmed viable |
| Storybook coverage | §21 lists all required stories including `EstimateSummaryPanel` and `QuoteExpiredState` — complete |
| i18n coverage | §16 namespaces complete; AC §21 covers no hardcoded strings |
| Empty/loading/error states | §18 covers all surfaces; individual layer fallback missing (C3) |
| Accessibility | §17 complete; `useReducedMotion` placement trap (T1) |
| `risk_level: low` in frontmatter | Questionable — module handles ₹2L+ finance approvals and GST. Recommend `risk_level: medium`. |

---

## Phase Plan Assessment

| Phase | Status | Notes |
|-------|--------|-------|
| P1 | Shippable after B4 fix (enum extension) + C4 fix (real VINs in fixtures) | |
| P2 | Shippable after B1 + B2 + B5 + C1 + C2 + C5 fixes | GST helper must be correct before PDF/share |
| P3 | Shippable independent of P4 | Confirmed viable |
| P4 | Shippable after P2 (ledger categories in enum) | B4 fix is a prerequisite |

---

*Review completed 2026-04-28. Resolve all 5 blockers and add missing AC bullets before moving spec to `approved` status.*
