# SPEC-SERVICE-INTAKE-001 — QA review

**Reviewer:** qa-planner
**Date:** 2026-05-07

---

## Concerns

**1. [P1] SC-8 mixes two independent observable outcomes into one scenario — untestable as written (§10, SC-8)**
SC-8 asserts both that R09 sees a disabled CTA with a banner AND that R19 sees "Confirm anyway" in the same scenario. A single test cannot validly assert both; they require different actor contexts. Split into SC-8a (R09 blocked) and SC-8b (R19 override with reason). AC-8 and the traceability matrix row must be updated to track both sub-scenarios. As written, a test implementation will either duplicate the scenario or leave one branch untested.

**2. [P1] Missing scenario: illegal state transition (DRAFT → SHEET_UPLOADED bypass) (§6, §10)**
The state machine forbids DRAFT → SHEET_UPLOADED directly (must pass through CUSTOMER_SIGNED), but no scenario or test covers this guard. Add SC-15: "Given intake in DRAFT, when `attachSignedSheet` is called without a prior `captureCustomerSignature`, then the action rejects with an error and state remains DRAFT." Without this, the guard in the store action has no test oracle and is an invisible regression surface.

**3. [P1] Missing scenario: signature canvas cleared before save (§10, §9 UI surfaces)**
The spec lists `signature-pad.tsx` as a component but has no scenario for the "clear then save" case, which is a real walk-around failure mode. Add SC-16: "Given the customer has drawn on the signature pad and then clicks 'Clear', when they attempt to confirm the signature, then the action is blocked and `customerSignatureDataUrl` remains unset." This is both falsifiable and maps to a common UX regression in canvas components.

**4. [P1] Photo upload > 1 MB rejection not a scenario — SC-2 only soft-mentions it (§10, SC-2, L5)**
SC-2 references "(Cap: 1 MB / photo per L5 risk; soft-fail with toast if exceeded)" parenthetically, but there is no dedicated scenario for the rejection path. This is a falsifiable edge case that needs: Given an intake in DRAFT, when R09 attempts to add a photo whose base64 exceeds 1 MB, then the upload is rejected client-side, a toast renders "Photo exceeds 1 MB limit — please retake", and the slot remains unfilled. Without this as a first-class scenario, AC-2 has no test coverage for the failure branch.

**5. [P1] `intake_amended` payload omits actor role — insufficient for audit debugging (§14)**
The `intake_amended` event carries `actorEmployeeId` but not `actorRole`. Downstream analytics and security monitoring need to distinguish whether an amendment was done by R03 (outlet manager) or R19 (GM) without a secondary lookup. Per CLAUDE §17 observability, payloads should be sufficient for standalone debugging. Recommendation: add `actorRole: string` to the `intake_amended` payload (not PII). Same gap applies to `intake_recorded` — `actorEmployeeId` is present but `actorRole` is absent.

**6. [P1] §19 does not specify the cross-aggregate drift test methodology — SC-11 binding is vague (§19, §20, AC-11)**
`cross-aggregate-consistency.test.ts` is listed in the test plan and traceability matrix, but §19 does not state HOW it enforces consistency — snapshot comparison, schema-level invariant, selector-call interception, or fixture mutation. The description "hand-corrupted fixture" in SC-11 implies a fixture mutation approach, but the test file spec should explicitly state: (a) the fixture mutation strategy, (b) that the test asserts the store's selector returns the VIN from `vehicles-store`, not a stale copy on the intake record. Without this, two different implementers would write incompatible tests that both claim to cover AC-11.

**7. [P1] §19 test plan missing RBAC test for SC-8b (R19 override) and SC-14 (cross-outlet R09) in `intake-rbac.test.ts` (§19, §20)**
The traceability matrix lists SC-14 → `intake-rbac.test.ts`, but the test plan description for `intake-rbac.test.ts` does not explicitly call out "SC-14 cross-outlet 403 for route handler" or "SC-8 R19 override CTA presence" in the "Covers" column. The "Covers" column in §19 should enumerate SC numbers covered by each file, not just high-level prose, so a coder can mechanically derive what to write. Recommendation: add SC-6, SC-8b, SC-10, SC-12, SC-14 to the explicit SC list in the `intake-rbac.test.ts` row.

