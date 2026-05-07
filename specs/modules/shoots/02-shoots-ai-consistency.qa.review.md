# SPEC-SHOOTS-002 — QA Review

**Reviewer:** qa-planner
**Date:** 2026-05-08
**Spec version reviewed:** 2.0 (draft)
**Source files verified:** `packages/types/src/domain/shoot.ts` (v1 only — v2 not yet built), `apps/staff-web/src/lib/shoots/shoots-store.ts` (v1 only), `apps/customer-web/src/components/vdp/vehicle-hero-gallery.tsx` (reads `vehicle.images` directly — migration target confirmed)

---

## Concerns

**1. [P1] SC-5/SC-6 combinatorial gap — no scenario for R11 force-override attempt (must be rejected)**
§10 SC-5 covers R11 + exterior + unredacted → error. SC-6 covers R12+ force-override → success. Missing: SC-X "R11 invokes `forceApproveOverride` → `AssetApprovalPreconditionError('rank < R12')` thrown." The RBAC table §12 shows R11 cannot `forceApproveOverride`, but this negative path has no scenario and no AC. Without it, a coder may inadvertently allow R11 to call the override. Recommendation: add SC-23 (R11 forceApproveOverride → rejected) and AC-23 mapping to it in §11 and §20.

**2. [P1] Missing scenario: approving a `failed` aiStatus asset**
§6.3 approval guard lists `aiStatus === 'failed' → throw AssetApprovalPreconditionError`. SC-4 only covers `processed` (succeeded/manual-only) → approved. No scenario exercises the `failed` path. This is a DPDP-adjacent risk: a failed-AI asset with no processedUrl might have an unredacted raw image visible to R11 if this guard is bypassed. Recommendation: add SC-24 "R11 attempts to approve an asset with `aiStatus='failed'` → `AssetApprovalPreconditionError('ai failed')`, asset stays raw."

**3. [P1] SC-11/SC-12 LISTED guard — missing: all-required-kinds present but one exterior kind unredacted (not approved)**
SC-11 covers all 11 required kinds approved → success. SC-12 covers missing slots → `ShootSlotIncompleteError`. Missing: vehicle has assets for all 11 required kinds but one exterior asset has `lpRedacted=false` so it cannot be approved → the guard should still fail with `ShootSlotIncompleteError` because that kind lacks an *approved* asset. The spec does not distinguish "slot has an asset" from "slot has an *approved* asset." §5 data model + L_AI-6 say "every REQUIRED kind has at least one `approved` asset" — this is correct, but no scenario explicitly tests the "uploaded-but-not-approved" case. Recommendation: add SC-25 "all 11 required kinds have assets but one has `approved=false` → guard fails; `missingKinds` enumerates the unapproved kind."

**4. [P1] SC-16 cross-aggregate drift — mechanism underspecified**
§8.3 states T11 "drives a scenario across stores: edit → assert reflected within the same render tick." But the spec does not state HOW the test achieves cross-process synchrony between staff-web and customer-web. The customer-web VDP is a separate process with a `per-process customer-shoots-store` (L_AI-9). A single-render-tick assertion across two separate process stores is not possible without test scaffolding. The spec should state: "T11 simulates the customer-web store in-process by importing `customer-shoots-store` directly, bypassing the MSW boundary, and asserting selector output after the same store mutation." Without this, the implementer may write a vacuous test. Reference: SPEC-SERVICE-INTAKE-001 §8 pattern. Recommendation: add a §8.4 sub-section specifying the test scaffolding approach (in-process import, not cross-HTTP).

**5. [P1] SC-22 round-trip not fully specified — deprecated getter on migrated shoot**
§10 SC-22 says: migrated shoot has `assets: []` and `assetUrls` getter returns `[]`. But the original v1 fixture had `assetUrls: ['u1','u2']` with real mock URLs. After migration the getter returns `[]` (because `assets` is empty), which silently loses the v1 URL list. This is the intended behavior per L_AI-1, but the scenario's "Then" clause does not assert what happens to the v1 `assetUrls` array on the raw fixture — it is simply dropped. The spec should confirm this is intentional (not a data-loss bug) and AC-14 should explicitly state "v1 `assetUrls` array is NOT migrated into `assets[]`; it is intentionally discarded." Also: the deprecated getter should be tested with an asset that HAS entries (a v2 asset with `processedUrl` populated) to prove the getter formula `processedUrl ?? rawUrl` works — SC-22 only tests the empty-migration path. Recommendation: expand SC-22 to include a non-empty asset sub-case and amend AC-14 with explicit intent about v1 URL discard.

