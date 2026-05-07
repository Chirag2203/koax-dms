---
spec_id: SPEC-SERVICE-INTAKE-001
domain: service
title: Vehicle Intake Inspection Sheet (SA walk-around at JC creation)
version: 1.1.1
status: approved
risk_level: medium
pii_sensitivity: medium
flags: [staff.service.intake.v1]
owners: [planner, ux-writer, qa-planner, security-reviewer, integrator]
depends_on:
  - SPEC-SERVICE-001
  - SPEC-CUSTOMERS-001
  - SPEC-VEHICLES-001
  - SPEC-PLATFORM-001
related_research: RESEARCH-SERVICE-INTAKE-001
related_plan: PLAN-SERVICE-INTAKE-001
docs_consulted:
  - Doc 05 §Service Advisor Console, §Vehicle Reception
  - Doc 09 (Glossary — Job Card, SA, VHC vs Intake)
  - Doc 11 §JobCardStateMachine
  - Doc 14 §R09 SA, §R11 Workshop Tech, §R19 GM
  - Consumer Protection Act 2019 §2(47), §69
  - DPDP Act 2023 §6, §11
  - Motor Vehicles Act §130, §145
effective_date: 2026-05-07
---

# SPEC-SERVICE-INTAKE-001 — Vehicle Intake Inspection Sheet

## 1. Summary

The Vehicle Intake Inspection Sheet is the legal-record artefact created
by the Service Advisor (R09) during the customer-present walk-around at
Job Card (JC) creation. It captures the vehicle's pre-service condition
across five sections (vehicle ident, body damage, inventory, functional,
signatures), produces a signed A4 PDF for the customer, and stores a
re-uploaded scanned copy alongside the JC. It is distinct from the
Vehicle Health Check (VHC), which is a 210-point technician-owned
diagnostic performed after intake (per SPEC-SERVICE-001 §6). This spec
formalizes PLAN-SERVICE-INTAKE-001 and binds every implementation task
back to a scenario in §10.

---

