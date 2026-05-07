# SPEC-SALES-001 — QA review

**Reviewer:** qa-planner
**Date:** 2026-05-07

---

## Concerns

**1. [P0] No formal scenarios exist in the spec — entire test plan is untestable**
SPEC-SALES-001 v0.4 has no §Scenarios section with numbered Given/When/Then entries. The spec documents behavior in prose (§3, §4.3, §13, §14, §15) but never formalizes it into falsifiable scenarios with IDs. CLAUDE.md §17 and Doc 15 (Spec Template) require ≥1 scenario per spec behavior. The W3 additions (§12–§15) are written as implementation notes, not acceptance scenarios. Every downstream test that claims to cover "a scenario" is referencing prose, not a contract.
Recommendation: Add a §Scenarios section with at minimum S-SALES-01 through S-SALES-15 covering each stage transition, each W3 flow, and the RBAC gates. Each scenario must map to ≥1 AC in §Acceptance Criteria.

**2. [P0] No §Acceptance Criteria section exists in the spec**
The spec (v0.4) has no §Acceptance Criteria table. Without it, the W3 locked decisions (L_S-RES-1, L_S-LOST-1, L_S-REFUND-1) have no falsifiable acceptance tests. The spec cannot be signed off or promoted to `approved` without this section per Doc 15 and CLAUDE.md §6.
Recommendation: Integrator must add §Acceptance Criteria before status can advance. Each AC must cite a scenario ID and be phrased as a verifiable pass/fail statement.

**3. [P0] No §Test Plan / test placement section in the spec**
CLAUDE.md §10 DoD item 9 mandates that every spec enumerate which test files cover which behaviors, using the binding placement convention:
- Pure-logic/store tests → `apps/staff-web/src/lib/sales/__tests__/`
- Cross-module integration → `apps/staff-web/src/tests/`
SPEC-SALES-001 has no §Test Plan section. The three W3 test files exist on disk but are not referenced by the spec at all — the spec does not claim them, and they cannot be audited for completeness against spec scenarios without a mapping.
Recommendation: Add §Test Plan to the spec listing each test file, the scenario IDs it covers, and the placement rationale.

**4. [P0] Spec status is `in-build`; no wave-2 signoffs on record; process violation**
The spec was promoted from `draft` to `in-build` in v0.4 (2026-05-07) without passing through `in-review` → `approved`. CLAUDE.md §6 is explicit: "No code lands without an `approved` spec." CLAUDE.md §5 requires all three wave-2 reviewers (security, finance, qa) to sign off before `in-review → approved`. As confirmed by AUDIT-SALES-2026-05-07 §2, the finance reviewer has never signed off on TCS flows, PAN handling, or e-invoicing stubs.
Recommendation: Status must revert to `in-review`; all three `.review.md` companion files must be present with `signed-off` lines before status can advance to `approved`.

**5. [P1] Reservation guard test count discrepancy — spec claims 11 tests, file has 20 raw `it()` calls**
SPEC-SALES-001 §12 (L_S-RES-1) references "W3 commit claimed 11 tests" for `sales-deals-store.reservation-guard.test.ts`. The file on disk at `apps/staff-web/src/lib/sales/__tests__/sales-deals-store.reservation-guard.test.ts` contains 20 `it()`/`test()` lines (file is 239 lines, 3 describe blocks). This count divergence means either the spec's commit note is stale or some tests were added post-W3 without a spec version bump. Either way, the spec's test-count claim is inaccurate.
Recommendation: Update the spec's test count claim to match the actual file (20 tests across 3 describe blocks). If extra tests were added after W3, bump the spec version and add a changelog entry.

**6. [P1] Lost reason test: spec says "7 tests" — file has 7 `it()` calls but coverage gap on `OTHER`+short-text rejection check wording**
`sales-deals-store.deal-lost.test.ts` contains 7 `it()` test cases, consistent with W3.2 spec claim. However test (2) checks for `OTHER + freeText < 10 chars` rejection but the spec (§14) says the threshold is `≥10 chars` for freeText when category is `OTHER`. The test literal `'Too short'` is 9 chars — this is correct for the boundary. However there is no test for the exact boundary value: `freeText.length === 10` (exactly 10 chars) should pass. A boundary-value test is missing.
Also: test descriptions are numbered 1–6 in comments but the file has 7 `it()` calls. Test 7 (`OTHER category with freeText >= 10 chars succeeds`) is unnumbered in the comment header (comments list only 6 items). The spec coverage claim of 7 is numerically correct, but the comment header in the test file lists only 6 items, creating an apparent mismatch.
Recommendation: (a) Add a boundary-value test for `freeText.length === 10` (passes). (b) Update the file's comment header to list all 7 items.

