---
spec_id: SPEC-SHOOTS-002
domain: shoots
title: AI-Driven Consistent Showroom Imagery (Photo Shoot v2)
status: in-review
version: 0.2.1
risk_level: medium
pii_sensitivity: medium
flags: [staff.shoots.ai.v1]
owners: [planner, ux-writer, qa-planner, security-reviewer, integrator]
depends_on:
  - SPEC-SHOOTS-001
  - SPEC-VEHICLES-001
  - SPEC-PLATFORM-001
  - SPEC-ARCH-UI-001
related_research: RESEARCH-SHOOTS-AI-001
related_plan: PLAN-SHOOTS-AI-001
docs_consulted:
  - Doc 04 §marketing
  - Doc 14 §R09 SA, §R11 Marketing Manager, §R19 GM, §R23 DPO
  - DPDP Act 2023 §6, §11
  - SPEC-ARCH-UI-001 §1 Card, §2 Field, §6 Badge, §7 Button, §8 Dialog, §10 Banner, §11 Gate
effective_date: 2026-05-08
---

# SPEC-SHOOTS-002 — AI-Driven Consistent Showroom Imagery (Photo Shoot v2)

## 1. Summary

This spec defines **v2 of the Photo Shoot capability** for BN Automobiles' staff DMS. It is a **sibling** to `SPEC-SHOOTS-001` (v1), not a replacement: v1 governs the Shoot lifecycle (`pending → scheduled → in-progress → completed`) and the count-only LISTED guard, while v2 layers on (a) a per-asset object model with kind/sortOrder/approval state, (b) license-plate redaction enforced for DPDP §6/§11, (c) an 11-angle slot enum that upgrades the LISTED predicate (supersedes v1 L2 in v2.1), (d) AI-processing scaffolding for Spyne.ai integration in v2.1 (P1 ships a stub), (e) a two-way edit pattern shared between `/shoots/[id]` (R11 full control) and `/inventory/[vin]` photos tab (R09 limited writes), and (f) a customer-web VDP gallery selector that replaces the deprecated `Vehicle.images` field. Primary user is **R11 Marketing Manager**; secondary is R09 SA via the inventory photos tab. The capability is gated behind feature flag `staff.shoots.ai.v1`. Per PLAN-SHOOTS-AI-001 §1.1, this spec mirrors the SPEC-SERVICE-001 → SPEC-SERVICE-INTAKE-001 sibling precedent.

---

## 2. Locked decisions

