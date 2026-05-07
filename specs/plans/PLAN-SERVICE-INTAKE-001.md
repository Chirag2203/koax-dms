---
plan_id: PLAN-SERVICE-INTAKE-001
title: Vehicle Intake Inspection Sheet — implementation plan
domain: service
status: draft
risk_level: medium
pii_sensitivity: medium
related_research: RESEARCH-SERVICE-INTAKE-001
extends_spec: SPEC-SERVICE-001
phase: P1 (print-mode MVP); Phase 2 deferred (digital tablet mode)
owners: [planner, integrator]
created: 2026-05-07
---

# PLAN-SERVICE-INTAKE-001 — Vehicle Intake Inspection Sheet

## 1. Architecture decisions

### 1.1 Data model location — new file `intake-inspection.ts` in `@dms/types/domain/`

**Decision.** Mint `IntakeInspection` as a first-class aggregate in a new
`packages/types/src/domain/intake-inspection.ts`, sibling to `service.ts`.
Re-export from `packages/types/src/domain/index.ts`. JC carries a single
back-reference: `intakeInspectionId?: string` added to `JobCardSchema`.

**Reasoning.** The aggregate has 25+ fields plus a damage-callouts
sub-collection plus signature blobs plus retention/PII metadata.
Inlining on `JobCardSchema` would balloon the JC schema by ~40% and
conflate the JC's "work" entity with a "legal record" entity that has
its own retention rules (5 years vs JC lifecycle). A new file keeps
`service.ts` lean and lets `IntakeInspection` evolve toward Phase 2
(damage marks as structured SVG annotations) without schema-wide churn.

**Alternatives rejected.**
- *Inline on JobCard.* Schema bloat, mixed lifecycle concerns, fights retention separation.
- *New top-level `inspection.ts` shared with VHC.* VHC is a 210-point technician diagnostic with completely different shape, audience, and lifecycle. Conflating would force discriminated-union acrobatics for no benefit.

**L1** — `IntakeInspection` lives in its own types file; JC references by id only.

### 1.2 Storage — new slice in service-store, NOT a new store

**Decision.** Add three top-level state arrays to `service-store.ts`:
`intakeInspections`, `intakeDamageCallouts`, `intakeInspectionPhotos`.
Add actions `recordIntakeInspection`, `attachSignedSheet`, `addIntakePhoto`,
`deleteIntakePhoto`, `addDamageCallout`. Selectors expose
`selectIntakeForJobCard(jobCardId)`.

**Reasoning.** The intake artefact is owned by the JC lifecycle. A
separate Zustand store would create a mandatory cross-store seam between
every JC view and every intake read; that's noise, not signal. Per
cross-module-wiring §Core-invariant 2, slices stay pure — co-locating
the slice keeps reads as same-module reads.

**L2** — intake state lives in the service-store slice; no separate store; no cross-module seam introduced for intake reads/writes inside the service module.

### 1.3 PDF generation — `@react-pdf/renderer` via Next.js Route Handler

**Decision.** Server-render PDF via `@react-pdf/renderer` inside a
Next.js App Router Route Handler at
`app/api/service/intake-inspection/[jobCardId]/pdf/route.ts`.
Stream the response as `application/pdf`.

**Reasoning.**
- Deterministic pixel-perfect A4, embedded fonts (Inter), inline `<Svg>` primitive for the body diagram, ~400 KB on the *server* only. Client bundle untouched.
- `puppeteer` rejected — Chromium adds ~150 MB and slow cold starts.
- `pdfkit` rejected — imperative API; the body diagram + tables would be 500+ LoC of cursor manipulation.

**L3** — PDF generation runs server-side via `@react-pdf/renderer` Route Handler; never bundled into the client.

### 1.4 Form ↔ PDF coupling — single source-of-truth field-definition module

**Decision.** Define every intake field once in
`apps/staff-web/src/lib/service/intake/field-definitions.ts` as a typed
array `INTAKE_FIELDS: IntakeFieldDef[]`. Both the digital form and the
PDF template iterate this list. Validators built from the same array
via Zod factory.

