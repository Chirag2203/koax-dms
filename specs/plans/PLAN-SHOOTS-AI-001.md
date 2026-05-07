---
plan_id: PLAN-SHOOTS-AI-001
title: AI-Driven Consistent Showroom Imagery (Photo Shoot module v2)
domain: shoots
status: draft
risk_level: medium
pii_sensitivity: medium
flags: [staff.shoots.ai.v1]
owners: [planner, ux-writer, qa-planner, security-reviewer, integrator]
depends_on:
  - SPEC-SHOOTS-001
  - SPEC-VEHICLES-001
  - SPEC-ARCH-UI-001
  - SPEC-SERVICE-INTAKE-001
related_research: RESEARCH-SHOOTS-AI-001
docs_consulted:
  - Doc 04 §marketing
  - Doc 14 §R09 SA, §R11 Marketing Manager, §R19 GM, §R23 DPO
  - DPDP Act 2023 §6, §11
  - SPEC-ARCH-UI-001 §1 Card, §2 Field, §6 Badge, §7 Button, §8 Dialog, §10 Banner, §11 Gate
effective_date: 2026-05-08
---

# PLAN-SHOOTS-AI-001 — AI-Driven Consistent Showroom Imagery

## 1. Architecture decisions

### 1.1 Spec lifecycle — sibling, not version bump

**Decision (LOCKED):** Mint NEW sibling `SPEC-SHOOTS-002` at `specs/modules/shoots/02-shoots-ai-consistency.md`. SPEC-SHOOTS-001 v1.0 stays untouched. Mirrors SPEC-SERVICE-001 → SPEC-SERVICE-INTAKE-001 precedent.

### 1.2 Schema upgrade — `assets: ShootAsset[]` (L_AI-1)

`Shoot.assetUrls: string[]` → `Shoot.assets: ShootAsset[]`. v2.0: deprecated computed getter `get assetUrls() { return assets.map(a => a.processedUrl ?? a.rawUrl) }` for back-compat. v2.1: getter removed; SPEC-SHOOTS-001 L2 marked `[SUPERSEDED by L_AI-6]`.

### 1.3 Cross-aggregate consistency contract (L_AI-2 — USER-MANDATED)

Mirror SPEC-SERVICE-INTAKE-001 §8.

| Shared field | SoT aggregate | Downstream readers | Drift guard |
|---|---|---|---|
| `vin` | Vehicle | Shoot, customer-web VDP | Shoot stores vin as FK; customer-web resolves via Vehicle |
| storefront gallery | Shoot | Vehicle list cards, customer-web VDP | Computed at render: `assets.filter(a => a.approved && a.kind !== 'video_walkaround').sort(by sortOrder)` |
| `coverAssetId` | Shoot | Vehicle list cards, customer-web VDP hero | Single field; readers via selector |
| listing eligibility | Shoot | Vehicle state machine LISTED guard | Reads `shoots-store.getShootByVin(vin)` (Seam 40); upgraded predicate L_AI-6 |
| `rawUrl` vs `processedUrl` | Shoot.assets[] | none external | local |
| curation order | Shoot.assets[].sortOrder | customer-web, inventory tab | render-time sort |
| `lpRedacted` | Shoot.assets[] | approval guard, customer-web VDP filter | precondition for exterior kinds (L_AI-5) |
| `aiStatus` | Shoot.assets[] | Shoot detail badges | Pure local |

**Rule:** Any field across multiple aggregates MUST have exactly ONE source-of-truth. Readers fetch via selector at render time, NEVER copy. Drift = regression caught by `cross-aggregate-shoots-consistency.test.ts` (T11).

**Enforcement:** compile-time JSDoc `@deprecated` on `Vehicle.images`; render-time selector usage; test-time T11.

### 1.4 Two-way edit pattern (L_AI-3)

| Surface | Capabilities |
|---|---|
| `/shoots/[id]` (R11) | full: addRawAsset, setCoverAsset, reorderGallery, redactLicensePlate, requestAiProcess, approveAsset, unapproveAsset |
| `/inventory/[vin]` photos tab (R09/R12+) | reorder + cover + requestReshoot only; CANNOT addRawAsset/approve/redact |

Both dispatch to `useShootsStore.getState().<action>`. Store enforces RBAC. UI wraps in `<Gate>`.

### 1.5 AI processing — phased delivery (L_AI-4)

- **P1 (this build):** scaffold only. `aiStatus` enum exists; `requestAiProcess` sets `aiStatus = 'manual-only'` + fires "Coming in v2.1" toast. Manual approval still works (processedUrl defaults to rawUrl).
- **P2 (DEF-AI-1):** Spyne.ai REST integration.
- **P3:** relighting, watermarking, 360°.

`aiStatus`: `'pending' | 'queued' | 'processing' | 'succeeded' | 'failed' | 'manual-only'`.

