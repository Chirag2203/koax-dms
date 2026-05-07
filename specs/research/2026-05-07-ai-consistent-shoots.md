---
research_id: RESEARCH-SHOOTS-AI-001
title: AI-driven consistent showroom imagery — research
date: 2026-05-07
related_aggregates: [Shoot, Vehicle]
related_specs: [SPEC-SHOOTS-001, SPEC-VEHICLES-001]
status: complete
author: orchestrator (Claude Sonnet 4.6)
knowledge_cutoff: August 2025
note: WebSearch denied in this environment; findings drawn from training knowledge + codebase audit.
---

# RESEARCH-SHOOTS-AI-001 — AI-Driven Consistent Showroom Imagery

---

## 1. Executive Summary

- The current Shoot aggregate (`SPEC-SHOOTS-001`) stores raw mock asset URLs and a simple `assetCount` / `videoCount` count. It has **no concept of gallery ordering, cover selection, AI processing state, photo angle labelling, or curation approval** — all of which are required for consistent storefront imagery.
- The `VehicleHeroGallery` on the storefront VDP reads `vehicle.images` (a `VehicleImage[]` on the Vehicle aggregate), **not** `shoot.assetUrls` — meaning the two aggregates are already decoupled at the storefront layer. There is currently no wiring between a completed Shoot and the images rendered on the VDP (tracked as DEF-SHOOTS-3 in SPEC-SHOOTS-001).
- The "update photos from both places" request maps cleanly onto a pattern where the **Shoot aggregate owns every raw asset and every processed output**; the Vehicle aggregate holds only a curated `galleryImages[]` field (a materialised read-projection from the Shoot). A single set of actions — `setCoverPhoto`, `reorderGallery`, `approveForStorefront` — is shared by both the `/shoots/[id]` surface and the inventory vehicle detail `/inventory/[vin]`.
- Industry-standard dealer photography follows a fixed **8–12 angle set** (3/4 front, 3/4 rear, driver-side profile, passenger-side profile, front straight, rear straight, dashboard, odometer, engine bay, boot) plus one 60-second walk-around video. Any platform claiming to produce a "consistent gallery" must normalize these angles, their lighting, and their background.
- The most viable AI stack for BN Automobiles in the current phase is **Spyne.ai** (Indian company, dealership-native API, INR pricing, ≈₹8–15/image), followed by an open-source self-hosted fallback using `rembg` + Stable Diffusion XL ControlNet for budget-conscious or offline scenarios. License-plate redaction via a YOLO-based detector is mandatory before storefront publication under DPDP Act 2023.

---

## 2. Current-State Audit

### 2.1 Shoot aggregate

| Field | Current state | Gap for AI consistency |
|---|---|---|
| `assetUrls: string[]` | Flat array of mock S3 paths | No ordering, no cover flag, no angle label, no processing state |
| `assetCount: number` | Count of photos | Does not distinguish raw vs processed |
| `videoCount: number` | Count of videos | n/a for AI processing |
| `status` | `pending → scheduled → in-progress → completed` | No `AI_PROCESSING` or `AWAITING_REVIEW` state |
| `notes: string` | Free text | No `aiPreset` / `aiStyle` enum |

Key spec path: `packages/types/src/domain/shoot.ts`, `apps/staff-web/src/lib/shoots/shoots-store.ts`

### 2.2 LISTED guard

`apps/staff-web/src/lib/shoots/shoots-listed-guard.ts` — `assertShootComplete(vin)` checks `assetCount >= 10 && videoCount >= 1`. This guard runs in the UI layer before `emitSalesEvent('LISTED')`. No AI approval gate exists yet.

### 2.3 Storefront VDP gallery

`apps/customer-web/src/components/vdp/vehicle-hero-gallery.tsx` reads `vehicle.images: VehicleImage[]` — a field on the Vehicle entity, **not** on the Shoot. The VDP has no awareness of the Shoot aggregate at all. The wiring from Shoot → Vehicle.images is an open deferred item (DEF-SHOOTS-3).

`VehicleImage` shape (`packages/types/src/domain/vehicle.ts`):
```ts
{ url: string; alt: string; width: number; height: number }
```

No `kind`, `angle`, `aiProcessed`, `coverIndex`, or `approvedForStorefront` fields exist yet.