**Reasoning.** Research §3 lists 32 fields; if the form and PDF each
hand-roll their fields, drift is guaranteed within one sprint. A single
typed array makes form/PDF parity a compile-time property.

**L4** — intake fields are defined once in `field-definitions.ts`; form, PDF template, and Zod validator are all derived from it.

### 1.5 Photo companion — typed 10-slot collection

**Decision.** Photos for intake live in their own array on service-store,
not co-mingled with the existing `photos: Photo[]`. Schema:
`IntakeInspectionPhotoSchema { id, intakeInspectionId, jobCardId, dataUrl, slot, capturedAt, uploadedBy }`
where `slot` enums: `front_3q_driver`, `front_3q_passenger`,
`rear_3q_driver`, `rear_3q_passenger`, `driver_profile`,
`passenger_profile`, `odometer`, `fuel_gauge`, `interior`, `boot`.

The form displays a 10-slot grid; SA fills the prescribed sequence.
Cap: 10 photos / intake; 1 MB per photo.

**Reasoning.** The 10 slots are *prescriptive* (research §6.5, OEM SOP).
Typing the slot enum lets us render guided UI (slot badges, missing-slot
warnings) and run an "all-10-captured" QC gate later.

**L5** — intake photos are a typed-slot collection; backend swap-in adds `s3Key?` without schema breaks.

### 1.6 Body diagram — single SVG asset

**Decision.** Ship a 5-view SVG asset (top-down, front, rear, left, right)
at `public/assets/intake-diagram.svg`. Used in PDF (`<Svg>` primitive)
AND digital form (Phase 1 read-only display; Phase 2 clickable overlay).

**v1 stub:** simple line-art under permissive license (Wikimedia CC0 or
in-house). v1 is documented as a stub; commission proper artwork in P2.

**L6** — single SVG asset is the canonical body diagram for both surfaces; v1 stub, P2 replaces without schema/template change.

### 1.7 Re-upload flow — re-use existing `attachments` infrastructure

**Decision.** `attachSignedSheet(intakeInspectionId, file, actor)` action:
1. Adds an `Attachment` record (existing schema; mime=pdf).
2. Patches `IntakeInspection.signedSheetAttachmentId = att.id` and `signedSheetUploadedAt = now`.
3. Emits timeline event `intake_signed_sheet_uploaded`.
4. Sets `intakeInspectionCompletedAt` on the JC, lifting the workflow gate.

**Reasoning.** Existing pattern; no new store, no new seam.

### 1.8 Retention — 5 years per Porsche-standard

**Decision.** Add `retainUntil: string` (ISO date) computed at creation
as `now + 5 years`. Add `retentionPolicy: 'INTAKE_INSPECTION_5Y'` literal
field. **No automated purge in v1** — purge is a backend job that does
not exist yet. Track as `DEF-INTAKE-1`.

**L7** — intake records carry an explicit `retainUntil` (5y); v1 records the date; v1.5 backend wires the purge job.

### 1.9 RBAC

| Role | Capability |
|---|---|
| **R09** SA (primary) | Create/edit; download PDF; upload signed sheet; capture photos |
| **R11** Workshop Tech | **Read-only** — sees intake summary on JC detail (no signature image — PII redacted) |
| **R03** Outlet Manager | Read + audit + amend within own outlet |
| **R19** GM | Read + audit + amend (any outlet) |
| **R24** CEO | Wildcard read |

`Gate` primitive used at every CTA per CLAUDE §10 #6.

**L8** — Intake create/edit gated to R09 + R03/R19/R24; technician (R11) read-only; amendment after `intakeInspectionCompletedAt` requires R19+ and a reason text (audit trail via `intake_amended` event).

### 1.10 JC state-machine gate — soft-warn in P1, hard-block in P2

**Decision.** P1 ships a banner on the JC detail "Intake inspection
pending — required before DIAGNOSED transition" + a confirm-anyway
escape valve for R19+. P2 promotes the warn to a hard block in
`state-machine.ts` `canTransition`.

