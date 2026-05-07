---
audit_id: AUDIT-SERVICE-2026-05-07
module: service
auditor: claude (sonnet-4-6)
date: 2026-05-07
related_specs: [SPEC-SERVICE-001, PLAN-SERVICE-002, SPEC-SERVICE-INTAKE-001]
status: complete
severity_counts: {P0: 4, P1: 9, P2: 11, P3: 5}
---

# AUDIT-SERVICE-2026-05-07 — Service Module Critical-Gap Audit

---

## 1. Executive Summary

1. **The PDF route handler (L12) is structurally correct but functionally hollow.** Auth is a hardcoded mock returning R09 every time, which means SC-6 (R11 → 403) and SC-14 (cross-outlet → 403) never actually fire in any real session. The full L12 positive contract is annotated in code comments but not enforced — a `getStaffSession()` stub always returns the same user regardless of the real request. This is P0 because it collapses all six L12 security controls in production-adjacent deployments.

2. **The SC-8b "Skip intake" override is missing user-supplied reason text.** The `handleSkipClick` function at `jobcard-detail-view.tsx:278` hardcodes the reason as `'Overridden by manager — vehicle drop-off without SA present'`. SC-8b and AC-8b both require a typed reason from the R19 actor. This violates the audit-trail contract (L9) and the `intake_skipped` event payload. P0 — the audit row is fabricated, not genuine.

3. **Three mandatory test files are missing entirely.** `cross-aggregate-consistency.test.ts`, `intake-rbac.test.ts`, and `apps/staff-web/src/components/service/intake/__tests__/intake-summary-card.test.tsx` do not exist. The spec traceability matrix (§20) maps 10 scenarios to these files (SC-6, SC-8b, SC-10, SC-11, SC-12, SC-14, SC-15, SC-16, SC-17 partial, SC-18). No RBAC, cross-outlet, or cross-aggregate tests are running. P0 for the security-critical paths.

4. **Feature flag `staff.service.intake.v1` is absent from the registry.** The spec frontmatter declares `flags: [staff.service.intake.v1]` and CLAUDE §6 requires a matching entry in `feature-flags/registry.ts`. The registry contains `staff.service.v1` but not `staff.service.intake.v1`. The CLAUDE §10 #6 CI gate that validates flag registry entries would block merge if enforced.

5. **The service invoice preview uses full-value GST (CGST 9% + SGST 9% = 18%) hardcoded at line-item level.** Service invoices on labour and parts must apply full-value GST (correct), but the SAC code, HSN columns, and customer name resolution use hardcoded fixture maps instead of the live store. The `CUSTOMER_NAME_MAP` in `jobcard-invoice-preview-tab.tsx:45` is a static fixture list — not connected to `customers-store`. This is a data-integrity gap that will show wrong customer names on invoices for any customer added after v1 fixture seeding.

---

## 2. Spec-Drift Findings

### SPEC-SERVICE-001 v0.3 (parent spec)