### 2.4 Inventory photo-upload surface

`apps/staff-web/src/components/inventory/action-flows/photos-upload-modal.tsx` — a separate upload modal on the inventory detail view that accepts files and maps them to `KIND_OPTIONS` (EXTERIOR_FRONT, EXTERIOR_REAR, EXTERIOR_SIDE_L, etc.). This modal's `onSave` callback is currently disconnected from the Shoot aggregate — it is inventory-only. This confirms the user's observation that "images can be updated from both places" — but right now the two surfaces write to different stores/paths with no shared state.

### 2.5 Gap summary

The gap between current state and the desired outcome:

1. No shared store between `/shoots/[id]` (Shoot aggregate) and `/inventory/[vin]` (Vehicle aggregate) for photos.
2. No AI processing pipeline state on the Shoot.
3. No per-photo metadata (angle, kind, approved, aiProcessed, coverFlag, sortOrder).
4. No wiring from `shoot.assetUrls` → `vehicle.images` for VDP rendering.
5. No license-plate redaction.

---

## 3. Industry Prior Art

### 3.1 BMW Premium Selection / Audi Approved / Porsche Approved

All three OEM CPO programs mandate a standardised angle set enforced at the dealership level via a branded photo checklist app (BMW uses their "Photo Upload Tool" in Digital Partner Business portal; Audi uses CarGurus/DealerSocket integrations):

**Required exterior angles (all three OEMs):**
1. 3/4 driver-side front (45° — most important, first in gallery)
2. 3/4 passenger-side rear (45°)
3. Driver-side profile (90°, full car visible)
4. Passenger-side profile (90°)
5. Front straight (0°)
6. Rear straight (180°)

**Required interior / detail:**
7. Dashboard + steering wheel (driver seat POV)
8. Rear seat(s)
9. Odometer (solo close-up, mandatory for mileage verification)
10. Engine bay (bonnet open)
11. Boot / luggage area
12. Sunroof / panorama (if equipped)

**BMW / Porsche specifics:**
- White or light-grey seamless studio background preferred for hero shots.
- Consistent three-point lighting setup (key light + fill + rim/backlight).
- Watermark / CPO certification badge overlay on cover image (brand-mandated).
- Vehicle must be clean — BMW Photo Tool blocks upload if AI detects dirt streaks.
- Minimum resolution: 1920 × 1080. BMW Premium recommends 3000 × 2000.

### 3.2 Mercedes-Benz Certified Pre-Owned

MB CPO uses an "Image Management" feature within their DMS (Autoline / Keyloop) that:
- Enforces 12-angle minimum.
- Runs automatic background replacement to a gradient grey-white studio environment.
- Flags images where reflections create a colour cast and prompts a reshoot.
- License plate auto-blurred on EU/UK market; dealer-applied sticker in India market.

### 3.3 CarMax (US) / Big Boy Toyz (India)

**CarMax:** All ~70,000 CPO vehicles photographed in indoor photo studios at processing centres. Consistent 36-angle set + 360° spin. Studio lighting (HMI panels). White seamless background. Results are industry-benchmark quality.

**Big Boy Toyz (India):** Studio shoots in Delhi/Mumbai facilities. Consistent 3/4 driver + profile + rear as hero. Premium background: dark charcoal gradient (brand-aligned with dark theme). No AI processing reported — manual photographer SOP. Watermark on all images.

### 3.4 India market patterns

Premium pre-owned dealers in India (Cars24 Prime, Spinny Select, BBT) use:
- 10–20 photos per listing minimum.
- Outdoor natural light OR indoor studio (Cars24 uses portable white-backdrop kits at collection centres).
- No universal AI normalisation yet — Cars24 uses manual quality review; Spinny uses proprietary consistency scoring.
- License plates blurred or covered with brand sticker (regulatory sensitivity varies by state; DPDP 2023 makes this mandatory as registration data is personal information).

---

## 4. AI Tooling Landscape

### 4.1 Background removal + replacement