**L9** — P1 soft-warn + R19 override; P2 hard-block via `canTransition`. GM signoff needed during /spec.

### 1.11 Cross-module-wiring seams

**Seam 45 — Service Intake → Customers (READ).** Resolves customer
name/phone/email for the PDF header and email-copy stub. Read-only.

**Seam 46 — Service Intake → Vehicles (READ).** Resolves
make/model/year/colour/VIN for Section A of the PDF and form auto-fill.
Read-only.

**Seam 47 — Service Intake → Notifications (WRITE, audit).**
[OPTIONAL v1.1] After successful customer-copy email-send, call
`useNotificationsStore.getState().recordSent(...)`. Best-effort try/catch.

**L10** — Seams 45/46 are read-only; intake never mutates customers-store or vehicles-store.

### 1.12 DPDP angle

**Decision.**
1. Consent text on form/PDF footer: "This document is a vehicle condition record completed in the customer's presence. Customer signature acknowledges pre-existing damage as noted. Retained for 5 years per company policy and BN Automobiles DPDP notice."
2. Display masking: rendered intake summary on JC detail does NOT show signature image to R11; only "✓ Signed by customer on YYYY-MM-DD". Full signature visible only to R09/R19+.
3. DPDP DSR alignment: retention deletion ties into the DSR purge job (DEF-INTAKE-1).

**L11** — Customer signature image is `pii_sensitivity: medium`; rendered for R09/R19+ only; technicians see a redacted "signed-on" indicator.

---

## 2. Field list (final)

Sections: **A** Vehicle ident · **B** Body/damage · **C** Inventory · **D** Functional · **E** Signatures · **DMS** DMS-only