| Tag | Title | Decision | Source |
|---|---|---|---|
| L_AI-1 | Schema upgrade `assets[]`; deprecated getter v2.0; removed v2.1 | `Shoot.assetUrls: string[]` is replaced by `Shoot.assets: ShootAsset[]`. v2.0 ships a deprecated computed getter `get assetUrls() { return assets.map(a => a.processedUrl ?? a.rawUrl) }` for backward compatibility with v1 readers (e.g. existing `assetCount` widgets). v2.1 removes the getter and finalises the supersession of SPEC-SHOOTS-001 §L2. | PLAN §1.2; RESEARCH §2.1 |
| L_AI-2 | Cross-aggregate consistency contract (SoT registry; render-time selectors) | Every shared field across the Shoot ↔ Vehicle ↔ customer-web VDP boundary has exactly **one** source-of-truth aggregate. Downstream readers fetch via selector at render time and **never copy** values into their own state. Drift is a regression caught by `cross-aggregate-shoots-consistency.test.ts` (T11). Mirrors SPEC-SERVICE-INTAKE-001 §8. See §8 below for the full SoT table. | PLAN §1.3; RESEARCH §7 |
| L_AI-3 | Two-way edit; same store actions; no shadow records | The Shoot detail surface (`/shoots/[id]`, R11) and the Inventory photos tab (`/inventory/[vin]`, R09/R12+) dispatch to the **same** `useShootsStore` actions. The store enforces RBAC; the UI wraps actions in `<Gate>`. No shadow record is created in the Vehicle aggregate — the inventory tab is a read-mostly view of the Shoot with limited writes (reorderGallery, setCoverAsset, requestReshoot). Forbidden writes from the inventory surface: `addRawAsset`, `approveAsset`, `redactLicensePlate`. | PLAN §1.4; RESEARCH §6 |
| L_AI-4 | Phased AI delivery — P1 scaffold, P2 Spyne.ai, P3 advanced | P1 (this build) scaffolds only: `aiStatus` enum exists, `requestAiProcess` sets `aiStatus = 'manual-only'` and fires a "Coming in v2.1" toast (DoD §10 #15 — never silent). Manual approval works fully (processedUrl defaults to rawUrl). P2 (DEF-AI-1) wires Spyne.ai REST. P3 adds relighting / watermarking / 360°. `aiStatus` enum: `'pending' \| 'queued' \| 'processing' \| 'succeeded' \| 'failed' \| 'manual-only'`. | PLAN §1.5; RESEARCH §4.6, §11 |
| L_AI-5 | LP redaction mandatory for exterior kinds before approval | A vehicle registration plate is prior-owner PII per DPDP Act 2023 §6, §11. `approveAsset` rejects with `LpRedactionRequiredError` if `lpRedacted === false` AND `kind ∈ EXTERIOR_LP_REQUIRED_KINDS = ['front_3q_driver','front_3q_passenger','rear_3q_driver','rear_3q_passenger','driver_profile','passenger_profile','front_straight','rear_straight','video_walkaround']`. Interior kinds (dashboard, rear_seats, odometer, engine_bay, boot) are not subject. R12+ may invoke `forceApproveOverride(reason)` which emits an audit event `audit:force_approved_lp_unredacted`. | PLAN §1.6; RESEARCH §10 |
| L_AI-6 | 11-angle slot enum + LISTED guard upgrade (supersedes L2 of v1) | `ShootAssetKindEnum` defines 14 kinds; 11 of them are REQUIRED (8 exterior + 3 interior + 1 walkaround video) for storefront listing. The new LISTED predicate: every REQUIRED kind has at least one `approved` asset. Cover defaults to `front_3q_driver`; override allowed (must be an exterior kind). Existing LISTED vehicles are **grandfathered**: the new guard applies only to LISTED transitions emitted **after** v2 ships. Supersedes SPEC-SHOOTS-001 §L2 (count-only guard); v1 L2 remains canonical until v2.1 finalises the supersession (see v1 changelog row dated 2026-05-08). | PLAN §1.7; RESEARCH §3.1, §11 |
| L_AI-7 | 4-state approval workflow; R11+ gate; R12+ force-override | Per-asset state derived from `(rawUrl, processedUrl, aiStatus, approved)`: **raw** (`aiStatus=='pending' && !approved`), **processing** (`aiStatus ∈ {queued, processing}`), **processed** (`aiStatus ∈ {succeeded, manual-only} && !approved`), **approved** (`approved === true`). `approveAsset(assetId, actor)` preconditions: actor.rank ≥ R11; aiStatus !== 'failed'; `lpRedacted === true` if kind ∈ EXTERIOR_LP_REQUIRED_KINDS; processedUrl (or rawUrl when manual-only) non-empty. `unapproveAsset(assetId, reason, actor)` requires R11+ and reason ≥5 chars. `forceApproveOverride(assetId, reason, actor)` requires R12+ and emits an audit event. | PLAN §1.8 |
| L_AI-8 | RBAC matrix | R11 Marketing Manager is the primary surface, but the R11-tier writes (`addRawAsset`, `setAssetKind`, `redactLicensePlate`, `requestAiProcess`, `approveAsset`, `unapproveAsset`) use a **rank-based gate** `hasMinRank(role, 'R11')` — so R12+ (GM/CFO/CEO) and R23 DPO are also permitted (consistent with `canApproveAsset`). This explicitly enables R24 to drive AI enhancement (user direction 2026-05-08) and R19 GM to upload re-shoots when Marketing is unavailable, without carving an allowlist per action. R09 SA stays excluded by rank (6 < 8); on `/inventory/[vin]` photos tab R09 has Seam 50 limited writes (reorder + cover + requestReshoot). R03 Outlet Mgr is below R11 in the ladder so cannot upload/redact/request AI; can approve standard assets (outlet-scoped). Force-override (`forceApproveOverride`) remains R12+ exclusive (matches W3 refund-tier precedent). R23 DPO additionally owns the DSAR surface (DEF-AI-6). All UI gating via `<Gate>` primitive (SPEC-ARCH-UI-001 §11). Inline `hasRank` in JSX is banned. | PLAN §1.9; CLAUDE.md §10; user direction 2026-05-08 (R24 AI enhancement) |
| L_AI-9 | Storefront VDP gallery selector contract; per-process mock + production parity | Customer-web VDP reads `selectStorefrontGalleryForVin(vin) → { coverUrl, gallery: { url, sortOrder, kind, alt }[], status: 'ready' \| 'pending' \| 'unavailable' }`. `ready` requires ≥ cover + 4 approved exterior kinds. `pending` shows a "Gallery being prepared" placeholder card. `unavailable` hides the gallery entirely. **Selector tightening (B2 — security #2):** the selector ALWAYS reads `processedUrl` (NEVER falls back to `rawUrl ?? processedUrl`); for kinds in `EXTERIOR_LP_REQUIRED_KINDS` if `processedUrl` is null the asset is excluded from `gallery[]` regardless of `approved` status. The selector additionally EXCLUDES every asset where `forceApprovedWithoutRedaction === true` (force-approval grants internal listing-eligibility but NEVER bypasses DPDP for public exposure). `Vehicle.images` becomes a deprecated phantom (JSDoc `@deprecated`); the selector is the only contract. Mock-phase: per-process `customer-shoots-store` hydrated from a shared MSW handler (precedent: `portal-consent-bridge` commit `c22fbd0`). Production: backend serves the identical contract. Closes DEF-SHOOTS-3. | PLAN §1.10; RESEARCH §6; security review #2 |
| L_AI-10 | Storage shape — dataUrl + additive `s3Key`; 2 MB cap | Mock-phase stores raw and processed images as `dataUrl` strings on `ShootAsset`. Schema additionally carries an optional `s3Key?: string` field (additive, P2 swap-in). Per-asset cap is 2 MB (storefront-quality; double the 1 MB intake cap). On exceed: soft-fail with toast; asset is not added to the shoot. Assets are kept in-memory only (NOT persisted to localStorage) — hydrator seeds tiny exemplar fixtures. Production = S3 (DEF-AI-5). | PLAN §1.11 |
| L_AI-11 | Seams 50 + 51 — read-mostly; only Seam 50 limited WRITE; never mutates Vehicle | Two new cross-module seams registered in `specs/architecture/cross-module-wiring.md`: **Seam 50** (Inventory Photos Tab → Shoots-store, READ + limited WRITE) and **Seam 51** (Customer-web VDP → Shoots gallery selector, READ-only). Neither seam ever mutates the Vehicle aggregate. Seam 50 limited WRITE allows: setCoverAsset, reorderGallery, requestReshoot. Forbidden: addRawAsset, approveAsset, redactLicensePlate. | PLAN §1.12, §5 |
| L_AI-12 | Redaction non-destructiveness contract — single flattened raster | The LP-redaction operation MUST produce a single flattened raster (`image/jpeg` or `image/png` without preserved layers/alpha for the redacted region) where pixels under the redaction rectangle are unrecoverable. Implementation: `canvas.getContext('2d').drawImage(rawImage)` → `ctx.fillRect(redactionBox)` → `canvas.toDataURL('image/jpeg', 0.92)` flattens the layer; the source `rawUrl` is NOT exposed via any selector that reaches customer-web. The customer-web `selectStorefrontGalleryForVin` selector (L_AI-9) reads `processedUrl` ONLY — never falls back to `rawUrl` — and excludes assets where `forceApprovedWithoutRedaction === true`. A unit test asserts the rasterised output for an exterior asset has no recoverable plate pixels (compare-region pixel-hash against the original). | security review #1 (P0); DPDP Act 2023 §6, §11 |
| L_AI-13 | Spyne.ai DPA precondition for P2 | DEF-AI-1 (Spyne.ai REST integration) MUST NOT enter `in-build` until a signed Data Processing Agreement (per DPDP Act 2023 §8(5)) with the AI vendor is on file. The DPA must cover: purpose limitation, data retention (ideally zero-retention vendor-side), sub-processor disclosure, breach notification, and India data-residency (or §17 carve-out justification). The signed DPA URL/document-id MUST be referenced from this L-tag before P2 begins. Tracked as a hard prerequisite on DEF-AI-1. | security review #6 (P1); DPDP Act 2023 §8(5) |
| L_AI-14 | `/api/shoots/ai-process` route hardening contract | The Route Handler MUST: (a) require an authenticated session (401 if absent); (b) verify actor.rank ≥ R11 for `requestAiProcess` (403 otherwise); (c) enforce outlet RLS — actor.outletId must equal shoot.outletId for non-R19+ actors (403 otherwise); (d) zod-validate the request body and reject malformed input with 422; (e) rate-limit per-actor (token bucket, default 30/min); (f) emit one audit-log entry per request including `actorId, actorRole, outletId, shootId, assetId, vendor`. Mirrors L12 from SPEC-SERVICE-INTAKE-001. The P1 stub still applies these gates even though it returns the manual-only stub response. | security review #8 (P1); SPEC-SERVICE-INTAKE-001 §L12 |

---

## 3. Routes

| Route | Surface | Status | Notes |
|---|---|---|---|
| `/shoots/[id]` | staff-web shell | EXISTING (v1), UPGRADED in v2 | Adds 14-slot grid, AI badges, approve/redact CTAs, cover selector, LP-redaction dialog. Full R11 control surface. |
| `/inventory/[vin]` (Photos tab) | staff-web shell | EXISTING, EXTENDED | Switches reads from `vehicle.images` to `useShootsStore.getShootByVin(vin)` (Seam 50). Adds `<Gate>`-wrapped reorder, setCover, requestReshoot CTAs for R09/R12+. |
| `/api/shoots/ai-process` | staff-web Route Handler (NEW) | P1 stub, P2 wired | P1: returns `{ status: 'manual-only', message: 'AI processing arrives in v2.1' }`. P2: calls Spyne.ai REST. Server-side only (CLAUDE.md §12 — never call from client). **Hardening per L_AI-14**: auth/session check first (401), then role-rank ≥ R11 (403), then outlet RLS for non-R19+ (403), then zod-validated body (422), then per-actor rate-limit (default 30/min), then audit log per request including `actorId, actorRole, outletId, shootId, assetId, vendor`. The P1 stub applies all gates even though it returns the stub response. |
| customer-web VDP gallery (`/collection/[vin]`) | customer-web | EXTENDED | Switches `vehicle-hero-gallery.tsx` from `vehicle.images` to `selectStorefrontGalleryForVin(vin)` (Seam 51). |

---

## 4. Personas

| Role | Persona | Primary surface | Capabilities in v2 |
|---|---|---|---|
| R11 | Marketing Manager | `/shoots/[id]` | Primary owner. Full asset lifecycle: upload, kind tagging, AI processing (P1 stub), LP redaction, approve/unapprove, set cover, reorder. |
| R09 | Sales Advisor | `/inventory/[vin]` photos tab | Limited writes via Seam 50: reorder, set cover, requestReshoot. Read on `/shoots/[id]`. |
| R03 / R12+ / R19 / R24 | Senior staff (Sales Mgr+, GM, CFO/CEO) | both | Full read everywhere. R12+ may invoke `forceApproveOverride` (audited). |
| R23 | DPO | dedicated DSAR surface (DEF-AI-6) | DSAR-driven asset retrieval and deletion-on-request. Reads via cross-aggregate selector (§8). |

---

## 5. Data model

```ts
// packages/types/src/domain/shoot.ts (v2 additions)
export const ShootAssetKindEnum = z.enum([
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
export type ShootAssetKind = z.infer<typeof ShootAssetKindEnum>;

export const AiStatusEnum = z.enum([
  'pending', 'queued', 'processing', 'succeeded', 'failed', 'manual-only',
]);

export const ShootAssetSchema = z.object({
  id: z.string(),
  shootId: z.string(),
  vin: z.string(),
  kind: ShootAssetKindEnum,
  sortOrder: z.number().int().nonnegative(),
  rawUrl: z.string(),
  processedUrl: z.string().nullable(),
  approved: z.boolean(),
  approvedAt: z.string().nullable(),
  approvedBy: z.string().nullable(),
  lpRedacted: z.boolean(),
  redactedAt: z.string().nullable(),
  redactedBy: z.string().nullable(),
  aiStatus: AiStatusEnum,
  aiRequestedAt: z.string().nullable(),
  aiCompletedAt: z.string().nullable(),
  aiErrorMessage: z.string().nullable(),
  capturedAt: z.string(),
  capturedBy: z.string(),
  s3Key: z.string().nullable(),
  // Persistent force-approval attributes (B3 — security review #3).
  // When forceApprovedWithoutRedaction === true the asset card renders a
  // permanent red badge "Force-approved without redaction" visible to all
  // roles, and the customer-web selector (L_AI-9) excludes it from gallery[].
  forceApprovedWithoutRedaction: z.boolean().default(false),
  forceApprovedReason: z.string().nullable().default(null),
  forceApprovedBy: z.string().nullable().default(null),
  forceApprovedAt: z.string().nullable().default(null),
});
export type ShootAsset = z.infer<typeof ShootAssetSchema>;

// Updated Shoot v2
export const ShootSchemaV2 = ShootSchema.extend({
  assets: z.array(ShootAssetSchema).default([]),
  coverAssetId: z.string().nullable(),
  aiVendor: z.enum(['NONE', 'SPYNE_AI', 'CUSTOM']).default('NONE'),
  aiPolicy: z.object({
    autoQueueOnUpload: z.boolean().default(false),
    autoApproveProcessed: z.boolean().default(false),
  }),
  // assetUrls: deprecated computed getter (v2.0 only) — see L_AI-1
});

// New error classes
export class LpRedactionRequiredError extends Error {
  constructor(public readonly vin: string, public readonly assetId: string, public readonly kind: ShootAssetKind) {
    super(`License plate must be redacted before approving exterior asset ${assetId} (kind=${kind}) for VIN ${vin}`);
  }
}
export class AssetApprovalPreconditionError extends Error {
  constructor(public readonly vin: string, public readonly assetId: string, public readonly reason: string) {
    super(`Asset ${assetId} (VIN ${vin}) cannot be approved: ${reason}`);
  }
}
export class ShootSlotIncompleteError extends Error {
  constructor(public readonly vin: string, public readonly missingKinds: ShootAssetKind[]) {
    super(`Shoot for VIN ${vin} missing required approved kinds: ${missingKinds.join(', ')}`);
  }
}
```

`ShootSlotIncompleteError` supersedes v1's `ShootIncompleteError` for v2-flagged transitions.

---

## 6. State machine

### 6.1 Per-asset state (4-state)

```
                   requestAiProcess (P2)        approveAsset
   ┌──────┐  ─────────────────────────►  ┌────────────┐  ──────►  ┌──────────┐
   │ raw  │                              │ processing │           │ approved │
   └──────┘                              └────────────┘           └──────────┘
       │                                       │                        ▲
       │  (P1 stub: aiStatus='manual-only')    │ aiStatus=succeeded     │
       │                                       ▼                        │
       │                                 ┌───────────┐  approveAsset    │
       └────────────────────────────────►│ processed │ ─────────────────┘
                                         └───────────┘
                                         ▲
                                  unapproveAsset(reason)
```

State predicates per L_AI-7:

| State | Predicate |
|---|---|
| raw | `aiStatus === 'pending' && !approved` |
| processing | `aiStatus ∈ {'queued','processing'}` |
| processed | `aiStatus ∈ {'succeeded','manual-only'} && !approved` |
| approved | `approved === true` |

### 6.2 Shoot-level state

The v1 status enum (`pending → scheduled → in-progress → completed`) is **unchanged** in v2. The LISTED-eligibility predicate (computed, not persisted) is upgraded per L_AI-6.

### 6.3 Approval state machine + LP-redaction gate (L_AI-7)

```
processed → approveAsset(actor)
   ├── if kind ∈ EXTERIOR_LP_REQUIRED_KINDS && !lpRedacted
   │     → throw LpRedactionRequiredError (unless forceApproveOverride by R12+)
   ├── if actor.rank < R11
   │     → throw AssetApprovalPreconditionError("rank < R11")
   ├── if aiStatus === 'failed'
   │     → throw AssetApprovalPreconditionError("ai failed")
   ├── if kind === 'video_walkaround'
   │     → require actor.rank ≥ R12 AND typed reason ≥ 10 chars
   │       (escalated approval gate per security review #12; folded into L_AI-5)
   │       on success: emit shoot_asset_approved + audit:walkaround_lp_confirmed
   └── else → approved = true; emit shoot_asset_approved
```

**Cover-photo validity precondition (folded into L_AI-7; security review #5):**
`setCoverAsset(shootId, assetId, actor)` MUST verify that the target asset satisfies ALL of:
- `asset.approved === true`
- `asset.kind ∈ EXTERIOR_LP_REQUIRED_KINDS \ {video_walkaround}`
- `asset.forceApprovedWithoutRedaction === false`

Otherwise the store throws `AssetApprovalPreconditionError("cover must be approved exterior with redaction")`. The `<Gate>` only renders the star CTA on assets satisfying these preconditions.

---

## 7. Cross-module integration

### 7.1 Seam 50 — Inventory Photos Tab → Shoots-store (READ + limited WRITE)

`vehicle-detail-view.tsx` photos tab subscribes to `useShootsStore(s => s.getShootByVin(vin))`. Allowed writes (R09 gate via `<Gate role={['R09','R12','R19','R24']}>`): `setCoverAsset`, `reorderGallery`, `requestReshoot`. Forbidden writes (UI does not render the action and the store rejects): `addRawAsset`, `approveAsset`, `redactLicensePlate`. Never mutates `vehicles-store`.

### 7.2 Seam 51 — Customer-web VDP → Shoots gallery selector (READ)

`vehicle-hero-gallery.tsx` calls `selectStorefrontGalleryForVin(vin)` from a per-process `customer-shoots-store` hydrated by a shared MSW handler (precedent: `c22fbd0` portal-consent-bridge). Returns `{ coverUrl, gallery[], status }`. Production: backend serves identical contract.

Both seams to be registered in `specs/architecture/cross-module-wiring.md` by `/implement` task T14 (per PLAN §5).

---

## 8. Cross-aggregate consistency contract

**This section mirrors SPEC-SERVICE-INTAKE-001 §8 verbatim in pattern. It is a USER-MANDATED constraint per L_AI-2.**

### 8.1 Source-of-truth (SoT) registry

| Shared field | SoT aggregate | Downstream readers | Drift guard |
|---|---|---|---|
| `vin` | **Vehicle** | Shoot, customer-web VDP | Shoot stores `vin` as FK; customer-web resolves Vehicle by VIN. Vehicle is canonical and never re-written. |
| storefront gallery (approved photos) | **Shoot** | Vehicle list cards, customer-web VDP | Computed at render time as `assets.filter(a => a.approved && a.kind !== 'video_walkaround').sort(by sortOrder)`. **Never copied** into `Vehicle.images`. |
| `coverAssetId` | **Shoot** | Vehicle list cards, customer-web VDP hero | Single field on `Shoot`; readers fetch via selector at render time. |
| listing eligibility | **Shoot** | Vehicle state-machine LISTED guard | Predicate reads `useShootsStore.getShootByVin(vin)` (Seam 40); upgraded predicate per L_AI-6. |
| `rawUrl` vs `processedUrl` per asset | **Shoot.assets[]** | none external | Local to Shoot. |
| curation order | **Shoot.assets[].sortOrder** | customer-web gallery, inventory tab | Render-time sort. |
| `lpRedacted` | **Shoot.assets[]** | approval guard, customer-web VDP filter | Precondition for exterior kinds (L_AI-5). |
| `aiStatus` | **Shoot.assets[]** | Shoot detail badges | Local to Shoot. |

### 8.2 The rule

Every shared field above has **exactly one** source-of-truth aggregate. Downstream readers fetch via selector at render time. **No reader copies a value into its own state.** Drift = a regression caught by `cross-aggregate-shoots-consistency.test.ts` (T11).

### 8.3 Three enforcement layers

1. **Compile-time** — `Vehicle.images` carries a `@deprecated` JSDoc tag pointing to `selectStorefrontGalleryForVin`. New writes to `Vehicle.images` raise an editor warning.
2. **Render-time** — `vehicle-hero-gallery.tsx` and the inventory photos tab consume the selector; tests assert no direct read of `Vehicle.images` remains in those files.
3. **Test-time** — T11 (`cross-aggregate-shoots-consistency.test.ts`) drives a scenario across stores: edit on `/shoots/[id]` → assert reflected on `/inventory/[vin]` and on customer-web VDP within the same render tick. SC-16 is the exemplar.

---

## 9. UI surfaces

All primitives cite `SPEC-ARCH-UI-001`. No local redefinition of Card/Field/Dialog (CLAUDE.md §6). Pre-flight UI checklist in CLAUDE.md §17.1 applies.

| Component | File | Primitives used | Notes |
|---|---|---|---|
| `ShootDetailView` (upgrade) | `apps/staff-web/src/components/shoots/shoot-detail-view.tsx` | `Card` (§1), `Field` (§2), `Badge` (§6), `Button` (§7), `Gate` (§11) | 14-slot grid (one tile per `ShootAssetKindEnum`); per-tile AI/redaction/approval badges; cover-selector star; reorder via drag handle. |
| `ShootAssetCard` (new) | `apps/staff-web/src/components/shoots/shoot-asset-card.tsx` | `Card` (§1), `Badge` (§6), `Button` (§7) | Renders one asset's thumbnail, kind label, 4-state badge, approve/redact CTAs. |
| `LpRedactionDialog` (new) | `apps/staff-web/src/components/shoots/lp-redaction-dialog.tsx` | `Dialog` (§8), `Button` (§7), `Banner` (§10) | SVG-rectangle canvas overlay → rasterise to processedUrl. P2 will replace with auto-detection (DEF-AI-2). |
| Inventory Photos tab integration | `apps/staff-web/src/components/inventory/...` (modify) | `Card` (§1), `Gate` (§11) | Reads via Seam 50; renders shared `ShootAssetCard`s; gates write CTAs. |
| `vehicle-hero-gallery` (customer-web, modify) | `apps/customer-web/src/components/vdp/vehicle-hero-gallery.tsx` | n/a (customer-surface) | Switches read source to `selectStorefrontGalleryForVin`. Renders `pending` placeholder when status !== 'ready'. |

i18n keys land under top-level `shootsAi.*` in `messages/en-IN.json` AND `messages/hi-IN.json` (CLAUDE.md §10 #13a; T13).

---

## 10. Scenarios (GPA)

### SC-1 R11 uploads raw asset → assigned slot → aiStatus=pending
**Given** R11 is on `/shoots/[id]` for an in-progress shoot **When** R11 drops a JPEG into the `front_3q_driver` slot **Then** `addRawAsset` creates a `ShootAsset` with `kind='front_3q_driver'`, `aiStatus='pending'`, `approved=false`, `lpRedacted=false`, and the tile transitions to **raw** state.

### SC-2 R11 requests AI process (P1 stub) → toast "Coming in v2.1"; aiStatus → manual-only
**Given** an asset in **raw** state **When** R11 clicks "Process with AI" **Then** the store sets `aiStatus='manual-only'`, `processedUrl=rawUrl`, and an info-toast renders "AI processing arrives in v2.1"; tile transitions to **processed** state. (DoD §10 #15 — never silent.)

### SC-3 R11 redacts license plate on exterior kind → lpRedacted=true; processedUrl populated
**Given** a **processed** exterior asset (`kind='front_3q_driver'`, `lpRedacted=false`) **When** R11 opens `LpRedactionDialog`, draws a rectangle, saves **Then** the asset gets `lpRedacted=true`, `redactedAt`, `redactedBy`, and `processedUrl` is updated to the rasterised redacted version; event `shoot_asset_redacted` fires.

### SC-4 R11 approves redacted exterior asset → approved=true (4-state goes processed → approved)
**Given** a **processed** exterior asset with `lpRedacted=true` **When** R11 clicks "Approve" **Then** `approveAsset` sets `approved=true`, `approvedAt`, `approvedBy`; tile transitions to **approved**; event `shoot_asset_approved` fires.

### SC-5 R11 attempts to approve unredacted exterior asset → LpRedactionRequiredError
**Given** an exterior asset with `lpRedacted=false` and `kind='front_3q_driver'` **When** R11 invokes `approveAsset` **Then** the store throws `LpRedactionRequiredError`; UI surfaces an error toast; asset stays **processed**; no event fires.

### SC-6 R12+ force-approves unredacted exterior → audit event emitted; approved=true with override flag
**Given** an exterior asset with `lpRedacted=false` and an actor with rank R12+ **When** the actor invokes `forceApproveOverride(assetId, reason)` **Then** the store sets `approved=true`, emits `shoot_force_approved` and `audit:force_approved_lp_unredacted` with the actor id and reason.

### SC-7 R09 attempts to upload raw asset → 403 from store; UI hides via Gate
**Given** R09 is on `/inventory/[vin]` photos tab **When** R09's UI renders **Then** the "Upload" CTA is **hidden** by `<Gate role={['R11']}>`; if R09 invokes `addRawAsset` directly, the store throws `AssetApprovalPreconditionError("forbidden: R09 cannot addRawAsset")`.

### SC-8 R09 reorders gallery on /inventory/[vin] photos tab → success (Seam 50 limited WRITE)
**Given** R09 on the inventory photos tab with an existing shoot **When** R09 drags assets to reorder **Then** `reorderGallery` succeeds, `sortOrder` is updated on each affected asset, event `shoot_gallery_reordered` fires.

### SC-9 R09 sets cover photo via inventory tab → success
**Given** R09 on inventory photos tab **When** R09 clicks the star on an approved exterior asset **Then** `setCoverAsset` updates `Shoot.coverAssetId`, event `shoot_cover_set` fires.

### SC-10 R09 attempts approveAsset via inventory tab → forbidden (UI hides AND store rejects)
**Given** R09 on inventory photos tab **When** UI renders **Then** the "Approve" CTA is hidden by `<Gate>`; if invoked directly the store throws.

### SC-11 LISTED transition with all 11 required slots approved → success
**Given** a Shoot whose `assets` cover all 11 REQUIRED kinds with `approved=true` **When** the LISTED guard runs (Seam 40) **Then** the predicate returns true; the LISTED transition succeeds.

### SC-12 LISTED transition with missing slot → ShootSlotIncompleteError; missingKinds enumerated
**Given** a Shoot missing approved `odometer` and `dashboard` assets **When** the LISTED guard runs **Then** it throws `ShootSlotIncompleteError(vin, ['odometer','dashboard'])`; the LISTED transition is rejected; toast surfaces missing kinds.

### SC-13 Customer-web VDP renders `ready` status (≥ cover + 4 exterior approved) — gallery shown in sortOrder
**Given** a Shoot with `coverAssetId` set and ≥4 approved exterior kinds **When** customer-web VDP renders **Then** `selectStorefrontGalleryForVin` returns `status='ready'`; `vehicle-hero-gallery` renders cover + remaining gallery in `sortOrder`.

### SC-14 Customer-web VDP renders `pending` status — placeholder card
**Given** a Shoot exists but threshold not met (e.g. 2 approved exterior) **When** VDP renders **Then** selector returns `status='pending'`; a "Gallery being prepared" placeholder card is shown in place of the hero.

### SC-15 Customer-web VDP renders `unavailable` status (no shoot for VIN) — gallery hidden
**Given** no Shoot exists for the VIN **When** VDP renders **Then** selector returns `status='unavailable'`; the gallery section is hidden entirely (no placeholder).

### SC-16 Cross-aggregate drift: cover changed on /shoots/[id] → /inventory/[vin] tab AND customer-web VDP both reflect new cover within same render tick
**Given** R11 changes the cover on `/shoots/[id]` **When** the user navigates to `/inventory/[vin]` photos tab AND a customer renders the VDP **Then** both surfaces reflect the new cover via the SoT selector with **no copy** — verified by T11 in a single render tick.

### SC-17 Cross-aggregate drift: VIN-corrected on Vehicle aggregate → Shoot.vin selector returns new value at next render
**Given** a Vehicle's VIN is corrected (rare) **When** Shoot's VIN-FK selector resolves on next render **Then** the new VIN is observed by readers (since `Shoot.vin` is an FK reference, not a copy of Vehicle's canonical VIN — test asserts pointer equality semantics in mock).

### SC-18 R23 DPO retrieves all shoots-with-assets for DSAR via selector
**Given** R23 invokes a DSAR for a prior owner (consignor) **When** the selector `selectShootsByConsignorId` runs **Then** all Shoots associated with vehicles previously owned by that consignor are returned with their full asset list including `lpRedacted` flags. (Surface deferred — DEF-AI-6 — but data path is exercised by test.)

### SC-19 R09 requestReshoot creates new Shoot; existing one stays as historical record
**Given** an existing completed Shoot for a VIN **When** R09 invokes `requestReshoot(vin, reason)` **Then** a new Shoot is created in `pending` status; the prior Shoot is retained unchanged as a historical record; event `shoot_reshoot_requested` fires.

### SC-20 Existing v1 LISTED vehicle WITHOUT 11-slot coverage stays LISTED post-v2 deploy (grandfather rule, L_AI-6 migration)
**Given** a vehicle that became LISTED under v1's count-only guard **When** v2 deploys **Then** the vehicle remains LISTED; the new 11-slot predicate applies only to LISTED transitions emitted **after** v2 ships.

### SC-21 Asset 2 MB cap exceeded → soft-fail with toast; asset not added
**Given** R11 attempts to upload a 3 MB JPEG **When** `addRawAsset` validates size **Then** it rejects with a soft-fail; an error toast renders "Image exceeds 2 MB limit"; no asset is added to the shoot.

### SC-22 v1 → v2 schema migration: v1 shoot with assetUrls=['url1','url2'] becomes v2 shoot with assets=[]
**Given** a v1 fixture with `assetUrls=['u1','u2']` **When** the v2 hydrator runs **Then** the migrated shoot has `assets: []` and `coverAssetId: null`; the deprecated v2.0 getter `assetUrls` returns `[]` (computed; v1 URLs intentionally discarded — no automatic re-association since v1 had no slot-kind metadata to map them onto); new uploads go via the v2 `addRawAsset` path. **Sub-case (deprecated-getter equivalence):** for a v2 shoot populated with three assets having `processedUrl` set, the deprecated getter MUST return `assets.map(a => a.processedUrl ?? a.rawUrl)` — verified by a separate equivalence test. (v2.1 removes the getter.)

### SC-23 R11 attempts forceApproveOverride → rejected (rank < R12)
**Given** R11 on `/shoots/[id]` viewing an unredacted exterior asset **When** R11 invokes `forceApproveOverride(assetId, reason)` **Then** the store throws `AssetApprovalPreconditionError("rank < R12 — force-override forbidden")`; the asset stays unapproved; no event fires; UI surfaces an error toast. (Per L_AI-7 force-override threshold.)

### SC-24 R11 attempts approveAsset on aiStatus='failed' asset → rejected
**Given** an asset with `aiStatus='failed'` (Spyne.ai retry exhausted in P2; or simulated in P1 mock) **When** R11 invokes `approveAsset(assetId)` **Then** the store throws `AssetApprovalPreconditionError("ai failed")`; asset stays in **processed**-with-failed state; no `shoot_asset_approved` event fires. Closes the failed-AI guard combinatorial gap (QA review #2).

### SC-25 LISTED guard with all 11 required slots present but one exterior unredacted → fails
**Given** a Shoot where every REQUIRED kind has at least one asset uploaded, but one exterior asset has `lpRedacted=false` (so it cannot be approved) **When** the LISTED guard runs **Then** the predicate throws either `ShootSlotIncompleteError` OR `LpRedactionRequiredError`; `missingKinds` enumerates the unredacted asset's id (not its kind, since the kind is "present" in slot terms but the asset is not approval-eligible). Distinct from SC-12 (slot missing entirely). Closes the "uploaded-but-not-approvable" gap (QA review #3).

### SC-26 Vehicle UNLISTED post-v1, RE-LISTED post-v2 deploy — must satisfy v2 11-slot guard (no grandfather)
**Given** a vehicle that was LISTED under v1's count-only guard, then UNLISTED (e.g. for a price correction) **When** v2 deploys and the vehicle attempts to re-LIST **Then** the new 11-slot predicate applies (no grandfather); transition fails with `ShootSlotIncompleteError` if any REQUIRED kind lacks an approved asset. Distinct from SC-20 (continuously-LISTED grandfather rule). Closes the re-listing path gap (QA review #10).

---

## 11. Acceptance criteria

- [ ] AC-1 `packages/types/src/domain/shoot.ts` exports `ShootAssetSchema`, `ShootAssetKindEnum`, `AiStatusEnum`, `ShootSchemaV2`, `LpRedactionRequiredError`, `AssetApprovalPreconditionError`, `ShootSlotIncompleteError` (SC-1, SC-22).
- [ ] AC-2 `useShootsStore` exposes actions: `addRawAsset`, `setCoverAsset`, `reorderGallery`, `redactLicensePlate`, `requestAiProcess`, `approveAsset`, `unapproveAsset`, `forceApproveOverride`, `requestReshoot` (SC-1, SC-3, SC-4, SC-8, SC-9, SC-19).
- [ ] AC-3 `requestAiProcess` in P1 sets `aiStatus='manual-only'` and surfaces info-toast "Coming in v2.1" — never silent (SC-2; CLAUDE.md §10 #15).
- [ ] AC-4 `approveAsset` rejects with `LpRedactionRequiredError` when `kind ∈ EXTERIOR_LP_REQUIRED_KINDS && !lpRedacted` (SC-5).
- [ ] AC-5 `forceApproveOverride` requires R12+ and emits audit event `audit:force_approved_lp_unredacted` (SC-6).
- [ ] AC-6 R09 actions on inventory photos tab are gated by `<Gate>`; the store rejects forbidden actions with `AssetApprovalPreconditionError` (SC-7, SC-10).
- [ ] AC-7 LISTED guard predicate (Seam 40) throws `ShootSlotIncompleteError` when REQUIRED kinds are missing approved assets (SC-12).
- [ ] AC-8 LISTED predicate succeeds when all 11 REQUIRED kinds have approved assets (SC-11).
- [ ] AC-9 `selectStorefrontGalleryForVin` returns `status: 'ready' | 'pending' | 'unavailable'` per L_AI-9 thresholds (SC-13, SC-14, SC-15).
- [ ] AC-10 customer-web `vehicle-hero-gallery.tsx` reads exclusively via the selector; no remaining read of `Vehicle.images` (SC-13–15; §8 enforcement).
- [ ] AC-11 Cross-aggregate consistency test T11 passes: cover change on `/shoots/[id]` reflects on `/inventory/[vin]` and customer-web VDP within one render tick (SC-16).
- [ ] AC-12 Grandfather rule: v1 LISTED vehicles remain LISTED post-deploy (SC-20).
- [ ] AC-13 Asset >2 MB rejected with soft-fail toast; no asset added (SC-21).
- [ ] AC-14 v1 → v2 migration path produces `assets: []` for legacy shoots (v1 `assetUrls: ['url1', ...]` arrays are intentionally discarded — no automatic re-association since v1 had no slot-kind metadata to map them onto); deprecated `assetUrls` getter computes correctly in v2.0 via formula `assets.map(a => a.processedUrl ?? a.rawUrl)` (SC-22).
- [ ] AC-15 R11-only writes to `addRawAsset`, `redactLicensePlate`, `approveAsset`, `unapproveAsset` (SC-1, SC-3, SC-7).
- [ ] AC-16 Seams 50, 51 registered in `specs/architecture/cross-module-wiring.md` before code lands (T14; CLAUDE.md §6).
- [ ] AC-17 i18n keys land at top-level `shootsAi.*` in `messages/en-IN.json` AND `messages/hi-IN.json` (CLAUDE.md §10 #13a).
- [ ] AC-18 No local redefinitions of Card / Field / Dialog; all UI primitives consumed from `SPEC-ARCH-UI-001` references.
- [ ] AC-19 No `text-[NNpx]` and no `rounded-lg/xl` in new files; ui-canon-drift test green.
- [ ] AC-20 `error.tsx` continues to exist for `app/(shell)/shoots/` per CLAUDE.md §17.0 (no regression).
- [ ] AC-21 Telemetry events in §14 fire with the documented payload shapes; no PII text in payloads.
- [ ] AC-22 R23 DPO selector returns shoots-with-assets for DSAR (SC-18).
- [ ] AC-23 `/api/shoots/ai-process` enforces auth + role-rank ≥R11 + outlet RLS + zod-validated body + per-actor rate-limit + per-request audit log; reject with 401/403/422 respectively (L_AI-14). P1 stub still applies all gates.
- [ ] AC-24 `forceApproveOverride` rejects when actor.rank < R12 (SC-23); event payload includes `actorRole`.
- [ ] AC-25 `approveAsset` rejects when `aiStatus === 'failed'` regardless of redaction status (SC-24).
- [ ] AC-26 LISTED guard fails when all required kinds are present but one exterior asset is unredacted (SC-25); error enumerates the unredacted asset id.
- [ ] AC-27 v2 11-slot LISTED guard applies to UNLISTED → RE-LISTED transitions emitted post-v2 deploy, even for vehicles previously LISTED under v1 (SC-26; distinguishes from SC-20 grandfather).
- [ ] AC-28 `forceApprovedWithoutRedaction === true` assets render a permanent red badge "Force-approved without redaction" on every staff surface; the customer-web selector excludes these from `gallery[]` (B2, B3).
- [ ] AC-29 LP redaction is destructive: rasterised `processedUrl` for a redacted exterior asset has no recoverable plate pixels under the redaction box (compare-region pixel-hash test against the original; L_AI-12).
- [ ] AC-30 Walkaround approval requires R12+ AND typed reason ≥10 chars; emits `audit:walkaround_lp_confirmed`; event payload includes `actorRole` (L_AI-5 escalated gate).
- [ ] AC-31 `setCoverAsset` rejects unapproved / interior / unredacted / force-approved-without-redaction assets; UI hides the star CTA for ineligible assets (security review #5; L_AI-7 cover precondition).
- [ ] AC-32 All event payloads in §14 include `actorRole: string` (non-PII role identifier, e.g. `'R11'`).

---

## 12. RBAC

| Action | R03 Outlet Mgr | R09 SA | R11 Mktg Mgr | R12+ (SM/Mgr+) | R19 GM | R23 DPO | R24 CEO |
|---|---|---|---|---|---|---|---|
| addRawAsset | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| setAssetKind | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| redactLicensePlate | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| requestAiProcess | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| approveAsset | ✓ (own outlet) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| unapproveAsset | ✓ (own outlet) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| forceApproveOverride | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| setCoverAsset | ✓ | ✓ (inventory tab) | ✓ | ✓ | ✓ | ✗ | ✓ |
| reorderGallery | ✓ | ✓ (inventory tab) | ✓ | ✓ | ✓ | ✗ | ✓ |
| requestReshoot | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| read all | ✓ (own outlet) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DSAR retrieve / delete | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

The R11-tier writes (`addRawAsset`, `setAssetKind`, `redactLicensePlate`,
`requestAiProcess`, `approveAsset`, `unapproveAsset`) use a **rank-based
gate** — `hasMinRank(role, 'R11')` — so R11 (Marketing primary) plus all
ranks above it (R12+, R19, R22, R23, R24) are permitted. This:

- Lets a CEO (R24) drive AI enhancement on inventory shoots (per user
  direction 2026-05-08) without an explicit allowlist.
- Lets a GM upload a re-shoot when Marketing is unavailable.
- Stays consistent with the existing `canApproveAsset` (R11+) gate.
- Keeps R09 SA excluded (rank 6 < R11 rank 8) — SA still operates only
  the limited inventory-tab writes (Seam 50).

R03 (Outlet Manager, rank 3) sits BELOW R11 in the rank ladder; its row
shows ✓ on `approveAsset`/`unapproveAsset`/`setCoverAsset`/`reorderGallery`
because those flows have outlet-scoped overrides for managers in the W3
refund-tier precedent — but R03 cannot upload, redact, or request AI
(which require R11+). Force-override remains R12+ exclusive.

R23 (DPO, rank 20) outranks R11 by the rank ladder, so it appears as ✓
for all R11+ writes. In practice DPO almost never uploads or redacts —
their DSAR surface is the canonical workflow — but the rank-based gate
is intentionally permissive rather than carving DPO out, matching the
existing `canApproveAsset` semantics.

UI gating via `<Gate>` everywhere; inline `hasRank` in JSX is banned (CLAUDE.md §17.1 rule 4).

---

## 13. DPDP / compliance

- **Registration plate is PII.** A vehicle reg plate identifies the registered owner (often a prior consignor). Publishing without consent violates DPDP Act 2023 §6 (purpose limitation) and §11 (data principal rights). L_AI-5 is the enforcement mechanism.
- **Approval gate (HARD).** `approveAsset` rejects exterior assets without `lpRedacted=true`. R12+ override is logged via `audit:force_approved_lp_unredacted`.
- **Retention.** No special override beyond v1's retention norms. Asset blobs persist for the life of the Shoot record. DPDP §11 (right-to-erasure) is exposed via R23 DSAR surface — **deferred** to DEF-AI-6.
- **DSAR fulfilment SLA.** Data Subject Access / Erasure Requests for shoot assets follow the **30 calendar days** SLA from receipt of verified request, per DPDP Act 2023 §11 read with the DPDP draft rules (security review #11). Hard-delete (not soft-delete) of the asset's `rawUrl`, `processedUrl`, and `s3Key` blobs is required; the `ShootAsset` record may be retained as a tombstone (`deleted=true`, urls=null) for audit-trail integrity. R23 DPO surface (DEF-AI-6) implements this. Vendor-side cascade uses `vendorReferenceId` captured in `shoot_asset_ai_response` to issue DPA-bound delete requests.
- **Consent text.** Consignors are informed at intake (existing flow) that approved photos may be used in storefront listings; reg plates will be redacted prior to publication. (Copy lives under existing intake consent — out of scope here.)
- **Audit trail.** Every approval, force-override, reshoot is event-logged (§14) with actor id but no PII text.

---

## 14. Telemetry / events emitted

All payloads use ids + counts only; no PII text. All events go through the existing event bus; consumers are not part of this spec.

All payloads include `actorRole: string` (lessons-learned from intake review per QA #11; needed for downstream debugging + DSAR attribution). `actorRole` is the role identifier (e.g. `'R11'`), not a PII string.

| Event | Payload |
|---|---|
| `shoot_asset_uploaded` | `{ shootId, assetId, vin, kind, sizeBytes, actorId, actorRole, at }` |
| `shoot_asset_redacted` | `{ shootId, assetId, vin, kind, actorId, actorRole, at }` |
| `shoot_asset_ai_requested` | `{ shootId, assetId, vin, kind, aiVendor, actorId, actorRole, at }` |
| `shoot_asset_ai_response` | `{ shootId, assetId, vin, kind, aiVendor, vendorReferenceId, vendorStatusCode, responseAt, actorId, actorRole }` |
| `shoot_asset_ai_failed` | `{ shootId, assetId, vin, kind, aiVendor, vendorStatusCode, errorMessage, actorId, actorRole, at }` |
| `shoot_asset_approved` | `{ shootId, assetId, vin, kind, actorId, actorRole, at }` |
| `shoot_asset_unapproved` | `{ shootId, assetId, vin, reasonLength, actorId, actorRole, at }` |
| `shoot_force_approved` | `{ shootId, assetId, vin, kind, actorId, actorRole, reasonLength, at }` |
| `shoot_cover_set` | `{ shootId, assetId, vin, actorId, actorRole, at }` |
| `shoot_gallery_reordered` | `{ shootId, vin, count, actorId, actorRole, at }` |
| `shoot_reshoot_requested` | `{ priorShootId, newShootId, vin, reasonLength, actorId, actorRole, at }` |
| `audit:walkaround_lp_confirmed` | `{ shootId, assetId, vin, reasonLength, actorId, actorRole, at }` |

Audit-namespace overlay: `audit:force_approved_lp_unredacted` carries the same payload as `shoot_force_approved` plus a flag `lpUnredacted: true`.

---

## 15. Open questions

(From PLAN §6 — the integrator's recommended resolutions are noted but remain open until signoff.)

1. **VDP visibility threshold** — recommend `ready ≥ cover + 4 exterior approved`; `<threshold → 'pending'` placeholder. (Matches L_AI-9.)
2. **R09 reorder rights on inventory tab** — recommend allow reorder + cover (low-risk). (Matches L_AI-3.)
3. **LP redaction rendering** — opaque rectangle in v1; Gaussian blur via Spyne.ai in v2. Defer aesthetic decision to integrator.
4. **requestReshoot semantics** — recommend new Shoot, prior retained as historical; idempotency: only one open shoot per VIN. (Matches SC-19.)
5. **Walk-around video LP redaction** — RESOLVED (security review #12): included in EXTERIOR_LP_REQUIRED_KINDS; P1 walkaround approval is escalated to **R12+** with a typed reason ≥10 chars ("I have personally reviewed every second of the video and no plate is visible"); approval emits `audit:walkaround_lp_confirmed`. Folded into L_AI-5 + §6.3 approval gate. P2 graduates to per-frame auto-blur via Spyne.ai (DEF-AI-2).
6. **Cover-photo override range** — RESOLVED (security review #5): restrict to exterior kinds excluding `video_walkaround`; cover MUST satisfy `approved && kind ∈ EXTERIOR_LP_REQUIRED_KINDS \ {video_walkaround} && forceApprovedWithoutRedaction === false`. Locked into §6.3 cover-photo precondition.
7. **Production write-conflict strategy** — Mock-phase (v1) is single-threaded; no race. Production (v1.5+) MUST use optimistic locking: each `Shoot` carries a monotonic `version` integer; writes carry an `etag` matching `version`; mismatched writes return 409, UI re-fetches and prompts retry. Last-write-wins is unacceptable for approval state. `sortOrder` reorder operations may use last-write-wins on the final ordered list (idempotent, debounced). Tracked as DEF-AI-7 (existing).

---

## 16. Deferred items

| ID | Item | Priority | Notes |
|---|---|---|---|
| DEF-AI-1 | Spyne.ai REST integration + retry | P2 | `/api/shoots/ai-process` Route Handler graduates from stub to live; webhook on completion |
| DEF-AI-2 | Automatic LP detection (replaces manual rect) | P2 | Spyne.ai built-in; falls back to manual rect on miss |
| DEF-AI-3 | Relighting + watermarking | P3 | IC-Light + sharp post-Spyne |
| DEF-AI-4 | 360° / interactive walkaround | P3 | Third-party integration (vendor TBD) |
| DEF-AI-5 | Real S3 storage | P3 | Replaces dataUrl mock; uses additive `s3Key` field already in schema |
| DEF-AI-6 | DSAR-driven asset deletion (prior owner) | P4 | R23 surface + selector + delete action; DPDP §11 right-to-erasure |
| DEF-AI-7 | Production cross-app shared API | P4 | Replaces per-process customer-shoots-store mock with backend API |
| DEF-AI-8 | A/B cover variants | P4 | Track CTR per cover variant on storefront analytics |

---

## 17. Out of scope

- This spec **does not replace** SPEC-SHOOTS-001. v1 remains the canonical Shoot lifecycle spec. v2 is a **sibling** that layers asset-level capabilities on top.
- This spec **does not introduce real AI calls**. The P1 build ships only a stub Route Handler. Real Spyne.ai integration is DEF-AI-1 (P2).
- Real S3 storage is **not** in scope (DEF-AI-5).
- DSAR / right-to-erasure UX is **not** in scope (DEF-AI-6); the data path (selector) is exercised by SC-18 but no R23 surface ships in P1.
- Video frame-level LP redaction is **not** in scope (P2 — DEF-AI-2 covers it).
- A/B cover-variant analytics are **not** in scope (DEF-AI-8).
- Outlet-configurable angle requirements are **not** in scope (DEF-SHOOTS-4 in v1 spec carries over).

---

## 18. Migration / rollout

- **Feature flag.** `staff.shoots.ai.v1` gates the v2 surface. When OFF, `/shoots/[id]` renders the v1 surface; when ON, the v2 14-slot grid + AI/redaction CTAs render. Customer-web VDP wiring (Seam 51) is independently flagged on the same key.
- **Backfill.** Existing v1 shoot fixtures are migrated via the hydrator: `assets: []`, `coverAssetId: null`, `aiVendor: 'NONE'`, `aiPolicy: defaults`. New uploads use the v2 path.
- **Grandfather rule.** Vehicles already in LISTED state under v1's count-only guard remain LISTED. The new 11-slot predicate applies **only** to LISTED transitions emitted after v2 ships (SC-20).
- **Deprecated getter (v2.0 only).** `Shoot.assetUrls` survives as a computed getter for v2.0 to avoid breaking residual v1 readers; v2.1 removes the getter and finalises the supersession of SPEC-SHOOTS-001 §L2.
- **Rollout sequence.** (1) Schema + types land. (2) Store actions land. (3) Inventory photos tab + ShootDetailView upgrade behind flag. (4) Customer-web VDP selector behind flag. (5) Flag enabled in dev → staging → prod. (6) Monitor `audit:force_approved_lp_unredacted` rate; alert if >5% of approvals.
- **Mock-phase parity caveat.** Cross-app state sync (staff-web → customer-web) requires a manual customer-web reload in dev/demo since they are separate processes (per-process Zustand stores). Production satisfies same-tick sync because both apps hit the same backend (DEF-AI-7). Demo-time hint added to README of `customer-web/src/components/vdp/vehicle-hero-gallery.tsx`.

---

## 19. Test plan

Per PLAN §3 tasks T11 + T12. Test placement per CLAUDE.md §10 #9.

### 19.1 Quality gates (CLAUDE.md §10, §17)

The following gates MUST pass before this spec can transition to `in-build → shipped`:

- **Typecheck** — `pnpm -F staff-web typecheck` and `pnpm -F customer-web typecheck` exit 0.
- **ui-canon-drift** — `pnpm -F staff-web exec vitest run src/tests/ui-canon-drift.test.ts` green; no new files introduce `text-[NNpx]` or `rounded-lg/xl`.
- **locale-completeness** — `shootsAi.*` keys present at top level in BOTH `messages/en-IN.json` AND `messages/hi-IN.json`.
- **dead-button-detector** — every CTA in §9 components wired (DoD §10 #15); deferred actions show explicit "Coming in v2.1" toast (SC-2).
- **zustand-selector-anti-patterns** — selectors return base refs; computation in `useMemo` (CLAUDE.md §17 production-grade checklist).
- **i18n-key-resolution** — no hardcoded user-visible strings in new components.
- **error-boundaries** — `pnpm -F staff-web exec vitest run src/tests/error-boundaries.test.ts` green; `app/(shell)/shoots/error.tsx` continues to exist (CLAUDE.md §17.0; QA review #7).

### 19.2 Test taxonomy

| Layer | Path | Coverage |
|---|---|---|
| Co-located store unit | `apps/staff-web/src/lib/shoots/__tests__/shoots-store.test.ts` | every action; RBAC; LP precondition; 4-state transitions; error classes |
| Co-located slot definitions | `apps/staff-web/src/lib/shoots/__tests__/asset-slot-definitions.test.ts` | EXTERIOR_LP_REQUIRED_KINDS membership; required-kind set; cover-eligibility |
| Top-level integration (staff-web) | `apps/staff-web/src/tests/shoots-flow.test.ts` | upload → redact → AI-stub → approve → LISTED end-to-end (SC-1 through SC-5, SC-11, SC-12, SC-20, SC-23–26) |
| Top-level integration (customer-web) | `apps/customer-web/src/tests/shoots-gallery.test.ts` | **B5 — QA review #6.** SC-13 / SC-14 / SC-15 / AC-10 — `vehicle-hero-gallery.tsx` rendering driven by `selectStorefrontGalleryForVin`; asserts ready/pending/unavailable status; asserts no remaining read of `Vehicle.images`. Selector logic is covered in staff-web; this file covers the customer-web component rendering. |
| Cross-aggregate | `apps/staff-web/src/tests/cross-aggregate-shoots-consistency.test.ts` | T11 — SC-16, SC-17; SoT registry assertions. **Mechanism (B6 — QA review #4):** mounts the staff-web shoot detail surface; calls `useShootsStore.getState().setCoverAsset(shootId, newCoverAssetId, actor)`; asserts the customer-web `selectStorefrontGalleryForVin(vin).coverUrl` reflects the new value within the same render tick. Mocked via shared MSW handler that mirrors staff-web shoots-store state into customer-web's per-process customer-shoots-store. The test deliberately runs in vitest's per-worker isolation; cross-process limitation is documented at the top of the test file with a pointer to L_AI-9 (production parity via DEF-AI-7 backend API). |
| RBAC | folded into store unit | SC-6, SC-7, SC-10, SC-23 (per §20 traceability — folded into `shoots-store.test.ts`, not the integration file) |
| Migration | folded into store unit | SC-22; v1→v2 hydrator path |

---

## 20. Spec traceability matrix

| Scenario | Acceptance criteria | Test file |
|---|---|---|
| SC-1 | AC-1, AC-2, AC-15 | shoots-store.test.ts; shoots-flow.test.ts |
| SC-2 | AC-3 | shoots-store.test.ts; shoots-flow.test.ts |
| SC-3 | AC-2, AC-15 | shoots-store.test.ts; shoots-flow.test.ts |
| SC-4 | AC-2 | shoots-store.test.ts; shoots-flow.test.ts |
| SC-5 | AC-4 | shoots-store.test.ts |
| SC-6 | AC-5 | shoots-store.test.ts |
| SC-7 | AC-6, AC-15 | shoots-store.test.ts |
| SC-8 | AC-2 | shoots-store.test.ts |
| SC-9 | AC-2 | shoots-store.test.ts |
| SC-10 | AC-6 | shoots-store.test.ts |
| SC-11 | AC-8 | shoots-store.test.ts |
| SC-12 | AC-7 | shoots-store.test.ts |
| SC-13 | AC-9, AC-10 | shoots-flow.test.ts; **apps/customer-web/src/tests/shoots-gallery.test.ts** |
| SC-14 | AC-9, AC-10 | shoots-flow.test.ts; **apps/customer-web/src/tests/shoots-gallery.test.ts** |
| SC-15 | AC-9, AC-10 | shoots-flow.test.ts; **apps/customer-web/src/tests/shoots-gallery.test.ts** |
| SC-16 | AC-11 | cross-aggregate-shoots-consistency.test.ts |
| SC-17 | AC-11 | cross-aggregate-shoots-consistency.test.ts |
| SC-18 | AC-22 | shoots-store.test.ts |
| SC-19 | AC-2 | shoots-store.test.ts |
| SC-20 | AC-12 | shoots-flow.test.ts |
| SC-21 | AC-13 | shoots-store.test.ts |
| SC-22 | AC-14 | shoots-store.test.ts |
| SC-23 | AC-24 | shoots-store.test.ts |
| SC-24 | AC-25 | shoots-store.test.ts |
| SC-25 | AC-26 | shoots-store.test.ts; shoots-flow.test.ts |
| SC-26 | AC-27 | shoots-flow.test.ts |

Cross-cutting ACs: AC-16 (verified in `cross-module-wiring.md` review), AC-17 (locale-completeness gate), AC-18/AC-19 (ui-canon-drift gate), AC-20 (error-boundaries test), AC-21/AC-32 (event payload shape tests, folded into shoots-store.test.ts), AC-23 (route-handler tests in `apps/staff-web/src/app/api/shoots/ai-process/__tests__/route.test.ts`), AC-28 (asset-card storybook + render test), AC-29 (redaction-destructive pixel-hash test in `lp-redaction-dialog.test.ts`), AC-30 (walkaround approval test in shoots-store.test.ts), AC-31 (cover-precondition test in shoots-store.test.ts).

---

## 21. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-08 | 2.0 | orchestrator | Initial draft. Sibling to SPEC-SHOOTS-001 v1.0. Mints L_AI-1 through L_AI-11. 22 scenarios, 22 ACs. §8 cross-aggregate consistency contract per USER mandate; mirrors SPEC-SERVICE-INTAKE-001 §8. |
| 2026-05-08 | 0.2 | Claude (integrator) | Wave-2 reviews integrated: security (with-concerns, 4 blockers), qa (no, 2 blockers). Minted L_AI-12 (redaction non-destructiveness; sec #1), L_AI-13 (Spyne DPA precondition; sec #6), L_AI-14 (AI route hardening; sec #8). Added persistent `forceApprovedWithoutRedaction` + 3 metadata fields to ShootAssetSchema (B3, sec #3). Tightened `selectStorefrontGalleryForVin` to read `processedUrl` only and exclude force-approved-unredacted assets (B2, sec #2; updates L_AI-9). Added R03 Outlet Manager column to §12 RBAC matrix (sec #4). Added 4 scenarios SC-23..SC-26 (qa #1, #2, #3, #10). Added `actorRole` to all event payloads in §14 + new `shoot_asset_ai_response` / `shoot_asset_ai_failed` / `audit:walkaround_lp_confirmed` events (qa #11, sec #7). Added customer-web `apps/customer-web/src/tests/shoots-gallery.test.ts` for SC-13/14/15/AC-10 (B5, qa #6). Specified T11 cross-aggregate test mechanism (B6, qa #4). Added DSAR 30-day SLA to §13 (sec #11). Walkaround video LP-approval escalated to R12+ with typed reason ≥10 chars (sec #12; folded into L_AI-5 + §6.3). Added cover-photo validity precondition (sec #5). Added `error-boundaries` to §19.1 quality gates (qa #7). Added §23 Storybook section (qa #9). Added mock-phase parity caveat to §18 (sec #10). Production write-conflict strategy noted as DEF-AI-7 in §15 (sec #9). Status flipped `draft → in-review`. ACs expanded 22 → 32. Reviewers must re-sign post-implementation. |
| 2026-05-08 | 0.2.1 | orchestrator | L_AI-8 RBAC clarification per user direction: R11-tier writes (`addRawAsset`, `setAssetKind`, `redactLicensePlate`, `requestAiProcess`, `approveAsset`, `unapproveAsset`) use `hasMinRank(role, 'R11')` not exact-match `role === 'R11'`. R24 CEO can now drive AI enhancement directly (the headline ask); R12+ / R19 / R23 also permitted via the same rank ladder. R09 still excluded by rank. §12 RBAC table updated; tests `shoots-rbac.test.ts` RBAC-2 + new RBAC-3b assert R23/R24 paths; `shoots-store-v2.test.ts` adds an explicit R24 `requestAiProcess` happy-path test. |
| TBD | 2.1 | (placeholder) | Remove deprecated `Shoot.assetUrls` getter; finalise supersession of SPEC-SHOOTS-001 §L2 by L_AI-6; graduate `requestAiProcess` from P1 stub to Spyne.ai (DEF-AI-1); wire automatic LP detection (DEF-AI-2). |

---

## 22. Cross-process / mock-phase caveats

(See §18 mock-phase parity caveat — extracted here for visibility.)

In v1 mock-phase, staff-web (port 3001) and customer-web (port 3000) are separate Node processes with independent Zustand stores. Cross-app state sync (e.g. cover changed on staff-web reflecting on customer-web) requires a manual customer-web reload in dev/demo. The cross-aggregate test (T11) simulates same-process synchrony by importing both stores into a single vitest worker, mocking the MSW boundary; the test file documents this limitation at the top with a pointer to L_AI-9 + DEF-AI-7.

Production satisfies same-tick cross-app sync because both apps hit the same backend (DEF-AI-7).

---

## 23. Storybook

Per QA review #9 + CLAUDE.md §10 #8, every component listed in §9 ships with Storybook stories. Required stories:

| Component | Required stories |
|---|---|
| `ShootDetailView` | `all-slots-empty`, `partial-slots`, `all-approved`, `with-force-approved-asset`, `walkaround-approved` |
| `ShootAssetCard` | `raw`, `processing`, `processed`, `approved`, `force-approved-without-redaction` (each × `exterior-kind` and `interior-kind`) |
| `LpRedactionDialog` | `open-empty`, `with-rectangle-drawn`, `rasterising`, `rasterised-success`, `error-rasterise-failed` |
| `vehicle-hero-gallery` (customer-web) | `ready`, `pending` (placeholder card), `unavailable` (hidden) |

Stories are verified by code-reviewer; missing stories block merge.