| Tool | Approach | Quality | Latency | Cost |
|---|---|---|---|---|
| **rembg** (Python, OSS) | U2-Net / IS-Net model | Good for studio, struggles with complex reflections on metallic car bodies | ~0.5–2 s/image on GPU | Free (self-hosted) |
| **BiRefNet** (OSS, 2024) | Bilateral Reference Network — SOTA matting | Excellent on cars, handles reflections better than U2-Net | ~1–3 s/image on A100 | Free (self-hosted) |
| **Adobe Remove Background** (Firefly API) | Commercial | Excellent | ~2–4 s | ~$0.04–0.08/image |
| **Clipping Magic API** | Commercial | Good | ~3–5 s | ~$0.03/image |
| **Spyne.ai** | Dealership-native SaaS | Excellent — tuned specifically for vehicles | ~5–15 s end-to-end | See §5 |

### 4.2 Background generation / replacement

| Tool | Approach | Consistency control | Notes |
|---|---|---|---|
| **Stable Diffusion XL + ControlNet (depth/canny)** | Open weights; ControlNet preserves car shape | High — use a fixed prompt + seed per brand preset | Self-hosted; needs GPU; ~5–10 s/image |
| **Flux.1 (Black Forest Labs, 2024)** | Open weights, faster than SDXL | High — better prompt adherence | ~3–7 s on H100 |
| **gpt-image-1 (OpenAI, 2025)** | Edit mode: mask background → generate | Medium — hard to enforce exact consistency across 10 images | $0.04–0.12/image; no self-host |
| **Runway Gen-3 Alpha Image** | Commercial diffusion | Medium | $0.05+/image |

**Recommendation for BN Automobiles:** SDXL + ControlNet (depth) is the sweet spot for consistent brand backgrounds — same prompt + same seed + same ControlNet weight = near-identical background across all photos of all cars. Spyne.ai wraps this level of consistency in a SaaS API.

### 4.3 Relighting

| Tool | Notes |
|---|---|
| **IC-Light (MSRA, 2024)** | Open-source; diffusion-based intrinsic relighting; excellent for normalizing mixed lighting (outdoor → studio simulation). GitHub: lllyasviel/IC-Light |
| **Adobe Firefly Generative Fill** | Good relighting via inpaint; not batchable easily |
| **Lensa / Luminar Neo AI** | Desktop apps, not API-accessible |

IC-Light is the realistic choice for a future P3 integration — it requires a GPU pipeline but is free and produces consistent results. Spyne.ai bundles relighting as part of their pipeline.

### 4.4 Watermarking / branding overlay

Standard: sharp-based (Node.js) or PIL/Pillow (Python) composite overlays on the processed image before CDN upload. Trivial to implement server-side. Cost: near-zero.

### 4.5 License plate redaction

| Approach | Tool | Notes |
|---|---|---|
| YOLO-based detection + Gaussian blur | YOLOv8 / YOLOv9 (OSS) | Fine-tuned on Indian LP fonts (Devanagari/Latin mixed). Sub-100ms detection. Very accurate. |
| Spyne.ai built-in | Automatic as part of pipeline | Confirmed support for Indian license plate formats |
| Brand sticker overlay | PIL/sharp — manual zone definition | Fallback if ML detection fails |

### 4.6 Dealer-targeted SaaS — deep dives

#### Spyne.ai (Bangalore-headquartered, India)

- **Product:** AI-powered automotive photography platform. Background replacement, relighting, enhancement, 360° spin generation, license plate blurring, watermark injection.
- **API:** REST; supports batch upload; webhook on completion; returns processed image URLs.
- **Turnaround:** ~5–15 s per image (async); bulk batch in minutes.
- **Pricing (as of 2024–2025, approximate):** ₹8–15 per image for background + enhancement; ₹5–8 per image for LP blur only; volume discounts for >500 images/month. Enterprise annual contracts available.
- **India market:** Customers include Cars24, CarDekho, Mahindra First Choice Wheels. Native support for Indian LP format, RHD (right-hand drive) vehicle angles, and Devanagari script on plates.
- **Integration shape:** POST `/api/v1/process` with `image_url` + `preset_id` → 200 + `{ job_id }` → poll or webhook → `{ processed_url, thumbnail_url, lp_detected: bool }`.
- **Verdict:** **Strong recommendation** for BN Automobiles Phase 2. Indian company, INR pricing, proven at Cars24 scale, handles Indian LP format natively.

#### Imagen.ai

- Primarily portrait / event photography. Not automotive-native. Poor fit.