| # | Key | Section | Type | Required | Default | On PDF | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `jobCardId` | meta | string | Y | — | Y (header) | Auto |
| 2 | `inspectionAt` | meta | ISO datetime | Y | now() | Y | Auto |
| 3 | `regNumber` | A | string | Y | from JC | Y | Indian reg pattern (lenient) |
| 4 | `vin` | A | string | Y | from JC | Y | Full display (operational doc) |
| 5 | `make`/`model`/`variant`/`year` | A | string/number | Y | from vehicles-store | Y | — |
| 6 | `exteriorColor` | A | string | Y | from vehicles-store | Y | — |
| 7 | `odometerKm` | A | integer | Y | from JC.odometerIn | Y | min 0, max 9_999_999 |
| 8 | `fuelLevel` | A | enum `EMPTY \| Q1 \| Q2 \| Q3 \| FULL` | Y | `Q2` | Y | 5-step |
| 9 | `battery12VCondition` | D | enum `OK \| LOW \| DEAD \| NOT_TESTED` | N | `NOT_TESTED` | Y | — |
| 10 | `tyreCondition` | D | object `{FL,FR,RL,RR}` enum `GOOD \| WORN \| DAMAGED` | N | all `GOOD` | Y | Per wheel |
| 11 | `tyreTreadMmFL`...`RR` | D | number (mm) | N | — | N | DMS-only (VHC owns tread) |
| 12 | `spareTyrePresent` | C | bool | Y | true | Y | — |
| 13 | `toolKitPresent` | C | bool | Y | true | Y | — |
| 14 | `keyCount` | C | enum `1 \| 2 \| 3+` | Y | `2` | Y | — |
| 15 | `keyType` | C | enum `SMART_ONLY \| SMART_PLUS_VALET \| BOTH \| NA` | N | `SMART_ONLY` | Y | Luxury relevance |
| 16 | `serviceBookPresent` | C | bool | N | false | Y | — |
| 17 | `rcInVehicle` | C | bool | Y | true | Y | MV Act §130 |
| 18 | `insuranceCertInVehicle` | C | bool | Y | true | Y | MV Act §145 |
| 19 | `cabinAccessoriesNote` | C | string ≤200 | N | "" | Y | Free text |
| 20 | `infotainmentFunctional` | D | bool | N | true | Y | — |
| 21 | `acFunctional` | D | bool | Y | true | Y | — |
| 22 | `wipersFunctional` | D | bool | Y | true | Y | — |
| 23 | `lightsFunctional` | D | bool | Y | true | Y | — |
| 24 | `dashboardWarningLightsNote` | D | string ≤200 | N | "" | Y | Free text |
| 25 | `damageCallouts` | B | array `IntakeDamageCallout[]` | Y (≥0) | `[]` | Y (table) | See sub-shape below |
| 26 | `damageDiagramAnnotations` | B | string (JSON SVG path overlay) | N | — | N (P2) | Forward compat for P2 |
| 27 | `customerName` | E | string | Y | from customer | Y | — |
| 28 | `customerSignatureDataUrl` | E | base64 PNG | Y (after sign step) | — | Y | PII medium |
| 29 | `customerSignedAt` | E | ISO date | Y | — | Y | — |
| 30 | `saName` | E | string | Y | from actor | Y | — |
| 31 | `saEmployeeId` | E | string | Y | from actor | Y | — |
| 32 | `saSignatureDataUrl` | E | base64 PNG | Y | — | Y | — |
| 33 | `saSignedAt` | E | ISO date | Y | — | Y | — |
| 34 | `outletId` | A | string | Y | from JC | Y (header) | — |
| 35 | `qrPayload` | meta | string (URL) | Y | computed | Y (footer) | `https://dms.bnautos.in/service/jobcards/{id}` |
| 36 | `nextActionNoteForWorkshop` | DMS | string ≤500 | N | "" | **N** | DMS-only — never on customer copy |
| 37 | `priorVisitDamageHistorySummary` | DMS | string | N | computed | N | P1 stub-empty; P2 populated |
| 38 | `signedSheetAttachmentId` | DMS | string | N | — | N | Reverse-link to upload |
| 39 | `signedSheetUploadedAt` | DMS | ISO | N | — | N | — |
| 40 | `retainUntil` | DMS | ISO date | Y | now+5y | N | L7 |
| 41 | `retentionPolicy` | DMS | literal `'INTAKE_INSPECTION_5Y'` | Y | — | N | — |
| 42 | `version` | DMS | int | Y | 1 | N | Bumps on amendment (L8) |
| 43 | `amendments` | DMS | array `{at, by, reason, beforeJson, afterJson}` | N | `[]` | N | R19 amendments audit |

**Sub-shape — `IntakeDamageCallout`:** `{ id, number: int, view: 'TOP'|'FRONT'|'REAR'|'LEFT'|'RIGHT', locationText: string, code: 'S'|'D'|'C'|'R'|'B'|'P', severity: 1|2|3, customerInitial?: string, saInitial?: string, observedAt: ISO }`.

**Codes:** S=scratch, D=dent, C=chip-crack, R=rust, B=broken/missing, P=paint fade.

---

## 3. PDF layout spec

A4 portrait (595 × 842 pt), 24 pt margins, Inter font.

```
┌──────────────────────────────────────────────────────┐
│ [BN Logo]  BN AUTOMOBILES   |   JC: JC-2026-N        │  Header (60pt)
│ Outlet: Bangalore · GSTIN   |   Intake: 07-May 14:32 │
├──────────────────────────────────────────────────────┤
│ SECTION A — VEHICLE                                  │  ~80pt
│ Reg: KA01-XX-1234   VIN: WBA12345...   Year: 2022   │
│ Make/Model · Colour · Odometer · Fuel               │
├──────────────────────────────────────────────────────┤
│ SECTION B — BODY DAMAGE (5-view + table)            │  ~340pt
│ ┌─[ TOP-VIEW ]─┐                                     │
│ │ marks 1, 2…  │  legend: S D C R B P              │
│ └──────────────┘                                     │
│ [FRONT][LEFT][RIGHT][REAR]                           │
│ Damage table: # | View | Location | Code | Sev | Init│
├──────────────────────────────────────────────────────┤
│ SECTION C — INVENTORY                                │  ~80pt
├──────────────────────────────────────────────────────┤
│ SECTION D — FUNCTIONAL                               │  ~60pt
├──────────────────────────────────────────────────────┤
│ SECTION E — SIGNATURES (Customer + SA)              │  ~100pt
├──────────────────────────────────────────────────────┤
│ Footer · "Retained 5 years..."                  [QR] │  ~30pt
└──────────────────────────────────────────────────────┘
```