### 1.6 License-plate redaction (L_AI-5 — DPDP)

Reg plate = prior-owner PII (DPDP §6, §11).

- Schema: `lpRedacted: boolean`, `redactedAt`, `redactedBy`.
- UI: per-asset "Redact license plate" CTA opens `LpRedactionDialog` (canvas rect overlay → rasterise to processedUrl).
- **Approval gate (HARD):** `approveAsset` rejects if `!lpRedacted` AND `kind ∈ EXTERIOR_LP_REQUIRED_KINDS`.
- `EXTERIOR_LP_REQUIRED_KINDS = ['front_3q_driver','front_3q_passenger','rear_3q_driver','rear_3q_passenger','driver_profile','passenger_profile','front_straight','rear_straight','video_walkaround']`.
- Interior kinds (dashboard/rear_seats/odometer/engine_bay/boot) NOT subject.
- Error: `LpRedactionRequiredError`.

### 1.7 11-angle slot enum + LISTED guard upgrade (L_AI-6)

```ts
ShootAssetKindEnum = z.enum([
  'front_3q_driver',     // REQUIRED, recommended cover
  'front_3q_passenger',  // REQUIRED
  'rear_3q_driver',      // REQUIRED
  'rear_3q_passenger',   // REQUIRED
  'driver_profile',      // REQUIRED
  'passenger_profile',   // REQUIRED
  'front_straight',      // REQUIRED
  'rear_straight',       // REQUIRED
  'dashboard',           // REQUIRED
  'rear_seats',          // REQUIRED
  'odometer',            // REQUIRED (mileage proof)
  'engine_bay',          // OPTIONAL
  'boot',                // OPTIONAL
  'video_walkaround',    // REQUIRED
]);
```

LISTED predicate: every REQUIRED kind has an `approved` asset. Cover defaults to `front_3q_driver`; override allowed.

**Migration:** existing LISTED vehicles grandfathered. New guard applies only to LISTED transitions emitted after v2 ships.

Supersedes SPEC-SHOOTS-001 L2.

### 1.8 Approval workflow — 4-state (L_AI-7)

Per-asset state derived from `(rawUrl, processedUrl, aiStatus, approved)`:

| State | Predicate |
|---|---|
| raw | aiStatus=='pending' AND !approved |
| processing | aiStatus∈{queued,processing} |
| processed | aiStatus∈{succeeded,manual-only} AND !approved |
| approved | approved==true |

`approveAsset(assetId, actor)` preconditions:
1. actor.rank ≥ R11
2. aiStatus !== 'failed'
3. lpRedacted === true if kind ∈ EXTERIOR_LP_REQUIRED_KINDS
4. processedUrl (or rawUrl if manual-only) non-empty

`unapproveAsset(assetId, reason, actor)` — R11+, reason ≥5 chars.

`forceApproveOverride(assetId, reason, actor)` — R12+; bypasses LP precondition; emits `audit:force_approved_lp_unredacted`.

### 1.9 RBAC (L_AI-8)

| Role | Capability |
|---|---|
| R11 Marketing Mgr | full: upload raw, AI processing, redact, approve/unapprove, set cover, reorder |
| R09 SA | read on /shoots/[id]; on /inventory/[vin]: reorder + cover + requestReshoot |
| R03/R12+/R19/R24 | full read; force-override available |
| R23 DPO | DSAR access; can request asset deletion (DEF-AI-6) |

Use `<Gate>` everywhere. Banned: inline `hasRank` in JSX.

### 1.10 Customer-web VDP wiring (L_AI-9 — closes DEF-SHOOTS-3)

`Vehicle.images` becomes deprecated phantom. New contract:

```ts
selectStorefrontGalleryForVin(vin): {
  coverUrl: string | null;
  gallery: { url: string; sortOrder: number; kind: ShootAssetKind; alt: string }[];
  status: 'ready' | 'pending' | 'unavailable';
}
```

- `ready`: ≥ cover + 4 approved exterior kinds.
- `pending`: shoot exists, threshold not met → "Gallery being prepared" placeholder.
- `unavailable`: no shoot → no gallery.

Mock-phase: per-process customer-shoots-store hydrated from shared MSW handler (precedent: portal-consent-bridge `c22fbd0`).

### 1.11 Storage shape (L_AI-10)