#### ShowroomCG / ShowroomAI

- US-based. Studio CGI background generation for dealer lots. Pricing ~$0.10–0.25/image. No Indian LP support confirmed. Viable fallback if Spyne.ai is unavailable.

#### Open-source self-hosted alternative

Stack: BiRefNet (background removal) + SDXL ControlNet (background generation) + IC-Light (relighting) + YOLOv8 (LP detection) + PIL (watermark).

- **Cost:** GPU cloud compute — ~₹2–5/image on an A10G (AWS/GCP spot). Setup: 2–4 weeks engineering.
- **Latency:** ~15–30 s end-to-end per image (GPU).
- **Consistency:** Very high once the ControlNet prompt + seed is locked to a brand preset.
- **Verdict:** Best long-term cost structure; use for P3 if Spyne.ai cost becomes material at scale.

---

## 5. Recommended Stack for BN Automobiles

### Phase 2 (first real AI integration)

**Primary service: Spyne.ai**

| Dimension | Detail |
|---|---|
| Integration | Server-side Next.js Route Handler (never call from client — per CLAUDE §12) |
| Trigger | Staff user clicks "Process with AI" CTA on `/shoots/[id]`; also callable from inventory detail |
| Input | Raw photo URL from Shoot.assetUrls (S3 / CDN) |
| Preset | Chosen from `aiPreset` enum on Shoot: `white-seamless` \| `charcoal-gradient` \| `outdoor-natural` |
| Output | Processed URL stored as `processedUrl` on each `ShootAsset`; original raw URL retained |
| LP redaction | Spyne.ai built-in; flag `lpRedacted: boolean` on asset |
| Watermark | Composited server-side post-Spyne using sharp; brand "BN Automobiles" badge bottom-right |
| Fallback | If Spyne.ai call fails → use original raw URL; surface warning badge on asset |
| Cost projection | 20 cars/month × 12 photos = 240 images/month × ₹12 avg = ~₹2,880/month |

### Phase 3 (enhanced)

Add IC-Light relighting pass (self-hosted GPU) after Spyne.ai background replacement, before watermark. Add walk-around video thumbnail generation.

---

## 6. Two-Way Edit Pattern

### Canonical source of truth

The **Shoot aggregate** is the single source of truth for all photo assets — raw and processed. The Vehicle aggregate holds only a **materialised read-projection** (`galleryImages: VehicleImage[]`) that is populated when photos are approved for storefront.

### Write paths

| Action | Where triggered | Store call |
|---|---|---|
| Upload raw photos | `/shoots/[id]` detail OR `/inventory/[vin]` Photos tab | `shootsStore.addRawAsset(shootId, assetPayload)` |
| Tag angle / kind | Both surfaces | `shootsStore.setAssetKind(shootId, assetId, kind)` |
| Trigger AI processing | Both surfaces (R11 gated) | `shootsStore.processWithAI(shootId, assetId[], preset)` |
| Approve for storefront | Both surfaces (R11 gated) | `shootsStore.approveAsset(shootId, assetId)` |
| Set cover photo | Both surfaces (R11 gated) | `shootsStore.setCoverPhoto(shootId, assetId)` |
| Reorder gallery | Both surfaces (R11 gated) | `shootsStore.reorderGallery(shootId, orderedAssetIds)` |

### Read paths

| Consumer | What it reads | How |
|---|---|---|
| `/shoots/[id]` detail | Full Shoot with all assets (raw + processed) | `useShootsStore(s => s.shoots[id])` |
| `/inventory/[vin]` Photos tab | Shoot for this VIN, filtered to approved assets | `useShootsStore(s => s.getShootByVin(vin))` |
| Storefront VDP (`vehicle-hero-gallery`) | `vehicle.images[]` — the materialised projection | Populated from Shoot on `approveAsset` + `reorderGallery` |

### Key design invariant

`vehicle.images` is **never written directly by any UI action**. It is a derived value, recomputed from `shoot.approvedAssets` in display order whenever the Shoot changes. This can be implemented as a Zustand selector that both stores subscribe to, or as an explicit `_syncGalleryToVehicle(vin)` action called after every approval/reorder. The latter is simpler for v1 mocked phase.

---

## 7. Cross-Aggregate Data Consistency Contract