Rules: monochrome only, Inter regular/semibold, tabular-nums, QR encodes the JC URL.

---

## 4. Task breakdown (P1 = MVP)

| # | Task | File(s) | LoC | Depends on |
|---|---|---|---|---|
| **T01** | Mint `IntakeInspection` schemas | `packages/types/src/domain/intake-inspection.ts` (new); barrel update; `JobCardSchema.intakeInspectionId?` | ~180 | — |
| **T02** | Field-definitions module (L4 source of truth) | `apps/staff-web/src/lib/service/intake/field-definitions.ts` (new) | ~140 | T01 |
| **T03** | Service-store slice extension | `apps/staff-web/src/lib/service/service-store.ts` modify: state arrays + 6 actions + selectors | ~200 | T01,T02 |
| **T04** | Body diagram SVG asset (stub) | `apps/staff-web/public/assets/intake-diagram.svg` (new) | ~asset | — |
| **T05** | Intake form (digital fields + photo grid + signature pad) | `intake-inspection-form.tsx` (new) | ~520 | T02,T03 |
| **T06** | Damage callout sub-form + photo grid | `damage-callouts-editor.tsx`, `intake-photos-grid.tsx` (new) | ~280 | T05 |
| **T07** | PDF template | `apps/staff-web/src/lib/service/intake/intake-pdf-document.tsx` (new — `@react-pdf/renderer`) | ~420 | T02 |
| **T08** | PDF route handler | `app/api/service/intake-inspection/[jobCardId]/pdf/route.ts` (new) | ~80 | T07 |
| **T09** | "Download Inspection Sheet" CTA on JC detail | `jobcard-detail-view.tsx` modify | ~100 | T03,T08 |
| **T10** | "Upload Signed Sheet" + photo upload | `upload-signed-sheet-dialog.tsx` (new) | ~160 | T03 |
| **T11** | Intake summary read-view on JC detail | `intake-summary-card.tsx` (new) | ~140 | T03 |
| **T12** | RBAC gates (Gate primitive) | covered in T05/T09–T11 | — | T05–T11 |
| **T13** | Tests (unit + integration) | `service/__tests__/intake-inspection.test.ts`; `intake/__tests__/field-definitions.test.ts`; `tests/intake-inspection-flow.test.ts` | ~400 | T03,T07 |
| **T14** | Storybook stories | `*.stories.tsx` for form, summary, damage editor | ~200 | T05–T11 |
| **T15** | i18n keys | `messages/en-IN.json`, `hi-IN.json` (top-level `serviceIntake`) | ~120 | T05–T11 |
| **T16** | Spec extension | /spec agent — extends SPEC-SERVICE-001 OR mints SPEC-SERVICE-INTAKE-001 | — | — |
| **T17** | Cross-module-wiring update | `specs/architecture/cross-module-wiring.md` — register seams 45+46 | ~40 | T16 |
| **T18** | Verify error.tsx + drift baselines | `app/(shell)/service/error.tsx` exists; ui-canon-drift baselines unchanged | — | T05–T11 |

**Sequencing:** /spec runs FIRST (T16). Then T01 → T02 → T03 (foundation). T04 + T05 + T07 in parallel. T06 after T05; T08 after T07. T09–T11 after T03+T08. T13–T15 after T11.

---

## 5. Risks + mitigations