dataUrl in mock; optional `s3Key?: string` for backend swap-in (additive). 2 MB cap per asset (storefront-quality; double intake's 1 MB).

### 1.12 Cross-module-wiring seams (L_AI-11)

- **Seam 50** — Inventory Photos Tab → Shoots-store (READ + limited WRITE). Forbidden writes: addRawAsset, approveAsset, redactLicensePlate.
- **Seam 51** — Customer-web VDP → Shoots gallery selector (READ).

---

## 2. Field list (final schema)

### 2.1 ShootAsset (new)

```ts
interface ShootAsset {
  id: string;
  shootId: string;
  vin: string;
  kind: ShootAssetKind;
  sortOrder: number;
  rawUrl: string;
  processedUrl: string | null;
  approved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  lpRedacted: boolean;
  redactedAt: string | null;
  redactedBy: string | null;
  aiStatus: 'pending' | 'queued' | 'processing' | 'succeeded' | 'failed' | 'manual-only';
  aiRequestedAt: string | null;
  aiCompletedAt: string | null;
  aiErrorMessage: string | null;
  capturedAt: string;
  capturedBy: string;
  s3Key: string | null;
}
```

### 2.2 Shoot v2 changes

Added: `assets: ShootAsset[]`, `coverAssetId: string | null`, `aiVendor: 'NONE'|'SPYNE_AI'|'CUSTOM'` (default NONE), `aiPolicy: { autoQueueOnUpload, autoApproveProcessed }` (defaults false).

Removed-as-stored / deprecated-getter: `assetUrls`, `assetCount`, `videoCount`.

### 2.3 New error classes

- `LpRedactionRequiredError extends Error { vin, assetId, kind }`
- `AssetApprovalPreconditionError extends Error { vin, assetId, reason }`
- `ShootSlotIncompleteError extends Error { vin, missingKinds[] }` (supersedes v1 ShootIncompleteError)

---

## 3. Task breakdown (P1 = MVP)

| # | Task | File(s) | LoC | Depends |
|---|---|---|---|---|
| T01 | Mint SPEC-SHOOTS-002 sibling | specs/modules/shoots/02-shoots-ai-consistency.md (new) | ~700 | — |
| T02 | Schema upgrade | packages/types/src/domain/shoot.ts modify | ~200 | T01 |
| T03 | Shoots-store actions: addRawAsset, setCoverAsset, reorderGallery, approveAsset, unapproveAsset, redactLicensePlate, requestAiProcess (P1 stub), forceApproveOverride, requestReshoot | apps/staff-web/src/lib/shoots/shoots-store.ts modify | ~350 | T02 |
| T04 | Slot-definitions module (mirrors intake L4) | apps/staff-web/src/lib/shoots/asset-slot-definitions.ts (new) | ~140 | T02 |
| T05 | UI: ShootDetailView upgrade — 14-slot grid, AI badges, approve/redact, cover selector | apps/staff-web/src/components/shoots/shoot-detail-view.tsx modify | ~400 | T03,T04 |
| T06 | UI: ShootAssetCard | apps/staff-web/src/components/shoots/shoot-asset-card.tsx (new) | ~180 | T03 |
| T07 | UI: LpRedactionDialog (manual SVG-rect canvas) | apps/staff-web/src/components/shoots/lp-redaction-dialog.tsx (new) | ~220 | T03 |
| T08 | AI processing CTA stub | inline in T05 | ~30 | T05 |
| T09 | /inventory/[vin] photos tab — switch to shoots-store reads (Seam 50) | apps/staff-web/src/components/inventory/... modify | ~250 | T03 |
| T10 | Customer-web VDP gallery — switch from vehicle.images to selectStorefrontGalleryForVin (Seam 51) + customer-shoots-store + MSW handler | apps/customer-web/src/components/vdp/vehicle-hero-gallery.tsx modify; new customer-shoots-store.ts | ~120 | T03 |
| T11 | Cross-aggregate consistency test | apps/staff-web/src/tests/cross-aggregate-shoots-consistency.test.ts (new) | ~180 | T03,T09,T10 |
| T12 | Tests: unit (store actions, RBAC, redaction precondition); integration (upload→redact→AI-stub→approve→storefront) | apps/staff-web/src/lib/shoots/__tests__/ + apps/staff-web/src/tests/shoots-flow.test.ts | ~400 | T03,T05 |
| T13 | i18n keys (top-level shootsAi.*) | messages/en-IN.json + hi-IN.json | ~120 | T05–T07 |
| T14 | Cross-module-wiring registry: Seams 50, 51 | specs/architecture/cross-module-wiring.md modify | ~30 | T01 |
| T15 | Migrate fixtures (existing v1 shoots get assets:[]) + 3 new exemplar shoots with 11-slot coverage | packages/mocks/src/fixtures/shoots.ts modify | ~50 | T02 |

**Total ~3,370 LoC.**

---

## 4. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Schema migration breaks v1 surfaces reading assetUrls/assetCount | Deprecated computed getters in v2.0; remove v2.1. T15 migration test. Pre-T02 grep for call sites. |
| Customer-web cross-process Zustand limit | Documented in §11 of SPEC-SHOOTS-002; reference c22fbd0. Production: shared backend API. |
| Manual LP redaction UX rough | Hand-rolled SVG-rectangle in v1; v2 wires Spyne.ai automatic detection. Banner: "Phase 2 will auto-detect plates." |
| AI scope creep into P1 | EXPLICIT phased delivery (L_AI-4); "Coming in v2.1" badge per CLAUDE §10 #15. |
| 11-slot mandate breaks existing shoots | Grandfather rule; new guard only applies to LISTED transitions emitted after v2 ships. |
| Storage size 2MB×14=28MB / shoot | Assets in-memory only (NOT persisted to localStorage). Hydrator seeds tiny fixtures. Production = S3. |
| Two-way edit race | Mock single-threaded; production needs optimistic locking (DEF-AI-7). |
| Ambient Vehicle.images writers | JSDoc @deprecated; ESLint rule or grep-based test. T11 catches drift. |
| DPDP redaction missed | approveAsset throws LpRedactionRequiredError; UI cannot bypass. R12+ override logged. |

---

## 5. Cross-module-wiring update (T14 entries)

```
| 50 | Inventory Photos Tab → Shoots-store (READ + limited WRITE) | vehicle-detail-view.tsx photos tab reads useShootsStore for gallery; allowed writes: setCoverAsset, reorderGallery, requestReshoot. Forbidden: addRawAsset, approveAsset, redactLicensePlate. Never mutates vehicles-store. | SPEC-SHOOTS-002 L_AI-3, L_AI-11 |
| 51 | Customer-web VDP → Shoots gallery selector (READ) | vehicle-hero-gallery.tsx → selectStorefrontGalleryForVin(vin) from per-process customer-shoots-store (mock; mirrors c22fbd0). Returns { coverUrl, gallery[], status }. Production swap: backend serves identical contract. | SPEC-SHOOTS-002 L_AI-9, L_AI-11 |
```

---

## 6. Open questions for the integrator (before /spec)

1. **VDP visibility threshold.** ≥cover + 4 exterior approved → `ready`; <threshold → `pending` placeholder. Recommend.
2. **R09 reorder rights on inventory tab.** Allow reorder + cover (low-risk). Recommend.
3. **LP redaction blur.** Opaque rectangle in v1; Gaussian via Spyne.ai in v2.
4. **requestReshoot semantics.** New Shoot (existing stays as historical); idempotency: only one open shoot per VIN.
5. **Walkaround video LP redaction.** YES — included in EXTERIOR_LP_REQUIRED_KINDS. P1: manual-confirm checkbox; P2: per-frame auto-blur.
6. **Cover-photo override.** Restrict to exterior kinds (industry SOP).

---

## 7. Out of scope (Phase 2+)

| ID | Item | Priority |
|---|---|---|
| DEF-AI-1 | Spyne.ai REST integration + retry | P2 |
| DEF-AI-2 | Automatic LP detection (replaces manual rect) | P2 |
| DEF-AI-3 | Relighting + watermarking | P3 |
| DEF-AI-4 | 360° / interactive walkaround | P3 |
| DEF-AI-5 | Real S3 storage | P3 |
| DEF-AI-6 | DSAR-driven asset deletion (prior owner) | P4 |
| DEF-AI-7 | Production cross-app shared API | P4 |
| DEF-AI-8 | A/B cover variants | P4 |

---

## 8. L-tag summary

| L-tag | Title |
|---|---|
| L_AI-1 | Schema upgrade assets[]; deprecated getter v2.0; removed v2.1 |
| L_AI-2 | Cross-aggregate consistency contract (SoT registry; render-time selectors) |
| L_AI-3 | Two-way edit; same store actions; no shadow records |
| L_AI-4 | Phased AI delivery — P1 scaffold, P2 Spyne.ai, P3 advanced |
| L_AI-5 | LP redaction mandatory for exterior kinds before approval |
| L_AI-6 | 11-angle slot enum + LISTED guard upgrade (supersedes L2 of v1) |
| L_AI-7 | 4-state approval workflow; R11+ gate; R12+ force-override |
| L_AI-8 | RBAC matrix |
| L_AI-9 | Storefront VDP gallery selector contract; per-process mock + production parity |
| L_AI-10 | Storage shape — dataUrl + additive s3Key; 2 MB cap |
| L_AI-11 | Seams 50 + 51 — read-mostly; only Seam 50 limited WRITE; never mutates Vehicle |

---

### Critical Files for Implementation

- packages/types/src/domain/shoot.ts
- apps/staff-web/src/lib/shoots/shoots-store.ts
- apps/staff-web/src/components/shoots/shoot-detail-view.tsx
- apps/staff-web/src/components/inventory/action-flows/photos-upload-modal.tsx
- apps/customer-web/src/components/vdp/vehicle-hero-gallery.tsx