**8. [P1] Quality gates not enumerated in the spec — no typecheck, lint, i18n-existence, or ui-canon-drift gate mention (§19, CLAUDE §10 #11–#13a)**
CLAUDE.md §10 #11 mandates typecheck clean; §10 #12/#13 mandate no `text-[NNpx]`/`rounded-lg` with drift-test enforcement; §10 #13a mandates the `serviceIntake` key exists in both `en-IN.json` and `hi-IN.json`. None of these gates are enumerated in §19 or §20. A spec that is silent on quality gates creates ambiguity at the code-reviewer phase. Add a "Quality gates" subsection to §19 that explicitly lists: (a) `pnpm -F staff-web typecheck` exits 0, (b) `ui-canon-drift.test.ts` passes with no new files added to baseline, (c) `serviceIntake` key present at top level in both locale files, (d) lint exits 0.

**9. [P2] §13.1 consent text does not specify its i18n key location (§13, CLAUDE §10 #13a)**
The consent text in §13.1 is given verbatim in English. Per CLAUDE §10 #7 and §10 #13a, it must live under a `serviceIntake` top-level key in `messages/en-IN.json` AND `messages/hi-IN.json`. The spec says nothing about the key path. Recommendation: add a note to §13.1 specifying the key `serviceIntake.consent.text` and confirming the hi-IN key must exist (English fallback acceptable until translator ships, but the key MUST be present — per CLAUDE §10 #13a rule).

**10. [P2] §19 Storybook mandate is incomplete — only prose-referenced in PLAN T14, not enumerated in §19 (§19, CLAUDE §10 #8)**
CLAUDE.md §10 #8 requires a Storybook story for every component. PLAN T14 lists `*.stories.tsx` for "form, summary, damage editor," but §19 does not enumerate the required stories. At minimum, the test plan should list: `IntakeInspectionForm.stories.tsx` (happy path + loading + error states), `IntakeSummaryCard.stories.tsx` (R09 view vs R11 redacted view), `IntakePhotosGrid.stories.tsx` (all 10 slots filled + partial + empty), `DamageCalloutsEditor.stories.tsx` (0 callouts + 3 callouts). Missing a story for the `SignaturePad` component is also a gap — it has meaningful visual states (empty / in-progress / cleared / saved).

**11. [P2] SC-5 PDF marker-content assertion missing from test plan (§10 SC-5, §19)**
SC-5 states the PDF endpoint returns `200 application/pdf`, but neither SC-5 nor §19 specifies that the test should assert the stream contains expected content markers (e.g., outlet GSTIN string, JC number, consent footer text). A route handler test that only checks status code and Content-Type header is not sufficient — it would pass even if `@react-pdf/renderer` rendered an empty document. The `intake-inspection-flow.test.ts` description should specify at least: (a) Content-Type is `application/pdf`, (b) Content-Disposition header present, (c) response body length > 0 (non-empty PDF stream).

**12. [P2] `AMENDED` state is terminal in the diagram but can it re-enter `AMENDED` on subsequent amendments? (§6 state machine)**
The state diagram shows `COMPLETED → AMENDED` but does not show whether `AMENDED → AMENDED` is a legal transition for a second amendment. SC-9 only covers one amendment. If multiple amendments are allowed (the `version` field increments suggest they are), then a missing scenario for the second-amendment cycle leaves an untested and undocumented transition. Recommend adding a note to §6 clarifying that `AMENDED → AMENDED` is a valid re-entry, and adding SC-17 or an extension to SC-9 to cover `AMENDED → AMENDED` with version=3.

**13. [P2] Malformed VIN in vehicles-store at intake creation has no scenario (§10, §8)**
§8.4 states the VIN is `derivedFrom: 'vehicle'` and cannot be edited on the form. But there is no scenario for the failure mode where `selectVehicleByVin(jobCard.vin)` returns `undefined` (e.g., vehicles-store fixture not seeded, or VIN lookup fails). The intake form should handle this gracefully. Without a scenario, the error state of the `IntakeInspectionForm` (per CLAUDE §4 — "every screen must ship with empty/loading/error/success states") has no test oracle.

**14. [P3] AC-15 deferred-CTA toast not independently falsifiable — lacks specific toast text (§11 AC-15, CLAUDE §10 #15)**
AC-15 states "deferred email-customer-copy CTA renders an info-toast 'Coming in v1.1'". This is technically falsifiable, but the toast text "Coming in v1.1" is hardcoded in the AC without an i18n key. Per CLAUDE §12, every user-visible string must go through `next-intl`. Recommendation: specify the i18n key `serviceIntake.emailCopy.deferred` with English value "Customer email copy coming in v1.1" and assert the toast uses that key.

---

## Blockers

1. **SC-8 is not independently testable as written** (maps to Concern 1 above). It conflates two RBAC contexts in one scenario. Must be split before implementation begins — the coder cannot derive two separate test cases from one scenario without guessing intent.

2. **§19 quality gates are absent** (maps to Concern 8 above). CLAUDE.md §10 #11–#13a mandates specific gate checks. A spec without explicit quality gates is missing a required §10 DoD element. The integrator must add a Quality Gates subsection to §19 before the spec can move to `approved`.

3. **Illegal transition guard (DRAFT → SHEET_UPLOADED) has no scenario or AC** (maps to Concern 2 above). This is an untestable state-machine edge. The AMENDED → AMENDED case (Concern 12) is a P2 concern, but DRAFT → SHEET_UPLOADED bypass is a P1 correctness gap.

---

## Open questions

1. **Can `AMENDED` transition back to `AMENDED` on a subsequent R19 amendment?** §6 is silent. If yes, the traceability matrix needs an additional row. If no, the state machine should show `AMENDED` as terminal and the action should reject.

2. **Should the `intake_recorded` event also carry `actorRole`?** The same role-omission issue applies to the creation event. Recommend yes — symmetry with `intake_amended` once that is patched.

3. **What is the exact server-side filtering mechanism for `customerSignatureDataUrl` toward R11?** §12 (SC-12, AC-12) says "server filters by role" but the spec does not specify whether this is done in the Route Handler (PDF path) only, or also in a hypothetical REST GET action, or whether the store serialization itself strips the field when the session role is R11. This needs to be unambiguous before the coder implements it — especially since L2 states all CRUD is in-process via store actions in P1 (no REST GET). If the data lives in the Zustand store in the browser, server-side filtering cannot occur on a store-read; the filtering must happen at hydration time or via a separate server action.

4. **SC-5 references "build-analyzer assertion" for AC-5 — which tool?** The spec says `@react-pdf/renderer` must not appear in client bundle, verified by build analyzer, but does not specify the tool (Next.js bundle analyzer, `@next/bundle-analyzer`, or a custom grep on `.next/static`). Clarify in §19 so the test plan is unambiguous.

---

## Signoff

signed-off: with-concerns
acknowledged-by-integrator: yes

Integrator (2026-05-07): all 3 blockers resolved (B4 SC-8 split into SC-8a/SC-8b + AC-8a/AC-8b + traceability rows; B5 §19.1 Quality gates subsection added enumerating typecheck/drift/i18n/lint/guardrails/bundle; B6 SC-17 illegal DRAFT → SHEET_UPLOADED transition + AC-18 added). P1 concerns also addressed: `actorRole` added to `intake_recorded`/`intake_amended` payloads (#5), cross-aggregate fixture-mutation methodology specified in §19 (#6), explicit SC numbers enumerated per test file (#7). P2 concerns: i18n key path `serviceIntake.consent.text` cited in §13.1 (#9), PDF marker-content assertions added to flow test (#11), AMENDED → AMENDED clarified in §6 (#12).