**7. [P1] Refund test: spec says "7 tests" — file has 7 but R09 rejection test uses wrong role**
`sales-deals-store.refund.test.ts` test (1) is titled "R09 actor → returns UNAUTHORIZED." The `SALES_MANAGER` constant is set to `role: 'R09'` (correct for test intent). However, spec §15 (L_S-REFUND-1) states "refundDeal rejects actors below R12" and lists the `Gate` as `<Gate role={['R12','R19','R22','R24']}>`. R09 is indeed below R12, so the test logic is correct. But the spec (§15) also says "R09 and below" — there is no test for role R05 (SA level) being rejected. Test (7) covers R05, so this is fine.
One genuine gap: the spec says the `RefundDealDialog` requires type-to-confirm "REFUND" before the Confirm button enables. **There is no store-level or UI-level test anywhere in the three W3 files for the type-to-confirm threshold.** This is a UI behavior (CLAUDE.md §17 requires type-to-confirm for permanent destructive actions) with no automated coverage.
Recommendation: Add a test (UI or integration level) verifying the `RefundDealDialog` Confirm button is disabled until the user types "REFUND" exactly (case-sensitive).

**8. [P1] State-machine illegal transition coverage: `new-lead → delivered` skip not guarded + not tested**
SPEC-SALES-001 §3 documents the pipeline `new-lead → contacted → test-drive → reserved → sales-order → delivered` plus terminal states `lost` / `refunded`. The audit (AUDIT-SALES-2026-05-07 §4, gap #4) found that `handleMoveDeal` never emits a toast for skip-stage drops. More critically, there is no test anywhere in `apps/staff-web/src/lib/sales/__tests__/` or `src/tests/` verifying that illegal backward transitions (e.g., `delivered → new-lead`) are rejected. The spec has no §State Machine section and no table of allowed/forbidden transitions.
Recommendation: (a) Add a §State Machine section to the spec with the allowed transition table and explicitly mark `delivered`, `lost`, and `refunded` as terminal (no further forward transition). (b) Add tests for at least 2 illegal transitions (backward jump; terminal-state escape attempt).

**9. [P1] No §Quality Gates (§19) section in the spec**
CLAUDE.md §17 and the DoD enumerate mandatory quality gates. The spec has no dedicated quality gates section enumerating which automated checks are required:
- `ui-canon-drift.test.ts` (blocks on `text-[NNpx]` / `rounded-lg/xl`)
- `error-boundaries.test.ts` (requires `error.tsx` per module)
- `locale-completeness` gate (top-level `salesDeals.*` namespace in both locale files)
- `zustand-selector-anti-patterns` (selectors return base refs; computation in `useMemo`)
- Dead-button detector (no silent CTAs)
AUDIT-SALES-2026-05-07 §9 found 43 `text-[NNpx]` violations that would already block the drift test. The spec should document these gates so implementers know what CI will fail.
Recommendation: Add §Quality Gates citing the automated checks by test file name and the DoD items they enforce.

**10. [P1] i18n: `salesDeals.*` namespace not mandated in the spec; top-level key missing from locale files**
CLAUDE.md §10 item 13a requires that any module calling `useTranslations('<module>.*')` have a top-level key in `messages/en-IN.json` AND `messages/hi-IN.json`. SPEC-SALES-001 §13 references `salesDeals.refund.reservationConflict.toastMessage` as the expected i18n key path, implying a `salesDeals` top-level namespace. The spec never formally mandates this namespace in a §i18n or §Quality Gates section. AUDIT-SALES-2026-05-07 §9 (i18n violations) confirms the core sales pipeline components have **zero** `useTranslations` usage — all strings are hardcoded. The spec should have caught this at authoring time.
Recommendation: Add a §i18n section specifying `salesDeals` as the required top-level namespace, listing the required key groups (`salesDeals.pipeline.*`, `salesDeals.lostReason.*`, `salesDeals.refund.*`, `salesDeals.reservationConflict.*`), and mandating both `en-IN` and `hi-IN` keys.

**11. [P1] No test for `DPDP consent` on lead capture — missing both spec scenario and test**
AUDIT-SALES-2026-05-07 §3 (gap row) and §4 gap #7 flag that `leads/new/page.tsx` collects PII without any DPDP consent text. CLAUDE.md §9 is explicit: "every PII collection point shows consent text + purpose." No scenario in the spec covers this, and no test in any file verifies the consent checkbox is present and required before form submit. This is both a spec gap (no scenario) and a test gap.
Recommendation: Add scenario `S-SALES-LEAD-CONSENT-01`: Given the lead capture form is loaded, When a user submits without checking the consent checkbox, Then the form rejects with a validation error. Add corresponding AC and test.

**12. [P2] Storybook stories: spec does not mandate stories for W3 dialogs**
`MarkDealLostDialog` and `RefundDealDialog` are new dialogs added in W3. CLAUDE.md §10 DoD item 8 requires Storybook stories for every component. The spec (§14, §15) describes the dialogs but never mandates stories or lists them in a §Storybook section. AUDIT-SALES-2026-05-07 §8 flags missing stories as P2.
Recommendation: Add a §Storybook note listing the required stories: `MarkDealLostDialog` (valid / invalid / OTHER-branch states), `RefundDealDialog` (role-gated / type-to-confirm states), and `ReservationConflictDialog` (conflict / force-override states).

**13. [P2] Observability: audit event payload shapes not documented in the spec**
SPEC-SALES-001 §13 mentions `RESERVATION_FORCE_OVERRIDE` audit event with payload fields (`reason`, `releasedDealIds`, `actorRole`). §14 mentions `deal_lost` event with `{ category, freeTextLength }`. §15 mentions `deal_refunded` with `{ category, refundedAmount, reasonLength, priorStage }`. None of these are documented in a formal §Events or §Observability section with TypeScript interface shapes. The spec says "NOT freeText body — privacy hygiene" in prose but this constraint is not an L-tag and has no test verifying the exclusion in the refund case (the lost-reason test does verify this).
Recommendation: Add a §Events Emitted section with typed payload shapes for all three audit events. The privacy constraints (no freeText body, no reason text) should be L-tagged or at minimum referenced as spec-enforced constraints with corresponding test IDs.

**14. [P2] Storefront customer-web touchpoints: explicitly out-of-scope but not declared**
SPEC-SALES-001 has no statement on whether customer-web deal-status display (customer seeing their deal progress) is in or out of scope. AUDIT-SALES-2026-05-07 does not flag this. Given the spec `depends_on` list does not include any customer portal spec, and no `/customer-web` routes are listed in §2, the customer-facing touchpoints are implicitly out of scope. However, implicit scoping is a review risk — especially since the deal reaches `delivered` and a customer might expect a notification.
Recommendation: Add an explicit §Out of Scope statement: "Customer-web deal status display is out of scope for SPEC-SALES-001. Customer notifications on stage changes are deferred to SPEC-CX-PORTAL-002 (or register as DEF-SALES-N)."

**15. [P3] `stub` vs `deferred` vocabulary: `Assign Lead` CTA not registered as a deferred item**
CLAUDE.md §15 requires that any CTA that is deferred must render an explicit "coming soon" notice AND be registered in §Deferred items with a `DEF-SALES-N` ID. AUDIT-SALES-2026-05-07 §4 gap #2 confirms "Assign Lead" is a silent dead CTA. The spec §6 describes the CTA in the header but never marks it as `stub` or `deferred` and there is no `DEF-SALES-N` entry for it.
Recommendation: Either implement the assign dialog (then add scenario + test) or register as `DEF-SALES-ASSIGN-1` in §Deferred items and add an explicit stub toast.

---

## Blockers

1. **No §Scenarios section** — test traceability is impossible without scenario IDs. The three W3 test files reference `SPEC-SALES-001 §12 / L_S-RES-1` etc., but these are L-tags, not scenarios. Tests cannot be verified as complete coverage without scenarios to map against. Spec cannot advance to `approved` without them.

2. **No §Acceptance Criteria section** — QA cannot sign off on a spec with no falsifiable AC. This is a mandatory section per Doc 15 §Spec Template.

3. **Spec status lifecycle violation** — status jumped from `draft` to `in-build` without `in-review` → `approved` transition. Security and finance wave-2 reviews have not run. QA sign-off (this document) is being delivered now, but the security and finance `.review.md` files are still absent. All three must be present for the integrator to advance status.

---

## Open questions

1. **`refunded` stage terminal or recoverable?** L_S-REFUND-1 says the deal moves to `stage='refunded'` but the state-machine diagram in §3 does not list `refunded` as a stage (it lists `LOST` and `ON_HOLD` as side states; `refunded` is added via W3.3). Is `refunded` terminal? Can a refunded deal be re-activated? The spec is silent.

2. **`service-to-sale` cross-module seam coverage** — AUDIT-SALES-2026-05-07 §6 flags `use-report-data.ts` as having an unregistered seam reading `useSalesDealsStore`. Is this seam in scope for SPEC-SALES-001, or does it belong to SPEC-REPORTS-001? The integrator needs to assign ownership before seam registration can happen.

3. **`forceReserveOverride` audit event casing** — the spec §13 documents the event as `RESERVATION_FORCE_OVERRIDE` (SCREAMING_SNAKE_CASE) but §14's `deal_lost` and §15's `deal_refunded` use `snake_case`. Are audit events intentionally mixed-case or is one form canonical? The test file honors `RESERVATION_FORCE_OVERRIDE` for the override event and `deal_lost` / `deal_refunded` for the others. This should be standardized in a §Observability section.

4. **`MarkDealLostDialog` — who can invoke it?** §14 says the dialog opens on drag-to-lost in the Kanban and on the "Mark Lost" CTA in enquiry detail. But the spec does not state which roles can mark a deal lost. R05 (SA) can do it in the test fixtures. Should R10+ approval be required to mark a high-value deal lost, or is any SA allowed? The spec is silent; Doc 14 §R05 should be consulted.

---

## Signoff

```
signed-off: no
reason: Two blocking structural gaps (no §Scenarios, no §Acceptance Criteria) prevent
        QA traceability sign-off. Additionally, the spec lifecycle violation (draft→in-build
        without approved transition) means security and finance wave-2 reviews have not run.
        QA will re-sign after: (a) §Scenarios + §Acceptance Criteria are added by the integrator,
        (b) security and finance .review.md files are submitted, and (c) the integrator
        acknowledges blockers 1–3 above.
acknowledged-by-integrator: yes
```

**Integrator note (2026-05-07, v0.5):** All 4 QA blockers acknowledged. Resolutions: blocker #1 (no §Scenarios) → §18 added with 22 SC-* scenarios mapping to W3 + new L-tag flows. Blocker #2 (no §Acceptance criteria) → §19 added with 27 falsifiable ACs each citing scenarios. Blocker #3 (no §Test plan) → §20 added with file-by-file SC coverage + Quality Gates subsection enumerating ui-canon-drift, error-boundaries, locale-completeness, dead-button-detector, zustand selector, i18n-key-resolution. Reservation-guard test count corrected from "11" to actual "20" (concern #5). Blocker #4 (lifecycle violation) → status reverted `in-build → in-review`; promotion to `approved` blocked pending P1 closure of 15 blockers tracked in §26. Concerns #5–#15 captured as DEF items: DEF-SALES-LOST-1 (boundary test), DEF-SALES-ASSIGN-1 (silent CTA), DEF-SALES-I18N-1 (hardcoded strings), DEF-SALES-CX-1 (customer-web scope statement now explicit in §22 Out of Scope), DEF-SALES-SEAM-REPORTS-1 (seam ownership). State-machine illegal-transition guard codified in §3 + SC-22; events casing standardized in §24. §i18n (§25) mandates `salesDeals.*` namespace in both locale files. §Storybook (§23) lists required stories.

---

## Summary by severity

| Severity | Count |
|----------|-------|
| P0 | 4 |
| P1 | 7 |
| P2 | 3 |
| P3 | 1 |
| **Total** | **15** |