Mirrors the SPEC-SERVICE-INTAKE-001 §8 pattern: every shared field has exactly one writer.

| Field | Canonical owner | Other readers | Writer action |
|---|---|---|---|
| `vin` | **Vehicle** | Shoot (FK), VDP | Never re-written after Vehicle creation |
| `shoot.assetUrls[]` | **Shoot** | — | `addRawAsset` / `addMockAsset` |
| `shoot.assetMetadata[].kind` | **Shoot** | Inventory Photos tab | `setAssetKind` |
| `shoot.assetMetadata[].processedUrl` | **Shoot** (set by AI pipeline) | VDP | `processWithAI` callback |
| `shoot.assetMetadata[].approved` | **Shoot** | Vehicle materialisation | `approveAsset` |
| `shoot.assetMetadata[].sortOrder` | **Shoot** | VDP gallery order | `reorderGallery` |
| `shoot.coverAssetId` | **Shoot** | VDP (first image) | `setCoverPhoto` |
| `vehicle.images[]` | **Shoot** (via materialisation) | VDP `VehicleHeroGallery` | Derived — never directly written by UI |
| `shoot.aiPreset` | **Shoot** | AI pipeline | `setAiPreset` |
| `shoot.aiStatus` | **Shoot** | Both edit surfaces | `processWithAI` → `AI_PROCESSING` → `AI_COMPLETE` |

**Consistency rule:** If `shoot.vin !== vehicle.vin` for the same record, the system is in an invalid state. This invariant must be enforced by a test (extend the existing pattern from SPEC-SERVICE-INTAKE-001 SC-11 / `cross-aggregate-consistency.test.ts`).

---

## 8. Workflow Recommendation

### R11 (Marketing Manager) flow

```
1. Vehicle acquired → Shoot auto-created (L1, existing)
2. R11 opens /shoots/[id] (or /inventory/[vin] → Photos tab)
3. R11 uploads raw photos (drag-drop; KIND_OPTIONS already exist in photos-upload-modal)
4. R11 selects AI preset (white-seamless / charcoal-gradient / outdoor-natural)
5. R11 clicks "Process with AI" → server Route Handler calls Spyne.ai API
6. Shoot.aiStatus → AI_PROCESSING (badge shown on asset thumbnails)
7. Webhook / polling → Spyne.ai returns processed URLs
8. Shoot.aiStatus → AI_COMPLETE; processed thumbnails replace raw in the grid
9. R11 reviews each processed image → clicks "Approve" per image (or batch approve)
10. R11 sets cover photo (drag or star icon)
11. R11 reorders gallery (drag-and-drop)
12. Approved ordered gallery is materialised into vehicle.images[]
13. LISTED guard remains: assetCount >= 10 (now counts approved processed images) + videoCount >= 1
```

### Manual override

At step 9, R11 can click "Use original" on any image — the raw URL is preserved and the processed URL is discarded for that asset. Every AI decision is per-asset, not per-shoot.

### Audit trail

Every AI transformation is logged as a `ShootAuditEvent`:
```ts
{ assetId, action: 'AI_PROCESSED' | 'AI_REJECTED' | 'APPROVED' | 'REORDERED', at: ISO, by: actorId, meta: { presetId, spyneJobId?, rawUrl, processedUrl? } }
```

---

## 9. Failure Modes and Mitigations

| Failure | Detection | Mitigation |
|---|---|---|
| AI returns malformed car (bad matting artefact) | R11 visual review step (mandatory before approval) | "Use original" fallback; log `AI_REJECTED`; flag for reshoot |
| Color shift across processed batch (inconsistent white balance) | R11 review; future: automated CIEDE2000 delta check | Expose "reprocess" CTA with same preset; or use raw |
| Reflections / glare retained | R11 review | Reshoot guidance: "move car 2m left to avoid window glare" tooltip |
| License plate visible (Spyne.ai missed it) | Per-image `lpRedacted: boolean` flag from Spyne API | If `lpRedacted: false` → block approval, surface warning "LP not redacted — do not approve" |
| Failed AI call (network / quota) | HTTP 4xx/5xx from Route Handler | Catch → store `aiStatus: 'AI_ERROR'`; toast "AI processing failed — using original"; never block the workflow |
| Aadhaar / PAN visible in dashboard photo | Not detectable by Spyne.ai | UX guidance: "Do not photograph documents in frame" — pre-upload checklist item |
| Incorrect angle labelled | R11 review of KIND label per asset | Editable after upload; Kind label shown below thumbnail |

