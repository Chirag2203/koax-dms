# SPEC-SHOOTS-002 — Security + DPDP review

**Reviewer:** security-reviewer
**Date:** 2026-05-08
**Spec under review:** `specs/modules/shoots/02-shoots-ai-consistency.md` (status: draft, v2.0)
**Lens:** DPDP Act 2023 §6/§11, RBAC correctness, AI-vendor data flow, audit trail completeness, cross-process integrity.

---

## Concerns

### 1. [P0] Manual LP-redaction rasterisation is not specified to be destructive of source pixels
**Spec cite:** §9 `LpRedactionDialog` ("SVG-rectangle canvas overlay → rasterise to processedUrl"); SC-3; L_AI-5.

**Finding:** The spec says the dialog draws a rectangle and "rasterises to processedUrl", but does NOT lock that (a) the resulting `processedUrl` is a single FLATTENED raster with the redacted region pixels permanently destroyed (not a layered SVG/PNG where the rectangle could be removed), and (b) the original `rawUrl` is NOT exposed via any selector that can reach the customer-web surface. Without an explicit lock, an implementer using `canvas.toDataURL` on a layered DOM could ship something where the original plate pixels are recoverable — defeating L_AI-5 entirely.

**Recommendation:** Mint a new locked decision **L_AI-12 — Redaction is destructive single-layer raster**:
- The redaction operation MUST produce a single flattened raster (`image/jpeg` or `image/png` without layers/alpha for the redacted region) where the pixels under the redaction rectangle are unrecoverable.
- The customer-web selector and the storefront gallery MUST read `processedUrl` ONLY when `lpRedacted === true` for kinds in `EXTERIOR_LP_REQUIRED_KINDS`. Selector MUST NOT expose `rawUrl` for those kinds.
- Add an AC and a unit test that asserts the rasterised output for an exterior asset has no recoverable plate pixels (compare-region pixel-hash test against the original).

### 2. [P0] `rawUrl` leakage via the SoT selector is not guarded
**Spec cite:** §8.1 SoT registry row "rawUrl vs processedUrl per asset" → "none external". L_AI-9 selector contract.

**Finding:** §8.1 says `rawUrl` has "no external readers", but the spec never enforces this. `selectStorefrontGalleryForVin` is documented to return `{url, sortOrder, kind, alt}` — implementers may pick `processedUrl ?? rawUrl` "for convenience" (matching the v2.0 deprecated `assetUrls` getter semantics in L_AI-1!). For an exterior asset that was approved via `forceApproveOverride` (where `lpRedacted=false` and `processedUrl` may also be null/manual-only=rawUrl), the selector would silently emit the unredacted `rawUrl` to the public storefront.