**6. [P1] Test plan §19.2 — SC-13/SC-14/SC-15 assigned to `shoots-flow.test.ts` (staff-web) but scenarios are customer-web VDP behaviors**
SC-13, SC-14, SC-15 describe customer-web VDP rendering based on `selectStorefrontGalleryForVin` output. The test plan places these in `apps/staff-web/src/tests/shoots-flow.test.ts`. This violates the cross-process boundary: `vehicle-hero-gallery.tsx` lives in customer-web; the selector behavior should also be tested there. Per CLAUDE.md §10 #9, integration tests for a module live in `apps/<app>/src/tests/`. Customer-web currently has 120 passing tests. These three scenarios (and AC-9, AC-10) need corresponding tests in `apps/customer-web/src/tests/shoots-gallery.test.ts`. The staff-web test can cover the *selector logic* in isolation; the customer-web test covers the *component rendering*. The traceability matrix §20 should show both files for SC-13–15. Recommendation: add `apps/customer-web/src/tests/shoots-gallery.test.ts` to §19.2 and §20 for SC-13/SC-14/SC-15; note the cross-process limitation explicitly.

**7. [P1] §19.1 quality gates — `error-boundaries` gate missing**
CLAUDE.md §17.0 mandates `error-boundaries.test.ts` (6 checks, including every shell module having `error.tsx`). AC-20 tracks this, but it is not enumerated in §19.1 quality gates alongside the other named gates (ui-canon-drift, locale-completeness, etc.). Recommendation: add `error-boundaries` to §19.1 quality gates: "error-boundaries — `pnpm -F staff-web exec vitest run src/tests/error-boundaries.test.ts` green; `app/(shell)/shoots/error.tsx` still present (no regression)."

**8. [P2] SC-19 requestReshoot idempotency — single-open-shoot invariant not tested**
§15 open question 4 says "idempotency: only one open shoot per VIN." L_AI-3 says "two-way edit; same store actions." But SC-19 tests only the happy-path creation. No scenario covers calling `requestReshoot` twice without completing the first reshoot — does the store reject or return the existing pending reshoot? SPEC-SHOOTS-001 L6 establishes the one-active-shoot-per-VIN invariant. Recommendation: add SC-26 "R09 calls `requestReshoot` when an open pending reshoot already exists → returns existing pending shoot (idempotent, per L6 pattern)."

**9. [P2] Storybook enumeration absent — §23 referenced in plan but not in spec**
PLAN §1 and CLAUDE.md §10 #8 require Storybook stories for every component. The plan (§3 T05–T07) implies stories for `ShootDetailView`, `ShootAssetCard`, `LpRedactionDialog`. The spec has no §23 Storybook section. Without it, the coder has no authoritative list of required stories and the code-reviewer cannot enforce coverage. Recommendation: add a §23 Storybook section enumerating required stories: `ShootDetailView` (all-slots-empty, partial-slots, all-approved), `ShootAssetCard` (raw/processing/processed/approved states × exterior/interior kinds), `LpRedactionDialog` (open, redacted, error).

**10. [P2] SC-20 LISTED grandfather — re-listed post-v2 path not explicitly tested**
§18 migration section correctly states the new guard applies only to LISTED transitions emitted after v2 ships. SC-20 tests the static "already-LISTED" case. Missing: vehicle was LISTED under v1, then UNLISTED (for a price correction), then RE-LISTED after v2 deploys — must satisfy v2 guard. The spec says "only applies to LISTED transitions emitted after v2 ships" which covers this case in principle, but there is no scenario that exercises the UNLISTED→RE-LISTED post-v2 path. Recommendation: add SC-27 to verify the re-listing path triggers the v2 guard.

**11. [P2] §14 events — `actorRole` field absent from all payloads**
CLAUDE.md §17 production-grade checklist (lessons-learned from intake) requires `actorRole` in audit event payloads for downstream debugging and DSAR attribution. All 9 events in §14 carry `actorId` but not `actorRole`. This is especially important for `audit:force_approved_lp_unredacted` which is a DPDP audit trail event. Recommendation: add `actorRole: string` to all event payloads in §14, and update AC-21 to assert `actorRole` is present and non-PII.

**12. [P2] Stub vocabulary — `requestAiProcess` P1 stub has user-visible notice per DoD but §16 deferred-items entry for DEF-AI-1 lacks a "Coming in v2.1" user notice spec**
AC-3 and SC-2 correctly mandate the toast. However §16 DEF-AI-1 entry says "stub to live" but does not specify how the _UI banner_ (distinct from the per-action toast) documents the deferred status. Per CLAUDE.md §15 stub vocabulary: "Stub — must show user-visible 'coming soon' text." The spec should enumerate whether the v2.1 notice is only a toast (per SC-2) or also a persistent info banner on the AI-process CTA. Recommendation: clarify in §9 UI surfaces table whether a persistent "Coming in v2.1" badge or banner is rendered on the AI-process CTA in addition to the per-action toast.

**13. [P3] SC-17 VIN-correction path — "pointer equality semantics in mock" is under-defined**
SC-17 says "test asserts pointer equality semantics in mock." In Zustand Immer stores, state is always a new reference after mutations; "pointer equality" is not a meaningful assertion for mock-phase tests. The intended assertion is likely "selector returns the updated VIN value after re-render" rather than true reference equality. Recommendation: restate SC-17's Then clause as: "The selector `getShootByVin(newVin)` returns the shoot; `getShootByVin(oldVin)` returns null — confirms FK semantics, not object identity."