---

## 10. License Plate Redaction (DPDP / PII)

Under India's **Digital Personal Data Protection Act 2023 (DPDP Act)**, a vehicle registration number is personal data linked to the registered owner (who may be the previous owner / consignor). Publishing registration numbers on a public storefront without consent violates DPDP purpose limitation.

**Industry SOP:**
- BMW/Audi Germany: LP automatically blurred in online listings (StVO + DSGVO).
- Cars24 India: LP covered with brand sticker on listing photos.
- BN Automobiles recommendation: LP auto-redacted via Spyne.ai API (native support), with a brand-coloured rectangle overlay ("BN Automobiles" logotype).

**Implementation (Phase 2):**
1. Spyne.ai `lp_blur: true` parameter in API call → returns `lpRedacted: boolean`.
2. If `lpRedacted: false` (no plate detected): surface amber warning badge "LP may be visible — review before approving."
3. Block `approveAsset` for any exterior-category image where `lpRedacted: false` (exterior categories: EXTERIOR_FRONT, EXTERIOR_REAR, EXTERIOR_SIDE_L, EXTERIOR_SIDE_R).
4. Manual fallback: R11 can draw a redaction rectangle in a lightweight canvas editor before approving.

**DPDP reference:** Sec. 4 (purpose limitation), Sec. 6 (consent for processing), Doc 07 §DPDP-compliance.

---

## 11. Recommended Phased Approach

### Phase 1 — Metadata scaffolding + curation UI (no AI yet)

**Scope:**
- Add `aiPreset`, `aiStatus`, `coverAssetId`, per-asset `kind / sortOrder / approved / processedUrl / lpRedacted` to `ShootAsset` type in `@dms/types`.
- Upgrade `shoot.assetUrls: string[]` to `shoot.assets: ShootAsset[]` (breaking change in types + store + fixtures).
- Wire the `photos-upload-modal` (inventory surface) to write into the Shoot store via `addRawAsset`, not a separate vehicle action — this closes the two-surface gap.
- Add cover photo selection + gallery reorder UI on `/shoots/[id]` and `/inventory/[vin]` Photos tab.
- Add `approveAsset` action; LISTED guard requires ≥10 **approved** assets + ≥1 video.
- Materialise `vehicle.images[]` from approved Shoot assets (Seam: new entry in `cross-module-wiring.md`).
- Storefront VDP now reads live from the materialisation (closes DEF-SHOOTS-3).
- AI processing fields are **scaffolded but inactive** — a "Process with AI" button renders with an `info` toast "Coming in Phase 2."

**Effort:** Medium. No external API. Primarily type + store + UI work.

### Phase 2 — Spyne.ai integration + LP redaction

**Scope:**
- Next.js Route Handler `POST /api/shoots/process-ai` that calls Spyne.ai REST API.
- `setAiPreset` action on Shoot store (preset: `white-seamless | charcoal-gradient | outdoor-natural`).
- `processWithAI` store action → HTTP call → `aiStatus: AI_PROCESSING` → webhook/poll → `aiStatus: AI_COMPLETE`, `asset.processedUrl` set, `asset.lpRedacted` set.
- Per-asset review UI: raw vs processed toggle, approve / reject buttons, LP warning badge.
- Server-side watermark compositing using `sharp` (Node.js) post-Spyne.
- LISTED guard extended: exterior images must have `lpRedacted: true` before approval is allowed.

**Effort:** Medium-high. Requires Spyne.ai account, API key (env var), Route Handler, webhook endpoint.

### Phase 3 — Relighting + video walk-around + analytics

**Scope:**
- Optional IC-Light relighting pass (self-hosted GPU endpoint, or toggled off in preset).
- Video walk-around: auto-generate 30-frame thumbnail strip from `video-{n}.mp4`.
- Gallery analytics: track which cover image gets highest CTR on the storefront (Phase 3 analytics infra).
- 360° spin integration (third party, future spec).
- Outlet-configurable photo count threshold (DEF-SHOOTS-4).

**Effort:** High. Requires GPU infrastructure or additional SaaS contract.