| Risk | Mitigation |
|---|---|
| `@react-pdf/renderer` server bundle ~400 KB | Server-only; never imported into client. Verify with build analyzer. |
| Body diagram SVG license — no commissioned art for v1 | CC0 outline (Wikimedia) or hand-drawn line-art. Document as v1 stub; P2 commissions artwork. |
| Customer copy via email (DLT/email gateway not real) | Stub the send — emit toast "Customer copy emailed to {email}" + log to notifications-store (Seam 47). |
| Photo upload size in mock phase (base64 in localStorage) | Cap 1 MB / photo (existing pattern); 10 photos × 1 MB = 10 MB risks localStorage quota. v1: photos in-memory only (not persisted); v1.5 backend uploads. |
| Signature pad library dependency | Roll a 60-line `<canvas>` component (preferred) over `react-signature-canvas` (~30 KB). |
| Server route handler tests need fs/Buffer mocks | `vitest.mock('node:fs')` + Buffer stubs. |
| `@react-pdf/renderer` SVG inline quirks | Fallback: embed body diagram as PNG asset. |
| Drift between digital form + PDF | L4 enforces single field-definitions source; manual grep audit until CI rule. |

---

## 6. Cross-module-wiring update

**Seam 45 — Service Intake → Customers (READ).** PDF header, summary card, email-copy stub. No mutation.

**Seam 46 — Service Intake → Vehicles (READ).** Section A auto-fill, PDF body. No mutation.

**Seam 47 — Service Intake → Notifications (WRITE, audit) [optional v1.1].** After customer-copy email-send. Best-effort try/catch.

---

## 7. Open questions for the integrator

1. **Hard-block vs soft-warn on RECEIVED→DIAGNOSED.** Recommend P1 soft-warn + R19 override, P2 hard-block. **Confirm with R19 before /spec freezes L9.**
2. **Authorised representative for fleet/corporate customers.** Recommend free-text P1, structured P2.
3. **Pre-existing damage pre-population.** Defer to P2 (DEF-INTAKE-4).
4. **Wheel-rim condition.** Per-wheel structured field + diagram annotation.
5. **Signature pad library vs custom.** Custom 60-line canvas preferred.
6. **Email customer copy in P1?** Defer to P2 (DEF-INTAKE-5).
7. **Auto-open intake panel after JC create?** YES with R19 skip override.

---

## 8. Out of scope (Phase 2+) — for §Deferred items

| ID | Item | Priority |
|---|---|---|
| DEF-INTAKE-1 | Scheduled purge of records past `retainUntil` | P4 |
| DEF-INTAKE-2 | Digital tablet damage marking via clickable SVG | P2 |
| DEF-INTAKE-3 | Tablet signature on glass | P2 |
| DEF-INTAKE-4 | Pre-populate prior-visit damage in blue | P2 |
| DEF-INTAKE-5 | Email customer copy (DLT-stub or real) | P2 |
| DEF-INTAKE-6 | Hard-block RECEIVED→DIAGNOSED gate | P2 |
| DEF-INTAKE-7 | Commissioned 5-view body diagram | P2 |
| DEF-INTAKE-8 | S3 swap-in for photos + attachment | P3 |
| DEF-INTAKE-9 | Authorised representative as structured entity | P3 |
| DEF-INTAKE-10 | OCR check that odometer-photo matches `odometerKm` | P3 |

---

## L-tag summary (for /spec to mint)

| Tag | Title |
|---|---|
| L1 | IntakeInspection in dedicated types file; JC carries id-only ref |
| L2 | Intake state in service-store slice; no separate store |
| L3 | PDF generation server-only via @react-pdf/renderer Route Handler |
| L4 | Single field-definitions module → form + PDF + Zod |
| L5 | Intake photos = typed-slot collection (10 named slots); S3-additive |
| L6 | Single canonical SVG body diagram; v1 stub, P2 commissioned |
| L7 | 5-year retention captured per record; v1 stores date, v1.5 purges |
| L8 | RBAC: R09 create; R11 read; R19+ amend with audit trail |
| L9 | P1 soft-warn + R19 override on RECEIVED→DIAGNOSED; P2 hard-block |
| L10 | Seams 45/46 read-only; intake never mutates customers/vehicles |
| L11 | Customer signature pii_sensitivity: medium; redacted for R11 |