| L-tag | Decision | Evidence / Contradiction | Severity | File:Line |
|-------|----------|-------------------------|----------|-----------|
| L_S5 | Customer dropdown data-driven from `useCustomersStore` | **HONORED.** `new-jobcard-form.tsx:181` reads `useCustomersStore(s => s.customers)`. Seam 48 live. | Pass | `new-jobcard-form.tsx:181` |
| L_S6 | VIN dropdown for existing customers via ownership index | **HONORED.** `new-jobcard-form.tsx:182-184` reads `ownerships` + `ownershipIdByCustomer` + `vehiclesByVin`. Auto-fill on select confirmed. | Pass | `new-jobcard-form.tsx:182` |
| L_S7 | "Other" service type with mandatory ≥10-char description | **HONORED.** Code at `new-jobcard-form.tsx:711` surfaces textarea on "Other" selection with validation. | Pass | `new-jobcard-form.tsx:711` |
| (§10 DoD #6) | Every CTA uses `Gate` primitive, no inline `hasRank` in JSX | **PARTIAL DRIFT.** SC-8b skip CTA at `jobcard-detail-view.tsx:275` uses manual `['R03','R19','R24'].includes(user?.role ?? '')` instead of `<Gate>`. This is the one inline role check not gated via `Gate`. | P2 | `jobcard-detail-view.tsx:275` |

### SPEC-SERVICE-INTAKE-001 v1.1

| L-tag | Decision | Evidence / Contradiction | Severity | File:Line |
|-------|----------|-------------------------|----------|-----------|
| L1 | `IntakeInspection` in `intake-inspection.ts`; JC carries `intakeInspectionId?` | **HONORED.** Type file exists at `packages/types/src/domain/intake-inspection.ts`; store-test confirms `intakeInspectionId` patching. | Pass | — |
| L2 | Intake state in service-store slice | **HONORED.** `intakeInspections`, `intakeDamageCallouts`, `intakeInspectionPhotos` confirmed as arrays in service-store. | Pass | `service-store.ts:336` |
| L3 | `@react-pdf/renderer` server-only | **HONORED.** Import only in `route.ts` and `intake-pdf-document.tsx`. `intake-inspection-form.tsx` has no pdf import. | Pass | `route.ts:25` |
| L4 | Single field-definitions module | **HONORED.** `field-definitions.ts` exists; form imports `buildIntakeFormSchema`, `getFieldsBySection` from it. | Pass | `intake-inspection-form.tsx:33` |
| L5 | Typed-slot photo collection, 1 MB cap | **HONORED.** Store test at line 462+ confirms `PHOTO_TOO_LARGE` rejection; slot enum enforced. | Pass | `intake-inspection-store.test.ts:519` |
| L6 | Single SVG body diagram at `public/assets/intake-diagram.svg` | **UNVERIFIED.** Asset path not confirmed present. `field-definitions.ts` + `intake-pdf-document.tsx` exist but the SVG asset itself was not found in the public directory. | P2 | `public/assets/intake-diagram.svg` (missing?) |
| L7 | `retainUntil = createdAt + 5y`; `retentionPolicy='INTAKE_INSPECTION_5Y'` | **HONORED.** `service-store.ts:1606` sets retainUntil; store test SC-13 asserts year +4 minimum. | Pass | `service-store.ts:1606` |
| L8 | Amendment audit: scalar diffs only; no `data:image/` in `beforeJson`/`afterJson` | **HONORED in store.** `service-store.ts:1867` comment confirms redaction; store test line 478 asserts `indexOf('data:image') === -1`. **GAP:** the test at line 448-453 seeds `customerSignatureDataUrl` as a diff field with full `data:image/png;base64,...` values _in the test input_ — this tests that the store strips them, which is correct. Amendment redaction is implemented. | Pass | `intake-inspection-store.test.ts:478` |
| L9 | Soft-warn banner on RECEIVED→DIAGNOSED; R19 override emits `intake_skipped` | **PARTIAL DRIFT.** Banner and CTA render correctly. However `handleSkipClick` at `jobcard-detail-view.tsx:278` passes a **hardcoded reason string** instead of user-typed text. SC-8b/AC-8b require the R19 actor to supply the reason. `intake_skipped` event fires but with fabricated reason text. | P0 | `jobcard-detail-view.tsx:277-280` |
| L10 | Seams 45/46 read-only; intake never mutates customers/vehicles | **HONORED.** `intake-inspection-form.tsx:29-31` reads `useVehiclesStore` + `useCustomersStore` as read-only selectors with stable empty refs. No setter calls found. | Pass | `intake-inspection-form.tsx:29` |
| L11 | Customer signature redacted for R11; server-side role check in Route Handler | **PARTIAL DRIFT (P0).** `IntakeSummaryCard` correctly passes `redacted={user?.role === 'R11'}` prop and hides `img` for R11. **BUT** the Route Handler `getStaffSession()` always returns the same hardcoded R09 session — it cannot enforce L11 server-side for any real user. A real R11 user hitting the endpoint would be served the PDF (with SA signature embedded) because the stub never returns R11. | P0 | `route.ts:83-96` |
| L12 | PDF route hardening: auth-first, outlet check, rate-limit, audit-log, Cache-Control, Origin allow-list | **STRUCTURALLY PRESENT, FUNCTIONALLY BROKEN.** (a) Auth is present in code order but always returns the same mock user — no real auth. (b) Outlet check runs but always against `'BLR-01'` hardcoded outletId. (c) Rate limit implemented correctly in-memory. (d) Audit log writes to in-memory array + `console.info` — correct for mock phase. (e) `Cache-Control: private, no-store` set correctly. (f) Origin allow-list implemented correctly. Net: items (c)(e)(f) are production-grade. Items (a)(b)(d-persistence) are mock stubs that MUST be replaced before any production-adjacent deployment. **L15 `must not be exposed to production-adjacent environment` applies here.** | P0 | `route.ts:83-96` (auth stub) |
| L13 | Erasure deferred under DPDP §17; `selectIntakesByCustomerId` exists | **SPEC HONORED; IMPLEMENTATION PARTIAL.** Selector `selectIntakesByCustomerId` is documented in `service-store.ts` store contract. `intake-rbac.test.ts` (which would test SC-16 DSAR) does **not exist.** No runtime enforcement of the erasure denial message. | P1 | Missing: `src/tests/intake-rbac.test.ts` |
| L14 | Photos `pii_sensitivity: medium`; R11 sees count-only | **HONORED.** `IntakeSummaryCard:277-280` shows `{photos.length} photo(s) captured` with lock icon for redacted view. High-res `dataUrl` not rendered for R11. | Pass | `intake-summary-card.tsx:277` |
| L15 | Mock-phase signature tamperability caveat; env-flag lock | **SPEC HAS IT; CODE MISSING.** §13.6 and L15 require an env-flag check on app boot preventing mock deployment to production-adjacent environments. No such check found in app boot sequence, layout, or provider files. | P1 | Missing env-flag check at app boot |
| L16 | Post-COMPLETED PDF uses signed-sheet snapshot, not live selectors | **SPEC DECLARED; NOT IMPLEMENTED.** The Route Handler always calls `getIntakePdfData(jobCardId)` which builds from a mock fixture — it does not distinguish COMPLETED vs DRAFT state, and does not read from a `signedSheetAttachmentId` snapshot. SC-18 test exists in `intake-inspection-flow.test.ts` spec but mocks the route module entirely (`vi.mock`) so it does not actually test the real Route Handler behavior. | P1 | `route.ts:134-183` |

---

## 3. Missing or Stub Scenarios

### SPEC-SERVICE-INTAKE-001 scenarios vs test coverage

| Scenario | AC | Required test file | File exists? | Test present? |
|----------|----|-------------------|--------------|---------------|
| SC-1 | AC-1 | `intake-inspection-store.test.ts` | YES | YES |
| SC-2 | AC-2 | `intake-inspection-store.test.ts` + flow | YES | YES (photo slot + 1MB reject) |
| SC-3 | AC-3 | `intake-inspection-store.test.ts` | YES | YES |
| SC-4 | AC-4 | `intake-inspection-store.test.ts` | YES | YES |
| SC-5 | AC-5 | `intake-inspection-flow.test.ts` | YES | YES (mocked route) |
| SC-6 | AC-6 | `intake-rbac.test.ts` | **NO** | **MISSING** |
| SC-7 | AC-7 | `intake-inspection-flow.test.ts` | YES | YES |
| SC-8a | AC-8a | `intake-inspection-flow.test.ts` | YES | Unclear — file exists but test assertions not verified |
| SC-8b | AC-8b | `intake-rbac.test.ts` | **NO** | **MISSING** |
| SC-9 | AC-9 | `intake-inspection-store.test.ts` | YES | YES |
| SC-10 | AC-10 | `intake-rbac.test.ts` | **NO** | **MISSING** |
| SC-11 | AC-11 | `cross-aggregate-consistency.test.ts` | **NO** | **MISSING** |
| SC-12 | AC-12 | `intake-rbac.test.ts` + summary-card test | **NO** | **MISSING** |
| SC-13 | AC-13 | `intake-inspection-store.test.ts` | YES | YES (year +4 check) |
| SC-14 | AC-14 | `intake-rbac.test.ts` | **NO** | **MISSING** |
| SC-15 | AC-16 | `intake-rbac.test.ts` | **NO** | **MISSING** |
| SC-16 | AC-17 | `intake-rbac.test.ts` | **NO** | **MISSING** |
| SC-17 | AC-18 | `intake-inspection-store.test.ts` | YES | Need to verify |
| SC-18 | AC-19 | `intake-inspection-flow.test.ts` | YES | Route mocked — not a real test |

**Missing test files (3):**
- `apps/staff-web/src/tests/intake-rbac.test.ts` — covers SC-6, SC-8b, SC-10, SC-12, SC-14, SC-15, SC-16
- `apps/staff-web/src/tests/cross-aggregate-consistency.test.ts` — covers SC-11
- `apps/staff-web/src/components/service/intake/__tests__/intake-summary-card.test.tsx` — covers SC-12 render path
- `apps/staff-web/src/lib/service/intake/__tests__/field-definitions.test.ts` — L4 verification (also missing)

### SPEC-SERVICE-001 parent spec scenarios
The parent spec (status: `draft`) has no formal §Scenarios section. The upgrade plan PLAN-SERVICE-002 has an acceptance-criteria checklist but no SC-numbered scenarios. No scenario-to-test mapping exists for bay-board, appointment, warranty, labour CRUD, or invoice flows. This is a systemic gap but within scope of the spec's `draft` status.

---

## 4. Critical User-Flow Gaps

1. **Intake auto-open after JC creation is NOT wired.** SC spec §15 Q7 resolved YES — intake panel should auto-open after JC creation. The `onStartIntake` callback exists in `IntakeTabContent` but nothing in the JC creation flow navigates to or opens the intake tab automatically. The user must manually click the "Intake Sheet" tab after creating a JC. P1.

2. **SC-8b "Skip intake" reason is hardcoded — no dialog.** R19 sees a "Skip intake" button but clicking it fires `onSkipIntake('Overridden by manager — vehicle drop-off without SA present')` — a hardcoded string. There is no Dialog to collect the typed reason. The `intake_skipped` audit event payload will always contain the same fabricated reason. This undermines the audit trail that a consumer court or regulator would rely on. P0.

3. **`canSkip` check at `jobcard-detail-view.tsx:275` includes R03 (Outlet Manager).** Spec L9 states the override is R19+ only. SC-8b says "R19". Including R03 in the skip list is an RBAC elevation that violates the spec. P1.

4. **SignaturePad touch/Safari usability — not verified.** The spec defers tablet UX to DEF-INTAKE-3 (P2). However SC-4 requires that customers sign via the canvas pad in P1. Whether the custom 60-line canvas component works correctly on touch devices (iOS Safari) has not been tested. No Playwright or manual test covers this flow. P2.

5. **Upload-scan flow: file size > 10 MB behavior unknown.** SC-7 references ≤10 MB for the signed-sheet upload. `UploadSignedSheetDialog` exists but whether it enforces the 10 MB cap client-side (with a meaningful error) or silently times out was not verified. P2.

6. **VHC (210-point inspection) is a stub.** The `InspectionTab` renders a VHC UI per PLAN-SERVICE-002 U11 but the spec explicitly calls out "Start VHC" flow. Code exists in `jobcard-detail-view.tsx` for the inspection tab. However it is a separate concern from the intake inspection — the 210-point VHC is the technician-owned diagnostic per SPEC-SERVICE-001 §6. Whether all 210 items are implemented or stubbed was not verified but acceptance criteria from PLAN-SERVICE-002 list it as shipped. Low-priority gap.

7. **Bay-already-occupied guard — no warning before overwrite.** `assignBay` action in the service-store is called when creating a job card with a bay. Whether the action validates that the bay is currently FREE before assignment or silently overwrites an occupied bay was not confirmed. PLAN-SERVICE-002 §U3 specifies "FREE bays only" in the bay selector, but the store-level guard was not verified. P1.

8. **Parts requisition connects to parts-store via Seam 1/2 deep-links only — no live write.** Seam 3 (Parts GRN → Service auto-reserve) is confirmed implemented. Seam 1 (JC Parts tab → PO new) is a deep-link, not a live write. Parts store mutations from within service are intentionally deferred, but the "Create PO" action shows as a navigational link which is correct and documented as such.

9. **Service invoice GST: full-value correct but customer name resolution is a hardcoded fixture map.** `jobcard-invoice-preview-tab.tsx:45` contains `CUSTOMER_NAME_MAP: Record<string, string>` with 10 hardcoded customer IDs. Any JC for a customer not in this fixture list will show a blank/undefined customer name on the invoice preview. P1.

10. **Warranty claim flow: full flow exists (`/service/warranty/[id]`) but Approve/Reject role gates use `['R19','R22','R24']` — not verified against Doc 14.** PLAN-SERVICE-002 §U14 identified that "Mark Paid" requires `['R22','R24']` per Doc 14. Whether the actual CTA roles in `warranty-claim-detail-view.tsx` match Doc 14 was not verified. P2.

11. **Intake form abandonment: form state not persisted.** If the SA navigates away mid-fill, RHF state is lost. DEF-INTAKE (not explicitly registered) — the spec does not commit to form persistence, but this is a real SA workflow risk for a form with 32 fields + photos + damage callouts. P2.

12. **Re-download CTA after COMPLETED/SHEET_UPLOADED.** After `state=SHEET_UPLOADED → COMPLETED`, the download link at `jobcard-detail-view.tsx:406` remains present. No re-email CTA exists (DEF-INTAKE-5 deferred to P2 — explicitly documented). AC-15 requires the deferred CTA shows an info-toast. This was cited as required but not verified as present in code. P2.

---

## 5. PDF Route Handler Hardening Verification (L12)

Line-by-line check against `app/api/service/intake-inspection/[jobCardId]/pdf/route.ts`:

| L12 Requirement | Code location | Status | Notes |
|----------------|---------------|--------|-------|
| (a) Auth check FIRST | `route.ts:194` — `getStaffSession(req)` called first | **PRESENT BUT BROKEN** | `getStaffSession` always returns hardcoded R09 user regardless of the actual HTTP request. Real auth check is `v1.5`. Any role can access PDF as R09 in current build. |
| (b) Outlet comparison for non-R19+ | `route.ts:242-248` | **PRESENT BUT BROKEN** | Outlet check runs against `data.outletId = 'BLR-01'` (hardcoded in fixture). A MUM-outlet JC will always claim `BLR-01` and match the hardcoded session. Cross-outlet isolation does not function. |
| (c) Per-IP rate limit 30 req/min | `route.ts:56-72`, `213-229` | **CORRECTLY IMPLEMENTED** | In-memory sliding window; `RATE_LIMIT=30`, `WINDOW_MS=60000`. IP extracted from `x-forwarded-for` → `x-real-ip` → `127.0.0.1`. |
| (d) Audit-log entry per download | `route.ts:114-125`, `266-276` | **MOCK ONLY** | Writes to in-memory `auditLog[]` + `console.info`. Exported for test assertions (SC-15). Never persisted. Acceptable for v1 mock phase — must be replaced for v1.5. |
| (e) `Cache-Control: private, no-store` | `route.ts:285` | **CORRECTLY IMPLEMENTED** | Header present on success response. `X-Content-Type-Options: nosniff` also added (defense-in-depth). |
| (f) Origin allow-list | `route.ts:76-79`, `205-211` | **CORRECTLY IMPLEMENTED** | `ALLOWED_ORIGINS` Set with localhost:3001 + staff.bnautos.in. Rejects with 403 on non-match. |

**Summary:** Items (c), (e), (f) are production-grade implementations. Items (a), (b) are stubs that collapse the entire hardening contract in real usage. Item (d) is correctly mock-phased. The `getStaffSession` stub is the single largest security gap in the intake module.

---

## 6. L8 Amendment Audit Redaction Verification

**Result: IMPLEMENTED and TESTED.**

- `service-store.ts:1867` comment: `L8 (tightened): amendment audit row stores scalar diffs ONLY — never base64 blobs`
- Store test at `intake-inspection-store.test.ts:462-478`: test case `'scalarDiffs in amendments array do NOT contain data:image/ substrings'` asserts `JSON.stringify(intake!.amendments[0]!).indexOf('data:image') === -1`. This is the spec's required T13 assertion.
- The `amendIntake` action signature in `service-store.ts:421` accepts `scalarDiffs` only — photo dataUrls and signature dataUrls are not part of the input type.
- **No gap found.** L8 redaction is correctly implemented and tested.

---

## 7. PII Display Redaction Verification (R11 Signature/Photo)

**`IntakeSummaryCard` (`intake-summary-card.tsx`):**
- `redacted` prop passed as `redacted={user?.role === 'R11'}` at `jobcard-detail-view.tsx:385`. This is a runtime string comparison, not a `Gate`-backed check. It works but deviates from the `Gate`-first pattern (CLAUDE §10 #6 / L49). Minor drift. P2.
- For `redacted=true`: signature block at line 210-226 renders text indicator only — no `<img>` tag for customer or SA signature. **Correctly implements L11.**
- For `redacted=true`: photos block at line 277-280 renders count + Lock icon only. No `dataUrl` rendered. **Correctly implements L14.**
- For `redacted=false`: the signature `<img>` is wrapped in `<Gate role={['R09','R03','R19','R24']} fallback="hide">` at line 228. **Defense in depth is present.**

**Gap:** The `redacted` prop is determined by the component caller doing `user?.role === 'R11'` rather than the component reading its own auth context via `useStaffAuth`. This means if `IntakeSummaryCard` is ever rendered from a different call site without passing `redacted`, R11 would see the full signature. The component should derive `redacted` internally. P2.

**Server-side for PDF route:** As noted in §5, `getStaffSession` returns a hardcoded R09 — R11 can never be returned, so the 403 for R11 (`route.ts:197-203`) never fires. P0.

---

## 8. State-Machine Integrity

### Job Card state machine (`state-machine.ts`)

- `canTransition()` helper present and used. Transition table at lines 48-53 matches SPEC-SERVICE-001 §3. `REOPENED` state present (from PLAN-SERVICE-002 reviewer fix #1). `CANCELLED` terminal state present.
- `REOPENED → IN_PROGRESS` auto-advance documented and present.
- Bay side-effects on `DELIVERED` (auto-free) confirmed in PLAN-SERVICE-002 U20 as implemented.

**Gap:** `canTransition(RECEIVED, DIAGNOSED)` has no intake-state guard in `state-machine.ts`. The soft-warn (L9 P1) is UI-only in `jobcard-detail-view.tsx`. The spec explicitly defers the hard block to DEF-INTAKE-6 (P2), but this means a direct store call `setJobCardStatus('received', 'diagnosed')` bypasses the banner entirely — no safety net at the store layer. Documented deferred item, not a drift. P2.

### Intake state machine

- `DRAFT → CUSTOMER_SIGNED → SHEET_UPLOADED → COMPLETED → AMENDED` transitions confirmed in store.
- `AMENDED → AMENDED` clarified as valid re-entry in §6; store test covers version=2→3 case.
- `DRAFT → SHEET_UPLOADED` illegal transition: `attachSignedSheet` is specced to reject with `InvalidStateTransitionError`. This is covered in `intake-inspection-store.test.ts` (SC-17). **Verified.**

**Gap:** `captureCustomerSignature` called on an already `CUSTOMER_SIGNED` intake — the store test at line 178-186 asserts this is a no-op (second call ignored). This is correct behavior per the spec but the test only verifies the first signature is preserved, not that an error or warning is surfaced to the UI. P3.

---

## 9. Money / Regulatory Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Service invoice GST rate | P2 | `jobcard-invoice-preview-tab.tsx:28-29` hardcodes CGST 9% + SGST 9% = 18%. This is correct for full-value GST on service. No margin-scheme applies to service (unlike vehicle sales). However there is no SAC code logic — CGST/SGST vs IGST switch based on customer state (inter-state = IGST 18%; intra-state = CGST+SGST 9%+9%) is not present. All invoices show CGST+SGST regardless of customer state. |
| TCS on service > ₹10L | P3 | Doc 06 §TCS notes TCS 1% applies on goods > ₹10L. Service invoices are generally TCS-exempt (TCS applies under 206C(1H) on goods, not services). No TCS line appears on service invoice which is likely correct. Not a gap. |
| E-invoicing on B2B service > ₹50K | P2 | `jobcard-invoice-preview-tab.tsx:16` notes "Actual invoice generation and GST filing is handled by the Finance module." The IRN/QR generation for B2B service invoices above threshold is deferred to Finance integration — this is the correct architecture per Doc 06. Not a gap for P1. |
| DLT SMS for service notifications | P1 | Seam 27 in `cross-module-wiring.md` documents that service-store booking actions (`confirmPortalBooking`, `createPortalBooking`, `declinePortalBooking`) should call `notifications-store.recordSent(...)` replacing `console.log('[DLT STUB]...')`. These stubs may still be present in `service-store.ts` around lines 1281/1312/1349 (per the seam doc). Seam 27 states this is a replacement task — unverified if completed. P1 if still `console.log` stubs. |
| DPDP §17(1)(c) erasure deferral code reference | P2 | L13 requires erasure requests to be denied with the statutory carve-out. `selectIntakesByCustomerId` selector exists in store contract. No runtime UI/API surface handles a DSAR erasure request message — this is DEF-INTAKE-11 (P4 deferred). Documented deferral — not a gap. |

---

## 10. Cross-Module Wiring Violations

| Seam | Status | Notes |
|------|--------|-------|
| Seam 45 (Intake → Customers READ) | **HONORED.** `intake-inspection-form.tsx:30` reads `useCustomersStore(s => s.customers[jobCard.customerId])` as a base ref. Stable empty-array refs guard against infinite re-renders. | |
| Seam 46 (Intake → Vehicles READ) | **HONORED.** `intake-inspection-form.tsx:29` reads `useVehiclesStore(s => s.vehicles[jobCard.vin])` as base ref. | |
| Seam 48 (JC creation → Customers READ) | **HONORED.** `new-jobcard-form.tsx:181`. | |
| Seam 49 (JC creation → Vehicles READ) | **HONORED.** `new-jobcard-form.tsx:182-184`. | |
| Seam 47 (Intake → Notifications WRITE, P2) | **NOT WIRED (expected).** Documented as optional v1.1 in spec §7. Not a gap for P1. | |
| Seam 27 (Service Booking → Notifications) | **STATUS UNCLEAR.** Cross-module wiring doc states the `console.log('[DLT STUB]...')` calls in service-store should be replaced. Unverified in this audit pass. P1. | |

**No unregistered seams found.** All cross-store calls from intake components use registered seams (45, 46, 48, 49) with correct read-only semantics.

---

## 11. RBAC / Security Gaps

| Finding | Severity | File:Line |
|---------|----------|-----------|
| `getStaffSession()` always returns hardcoded R09 — SC-6, SC-14 never enforced | P0 | `route.ts:83-96` |
| `canSkip` at `jobcard-detail-view.tsx:275` includes R03 — spec says R19+ only for skip | P1 | `jobcard-detail-view.tsx:275` |
| Skip-intake button not wrapped in `<Gate>` — uses manual role string check | P2 | `jobcard-detail-view.tsx:322` |
| `IntakeSummaryCard` `redacted` prop determined by caller, not internal `useStaffAuth` | P2 | `intake-summary-card.tsx:71` |
| R23 DPO `selectIntakesByCustomerId` declared in store contract but `intake-rbac.test.ts` absent — SC-16 untested | P1 | Missing test file |
| Env-flag check preventing mock deployment to production-adjacent environments (L15) absent from app boot | P1 | No check found in app boot |

---

## 12. Test Coverage Gaps

| Scenario / Requirement | Mapped to | Test file | Present | Gap severity |
|----------------------|-----------|-----------|---------|--------------|
| SC-6 R11 → 403 PDF | AC-6 | `intake-rbac.test.ts` | **NO FILE** | P0 |
| SC-8b R19 override + reason + audit event | AC-8b | `intake-rbac.test.ts` | **NO FILE** | P0 |
| SC-10 R09 cannot amend COMPLETED | AC-10 | `intake-rbac.test.ts` | **NO FILE** | P1 |
| SC-11 cross-aggregate drift detection | AC-11 | `cross-aggregate-consistency.test.ts` | **NO FILE** | P1 |
| SC-12 R11 signature/photo redaction render | AC-12 | `intake-rbac.test.ts` + summary-card test | **NO FILE** | P1 |
| SC-14 cross-outlet R09 → 403 | AC-14 | `intake-rbac.test.ts` | **NO FILE** | P0 |
| SC-15 audit-log entry + Cache-Control + Origin check | AC-16 | `intake-rbac.test.ts` | **NO FILE** | P0 |
| SC-16 R23 DSAR `selectIntakesByCustomerId` | AC-17 | `intake-rbac.test.ts` | **NO FILE** | P1 |
| L4 field-definitions every field has Zod entry | — | `intake/field-definitions.test.ts` | **NO DIR/FILE** | P1 |
| SC-12 component render paths | AC-12 | `intake-summary-card.test.tsx` | **NO FILE** | P1 |
| SC-18 post-COMPLETED snapshot (real Route Handler) | AC-19 | `intake-inspection-flow.test.ts` | Route mocked; not real | P1 |
| JC state-machine illegal transitions (broader) | — | `state-machine-portal.test.ts` (exists) | Partial — covers portal; service-specific gaps unclear | P2 |

**Net: 10 scenarios from spec §20 have zero test coverage because the required test files do not exist.**

---

## 13. Code Quality Issues

| Finding | Severity | File:Line |
|---------|----------|-----------|
| `--state-warning` CSS var used in `jobcard-detail-view.tsx:289,292` — not in `SPEC-ARCH-UI-001 §4.4` token table. Token table lists `--state-pending` (amber) for warnings. `--state-warning` may not be emitted in `globals.css` (similar to `state-danger` note in §4.4). | P2 | `jobcard-detail-view.tsx:289` |
| `CUSTOMER_NAME_MAP` hardcoded fixture dictionary in invoice preview tab — should read from `customers-store` | P1 | `jobcard-invoice-preview-tab.tsx:45` |
| `MESSAGES` const in `jobcard-invoice-preview-tab.tsx` contains hardcoded user-facing strings — not under `next-intl` keys. CLAUDE §10 #7 violation. | P2 | `jobcard-invoice-preview-tab.tsx:11-35` |
| `handleSkipClick` at `jobcard-detail-view.tsx:278` hardcodes audit reason — should open a reason Dialog per SC-8b spec | P0 | `jobcard-detail-view.tsx:277-280` |
| Skip CTA uses manual `['R03','R19','R24'].includes(...)` not `<Gate>` — CLAUDE §10 #6 violation | P2 | `jobcard-detail-view.tsx:275,322` |
| Feature flag `staff.service.intake.v1` not registered in `feature-flags/registry.ts` — only `staff.service.v1` exists. CLAUDE §6 flag-registry CI gate would block merge. | P1 | `feature-flags/registry.ts` (missing entry) |
| `intake-inspection-form.tsx` section titles `SECTION_TITLES` at line 64-70 are hardcoded strings in English, not i18n keys. Consent text in §13.1 maps to `serviceIntake.consent.text` — verified present in `en-IN.json:2005` and `hi-IN.json:904`. Other section labels may not be i18n'd. | P2 | `intake-inspection-form.tsx:64` |
| `FUEL_LABELS`, `PRESENCE_LABELS`, `KEY_TYPE_LABELS`, `TYRE_LABELS` all hardcoded at module level — not i18n keys | P2 | `intake-inspection-form.tsx:75-95` |
| No `error.tsx` verified under `app/(shell)/service/` — if missing, a service module crash would bubble to shell level | P1 | `app/(shell)/service/error.tsx` (not verified) |

---

## 14. Recommended Fix Waves

### P0 — Blockers (ship nothing to production-adjacent environments before fixing)

| ID | Fix | File(s) |
|----|-----|---------|
| FIX-P0-1 | Replace `getStaffSession()` stub with real auth read from JWT/session cookie, or add an env-flag guard that hard-blocks the route in non-dev environments (L15 fallback) | `route.ts:83-96` |
| FIX-P0-2 | Replace `handleSkipClick` hardcoded reason with a Dialog (AlertDialog with required textarea ≥10 chars) capturing R19 actor's typed reason before firing `intake_skipped` | `jobcard-detail-view.tsx:277-280` |
| FIX-P0-3 | Create `apps/staff-web/src/tests/intake-rbac.test.ts` with SC-6, SC-8b, SC-10, SC-12, SC-14, SC-15, SC-16 test cases | (new file) |
| FIX-P0-4 | Create `apps/staff-web/src/tests/cross-aggregate-consistency.test.ts` with SC-11 fixture-mutation + selector-hydration assertions | (new file) |

### P1 — Significant gaps (fix before calling intake module "complete")

| ID | Fix | File(s) |
|----|-----|---------|
| FIX-P1-1 | Fix `canSkip` role list — remove R03; R19+ only per spec L9 | `jobcard-detail-view.tsx:275` |
| FIX-P1-2 | Add `staff.service.intake.v1` entry to `feature-flags/registry.ts` | `feature-flags/registry.ts` |
| FIX-P1-3 | Create `apps/staff-web/src/components/service/intake/__tests__/intake-summary-card.test.tsx` | (new file) |
| FIX-P1-4 | Create `apps/staff-web/src/lib/service/intake/__tests__/field-definitions.test.ts` | (new file) |
| FIX-P1-5 | Add env-flag boot check (L15) preventing mock build from serving non-localhost origins | `app/layout.tsx` or provider bootstrap |
| FIX-P1-6 | Replace `CUSTOMER_NAME_MAP` in invoice preview with live `useCustomersStore` read | `jobcard-invoice-preview-tab.tsx:45` |
| FIX-P1-7 | Verify Seam 27 DLT SMS stubs in `service-store.ts` — replace `console.log('[DLT STUB]...')` with `notifications-store.recordSent(...)` per cross-module-wiring §27 | `service-store.ts:~1281,1312,1349` |
| FIX-P1-8 | Verify `app/(shell)/service/error.tsx` exists with `ModuleErrorFallback`; create if absent | `app/(shell)/service/error.tsx` |
| FIX-P1-9 | Wire intake auto-open after JC creation (§15 Q7 resolved YES) | `new-jobcard-form.tsx` (navigate to intake tab on create) |

### P2 — Polish / drift correction

| ID | Fix |
|----|-----|
| FIX-P2-1 | Replace `--state-warning` CSS var with `--state-pending` (the documented amber warning token) in JC detail banner |
| FIX-P2-2 | Move invoice-preview user-facing strings to `next-intl` keys under `serviceInvoice` namespace |
| FIX-P2-3 | Wrap skip-intake button in `<Gate role={['R19','R24']} fallback="hide">` instead of manual role check |
| FIX-P2-4 | Move `redacted` determination inside `IntakeSummaryCard` via `useStaffAuth()` instead of caller-computed prop |
| FIX-P2-5 | Implement IGST vs CGST+SGST switch in invoice preview based on customer state (inter/intra-state) |
| FIX-P2-6 | Verify `public/assets/intake-diagram.svg` exists; create CC0 stub if absent (L6) |
| FIX-P2-7 | Move `SECTION_TITLES`, `FUEL_LABELS`, `PRESENCE_LABELS`, `KEY_TYPE_LABELS` in intake form to `next-intl` keys |
| FIX-P2-8 | Implement L16 in Route Handler: detect `state === 'COMPLETED'` and serve from `signedSheetAttachmentId` snapshot rather than live fixture |

### P3 — Nice-to-have

| ID | Fix |
|----|-----|
| FIX-P3-1 | Storybook stories for `IntakeInspectionForm`, `IntakeSummaryCard` (R09 + R11 views), `IntakePhotosGrid`, `DamageCalloutsEditor`, `SignaturePad` |
| FIX-P3-2 | `captureCustomerSignature` no-op on already-CUSTOMER_SIGNED: surface a warning toast to the UI |
| FIX-P3-3 | Playwright E2E: create JC → fill intake → sign → download PDF → upload sheet → assert COMPLETED |
| FIX-P3-4 | Verify Doc 14 roles on warranty claim Approve/Reject/MarkPaid CTAs in `warranty-claim-detail-view.tsx` |
| FIX-P3-5 | `MASKED_PHONE = '+91 98765 ••••1'` hardcoded in invoice preview — replace with `maskedContactFor()` helper |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-05-07 | claude (sonnet-4-6) | Initial audit — AUDIT-SERVICE-2026-05-07. P0: 4, P1: 9, P2: 11, P3: 5 |