**Recommendation:** Lock in §9 / AC and as part of L_AI-12:
- The customer-web selector MUST NEVER fall back to `rawUrl` for kinds in `EXTERIOR_LP_REQUIRED_KINDS`. If `processedUrl` is null for such an asset, the selector treats the asset as not-publishable and excludes it from `gallery[]` regardless of `approved` status.
- For force-approved-without-redaction assets (R12+ override path): selector MUST exclude them from customer-web gallery — force-approval allows internal staff visibility/listing-eligibility but DOES NOT bypass DPDP for public exposure. (See concern #5.)
- Add SC: "Force-approved unredacted exterior asset → customer-web VDP excludes asset; staff inventory tab shows it with persistent 'unredacted — internal only' badge."

### 3. [P1] Force-override does not produce a permanent badge or surface; only a one-shot event
**Spec cite:** L_AI-5; L_AI-7; SC-6; §14 (`audit:force_approved_lp_unredacted`).

**Finding:** SC-6 emits an audit event but the spec does not require the override state to be a queryable, persistent attribute on `ShootAsset`. After SC-6, `approved=true` and there is no field distinguishing "approved cleanly" from "approved via override". A subsequent reviewer or DPO has to scan the event log to find override assets — not greppable, easy to lose.

**Recommendation:** Add fields to `ShootAssetSchema`:
```
forceApprovedWithoutRedaction: boolean (default false)
forceApprovalReason: string | null
forceApprovedBy: string | null
forceApprovedAt: string | null
```
Render a permanent red/amber badge on the asset card whenever `forceApprovedWithoutRedaction === true` (both staff surfaces). Update AC-5 to assert these fields are set. Update concern #2's selector exclusion to read this flag rather than `lpRedacted`.

### 4. [P1] R12+ vs R03 ranking inconsistency in L_AI-7 / L_AI-8 / §12
**Spec cite:** L_AI-7 ("R12+ for force-override"); L_AI-8 ("R03/R12+/R19/R24: Full read; force-override available for R12+"); §12 RBAC matrix row `forceApproveOverride` shows `✗` for the R09 column but no R03 column at all.

**Finding:** The §12 RBAC matrix omits R03 entirely. Reader cannot tell whether R03 (Sales Manager) gets force-override or only standard approve. The body of L_AI-8 implies R03 has only "full read + standard approve" — consistent with the W3 refund-tier precedent — but the matrix doesn't show it.

**Recommendation:** Resolve in spec by:
- Adding an R03 column to §12 matrix.
- Setting R03 row: `approveAsset=✓`, `unapproveAsset=✓`, `forceApproveOverride=✗`, `setCoverAsset=✓`, `reorderGallery=✓`.
- Add a sentence to L_AI-8: "R03 (Sales Manager) has full read + standard approve; force-override remains R12+ exclusive (matches W3 refund-tier precedent)."

### 5. [P1] Cover-photo gate enforcement not locked
**Spec cite:** L_AI-9 (gallery-status thresholds); Open Q6 ("restrict cover to exterior kinds — confirm").

**Finding:** The spec specifies `setCoverAsset` semantics but does NOT lock that the cover MUST be (a) approved and (b) in `EXTERIOR_LP_REQUIRED_KINDS` AND `lpRedacted=true`. A bug in `setCoverAsset` could pin an unredacted, unapproved, or interior-kind asset as cover, and L_AI-9's "ready" predicate (≥ cover + 4 approved exterior) would still emit "ready" because it counts cover existence, not cover validity.

**Recommendation:** Resolve Open Q6 to "yes — cover restricted to exterior kinds." Add a precondition to `setCoverAsset`:
- `asset.approved === true`
- `asset.kind ∈ EXTERIOR_LP_REQUIRED_KINDS \ {video_walkaround}`
- `asset.lpRedacted === true` (or the new `forceApprovedWithoutRedaction === false` from concern #3)
Add AC and SC: "setCoverAsset rejects unapproved / interior / unredacted asset → store throws; UI hides star CTA via Gate."

### 6. [P1] Spyne.ai data-processor agreement not gated on P2 ship
**Spec cite:** L_AI-4 (P2 deferral); §16 DEF-AI-1; §13 DPDP / compliance; §17 out-of-scope.

**Finding:** P2 will send vehicle photos (containing prior-owner PII per concern #1) to Spyne.ai, an external data processor. §13 covers consent text and approval-gate but is silent on the data-processor agreement (DPA) required under DPDP Act 2023 §8(5) (data fiduciary's obligation to bind data processors by contract). Without this lock, P2 could ship without a DPA in place.

**Recommendation:** Add a new locked decision **L_AI-13 — DPA precondition for P2**:
- DEF-AI-1 (Spyne.ai integration) MUST NOT enter `in-build` until a signed DPA with the AI vendor is on file (referenced by URL/document-id in the L-tag).
- DPA must cover: purpose limitation, data retention (ideally zero-retention on vendor side), sub-processor disclosure, breach notification, and India data-residency (or §17 carve-out justification).
- Add to `§13 DPDP / compliance`.

### 7. [P1] Per-asset audit log of vendor transmission not specified
**Spec cite:** §14 events; `shoot_asset_ai_requested`.

**Finding:** `shoot_asset_ai_requested` payload is `{shootId, assetId, vin, kind, aiVendor, actorId, at}`. This captures the request but not the response (vendor URL accessed, response status, whether vendor stored the asset, vendor-side reference id for later DSAR/erasure). When R23 needs to fulfil a DSAR including "delete from any sub-processor", there is no audit trail to act on.

**Recommendation:** Add events `shoot_asset_ai_response` and `shoot_asset_ai_failed` with payloads including `vendorReferenceId`, `vendorStatusCode`, `responseAt`. Document in §14 that these events feed the future DSAR delete-cascade (DEF-AI-6).

### 8. [P1] Server-route `/api/shoots/ai-process` hardening not specified
**Spec cite:** §3 routes table.

**Finding:** Mirrors the L12 pattern from `SPEC-SERVICE-INTAKE-001` but the spec does not say the route handler MUST: (a) require an authenticated session, (b) verify the actor's role allows `requestAiProcess` (R11), (c) verify the actor's outlet matches the shoot's outlet (city-scoped RLS per CLAUDE.md §8), (d) reject if the asset's `kind` is not in the spec's enum, (e) rate-limit per-actor.

**Recommendation:** Add an explicit AC: "AC-23 — `/api/shoots/ai-process` enforces auth + role-rank ≥R11 + outlet RLS + zod-validated body; reject with 401/403/422 respectively. P1 stub still applies these gates even though it returns the manual-only stub response." Mirror the L12 wording from `SPEC-SERVICE-INTAKE-001`.

### 9. [P2] Production write-conflict resolution undocumented
**Spec cite:** L_AI-3 two-way edit; PLAN §4 risks ref to DEF-AI-7.

**Finding:** Mock-phase is single-threaded (acceptable). For production, the spec doesn't lock the conflict resolution: last-write-wins vs reject-on-version-mismatch vs CRDT-merge for `sortOrder`. Ambiguity in v2.0 is fine, but the spec should commit to a strategy now so DEF-AI-7 doesn't inherit an undefined contract.

**Recommendation:** Add a new locked decision **L_AI-14 — Optimistic concurrency for production writes**: every write to `Shoot.assets[]` carries an `etag` / `version` integer; conflicts return 409; UI re-fetches and prompts the user to retry. Reorder operations are idempotent on the final ordered list (last-write-wins is acceptable specifically for `sortOrder`, with a debounce). Pure mock-phase guidance: no version field needed.

### 10. [P2] Cross-process Zustand mock divergence not surfaced to user
**Spec cite:** L_AI-9; §7.2 Seam 51; SC-13–15.

**Finding:** In mock-phase, staff-web and customer-web are separate processes. A cover change on staff-web tab A will not appear on customer-web tab B until tab B reloads. SC-16 asserts cross-aggregate reflection "within the same render tick" — true within a single app, false across apps in mock. The spec doesn't explicitly call this out; demos may mislead a stakeholder into thinking customer-web auto-syncs.

**Recommendation:** Add a paragraph to §18 Migration / rollout: "Mock-phase parity caveat — cross-app state sync requires a manual customer-web reload. Production satisfies same-tick sync because both apps hit the same backend (DEF-AI-7)." Also add a demo-time hint to README of `customer-web/src/components/vdp/vehicle-hero-gallery.tsx`.

### 11. [P2] DSAR / right-to-erasure SLA not captured
**Spec cite:** §13 retention paragraph; DEF-AI-6.

**Finding:** §13 says erasure is deferred to DEF-AI-6 but does not declare an SLA. DPDP draft rules trend toward a 30-day fulfilment SLA. Even though implementation is deferred, the spec must lock the target now so the future surface is built to it.

**Recommendation:** Add to §13: "DSAR fulfilment SLA — 30 calendar days from receipt of verified request, per DPDP Act 2023 §11 read with the DPDP draft rules. Hard-delete (not soft-delete) of the asset's `rawUrl`, `processedUrl`, and `s3Key` blobs is required; the `ShootAsset` record may be retained as a tombstone (`deleted=true`, urls=null) for audit trail integrity." Add ID `DEF-AI-6` priority bump from P4 to P3 if the legal team confirms the rules timeline.

### 12. [P2] Walk-around video LP-redaction is per-frame work but P1 ships only a manual-confirm checkbox
**Spec cite:** L_AI-5 (includes `video_walkaround` in EXTERIOR_LP_REQUIRED_KINDS); Open Q5.

**Finding:** Treating `video_walkaround` as a single asset with a binary `lpRedacted` flag is structurally unsafe — a video has hundreds of frames, any one of which can show the plate. A staff member ticking "I confirm plate is redacted" before P2 auto-blur ships is human-in-the-loop with no verification floor. This is the single highest-risk DPDP path in P1.

**Recommendation:** For P1 specifically, do ONE of:
- (preferred) Hold `video_walkaround` out of P1's storefront-publishable set. The walkaround can be uploaded and approved internally but is excluded from `selectStorefrontGalleryForVin` until P2 lands per-frame auto-blur.
- (acceptable) Require R12+ for any walkaround approval in P1 (treat every walkaround approval as effectively a force-override) AND require a typed reason ("I have personally reviewed every second of the video and no plate is visible").
Resolve Open Q5 explicitly. Add SC + AC.

### 13. [P3] Gallery threshold (≥ cover + 4 exterior) admits low-quality "approved" galleries
**Spec cite:** L_AI-9.

**Finding:** Customer-trust angle (not security). Four redacted-but-uncurated exterior shots could render an unprofessional gallery. Out of security scope; flagging only because it weakens the "production-quality" aspect of L_AI-9.

**Recommendation:** No spec change; track as `DEF-AI-9` for P2/P3 polish: bump `ready` threshold to ≥ cover + 8 (matches the 8-required-exterior set).

### 14. [P3] R09 'cover-set on inventory tab' could expose a still-pending non-approved asset (interaction)
**Spec cite:** SC-9; L_AI-3.

**Finding:** The store should reject `setCoverAsset(assetId)` if the target asset is unapproved (see concern #5). If implementer overlooks this, R09 (without approve rights) could indirectly elevate an unapproved asset to cover via the inventory tab. The Gate hides the CTA but the store contract is the last line of defence.

**Recommendation:** Subsumed under concern #5's preconditions. Add SC: "R09 attempts setCoverAsset on an unapproved asset → store throws AssetApprovalPreconditionError('cover must be approved')." Confirm `<Gate>` only renders the star icon for approved assets.

---

## Blockers

1. **Concern #1 + #2 — destructive raster + selector `rawUrl` non-leakage** must be locked before `approved`. These are the hard DPDP guarantees the redaction story rests on. Mint **L_AI-12** in the spec.
2. **Concern #3 — persistent override flag on the asset.** Without it, force-override is invisible to downstream readers (selector, DPO surface) and the "permanent badge" requirement of the review brief is unmet. Add the four `forceApproved*` fields to `ShootAssetSchema`.
3. **Concern #6 — DPA precondition for P2.** Mint **L_AI-13** so that P2 cannot ship absent a signed DPA with the AI vendor. Without this lock, the spec is signing off on a future DPDP §8(5) violation.
4. **Concern #12 — walk-around video in P1.** Either remove from storefront-publishable set OR escalate to R12+ with a typed reason. Current P1 path (manual checkbox) is not DPDP-defensible.

---

## Open questions

1. **Cover validity preconditions** (concern #5) — the integrator should resolve Open Q6 (interior cover allowed?) before approval. Recommendation: NO interior cover; cover MUST be exterior + approved + redacted.
2. **DSAR SLA value** (concern #11) — confirm 30-day target with legal counsel; some draft rule iterations propose tighter timelines for sensitive PII.
3. **R03 RBAC row** (concern #4) — confirm R03 is "standard approve, no force-override" and add the matrix column.
4. **Production conflict-resolution strategy** (concern #9) — ETag-based optimistic locking vs CRDT-style sortOrder merge. Recommendation: ETag for content fields, last-write-wins for `sortOrder` only.
5. **Vendor-response audit fields** (concern #7) — confirm Spyne.ai exposes a `vendorReferenceId` we can persist; if not, we need an internal id we can later use to issue a vendor-side DSAR.
6. **Walk-around P1 disposition** (concern #12) — final integrator call on the two options.

---

## Signoff

signed-off: with-concerns
acknowledged-by-integrator: yes

**Integrator (2026-05-08):** all 4 blockers resolved (B1 → minted L_AI-12 redaction non-destructiveness contract; B2 → tightened `selectStorefrontGalleryForVin` selector in L_AI-9 to read `processedUrl` only and exclude `forceApprovedWithoutRedaction === true` assets; B3 → added persistent `forceApprovedWithoutRedaction` + `forceApprovedReason` + `forceApprovedBy` + `forceApprovedAt` fields to `ShootAssetSchema` with permanent red badge; B4 → minted L_AI-13 Spyne.ai DPA precondition for P2). P1 concerns also addressed: R03 column added to §12; cover-photo precondition locked into §6.3; route hardening minted as L_AI-14 + §3 routes table updated; production write-conflict strategy noted in §15 Q7; DSAR 30-day SLA added to §13; walkaround LP-approval escalated to R12+ with typed reason ≥10 chars (folded into L_AI-5). Vendor-response audit fields landed via new `shoot_asset_ai_response` / `shoot_asset_ai_failed` events in §14. Mock-phase parity caveat added to §18 + new §22. Spec status flipped `draft → in-review`. Reviewer re-sign required post-implementation.

The four blockers above (L_AI-12, force-approved flags, L_AI-13, walkaround disposition) MUST be resolved in the spec — either by editing the L-tag table or by adding scoped open questions with integrator acknowledgment — before this spec transitions `in-review → approved`. Concerns #4, #5, #7, #8 should be folded into the spec; #9, #10, #11 may remain as deferred items if explicitly tagged. #13, #14 are advisory.

**Concern count by severity:** P0 = 2, P1 = 6, P2 = 4, P3 = 2 (total 14).