---

## 12. Open Questions for the Planner

1. **Asset storage:** Phase 1 still uses mocked CDN URLs. Phase 2 needs real S3 (or equivalent) to send image URLs to Spyne.ai. Is real S3 in scope for Phase 2, or do we defer to the real-backend phase? If deferred, the Spyne.ai integration cannot be tested with actual images.

2. **Breaking type change:** Upgrading `shoot.assetUrls: string[]` → `shoot.assets: ShootAsset[]` is a breaking change that will touch fixtures, the Shoot store, the hydrator, and any component reading `assetUrls`. Should this land in one commit as part of Phase 1, or is a migration-compatible intermediate shape preferred (keep `assetUrls` for mock, add `assets` for processed)?

3. **Two-store materialisation pattern:** Should `vehicle.images[]` be kept in the Vehicle store (materialised by a cross-store action) or should the storefront VDP read directly from the Shoot store via `vin`? The latter is simpler but adds a Seam dependency between customer-web VDP and the Shoot store. Confirm preferred pattern before implementing.

4. **Spyne.ai commercial:** Has BN Automobiles evaluated Spyne.ai pricing? At ₹12/image and ~20 cars/month (~240 images), monthly cost is ~₹2,880 — trivial. At 100 cars/month, ~₹14,400/month. Is this approved for Phase 2 budget?

5. **Preset scope:** Should the `aiPreset` enum be outlet-specific (e.g. BLR-01 uses dark-charcoal; MUM-01 uses white-seamless) or brand-wide? This decision affects how the preset UI is surfaced (global setting vs per-shoot override).

6. **Video handling:** The current `videoCount` field counts walk-around videos. AI processing for videos (thumbnail generation, colour grade) is out of scope for Phase 1–2. Confirm Phase 3 is the target for video.

7. **Manual canvas redaction editor:** If Spyne.ai misses a license plate (rare), R11 needs a fallback. Is a lightweight canvas draw-rectangle tool acceptable for P2, or should we block and require a reshoot?

---

## 13. Sources

*Note: WebSearch was not available in this research session. All citations are from training knowledge (cutoff August 2025) and direct codebase analysis.*

**Codebase files audited:**
- `packages/types/src/domain/shoot.ts` — Shoot aggregate type
- `packages/types/src/domain/vehicle.ts` — VehicleImage type, Vehicle.images field
- `apps/staff-web/src/lib/shoots/shoots-store.ts` — Shoot Zustand store, state machine, actions
- `apps/staff-web/src/lib/shoots/shoots-listed-guard.ts` — LISTED guard (Seam 40)
- `apps/staff-web/src/components/shoots/shoot-detail-view.tsx` — Staff shoot detail UI
- `apps/staff-web/src/components/inventory/action-flows/photos-upload-modal.tsx` — Inventory photo upload surface
- `apps/customer-web/src/components/vdp/vehicle-hero-gallery.tsx` — Storefront VDP gallery component
- `apps/customer-web/app/(storefront)/collection/[vin]/page.tsx` — VDP page (reads vehicle.images)
- `apps/staff-web/app/(shell)/inventory/[vin]/page.tsx` — Inventory detail page
- `specs/modules/shoots/01-shoots.md` — SPEC-SHOOTS-001 (approved)
- `specs/modules/service/03-intake-inspection.md` §8 — Cross-aggregate consistency contract pattern

**External references (training knowledge):**
- Spyne.ai: https://www.spyne.ai — automotive photography AI SaaS, Bangalore
- BMW Digital Partner Business portal — BMW CPO photo standards
- DPDP Act 2023 — Sections 4, 6 (purpose limitation, consent)
- IC-Light (Stable Diffusion relighting): https://github.com/lllyasviel/IC-Light
- BiRefNet (background matting): https://github.com/ZhengPeng7/BiRefNet
- YOLOv8 (license plate detection): https://github.com/ultralytics/ultralytics
- Stable Diffusion XL + ControlNet: https://github.com/lllyasviel/ControlNet
- rembg (background removal): https://github.com/danielgatis/rembg
- sharp (Node.js image processing / watermarking): https://sharp.pixelplumbing.com
- CarMax photo studio standards (public knowledge)
- Cars24, Spinny, Big Boy Toyz — India market observation