**14. [P3] §19.2 — RBAC coverage folded into integration test but no dedicated RBAC test file**
SC-6/SC-7/SC-10 RBAC tests are "folded into integration" (`shoots-flow.test.ts`). Per CLAUDE.md §10 #9, pure-logic/store tests should be co-located in `lib/shoots/__tests__/`. Since RBAC enforcement is store logic (not UI), these belong in `shoots-store.test.ts`, not the integration file. The current mapping in §20 correctly shows `shoots-store.test.ts` for SC-6/SC-7/SC-10 — but §19.2 taxonomy says "RBAC: folded into integration." This is an internal inconsistency. Recommendation: update §19.2 to remove the RBAC row and confirm those cases live in `shoots-store.test.ts` (as §20 already correctly shows).

---

## Blockers

**B1. Customer-web test coverage gap (Concern 6)**
SC-13/SC-14/SC-15 cannot be validly tested in staff-web alone. `vehicle-hero-gallery.tsx` (confirmed reading `vehicle.images` today) must be tested in customer-web after the migration. Without `apps/customer-web/src/tests/shoots-gallery.test.ts`, AC-10 ("no remaining read of `Vehicle.images`") has no runtime verification on the customer-web side. This is a blocker for LISTED-gate testing across surfaces. The spec must be updated to add this file before transitioning to `approved`.

**B2. T11 cross-aggregate test mechanism undefined (Concern 4)**
The test that most directly enforces L_AI-2 (the user-mandated cross-aggregate contract) has no specification of *how* it runs. An implementer will write either (a) a vacuous same-process selector test that does not actually test cross-aggregate drift, or (b) an overly-complex HTTP-round-trip test that won't pass in CI. The spec must define the test approach before coding starts.

---

## Open Questions

1. **Stale processedUrl on re-upload (not in spec)** — If a raw asset is re-uploaded (same slot, same shoot) after AI processing has succeeded and `processedUrl` is set, should `processedUrl` be cleared (reverting to `raw` state) or kept? The spec and L_AI-7 state machine diagram do not show a "raw → raw (re-upload replaces rawUrl)" transition. Is this intentional — re-uploads are not permitted; instead `requestReshoot` is the mechanism? The integrator should lock this decision.

2. **`approved` flag semantics on unapprove + re-approve cycle (not tested)** — SC-4 tests `processed → approved`. No scenario shows `approved → (unapprove) → processed → (re-approve) → approved`. The state machine diagram shows `unapproveAsset` leading back to `processed`, but this is drawn as a separate path not shown in the ASCII diagram. Is the complete round-trip covered by the existing `unapproveAsset` scenario (SC-4 + AC-2)? Needs explicit confirmation from the integrator.

3. **`video_walkaround` in LISTED predicate vs gallery selector** — `video_walkaround` is a REQUIRED kind for the LISTED guard (L_AI-6) but is explicitly excluded from the storefront gallery computed field (§8.1: `a.kind !== 'video_walkaround'`). The `selectStorefrontGalleryForVin` `ready` threshold (≥ cover + 4 exterior approved) does not include the walkaround. Should the VDP gallery surface a separate video player CTA when `video_walkaround` is approved? The spec is silent on this. Flag for the integrator if the VDP video path is deferred.

4. **`actorRole` vs `actorId` in audit events** — If `actorRole` is added per Concern 11, does the event bus schema already support the additional field or does a schema change need registering? The spec says "all events go through the existing event bus; consumers are not part of this spec" — but an additive payload field needs to be confirmed non-breaking.

---

## Signoff

**Verdict:** No sign-off until blockers B1 and B2 are resolved. Concerns 1–5 are P1 and must be addressed before `approved` transition. Concerns 6–14 should be resolved before `in-build`.

```
signed-off: no
acknowledged-by-integrator: yes
```

**Integrator (2026-05-08):** both blockers resolved (B1 → added `apps/customer-web/src/tests/shoots-gallery.test.ts` to §19.2 + §20 traceability for SC-13/14/15/AC-10; B2 → cross-aggregate test mechanism specified in §19.2 — mounts staff-web shoot detail surface, calls `useShootsStore.getState().setCoverAsset`, asserts customer-web `selectStorefrontGalleryForVin(vin).coverUrl` reflects within same render tick via shared MSW handler mirroring stores; cross-process limitation documented at top of test file). P1 concerns folded in: SC-23 (R11 forceApproveOverride rejected), SC-24 (failed-AI approval rejected), SC-25 (LISTED guard with unredacted exterior), SC-26 (UNLISTED → RE-LISTED post-v2 must satisfy v2 guard). `actorRole` added to every event payload in §14 + AC-32. AC-14 amended to explicitly state v1 `assetUrls` discard. SC-22 expanded with non-empty deprecated-getter equivalence sub-case. `error-boundaries` gate added to §19.1. §23 Storybook section enumerates required stories. Spec status flipped `draft → in-review`. ACs expanded 22 → 32. Reviewer re-sign required post-implementation.

**Concern count by severity:**
- P0: 0
- P1: 5 (Concerns 1–5)
- P2: 6 (Concerns 6–11)
- P3: 3 (Concerns 12–14)
- Blockers: 2 (B1, B2)
- Open questions: 4