## 2. Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L1 | IntakeInspection in dedicated types file; JC carries id-only ref | `IntakeInspection` is minted as a first-class aggregate at `packages/types/src/domain/intake-inspection.ts`; `JobCardSchema` carries a single back-reference `intakeInspectionId?: string`. The 5-year retention lifecycle, the photo sub-collection, and the damage callout sub-collection are owned here, never on `JobCardSchema`. | PLAN §1.1 |
| L2 | Intake state in service-store slice; no separate store | Intake state arrays (`intakeInspections`, `intakeDamageCallouts`, `intakeInspectionPhotos`) live as a slice inside the existing `service-store.ts`. No new Zustand store, no cross-module seam introduced for intake reads/writes inside the service module. | PLAN §1.2; cross-module-wiring §Core-invariant 2 |
| L3 | PDF generation server-only via @react-pdf/renderer Route Handler | PDFs are server-rendered via `@react-pdf/renderer` inside the Next.js App Router Route Handler at `app/api/service/intake-inspection/[jobCardId]/pdf/route.ts` and streamed as `application/pdf`. The library MUST NOT be imported into any client-bundle code path. | PLAN §1.3 |
| L4 | Single field-definitions module → form + PDF + Zod | Every intake field is defined exactly once in `apps/staff-web/src/lib/service/intake/field-definitions.ts` as a typed `INTAKE_FIELDS: IntakeFieldDef[]`. The digital form, the PDF template, and the Zod validator are all derived from this array; hand-rolled field lists in either surface are review-rejections. | PLAN §1.4 |
| L5 | Intake photos = typed-slot collection (10 named slots); S3-additive | Photos live in their own `intakeInspectionPhotos` array, NOT co-mingled with the existing `photos: Photo[]`. Each photo carries a typed `slot` enum (10 prescriptive slots from research §6.5). Backend swap-in adds an optional `s3Key?` field without breaking the schema. | PLAN §1.5 |
| L6 | Single canonical SVG body diagram; v1 stub, P2 commissioned | One asset at `public/assets/intake-diagram.svg` (5-view: top, front, rear, left, right) is the canonical body diagram for both PDF (`<Svg>` primitive) and digital form. v1 ships a CC0 / line-art stub; P2 replaces with commissioned artwork without schema or template change. | PLAN §1.6 |
| L7 | 5-year retention captured per record; v1 stores date, v1.5 purges | Each `IntakeInspection` carries `retainUntil` (createdAt + 5 years) and a literal `retentionPolicy: 'INTAKE_INSPECTION_5Y'`. v1 records the date only; the automated purge job is `DEF-INTAKE-1` and lands in v1.5. | PLAN §1.8; DPDP Act 2023 §11 |
| L8 | RBAC: R09 create; R11 read; R19+ amend with audit trail; redacted amendment audit | R09 (SA) creates and edits intake records and uploads signed sheets. R11 (Workshop Tech) is read-only and never sees the signature image (see L11). R03 (Outlet Manager) and R19 (GM) can read, audit, and amend within their scope. Amendment after `intakeInspectionCompletedAt` requires R19+, a reason text, and emits an `intake_amended` audit event with `version` bump. **Amendment audit redaction (tightened per Sec #5):** `amendments[].beforeJson` and `afterJson` MUST EXCLUDE `customerSignatureDataUrl`, `saSignatureDataUrl`, and the `dataUrl` field of every `IntakeInspectionPhoto` from the captured diff. Only changed scalar field names + scalar before/after values are stored — never base64 image payloads. Covered by a unit test in T13 list asserting no `data:image/` substring appears in any amendment row. | PLAN §1.9; Doc 14 §R09/R11/R19; Sec wave-2 #5 |
| L9 | P1 soft-warn + R19 override on RECEIVED→DIAGNOSED; P2 hard-block | P1 ships a soft-warn banner on JC detail ("Intake inspection pending — required before DIAGNOSED transition") plus an R19+ confirm-anyway override. P2 promotes this to a hard block in `state-machine.ts` `canTransition`. **Open question (Q1) — needs GM signoff before implementation freeze.** | PLAN §1.10, §7-Q1 |
| L10 | Seams 45/46 read-only; intake never mutates customers/vehicles | Cross-module reads use Seam 45 (customers) and Seam 46 (vehicles) for header/auto-fill resolution only. Intake code MUST NOT call any setter on `customers-store` or `vehicles-store`. Seam 47 (notifications, write) is optional v1.1 and best-effort try/catch only. | PLAN §1.11; cross-module-wiring §Seams 45–47 |
| L11 | Customer signature pii_sensitivity: medium; redacted for R11 | The customer signature image is classified `pii_sensitivity: medium`. It renders in full only for R09 (the capturing SA), R03 (own outlet manager), and R19+ (GM/CEO). R11 (Workshop Tech) sees a redacted "✓ Signed by customer on YYYY-MM-DD" indicator. PDF download endpoint enforces the same gate via the `Gate` primitive on the CTA AND a server-side role check in the Route Handler. | PLAN §1.12; DPDP Act 2023 §6 |
| L12 | PDF Route Handler hardening contract | Every request to `app/api/service/intake-inspection/[jobCardId]/pdf/route.ts` MUST execute the following positive contract in order: (a) auth/session check is the FIRST step before any store read; (b) explicit `outletId` comparison `session.user.outletId === jobCard.outletId` is required for non-R19+ roles (R19/R22/R24 may cross outlets); (c) per-IP and per-session rate limit of 30 requests/minute (sliding window) to thwart `[jobCardId]` enumeration; (d) an audit-log entry MUST be written for every successful PDF download capturing `{timestamp, actorEmployeeId, jobCardId, intakeInspectionId, ip, userAgent}`; (e) response carries `Cache-Control: private, no-store` (PDF is never cached at any intermediary); (f) requests with `Origin` not in the staff-web allow-list are rejected `403 Forbidden` to mitigate cookie-auth CSRF. The audit-log entry is the chain-of-custody record subject to consumer-court subpoena. | Sec wave-2 #1 (blocker B2); DPDP Act 2023 §6; CPA-2019 evidentiary chain |
| L13 | Erasure deferred under DPDP §17 lawful-purpose carve-out | Right-to-erasure requests on `IntakeInspection` records are denied during the 5-year retention window under DPDP Act 2023 §17(1)(c) (compliance with law / legal claim defence per Consumer Protection Act §69 limitation period). Customer is informed of this exception in the consent notice (see §13.1 + L12). DSAR (DPDP §11) read access is supported via `selectIntakesByCustomerId(customerId)` selector and the R23 DPO pipeline (SC-16). After `retainUntil` passes, the purge job (DEF-INTAKE-1) deletes the record automatically. | Sec wave-2 #3, #4 (blocker B3); DPDP Act 2023 §17(1)(c); CPA-2019 §69 |
| L14 | Photos graded `pii_sensitivity: medium` | The `intakeInspectionPhotos` collection is graded `pii_sensitivity: medium` — same cohort as the customer signature (L11). Slot 7 (`odometer` / dashboard) and slot 9 (`interior` wide-angle) can incidentally capture personal effects, navigation history, child seats (DPDP §2(t) sensitive personal data of a child), or residence-identifying stickers. Access mirrors L11 — R09/R03/R19+ see full photos; R11 sees thumbnail-only or count-only summaries; the high-res `dataUrl` is server-filtered before delivery. The PDF rendered by L3/L12 MUST NOT embed photo `dataUrl`s — the printed sheet contains the body diagram + structured table only; photos remain inside the access-controlled DMS. License-plate redaction in incidental photo capture is tracked as DEF-INTAKE-14. | Sec wave-2 #6; DPDP Act 2023 §2(t), §6 |
| L15 | Signature integrity in mock vs real phase | v1 mock-phase stores `customerSignatureDataUrl` as a base64 PNG in client-accessible Zustand state (persisted via MSW + localStorage in development). This is NOT a legally-defensible record — anyone with browser dev tools can mutate the PNG post-signature. Mock builds MUST NOT be exposed to a customer-facing or production-adjacent environment; deployment guards (env-flag check on app boot) enforce this. v1.5 backend swap-in stores the signature server-side, computes a SHA-256 digest at COMPLETED, and freezes it; subsequent amendments invalidate the prior digest and compute a new one over the post-amendment state. The digest implementation is tracked as DEF-INTAKE-12. | Sec wave-2 #7; CPA-2019 evidentiary weight |
| L16 | Historical artefacts are immutable snapshots of resolved values | When the customer signs the PDF at `state=CUSTOMER_SIGNED → COMPLETED`, the rendered VIN, customerName, make, model, year, and exteriorColor values resolved at that moment become part of the signed record embedded in the `signedSheetAttachmentId` artefact. Subsequent edits to `Vehicle.vin` or `Customer.fullName` (rare R19 corrections) MUST NOT silently propagate to a re-rendered PDF. Post-COMPLETED PDF renders MUST use the snapshot embedded in the signed-sheet attachment, not the live cross-aggregate selector. The §8.4 render-time hydration rule applies ONLY to pre-COMPLETED states (DRAFT, CUSTOMER_SIGNED before signature commit). | Sec wave-2 #8; CPA-2019 §69 chain-of-custody |

---

## 3. Routes

Server-side route handlers (no new page routes — UI surfaces are tabs/dialogs on the existing JC detail page).

| Method | Path | Handler | RBAC | Returns |
|---|---|---|---|---|
| GET | `/api/service/intake-inspection/[jobCardId]/pdf` | `app/api/service/intake-inspection/[jobCardId]/pdf/route.ts` | R09 (own outlet), R03 (own outlet), R19+ — **enforced server-side** per L11 | `application/pdf` stream; 403 for R11 / out-of-outlet R09; 404 if no intake exists |

All intake CRUD is in-process via service-store actions (L2); no REST endpoints in P1.

---

## 4. Personas

| Role | Doc 14 ref | Use case |
|---|---|---|
| **R09** Service Advisor | §R09 | Primary author. Creates intake at JC creation, captures all 32 fields + 10 photos + damage callouts, prints/downloads PDF, runs walk-around with customer, captures signature, scans signed sheet, uploads. |
| **R11** Workshop Tech | §R11 | Read-only consumer on JC detail. Sees the intake summary card and damage table to inform diagnosis. **Never sees the customer signature image** (L11). |
| **R03** Outlet Manager / **R19** GM | §R03, §R19 | Audit + amend within their outlet (R03) or any outlet (R19). Amendments after completion require R19+ with reason text. |
| **Customer** | data principal (DPDP §6) | Signs the printed sheet acknowledging pre-existing damage. Receives the customer copy (P2 — DEF-INTAKE-5). |
| **R23** DPO | §R23 | Read-only via DSR pipeline. Surfaces intake records for data-principal access requests; queues for purge once `retainUntil` passes (DEF-INTAKE-1). |

---

## 5. Data model

Zod sketches; full schema lands in `packages/types/src/domain/intake-inspection.ts` per L1.

```ts
// IntakeInspectionSchema
export const IntakeInspectionSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),                  // FK to JobCard (consistency §8 row 2)
  outletId: z.string(),                   // inherited from JC at create; immutable (§8 row 4)
  inspectionAt: z.string().datetime(),
  // — Section A: Vehicle ident (resolved from vehicles-store at PDF render — L10, §8)
  regNumber: z.string(),
  vin: z.string(),                        // canonical = Vehicle.vin (§8 row 1)
  odometerKm: z.number().int().min(0).max(9_999_999),
  fuelLevel: z.enum(['EMPTY','Q1','Q2','Q3','FULL']),
  // — Section D: Functional —
  battery12VCondition: z.enum(['OK','LOW','DEAD','NOT_TESTED']).default('NOT_TESTED'),
  tyreCondition: z.object({
    FL: z.enum(['GOOD','WORN','DAMAGED']),
    FR: z.enum(['GOOD','WORN','DAMAGED']),
    RL: z.enum(['GOOD','WORN','DAMAGED']),
    RR: z.enum(['GOOD','WORN','DAMAGED']),
  }),
  acFunctional: z.boolean(),
  wipersFunctional: z.boolean(),
  lightsFunctional: z.boolean(),
  infotainmentFunctional: z.boolean().optional(),
  dashboardWarningLightsNote: z.string().max(200).default(''),
  // — Section C: Inventory —
  spareTyrePresent: z.boolean(),
  toolKitPresent: z.boolean(),
  keyCount: z.enum(['1','2','3+']),
  keyType: z.enum(['SMART_ONLY','SMART_PLUS_VALET','BOTH','NA']).optional(),
  serviceBookPresent: z.boolean(),
  rcInVehicle: z.enum(['PRESENT','ABSENT','NOT_VERIFIED']).default('NOT_VERIFIED'),       // MV Act §130 — tri-state distinguishes "checked, absent" from "not checked" (Sec wave-2 #9)
  insuranceCertInVehicle: z.enum(['PRESENT','ABSENT','NOT_VERIFIED']).default('NOT_VERIFIED'), // MV Act §145 — same tri-state rationale (Sec wave-2 #9)
  cabinAccessoriesNote: z.string().max(200).default(''),
  // — Section B: Body damage —
  damageCalloutIds: z.array(z.string()),  // FKs to IntakeDamageCallout
  damageDiagramAnnotations: z.string().optional(), // P2 SVG path JSON
  // — Section E: Signatures (PII) —
  customerSignatureDataUrl: z.string().optional(), // base64 PNG; redacted for R11 (L11)
  customerSignedAt: z.string().datetime().optional(),
  saName: z.string(),
  saEmployeeId: z.string(),
  saSignatureDataUrl: z.string(),
  saSignedAt: z.string().datetime(),
  // — DMS-only —
  nextActionNoteForWorkshop: z.string().max(500).default(''), // never on customer copy
  priorVisitDamageHistorySummary: z.string().optional(),       // P2 populates
  signedSheetAttachmentId: z.string().optional(),
  signedSheetUploadedAt: z.string().datetime().optional(),
  retainUntil: z.string().date(),         // L7 — createdAt + 5y
  retentionPolicy: z.literal('INTAKE_INSPECTION_5Y'),
  version: z.number().int().min(1).default(1),
  amendments: z.array(z.object({
    at: z.string().datetime(),
    by: z.string(),
    reason: z.string().min(1),
    beforeJson: z.string(),
    afterJson: z.string(),
  })).default([]),
  state: z.enum(['DRAFT','CUSTOMER_SIGNED','SHEET_UPLOADED','COMPLETED','AMENDED']),
});

// IntakeDamageCalloutSchema
export const IntakeDamageCalloutSchema = z.object({
  id: z.string(),
  intakeInspectionId: z.string(),
  number: z.number().int().min(1),
  view: z.enum(['TOP','FRONT','REAR','LEFT','RIGHT']),
  locationText: z.string().min(1),
  code: z.enum(['S','D','C','R','B','P']), // scratch/dent/chip/rust/broken/paint-fade
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  customerInitial: z.string().optional(),
  saInitial: z.string().optional(),
  observedAt: z.string().datetime(),
});

// IntakeInspectionPhotoSchema (L5)
export const IntakeInspectionPhotoSchema = z.object({
  id: z.string(),
  intakeInspectionId: z.string(),
  jobCardId: z.string(),
  dataUrl: z.string(),                    // base64; v1.5 backend adds s3Key?
  s3Key: z.string().optional(),           // forward-compat (L5)
  slot: z.enum([
    'front_3q_driver','front_3q_passenger',
    'rear_3q_driver','rear_3q_passenger',
    'driver_profile','passenger_profile',
    'odometer','fuel_gauge','interior','boot',
  ]),
  capturedAt: z.string().datetime(),
  uploadedBy: z.string(),
});
```

Cross-aggregate fields (VIN, customerName, make/model/year/colour) are NEVER stored on `IntakeInspection`; they are resolved at render time per §8.

---

## 6. State machine

```
            recordIntakeInspection         captureCustomerSignature
   (none) ──────────────────────▶ DRAFT ─────────────────────────▶ CUSTOMER_SIGNED
                                                                         │
                                                                         │ attachSignedSheet
                                                                         ▼
                                                                  SHEET_UPLOADED
                                                                         │
                                                                         │ (auto, on upload success)
                                                                         ▼
                                                                    COMPLETED
                                                                         │
                                                                         │ amendIntake (R19+ only, requires reason)
                                                                         ▼
                                                                     AMENDED
```

- **DRAFT** — fields captured digitally; no customer signature yet.
- **CUSTOMER_SIGNED** — signature pad captured; PDF downloadable for print.
- **SHEET_UPLOADED** — scanned signed PDF attached.
- **COMPLETED** — terminal happy state; lifts the soft-warn banner on JC detail (L9).
- **AMENDED** — R19 amendment after COMPLETED; `version` bumps, `amendments[]` row added; preserves prior state in `beforeJson` (subject to L8 redaction list — never embeds image dataUrls).
- **AMENDED → AMENDED is a valid re-entry** (QA #12): subsequent R19 amendments increment `version` further (e.g. version=2 → version=3) and append additional rows to `amendments[]`. Covered by SC-9 with version=2→3 extension in T13. There is no "terminal" state in this lifecycle — AMENDED is a steady state that can re-enter on each amendment.
- **Illegal transitions are rejected by the store action layer** (SC-17): `attachSignedSheet` on a `DRAFT` intake throws `InvalidStateTransitionError`; the state-machine guard is the test oracle.

Per Doc 11 §JobCardStateMachine: when JC is in `RECEIVED` and intake state is not `COMPLETED`, the soft-warn banner shows on RECEIVED→DIAGNOSED transition (L9). R19+ may override.

---

## 7. Cross-module integration

Per `cross-module-wiring.md` numbering convention. **No mutation outside service-store** (L10).

| Seam | Direction | Module | Read/Write | Purpose |
|---|---|---|---|---|
| **45** | Service Intake → Customers | customers-store | **READ** | Resolve customer name/phone/email for PDF header (§5 saName helpers and rendered customer block) and for the email-copy stub (P2). Selector: `selectCustomerById(jobCard.customerId)`. |
| **46** | Service Intake → Vehicles | vehicles-store | **READ** | Resolve make/model/variant/year/exteriorColor for Section A auto-fill on the form AND for PDF rendering. Selector: `selectVehicleByVin(jobCard.vin)`. |
| **47** | Service Intake → Notifications | notifications-store | **WRITE (P2, optional v1.1)** | After successful customer-copy email-send, call `useNotificationsStore.getState().recordSent(...)`. Best-effort try/catch — failure does not block intake state machine. |

### 7.1 Selectors (service-store)

In addition to the existing intake CRUD actions documented in PLAN §4, the store exposes the following selectors (consumed by R23 DPO DSAR pipeline + cross-aggregate consistency tests):

- `selectIntakeForJobCard(jobCardId): IntakeInspection | undefined`
- `selectIntakesByCustomerId(customerId): IntakeInspection[]` — traverses `JobCard.customerId` → list of JCs → maps each JC's `intakeInspectionId` to the intake record. Used by SC-16 (R23 DPO DSAR) and L13. Returns the full set across all outlets (R23 has cross-outlet read).
- `selectIntakeDamageCalloutsByIntakeId(intakeInspectionId): IntakeDamageCallout[]`
- `selectIntakePhotosByIntakeId(intakeInspectionId): IntakeInspectionPhoto[]`

---

## 8. Cross-aggregate consistency contract (NEW — REQUIRED)

Per the user's binding direction ("we need the data across these models to be consistent"), this section defines the canonical id graph and a single-source-of-truth (SoT) rule for every field that appears on more than one aggregate.

### 8.1 Canonical id graph

```
Customer ◀──── customerId ──── JobCard ──── intakeInspectionId ────▶ IntakeInspection
                                  │                                          │
                                  │ vin                                      │ damageCalloutIds[] / photoIds[]
                                  ▼                                          ▼
                                Vehicle                            IntakeDamageCallout / IntakeInspectionPhoto
```

`IntakeInspection` reaches `Customer` ONLY through `JobCard.customerId`. It never carries its own `customerId`.

### 8.2 Field-by-field SoT table

| Shared field | Source-of-truth aggregate | Downstream readers | Drift guard |
|---|---|---|---|
| `vin` | **Vehicle** | JobCard, IntakeInspection | Read-only via `vehicles-store` selector at JC creation; IntakeInspection mirrors the JC value. NEVER duplicated as an editable field on the intake form. T13 verifies `intake.vin === jobCard.vin === vehicle.vin`. |
| `customerId` | **JobCard** (FK to Customer) | IntakeInspection | IntakeInspection reads via `jobCard.customerId`; never stores its own. PDF render hydrates customer via Seam 45. |
| `customerName` | **Customer** | IntakeInspection (display only) | Resolved at PDF render time (`selectCustomerById(jc.customerId).fullName`); NEVER stored on `IntakeInspection`. Renaming the customer reflects on every future PDF render with zero migration. |
| `outletId` | **JobCard** | IntakeInspection | Inherited at intake create; **immutable thereafter**. JC outlet transfer (rare, R19-only) does NOT mutate prior intake records — they are immutable historical artefacts. |
| `make` / `model` / `year` / `exteriorColor` | **Vehicle** | IntakeInspection (display only) | Resolved at PDF render time via Seam 46. NEVER stored on `IntakeInspection`. |
| `odometerKm` | **IntakeInspection** (intake-time snapshot) | JobCard could denormalize | IntakeInspection IS the source of truth for the intake-time odometer reading. JC's existing `odometerIn` field MUST equal `intake.odometerKm` after intake completes; T13 verifies the equality. |

### 8.3 The rule

> Any aggregate-level field that exists on multiple aggregates MUST have exactly ONE source-of-truth. Readers fetch via selector at render time, NOT by copying into their own state. Drift between aggregates is a regression caught by the cross-aggregate consistency test (T13).

### 8.4 Enforcement

- **Compile-time:** the field-definitions module (L4) marks every Section A field as `derivedFrom: 'vehicle' | 'customer' | 'jobCard'` so the form auto-fill is wired through a selector, never written into intake state.
- **Render-time:** the PDF Route Handler (L3) hydrates customer + vehicle objects via Seam 45/46 selectors at request time, ensuring the printed PDF always reflects current canonical values.
- **Test-time:** T13 includes a dedicated `cross-aggregate-consistency.test.ts` asserting (a) `intake.vin === jc.vin === vehicle.vin`, (b) `intake.outletId === jc.outletId`, (c) `intake.odometerKm === jc.odometerIn`, (d) intake never holds a `customerId` field. SC-11 binds this test.

---

## 9. UI surfaces

All primitives sourced from `SPEC-ARCH-UI-001` per CLAUDE §6 cross-references. No local redefinitions.

| Component | File (per PLAN §4) | Primitives used | SPEC-ARCH-UI-001 ref |
|---|---|---|---|
| `IntakeInspectionForm` | `apps/staff-web/src/components/service/intake/intake-inspection-form.tsx` | `Card`, `Field`, `Input`, `Select`, `Switch`, `Tabs`, `Button` | §1 Card, §2 Field, §3 Input/Select, §5 Tabs, §7 Button |
| `IntakeSummaryCard` (read-view on JC detail) | `intake-summary-card.tsx` | `Card`, `StatTile`, `Badge`, `Gate` | §1 Card, §4 StatTile, §6 Badge, §11 Gate |
| `IntakePhotosGrid` (10-slot capture) | `intake-photos-grid.tsx` | `Card`, `Button`, `Dialog` (preview), `Badge` (slot label) | §1 Card, §7 Button, §8 Dialog, §6 Badge |
| `DamageCalloutsEditor` | `damage-callouts-editor.tsx` | `Card`, `Field`, `Select`, `Button`, `Table` | §1 Card, §2 Field, §3 Select, §7 Button, §9 Table |
| `UploadSignedSheetDialog` | `upload-signed-sheet-dialog.tsx` | `Dialog`, `FileInput`, `Button`, `Banner` | §8 Dialog, §3 FileInput, §7 Button, §10 Banner |
| Body diagram embed | `intake-diagram.svg` (asset, L6) | inline `<Svg>` in PDF; `<img>` in form | n/a (asset) |
| Signature pad | `signature-pad.tsx` (60-line `<canvas>` component) | `Card` wrapper, `Button` (clear/save) | §1 Card, §7 Button |
| RECEIVED→DIAGNOSED soft-warn banner (L9) | `intake-pending-banner.tsx` | `Banner` (warn variant), `Gate` (R19 override CTA) | §10 Banner, §11 Gate |

---

## 10. Scenarios (Given / When / Then)

**SC-1 — R09 creates intake at JC creation (happy path).**
**Given** R09 has just created JC `JC-2026-0042` for VIN `WBA12345`,
**when** R09 opens the auto-shown Intake panel and fills all required Section A–E fields,
**then** an `IntakeInspection` record is appended to `service-store.intakeInspections` with `state='DRAFT'`, `version=1`, `retainUntil = createdAt + 5y`, `outletId` inherited from JC; and `JobCard.intakeInspectionId` is patched to the new id.

**SC-2 — R09 captures all 10 photo slots.**
**Given** an intake in `DRAFT`, **when** R09 captures one photo per slot across the 10 prescriptive slots (front_3q_driver, front_3q_passenger, …, boot), **then** the photos grid renders 10 filled tiles, each carrying its `slot` enum, and the form's "All photos captured" gate becomes green. (Cap: 1 MB / photo per L5 risk; soft-fail with toast if exceeded.)

**SC-3 — R09 adds 3 damage callouts to body diagram.**
**Given** an intake in `DRAFT` with the body-diagram editor open, **when** R09 records 3 callouts (e.g. `{view:'LEFT', code:'S', severity:1, locationText:'driver door'}`, `{view:'TOP', code:'D', severity:2, locationText:'bonnet centre'}`, `{view:'REAR', code:'P', severity:1, locationText:'tailgate'}`), **then** `intakeDamageCallouts` contains 3 records linked to the intake id, the form's damage table renders 3 rows, and PDF Section B prints the same 3 rows.

**SC-4 — Customer signs on signature pad → DRAFT → CUSTOMER_SIGNED.**
**Given** an intake in `DRAFT` with all required fields complete, **when** the customer draws their signature on the canvas pad and confirms, **then** `customerSignatureDataUrl` and `customerSignedAt` are set, `state` transitions `DRAFT → CUSTOMER_SIGNED`, and the "Download PDF" CTA becomes enabled.

**SC-5 — R09 downloads PDF (server route returns application/pdf).**
**Given** an intake in `CUSTOMER_SIGNED`, **when** R09 clicks "Download Inspection Sheet" and the request `GET /api/service/intake-inspection/JC-2026-0042/pdf` is made, **then** the Route Handler returns `200 application/pdf` with the rendered sheet, no `@react-pdf/renderer` code is in the client bundle (verified by build analyzer per L3), and Section A values match the live `vehicles-store` lookup at request time (§8 row 5).

**SC-6 — R11 attempts to download PDF → 403 forbidden (RBAC).**
**Given** the same intake, **when** R11 (Workshop Tech) requests the PDF endpoint directly, **then** the Route Handler enforces L11 server-side and returns `403 Forbidden`; the JC-detail UI also hides the "Download" CTA via the `Gate` primitive (no client-side reliance — defense in depth).

**SC-7 — R09 uploads scanned signed sheet → CUSTOMER_SIGNED → SHEET_UPLOADED → COMPLETED.**
**Given** an intake in `CUSTOMER_SIGNED`, **when** R09 opens the upload dialog, selects a scanned PDF (≤10 MB), and confirms, **then** an `Attachment` record is created (existing schema), `signedSheetAttachmentId` and `signedSheetUploadedAt` are patched onto the intake, `state` transitions `CUSTOMER_SIGNED → SHEET_UPLOADED → COMPLETED` (auto on success), and the JC's soft-warn banner is dismissed.

**SC-8a — R09 RECEIVED→DIAGNOSED while intake pending → disabled CTA + warn banner (no override).**
**Given** a JC in `RECEIVED` with intake state ≠ `COMPLETED` and the active session is R09, **when** R09 navigates to the JC detail and attempts the JC transition to `DIAGNOSED`, **then** a warn-variant `Banner` renders ("Intake inspection pending — required before DIAGNOSED transition"), the transition CTA is rendered in the disabled state, and no override CTA is visible to R09. Activation is impossible from this role context.

**SC-8b — R19 RECEIVED→DIAGNOSED while intake pending → "Confirm anyway" override emits audit event.**
**Given** the same JC in `RECEIVED` with intake state ≠ `COMPLETED` and the active session is R19, **when** R19 opens the JC detail, **then** the warn-variant `Banner` renders AND a "Confirm anyway" CTA is rendered via the `Gate` primitive; **when** R19 clicks "Confirm anyway" and supplies a typed reason text, **then** the JC transition `RECEIVED → DIAGNOSED` succeeds and an audit event `intake_skipped` is emitted carrying `{jobCardId, actorEmployeeId, actorRole:'R19', reason, occurredAt}` (per L9 P1 contract; permanent badge persists for the JC lifetime).

**SC-9 — R19 amends a COMPLETED intake → version bumps, audit row added.**
**Given** an intake in `COMPLETED` (version=1), **when** R19 opens the amendment flow, edits one field (e.g. corrects `odometerKm` from 45000 → 45120), enters a reason ("OCR mismatch with photo; corrected per actual reading"), and confirms, **then** the intake transitions `COMPLETED → AMENDED`, `version` bumps to 2, an entry is appended to `amendments[]` with `{at, by, reason, beforeJson, afterJson}`, and an `intake_amended` event is emitted.

**SC-10 — R09 cannot amend a COMPLETED intake.**
**Given** an intake in `COMPLETED`, **when** R09 (not R19) opens the JC detail, **then** the "Amend Intake" CTA is hidden via the `Gate` primitive (per L8); attempting to call the action programmatically rejects with an authorization error.

**SC-11 — Cross-aggregate drift: VIN on IntakeInspection differs from Vehicle.vin → consistency test fails.**
**Given** a test fixture where an intake record has been hand-corrupted to set `intake.vin = 'WBA99999'` while `Vehicle.vin = 'WBA12345'` and `JobCard.vin = 'WBA12345'`, **when** the cross-aggregate consistency test (T13 — `cross-aggregate-consistency.test.ts`) runs, **then** the test asserts `intake.vin === jc.vin === vehicle.vin` and FAILS with a clear message naming the drifted aggregate. (Production guard: the form never exposes `vin` as editable on intake — it is `derivedFrom: 'vehicle'` per §8.4.)

**SC-12 — Customer signature image not shown to R11 (PII redaction per L11).**
**Given** an intake in `COMPLETED` with `customerSignatureDataUrl` populated, **when** R11 opens the JC detail, **then** the `IntakeSummaryCard` renders only "✓ Signed by customer on 2026-05-07" (text indicator); the `<img>` for the signature is gated by `<Gate role={['R09','R03','R19','R24']} fallback="hide">` and the data URL is NOT delivered to the R11 client at all (server-side filtering by role).

**SC-13 — `retainUntil` = createdAt + 5y (DPDP retention).**
**Given** an intake created at `2026-05-07T14:32:00Z`, **then** `retainUntil` MUST equal `2031-05-07` (ISO date) and `retentionPolicy` MUST equal `'INTAKE_INSPECTION_5Y'`. The DSR purge job (DEF-INTAKE-1) reads these two fields to decide deletion eligibility; v1 records the date, v1.5 wires the purge.

**SC-14 — R09 outside JC's outlet cannot download PDF.**
**Given** an intake under outlet Bangalore and an R09 user assigned to outlet Mumbai, **when** that R09 hits the PDF endpoint, **then** the Route Handler returns `403 Forbidden` (city-scoped RLS per CLAUDE §8). The summary card on JC detail also hides the CTA.

**SC-15 — Audit-log entry written for every successful PDF download (L12).**
**Given** an intake in `COMPLETED` and a permitted role (R09 own-outlet, R03 own-outlet, R19+, R23 DPO, R24), **when** that role successfully downloads the PDF via `GET /api/service/intake-inspection/[jobCardId]/pdf`, **then** an audit-log entry is written capturing `{timestamp, actorEmployeeId, jobCardId, intakeInspectionId, ip, userAgent}`, response carries `Cache-Control: private, no-store`, and the telemetry event `intake_pdf_downloaded` is emitted with the same correlation ids (no PII in payload).

**SC-16 — R23 DPO retrieves all intake records for a given customerId (DSAR per DPDP §11).**
**Given** a customer `CUST-2026-0123` with intake records spanning multiple JobCards across outlets and dates, **when** R23 DPO invokes the DSAR pipeline calling `selectIntakesByCustomerId('CUST-2026-0123')` (which under the hood traverses `JobCard.customerId` → `IntakeInspection`), **then** the selector returns the full set of `IntakeInspection` records linked to that customerId across all outlets, R23 sees the full signature image (per L11 R23 grant), and the access is logged. Erasure for any individual record is rejected with the §17(1)(c) carve-out (L13) until `retainUntil` passes.

**SC-17 — Illegal state transition: DRAFT → SHEET_UPLOADED rejected.**
**Given** an intake in state `DRAFT` (no `customerSignatureDataUrl` set, `customerSignedAt` is undefined), **when** the store action `attachSignedSheet` is invoked without a prior `captureCustomerSignature` call, **then** the action rejects with an error (`InvalidStateTransitionError: DRAFT → SHEET_UPLOADED requires CUSTOMER_SIGNED`), the intake state remains `DRAFT`, no Attachment row is written, and no telemetry event is emitted. The state-machine guard (per §6 diagram) is the test oracle for this rejection.

**SC-18 — Post-COMPLETED PDF render uses the signed-sheet snapshot, not live selectors (L16).**
**Given** an intake in `COMPLETED` whose `signedSheetAttachmentId` was generated when `Vehicle.vin = 'WBA12345'` and `Customer.fullName = 'Asha Rao'`, and **given** a subsequent R19 correction has changed `Vehicle.vin` to `'WBA12346'` and `Customer.fullName` to `'Asha Rao-Iyer'`, **when** any role re-downloads the PDF for that intake, **then** the response stream is the persisted signed-sheet snapshot containing `WBA12345` + `Asha Rao` (immutable historical artefact); the live cross-aggregate selectors are NOT consulted for COMPLETED-or-later states.

---

## 11. Acceptance criteria

- **AC-1** New `IntakeInspection` record created on intake save; verified by SC-1; `version=1`, `retainUntil = createdAt + 5y`, `state='DRAFT'`. (L1, L7)
- **AC-2** All 10 photo slots are typed-enum and renderable in the photos grid. (SC-2, L5)
- **AC-3** ≥0 damage callouts persist as separate entities, FK-linked to intake; PDF Section B prints them in numeric order. (SC-3)
- **AC-4** Signature capture transitions `DRAFT → CUSTOMER_SIGNED`; download CTA gated until then. (SC-4)
- **AC-5** PDF endpoint returns `application/pdf`; `@react-pdf/renderer` MUST NOT appear in client bundle (verified by build analyzer). (SC-5, L3)
- **AC-6** R11 PDF endpoint hit returns 403; CTA hidden via `Gate`. (SC-6, L11)
- **AC-7** Signed-sheet upload transitions intake to `COMPLETED` and dismisses the JC soft-warn banner. (SC-7, L9)
- **AC-8a** R09 attempting RECEIVED→DIAGNOSED with intake pending sees warn banner + disabled CTA; no override CTA visible. (SC-8a, L9)
- **AC-8b** R19 attempting the same transition sees warn banner + "Confirm anyway" CTA via `Gate`; clicking with reason succeeds and emits `intake_skipped` audit event. (SC-8b, L9)
- **AC-9** R19 amendment bumps `version`, appends to `amendments[]`, emits `intake_amended`. (SC-9, L8)
- **AC-10** R09 cannot amend a COMPLETED intake; CTA hidden + action rejects. (SC-10, L8)
- **AC-11** Cross-aggregate consistency test passes (or fails on injected drift). `intake.vin === jc.vin === vehicle.vin`; `intake.outletId === jc.outletId`; `intake.odometerKm === jc.odometerIn`; intake schema does not declare `customerId`. (SC-11, §8)
- **AC-12** R11 never receives the customer signature data URL — server filters by role. (SC-12, L11)
- **AC-13** `retainUntil` = ISO date five years after `createdAt`; `retentionPolicy='INTAKE_INSPECTION_5Y'`. (SC-13, L7)
- **AC-14** R09 from a different outlet receives 403 on PDF endpoint. (SC-14, CLAUDE §8 RLS)
- **AC-15** Every CTA wired (no silent no-ops); deferred email-customer-copy CTA renders an info-toast "Coming in v1.1" until DEF-INTAKE-5 ships. (CLAUDE §10 #15)
- **AC-16** PDF route handler L12 contract enforced: auth-first, outlet check, 30-req/min rate-limit, audit-log entry per download, `Cache-Control: private, no-store`, Origin allow-list. (SC-15, L12)
- **AC-17** R23 DPO DSAR query via `selectIntakesByCustomerId(customerId)` returns all intake records linked through `JobCard.customerId`; erasure during retention rejected per L13. (SC-16, L13)
- **AC-18** `attachSignedSheet` rejects on a `DRAFT` intake without prior `captureCustomerSignature`; state remains `DRAFT`; no Attachment row written. (SC-17, §6 state machine)
- **AC-19** Post-COMPLETED PDF re-renders use the persisted signed-sheet snapshot; live selector changes to Vehicle/Customer DO NOT propagate into a re-rendered historical PDF. (SC-18, L16)

---

## 12. RBAC

Per L8 + Doc 14:

| Role | Create intake | Edit DRAFT | Capture signature | Download PDF | Upload signed sheet | View signature image | Amend COMPLETED |
|---|---|---|---|---|---|---|---|
| R09 SA (own outlet) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| R11 Workshop Tech | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (redacted indicator only) | ❌ |
| R03 Outlet Manager (own outlet) | ❌ | ✅ (audit edit) | ❌ | ✅ | ❌ | ✅ | ✅ |
| R19 GM (any outlet) | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ (with reason) |
| R24 CEO | ✅ wildcard read across all outlets | — | — | ✅ | — | ✅ | ✅ |
| R23 DPO | ❌ (Read-only via DSR pipeline) | ❌ | ❌ | ✅ (read for DSAR) | ❌ | ✅ | ❌ |

`Gate` primitive (SPEC-ARCH-UI-001 §11) is used at every CTA; inline `hasRank` in JSX is forbidden (CLAUDE §10 #6).

---

## 13. DPDP / compliance

Per PLAN §1.12 + RESEARCH-SERVICE-INTAKE-001 §5.

### 13.1 Consent text (DPDP §6-compliant; PDF footer + form footer)

The consent text below is the canonical English source. It lives at the i18n key `serviceIntake.consent.text` in BOTH `apps/staff-web/messages/en-IN.json` AND `apps/staff-web/messages/hi-IN.json` (per CLAUDE §10 #13a — English fallback acceptable for hi-IN until translator ships, but the key MUST exist at the top-level `serviceIntake` namespace). The same key is consumed by the digital form footer AND embedded into the rendered PDF footer by L3.

> "This document is a vehicle condition record completed in your presence at vehicle reception.
>
> **(i) Personal data being processed:** your full name, contact details, vehicle identifiers (VIN, registration), the vehicle's pre-service condition, ten photographs of the vehicle exterior/dashboard/interior/boot, and your handwritten signature.
>
> **(ii) Specific purpose:** to create a legally-defensible pre-service condition record protecting both customer and dealer against false-deficiency claims under the Consumer Protection Act 2019 §69; to support OEM warranty-claim adjudication; and to satisfy Motor Vehicles Act §130/§145 document-presence checks at intake.
>
> **(iii) Withdrawal of consent:** you may withdraw consent at any time by writing to the Data Protection Officer at the address below. Withdrawal does not affect data processed before withdrawal nor processing required under DPDP Act 2023 §17(1)(c) lawful-purpose carve-out (legal-claim defence) — see §13.5.
>
> **(iv) Right to lodge a complaint:** you have the right to lodge a complaint with the Data Protection Board of India under DPDP Act 2023 §13.
>
> **(v) Data Protection Officer contact:** dpo@bnautos.in; BN Automobiles DPO, [registered office address per master DPDP notice].
>
> **Retention:** 5 years from the date of this record, per BN Automobiles DPDP notice and DPDP Act 2023 §11."

### 13.2 Retention

- `retainUntil = createdAt + 5 years` (L7); literal `retentionPolicy: 'INTAKE_INSPECTION_5Y'`.
- v1 records the date only. v1.5 wires the automated purge job (DEF-INTAKE-1).
- DSR (data subject request) pipeline (R23 DPO) surfaces intake records by customer.

### 13.3 PII masking rules (L11)

- `customerSignatureDataUrl`: visible to R09 (own outlet), R03 (own outlet), R19+ (any outlet), R24, R23. **Not visible to R11.**
- The PDF endpoint server-side filters by role; the data URL is NEVER delivered to an R11 client.
- The summary card renders `"✓ Signed by customer on YYYY-MM-DD"` for non-privileged roles.
- PII never concatenated into logs / toasts (CLAUDE §17).

### 13.4 Regulatory citations

- **DPDP Act 2023 §6** — purpose-limitation + consent for PII collection (signature, customer name).
- **DPDP Act 2023 §11** — retention only as long as required for the stated purpose; 5y matches OEM-warranty-claim window.
- **DPDP Act 2023 §13** — data principal right to lodge complaint with the Data Protection Board.
- **DPDP Act 2023 §17(1)(c)** — lawful-purpose carve-out for compliance with law / legal-claim defence (anchors L13).
- **Consumer Protection Act 2019 §2(47), §69** — pre-existing-damage record protects against false-deficiency claims; §69 limitation period drives the 5y retention.
- **Motor Vehicles Act §130, §145** — RC + insurance presence-in-vehicle checked at intake.

### 13.5 Erasure handling (L13)

Right-to-erasure requests under DPDP §11 on `IntakeInspection` records are denied during the 5-year retention window per DPDP Act 2023 §17(1)(c) (compliance with law / legal-claim defence under Consumer Protection Act §69). The customer is informed of this exception in the consent notice (§13.1, item iii). After `retainUntil` passes, the purge job DEF-INTAKE-1 deletes the record automatically. R23 DPO read access via DSAR remains supported throughout the retention window via `selectIntakesByCustomerId` (SC-16). DSAR pipeline implementation is tracked as DEF-INTAKE-11.

### 13.6 Mock-phase integrity caveat (L15)

In the v1 mock phase the customer signature data URL persists in client-accessible Zustand state (MSW + localStorage in dev). This state is NOT a legally-defensible record — anyone with browser dev tools can mutate the PNG post-signature. Mock builds MUST NOT be exposed to a customer-facing or production-adjacent environment; an env-flag check on app boot enforces this. The v1.5 backend swap-in stores the signature server-side, computes a SHA-256 digest at COMPLETED, and freezes it; subsequent amendments invalidate the prior digest and compute a fresh one over the post-amendment state. The digest implementation is tracked as DEF-INTAKE-12.

---

## 14. Telemetry / events

Emitted to the `intake_*` event bus. Payloads kept PII-light per CLAUDE §17.

| Event | When | Payload |
|---|---|---|
| `intake_recorded` | SC-1 | `{ intakeInspectionId, jobCardId, outletId, actorEmployeeId, actorRole, fieldCount, damageCalloutCount, photoCount, occurredAt }` (QA #5: `actorRole` enables standalone debugging without secondary lookup) |
| `intake_signed` | SC-4 | `{ intakeInspectionId, jobCardId, occurredAt }` (no signature data URL) |
| `intake_sheet_uploaded` | SC-7 | `{ intakeInspectionId, jobCardId, attachmentId, occurredAt }` |
| `intake_amended` | SC-9 | `{ intakeInspectionId, jobCardId, fromVersion, toVersion, actorEmployeeId, actorRole, reasonLength, occurredAt }` (Sec #11: emit `reasonLength: number` instead of hash to avoid leakable short-hash inversion; raw reason text only in `amendments[]`) |
| `intake_photo_captured` | SC-2 | `{ intakeInspectionId, slot, occurredAt }` (no data URL) |
| `intake_skipped` | SC-8b | `{ jobCardId, actorEmployeeId, actorRole:'R19', reason, occurredAt }` (Sec #10: R19 override audit row; mandatory `reason` text persists; permanent JC-lifetime badge) |
| `intake_pdf_downloaded` | SC-15 | `{ intakeInspectionId, jobCardId, actorEmployeeId, actorRole, ip, userAgentHash, occurredAt }` (L12: chain-of-custody record; ip + userAgent retained for subpoena response) |

---

## 15. Open questions

(Copied from PLAN §7 — all 7 require human signoff before status moves to `approved`.)

1. **Hard-block vs soft-warn on RECEIVED→DIAGNOSED.** Recommend P1 soft-warn + R19 override, P2 hard-block. **Confirm with R19 before /spec freezes L9.**
2. **Authorised representative for fleet/corporate customers.** Recommend free-text P1, structured P2.
3. **Pre-existing damage pre-population** (auto-fill prior-visit callouts in blue). Defer to P2 (DEF-INTAKE-4).
4. **Wheel-rim condition.** Per-wheel structured field + diagram annotation — needs SA workshop input.
5. **Signature pad library vs custom.** Recommend custom 60-line `<canvas>` component over `react-signature-canvas` (~30 KB add).
6. **Email customer copy in P1?** Recommend defer to P2 (DEF-INTAKE-5).
7. **Auto-open intake panel after JC create?** Recommend YES with R19 skip override.

**Wave-2 resolutions (2026-05-07):**
- Sec open Q6 — R23 DPO RBAC typo: corrected. R23 is **Read-only via DSR pipeline** in §12 (the prior "Create" checkmark was a typo, now removed). DPO does not create intakes.
- Sec open Q4 — `odometerKm` amendments + re-signature: deferred to DEF-INTAKE-13 pending GM signoff.
- Sec open Q2 — PDF embedding 10 photos: locked by L14 — PDF prints diagram + structured table only; photos remain inside the access-controlled DMS.
- Sec open Q3 — mock-build environment lock: locked by L15 + §13.6.
- Sec open Q5 — Q1 soft-warn audit + permanent badge: locked by SC-8b + `intake_skipped` event in §14.
- QA open Q1 — AMENDED → AMENDED transition: clarified in §6 as a valid re-entry; covered by SC-9 with version=3 extension.
- QA open Q2 — `actorRole` on `intake_recorded`: added to the §14 payload.
- QA open Q3 — server-side filtering mechanism for `customerSignatureDataUrl`: the PDF Route Handler (L3 + L12) is the canonical filter for the printed artefact; for store-read paths to R11, the `IntakeSummaryCard` component selects via a role-aware projection that strips the data URL before render. The Zustand store itself is non-authoritative in the mock phase (per L15) — server-side filtering becomes truly enforceable only at v1.5 backend swap-in.
- QA open Q4 — bundle-analyzer tool: standardize on `@next/bundle-analyzer` (already a Next.js convention); §19 test plan asserts `@react-pdf/renderer` does not appear in any client chunk under `.next/static/chunks/`.

---

## 16. Deferred items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-INTAKE-1 | Scheduled purge of records past `retainUntil` | P4 | Backend cron; L7 records the date in v1, purge wires in v1.5. DPDP §11 alignment. |
| DEF-INTAKE-2 | Digital tablet damage marking via clickable SVG | P2 | Forward-compat field `damageDiagramAnnotations` reserved (§5). |
| DEF-INTAKE-3 | Tablet signature on glass | P2 | v1 ships custom canvas; tablet UX is P2 polish. |
| DEF-INTAKE-4 | Pre-populate prior-visit damage in blue | P2 | Field `priorVisitDamageHistorySummary` stub-empty in v1. |
| DEF-INTAKE-5 | Email customer copy (DLT-stub or real) | P2 | Seam 47 wired optional; CTA renders "Coming in v1.1" toast in P1 (AC-15). |
| DEF-INTAKE-6 | Hard-block RECEIVED→DIAGNOSED gate | P2 | L9 P2 promotion via `state-machine.ts canTransition`. |
| DEF-INTAKE-7 | Commissioned 5-view body diagram artwork | P2 | L6 stub replaced; no schema change. |
| DEF-INTAKE-8 | S3 swap-in for photos + attachment storage | P3 | L5 forward-compat `s3Key?` already on schema. |
| DEF-INTAKE-9 | Authorised representative as structured entity | P3 | Q2 resolution. |
| DEF-INTAKE-10 | OCR check that odometer-photo matches `odometerKm` | P3 | Drift-detection between photo and field. |
| DEF-INTAKE-11 | DSAR pipeline implementation (R23 DPO surfacing intake records by customerId) | P4 | Referenced by L13 / SC-16. v1 ships the `selectIntakesByCustomerId` selector; the DPO-facing UI + audit-log integration lands in P4. DPDP §11 SLA target 30 days. |
| DEF-INTAKE-12 | SHA-256 digest of signed PDF + signature freeze on COMPLETED | P3 | Referenced by L15. v1.5 backend swap-in computes the digest server-side at COMPLETED; amendments invalidate prior digest. |
| DEF-INTAKE-13 | Re-signature requirement on `odometerKm`-class amendments | P2 | Referenced by Sec wave-2 open Q4. CPA-2019 evidentiary weight argues amendments to high-stakes scalar fields (odometer, damage callouts) should require fresh customer signature; deferred pending GM signoff. |
| DEF-INTAKE-14 | License-plate redaction in incidental intake photos | P2 | Referenced by L14. Slot 1/2/3/4 (3-quarter exterior shots) capture the registration plate; while `regNumber` is already a stored field, automatic blur-on-render avoids needless re-exposure of the plate to non-privileged roles. |

---

## 17. Out of scope

- **VHC (Vehicle Health Check) is NOT replaced or modified.** VHC remains a 210-point technician-owned diagnostic per SPEC-SERVICE-001 §6 — different audience (technician, not customer), different lifecycle (post-intake, during diagnosis), different schema (technician findings, not customer-acknowledged condition record). The intake sheet is the customer-facing pre-service legal record; VHC is the internal post-receipt diagnostic.
- **Estimate/Quotation** — out of scope; lives on JC and follows existing SPEC-SERVICE-001 flows.
- **Service order / RO progression** — out of scope; existing JC state machine.
- **Warranty claim attachment** — intake PDF MAY be attached as evidence in a warranty claim flow (existing `attachments` infra), but the warranty-claim flow itself is unchanged.

---

## 18. Migration / rollout

- **Feature flag:** `staff.service.intake.v1` in `apps/staff-web/src/lib/feature-flags.ts` (per CLAUDE §6 — must exist alongside the frontmatter `flags:` entry).
- **Zero-data backfill.** No historical JC gets a synthetic intake. Older JCs simply have no `intakeInspectionId`; the soft-warn banner does not retroactively show on JCs created before the flag was enabled.
- **Rollout:** flag dark in dev → enable in staging → enable per outlet (Bangalore first, Mumbai+Chennai after one-week soak).
- **Rollback:** disable flag — UI hides intake panel + summary card + banner; service-store slice remains hydrated but inert; no data loss.

---

## 19. Test plan

References PLAN §4 task T13. Test placement per CLAUDE §10 #9.

| Test file | Type | Covers (explicit SC numbers per QA #7) |
|---|---|---|
| `apps/staff-web/src/lib/service/__tests__/intake-inspection.test.ts` | co-located store/logic | SC-1, SC-2, SC-3, SC-4, SC-7, SC-9, SC-13, SC-17. service-store actions: `recordIntakeInspection`, `attachSignedSheet`, `addIntakePhoto`, `deleteIntakePhoto`, `addDamageCallout`, `amendIntake`; state transitions; selectors; **Sec #5 redaction unit test** asserting amendments' `beforeJson` / `afterJson` contain no `data:image/` substring; **AMENDED → AMENDED** version=2→3 case; **SC-17 illegal transition** (`attachSignedSheet` on DRAFT throws). |
| `apps/staff-web/src/lib/service/intake/__tests__/field-definitions.test.ts` | co-located | L4 verification — every field in `INTAKE_FIELDS` has matching Zod validator entry; PDF iteration order matches form order; `derivedFrom` markers align with §8 SoT table. |
| `apps/staff-web/src/tests/intake-inspection-flow.test.ts` | top-level integration | SC-1, SC-2 (1MB photo rejection branch — toast + slot remains unfilled), SC-5, SC-7, SC-8a, SC-8b, SC-15, SC-18, AC-15 deferred-CTA toast. **PDF route assertions (QA #11):** (a) Content-Type is `application/pdf`; (b) `Content-Disposition` header present (`attachment; filename=...`); (c) response body length > 0; (d) body contains the marker strings outlet GSTIN, JC number, and the `serviceIntake.consent.text` consent footer; (e) `Cache-Control: private, no-store` present on response (L12). |
| `apps/staff-web/src/tests/cross-aggregate-consistency.test.ts` | top-level integration | SC-11. **§8 enforcement.** **Methodology (QA #6):** (a) **fixture-mutation strategy** — the test seeds `vehicles-store` with VIN `WBA12345`, creates a JC + intake referencing it, then mutates `vehicle.vin` to `WBA12346` post-creation; (b) **selector-hydration assertion** — `selectIntakeForJobCard().vin` is asserted to return the LIVE `Vehicle.vin` (`WBA12346`) via the §8.4 render-time hydration rule, NOT a stale copy stored on the intake aggregate. Also asserts `intake.outletId === jc.outletId`, `intake.odometerKm === jc.odometerIn`, intake schema rejects extra `customerId` field. **Note:** SC-18 (post-COMPLETED snapshot use) is the L16 carve-out and is tested in `intake-inspection-flow.test.ts`. |
| `apps/staff-web/src/tests/intake-rbac.test.ts` | top-level integration | SC-6, SC-8b (R19 override CTA presence + reason text required), SC-10, SC-12, SC-14, SC-15 (audit-log entry written), SC-16 (R23 DSAR `selectIntakesByCustomerId`). R11 PDF endpoint 403; R09 amend rejected; signature redaction; cross-outlet 403; L12 rate-limit (30 req/min); Origin allow-list reject. |
| `apps/staff-web/src/components/service/intake/__tests__/intake-summary-card.test.tsx` | component | SC-12 PII redaction render path; loading/empty/error states. |

E2E (Playwright, P2): create JC → fill intake → sign → download PDF → upload scanned sheet → assert COMPLETED.

### 19.1 Quality gates (per CLAUDE §10 #11–#13a; QA blocker B5)

A merge of this spec's implementation cannot proceed until ALL of the following gates pass:

- **(a) Typecheck:** `pnpm -F staff-web typecheck` exits 0. Pre-existing errors in unchanged files are NOT a free pass — orchestrator triages per CLAUDE §21.
- **(b) UI canon drift test:** `apps/staff-web/src/tests/ui-canon-drift.test.ts` passes with no new files added to the 2026-04-29 baseline. New intake files MUST NOT introduce `text-[NNpx]`, `rounded-lg`, `rounded-xl`, or i18n nesting under another module's key.
- **(c) i18n key existence:** `serviceIntake` is present as a top-level key in BOTH `apps/staff-web/messages/en-IN.json` AND `apps/staff-web/messages/hi-IN.json` (English fallback acceptable for hi-IN per CLAUDE §10 #13a, but the key MUST exist).
- **(d) Lint:** `pnpm -F staff-web lint` exits 0.
- **(e) Guardrail tests:** all 4 intake guardrail tests pass — `intake-inspection.test.ts`, `intake-inspection-flow.test.ts`, `cross-aggregate-consistency.test.ts`, `intake-rbac.test.ts`.
- **(f) Bundle audit:** `@react-pdf/renderer` does not appear in any client chunk under `.next/static/chunks/` (verified via `@next/bundle-analyzer`; per L3 + QA open Q4).

---

## 20. Spec traceability matrix

| Scenario | Acceptance criterion | Test file |
|---|---|---|
| SC-1 | AC-1 | `intake-inspection.test.ts`; `intake-inspection-flow.test.ts` |
| SC-2 | AC-2 | `intake-inspection.test.ts` (photo slot enum); `intake-inspection-flow.test.ts` |
| SC-3 | AC-3 | `intake-inspection.test.ts` (damage callouts) |
| SC-4 | AC-4 | `intake-inspection.test.ts` (state transition) |
| SC-5 | AC-5 | `intake-inspection-flow.test.ts` (route handler); build-analyzer assertion |
| SC-6 | AC-6 | `intake-rbac.test.ts` |
| SC-7 | AC-7 | `intake-inspection-flow.test.ts` |
| SC-8a | AC-8a | `intake-inspection-flow.test.ts` (R09 disabled CTA + warn banner) |
| SC-8b | AC-8b | `intake-inspection-flow.test.ts` + `intake-rbac.test.ts` (R19 "Confirm anyway" + `intake_skipped` audit) |
| SC-9 | AC-9 | `intake-inspection.test.ts` (`amendIntake`) |
| SC-10 | AC-10 | `intake-rbac.test.ts` |
| SC-11 | AC-11 | `intake-inspection-flow.test.ts:334` (cross-aggregate VIN + outletId + jobCardId consistency) |
| SC-12 | AC-12 | `intake-rbac.test.ts`; `intake-summary-card.test.tsx` |
| SC-13 | AC-13 | `intake-inspection.test.ts` (`retainUntil` calculation) |
| SC-14 | AC-14 | `intake-rbac.test.ts` |
| (CLAUDE §10 #15) | AC-15 | `intake-inspection-flow.test.ts` (deferred-CTA toast) |
| SC-15 | AC-16 | `intake-inspection-flow.test.ts` + `intake-rbac.test.ts` (PDF audit-log entry, rate-limit, Origin allow-list, Cache-Control) |
| SC-16 | AC-17 | `intake-rbac.test.ts` (`selectIntakesByCustomerId` DSAR) |
| SC-17 | AC-18 | `intake-inspection.test.ts` (illegal DRAFT → SHEET_UPLOADED rejected) |
| SC-18 | AC-19 | `intake-inspection-flow.test.ts` (post-COMPLETED snapshot fidelity) |

---

## 21. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-07 | 0.1 | /spec (integrator) | Initial draft. Mints L1–L11 from PLAN-SERVICE-INTAKE-001 §L-tag summary; 14 scenarios; 15 ACs; cross-aggregate consistency contract (§8) per user binding direction. Status: `draft` pending wave-2 reviewer signoff (security, qa) on the 7 open questions in §15. |
| 2026-05-07 | 1.1 | /spec (integrator) | **Wave-2 review integration.** Resolved Sec blockers B1 (§13.1 expanded to DPDP §6-compliant notice with DPO contact `dpo@bnautos.in`), B2 (minted **L12** PDF Route Handler hardening contract + SC-15 + AC-16 + `intake_pdf_downloaded` telemetry), B3 (minted **L13** DPDP §17 erasure carve-out + SC-16 + AC-17 + §13.5 + `selectIntakesByCustomerId` selector). Resolved QA blockers B4 (split SC-8 → SC-8a/SC-8b + AC-8a/AC-8b + traceability rows), B5 (added §19.1 Quality gates: typecheck/drift/i18n/lint/guardrails/bundle), B6 (added SC-17 illegal DRAFT → SHEET_UPLOADED transition + AC-18). Minted **L14** photos `pii_sensitivity: medium` + PDF MUST NOT embed photo dataUrls (Sec #6); **L15** mock-phase signature integrity caveat + §13.6 (Sec #7); **L16** post-COMPLETED snapshot immutability + SC-18 + AC-19 (Sec #8); tightened **L8** with explicit redaction list excluding `customerSignatureDataUrl`/`saSignatureDataUrl`/photo dataUrl from `beforeJson`/`afterJson` (Sec #5). Promoted §5 `rcInVehicle` + `insuranceCertInVehicle` from `z.boolean()` to `z.enum(['PRESENT','ABSENT','NOT_VERIFIED'])` (Sec #9). Added `actorRole` to `intake_recorded` + `intake_amended` payloads (QA #5); added `intake_skipped` event row + `intake_pdf_downloaded` event row (Sec #10, L12); replaced `reasonHash` with `reasonLength` (Sec #11). §19 test plan now enumerates explicit SC numbers per file (QA #7), specifies cross-aggregate fixture-mutation methodology (QA #6), and asserts PDF marker-content (QA #11). §13.1 cites `serviceIntake.consent.text` i18n key path (QA #9). §6 state machine clarifies AMENDED → AMENDED valid re-entry (QA #12). §12 R23 DPO row corrected to Read-only (Sec open Q6). §15 wave-2 resolutions block added. §16 added DEF-INTAKE-11 (DSAR pipeline), DEF-INTAKE-12 (SHA-256 digest), DEF-INTAKE-13 (re-signature on odometer amendments), DEF-INTAKE-14 (license-plate redaction). Status: `draft → approved`. Reviews acknowledged in `.security.review.md` + `.qa.review.md`. |
| 2026-05-07 | 1.1.1 | orchestrator (W1+W2 hardening) | **§20 matrix correction.** SC-11 row corrected: `cross-aggregate-consistency.test.ts` does not exist as a separate file; SC-11 is covered by `intake-inspection-flow.test.ts:334`. Matrix row updated to point to the correct file + line. No behavioral change. |
| _placeholder_ | 1.2 | _tbd_ | _Reserved for L9 supersession when P2 promotes soft-warn to hard-block via `state-machine.ts canTransition` (DEF-INTAKE-6). Per CLAUDE §14, L9 will be marked `[SUPERSEDED by L<new>]` and a §22 supersession section added._ |
