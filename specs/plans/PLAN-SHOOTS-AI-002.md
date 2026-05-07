---
plan_id: PLAN-SHOOTS-AI-002
title: SPEC-SHOOTS-002 v2.1 — AI pipeline graduation + LP auto-detect + schema cleanup + v1 L2 supersession
domain: shoots
status: draft
risk_level: medium
pii_sensitivity: medium
flags: [staff.shoots.ai.v1]
owners: [planner, security-reviewer, qa-planner, integrator]
depends_on:
  - SPEC-SHOOTS-001
  - SPEC-SHOOTS-002 (v0.2.1 → v0.3.0)
  - PLAN-SHOOTS-AI-001
  - SPEC-ARCH-UI-001
related_research: RESEARCH-SHOOTS-AI-001 §5 (Spyne.ai recommendation), §10 (LP detection)
effective_date: 2026-05-08
---

# PLAN-SHOOTS-AI-002 — v2.1 Spyne-shaped pipeline + LP auto-detect + schema cleanup + L2 supersession

## 0. Scope summary

v2.1 graduates four placeholder areas of SPEC-SHOOTS-002 from "scaffold" to "shape-realistic mock":

1. `requestAiProcess` evolves from manual-only stub to a **Spyne.ai-shaped vendor-adapter pipeline** with async request → vendorJobId → poll → result, deterministic mock failure injection, and retry policy.
2. **Auto LP detection** lands as a coords-returning mock service behind an `auto-redact` button on `ShootAssetCard`; manual `LpRedactionDialog` stays as override.
3. **Deprecated schema removal** — `Shoot.assetUrls`, `assetCount`, `videoCount` deleted; v1 LISTED-guard count fallback deleted.
4. **CLAUDE §14 supersession protocol completed** — SPEC-SHOOTS-001 §L2 marked `[SUPERSEDED by L_AI-6]` in place.

**Headline decision:** spec receives a **0.2.1 → 0.3.0 minor bump** (not a sibling).

---

## 1. Architecture decisions

### 1.1 Vendor adapter pattern (mint **L_AI-15**)

Typed `AiVendorAdapter` interface with three implementations: `noneAdapter`, `mockSpyneAdapter`, `customAdapter` slot. Vendor selection from `Shoot.aiVendor` enum.

```ts
interface AiVendorAdapter {
  vendorId: 'NONE' | 'SPYNE_AI' | 'CUSTOM';
  enqueue(req: AiEnqueueRequest): Promise<{ vendorJobId: string; status: 'accepted' }>;
  poll(vendorJobId: string): Promise<{ status: 'processing' | 'succeeded' | 'failed'; processedDataUrl?: string; errorMessage?: string }>;
}
```

Production swap = drop in real Spyne adapter; route handler signature unchanged.

### 1.2 Async pipeline shape (mint **L_AI-16**)

Three-stage flow mirrors Spyne.ai REST: client `POST /api/shoots/ai-process { shootId, assetIds[] }` → server returns `202 { vendorJobId }` per asset → client polls `GET /api/shoots/ai-process?vendorJobId=` every 1.5s up to 8 attempts → terminal status writes via `_applyAiResult(assetId, result)` action.

Mock latency ≈ 3-4.5s. Tests use `vi.useFakeTimers()`.

### 1.3 Mock failure injection (mint **L_AI-17**)

10% deterministic seeded failure:
```ts
const seed = hashCode(`${shootId}:${assetId}:${shoot.aiPolicy.failureSeed ?? 0}`);
const fails = (seed % 100) < (shoot.aiPolicy.failureRate ?? 10);
```
Per-shoot `aiPolicy.failureRate: number` (default 10) configurable so tests can drive 0% or 100%. Retry bumps a counter feeding the seed → fresh roll.

### 1.4 LP auto-detect contract (mint **L_AI-18**)

Coords-returning interface separate from mutating `redactLicensePlate`:
```ts
interface LpDetectionResult { boxes: { x, y, w, h, confidence }[] }
detectLicensePlate(rawUrl, kind): Promise<LpDetectionResult>
```

Mock returns kind-aware location:
- 3/4 shots → bottom-center 30%×8%
- profiles → bottom 30% mid-rule-of-thirds 25%×7%
- straight rear/front → bottom-center 35%×10%
- interior kinds → not subject (no detect)
- `video_walkaround` → no auto-detect (operator manual-review per L_AI-5 escalated gate)

New action `autoRedactAsset(assetId, actor)` calls detector, rasterises via L_AI-12 pipeline, dispatches existing `redactLicensePlate` to honor audit trail.

### 1.5 Retry policy (mint **L_AI-19**)

`aiRetryCount` field added to `ShootAsset` (default 0). On `aiStatus='failed'` UI surfaces "Retry". Action `retryAiProcess(assetId, actor)`:
- If `aiRetryCount >= 3` → permanent `aiStatus='manual-only'`; toast "AI retries exhausted; manual approval available"
- Else increment, reset `aiStatus='queued'`, fresh enqueue→poll cycle

`forceApproveOverride` (R12+) remains bypass.

### 1.6 Schema cleanup migration (closes L_AI-1 deprecation; mint **L_AI-20**)

Remove from `ShootSchema`: `assetUrls`, `assetCount`, `videoCount`.

Migration: typecheck is the gate. Affected call sites (15 files):
- `shoots-listed-guard.ts:73-84` — DELETE v1 count fallback
- `shoots-store.ts:458-460, 541-552, 565-575` — delete count writes; deprecate `addMockAsset`; v1 `completeShoot` switches to 11-slot via `assertShootComplete`
- `shoot-detail-view.tsx:438` — switch to `ShootSlotIncompleteError.missingKinds`
- `shoots-queue-view.tsx:79` — `shoot.assetCount` → `shoot.assets.length`
- `shoots.test.ts` (16 occurrences) — migrate to assets[]
- `shoots-store-v2.test.ts` — migrate fixture writes
- `fixtures/shoots.ts` (8 fixtures × 3 fields) — delete keys
- `shoot.ts` types — remove deprecated fields
- `ShootIncompleteError` — `@deprecated` retained for v1 back-compat

Test: `migration.test.ts` parses every v1 fixture through new schema; asserts no `assetUrls/assetCount/videoCount` keys survive.

### 1.7 v1 supersession protocol completion (mint **L_AI-21**)

Per CLAUDE §14 exactly:

1. Edit SPEC-SHOOTS-001 §L2 in place: prepend `**[SUPERSEDED by L_AI-6 — see SPEC-SHOOTS-002 §1.7]**` to title; wrap original Decision as `Original (v1.0):`
2. Append §10 to SPEC-SHOOTS-001 titled "L2 supersession by L_AI-6 (v2.1)" with three subsections (Trigger / Migration path / Fallback handling)
3. SPEC-SHOOTS-001 changelog row: `2026-05-08 | 1.1 | orchestrator | §L2 superseded by SPEC-SHOOTS-002 §L_AI-6...`
4. Frontmatter: `version: 1.0 → 1.1`. Status stays `approved`.
5. No deletion of L2 row — `[SUPERSEDED]` marker is the audit trail.

---

## 2. Field list (delta from v0.2.1)

### 2.1 ShootAsset additions

| Field | Type | Default | L-tag |
|---|---|---|---|
| `aiRetryCount` | int ≥0 | 0 | L_AI-19 |
| `aiLastFailedAt` | ISO \| null | null | L_AI-19 |
| `vendorJobId` | string \| null | null | L_AI-16 |

### 2.2 Shoot additions

| Field | Type | Default | L-tag |
|---|---|---|---|
| `aiPolicy.failureRate` | 0..100 | 10 | L_AI-17 |
| `aiPolicy.failureSeed` | number | 0 | L_AI-17 |
| `aiPolicy.maxRetries` | number | 3 | L_AI-19 |

`aiVendor` default flips `'NONE' → 'SPYNE_AI'` for new shoots; existing v1 fixtures stay `'NONE'`.

### 2.3 Shoot removals (v0.3.0 breaking)

`assetUrls`, `assetCount`, `videoCount` deleted. `ShootIncompleteError` exported `@deprecated`.

---

## 3. Task breakdown

| # | Task | LoC est | Depends |
|---|---|---|---|
| T01 | Spec bump 0.2.1 → 0.3.0; mint L_AI-15..L_AI-21 | ~150 | — |
| T02 | Vendor adapter interface + registry + noneAdapter | ~80 | T01 |
| T03 | mockSpyneAdapter (seeded RNG, async stages) | ~150 | T02 |
| T04 | Route handler graduation: enqueue + poll branches; preserve all 7 L_AI-14 hardening gates | ~120 | T03 |
| T05 | requestAiProcess rewrite + retryAiProcess + _applyAiResult; ShootAsset additions; client polling helper | ~200 | T03,T04 |
| T06 | Schema cleanup: delete assetUrls/assetCount/videoCount; delete v1 LISTED count fallback; migrate 15 call sites | ~100 | T05 |
| T07 | LP auto-detect mock + autoRedactAsset action + Auto-redact button on ShootAssetCard | ~120 | T05 |
| T08 | SPEC-SHOOTS-001 §L2 supersession edit per CLAUDE §14 | ~30 | T01 |
| T09 | Tests: vendor-adapter, retry, auto-detect, schema-cleanup | ~250 | T05,T07 |
| T10 | i18n keys (retry, auto-redact, AI failure) | ~20 | T05,T07 |
| T11 | Re-request wave-2 sign-offs; integrator merge; status flip if YES | process | all |

**Total ~1,220 LoC** (excl T11).

---

## 4. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Schema removal silent breakage | Typecheck gate before T06 commits; pre-grep enumerated 15 files |
| Mock async timing flakiness | All tests use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(1500)` per poll |
| Determinism collisions on retry | Acceptable by design; failureRate=0/100 for happy/unhappy paths |
| forceApproveOverride × failed state | L_AI-7 already permits any state; tests cover R12+ on permanent manual-only |
| UI churn in shoot-asset-card | Auto-redact button slots into existing redact-CTA group; storybook stories added |
| Polling leaks on unmount | useEffect cleanup aborts via AbortController; tests assert no pending timers post-unmount |
| Customer-web selector regression on force-approved | T09 regression case: post-v2.1 force-approved still excluded |
| §L2 in-place edit drifts from CLAUDE §14 | T08 follows custom-builds L4/L5 → L51 example verbatim; integrator reviews against §14 |
| ShootIncompleteError unused after deletion | Keep exported + @deprecated; v1 spec back-compat preserved per L_AI-21 |

---

## 5. L-tag summary

| L-tag | Title | Source |
|---|---|---|
| L_AI-15 | Vendor adapter interface (`AiVendorAdapter`) | §1.1 |
| L_AI-16 | Async pipeline shape | §1.2 |
| L_AI-17 | Mock failure injection (10% seeded) | §1.3 |
| L_AI-18 | LP auto-detect contract (coords-returning) | §1.4 |
| L_AI-19 | AI retry policy (max 3) | §1.5 |
| L_AI-20 | Deprecated schema removed (closes L_AI-1) | §1.6 |
| L_AI-21 | SPEC-SHOOTS-001 §L2 supersession completion | §1.7 |

---

## 6. Open questions for /spec

1. **Adapter naming pre-DPA** — keep enum `'SPYNE_AI'` (production-shaped); file `mockSpyneAdapter` with TODO guarded by L_AI-13 DPA URL.
2. **Auto-detect rectangle placement** — kind-aware (3/4 bottom-center; profiles lower-rear quadrant; rear/front straight bottom-center; interior not subject; walkaround manual-only).
3. **Retry counter granularity** — per-asset.
4. **manual-only after 3 fails auto-redact LP?** No — keep as separate gate.
5. **Default `aiVendor` for new shoots** — `'SPYNE_AI'` so pipeline is exercised by default.
6. **Polling backoff** — fixed 1.5s × 8.

---

## 7. Out of scope (P3+)

| ID | Item | Priority |
|---|---|---|
| DEF-AI-1 | Real Spyne.ai network | P3 (env-only; needs DPA) |
| DEF-AI-2 | Real YOLO/Spyne LP detection model | P3 |
| DEF-AI-3..8 | (existing) | P3+ |

DEF-AI-1+2 stay deferred — shape-mocks shipping in v2.1 collapse production cutover to single adapter swap.

---

## 8. v1 supersession block (T08 exact text)

**Edit to SPEC-SHOOTS-001 L2 row:**

| L2 | **[SUPERSEDED by L_AI-6 — see SPEC-SHOOTS-002 §1.7 / §10]** LISTED guard: ≥10 photos + 1 video | *Original (v1.0):* A vehicle cannot transition to LISTED unless its linked Shoot has `assetCount >= 10` AND `videoCount >= 1`. Enforced by `ShootIncompleteError` thrown from `emitSalesEvent` in the sales-events-slice. Checked via `shoots-store.getShootByVin(vin)` at the LISTED call site (Seam 40). |

**New §10 appended to SPEC-SHOOTS-001:**

```markdown
## 10. L2 supersession by L_AI-6 (v2.1)

### 10.1 Trigger
SPEC-SHOOTS-002 v2.1 (L_AI-20) removes `Shoot.assetCount`, `Shoot.videoCount`, and `Shoot.assetUrls` from the schema. The count-only predicate enshrined in L2 becomes mechanically inexpressible. The 11-slot predicate (L_AI-6) takes over as the sole LISTED gate.

### 10.2 Migration path
Active LISTED transitions post-v2.1 deploy use `assertShootComplete(vin, currentlyListed)` exclusively against the v2 11-slot predicate. The grandfather rule (SC-20) keeps continuously-LISTED v1 vehicles in LISTED state without re-evaluation. UNLISTED→LISTED re-transitions trigger v2 (SC-26).

### 10.3 Fallback handling
No v1 fallback exists after v2.1. The v1 count-fallback block previously at `apps/staff-web/src/lib/shoots/shoots-listed-guard.ts:73-84` is deleted in T06. An unknown shoot still returns silently (L9 unchanged). `ShootIncompleteError` is retained as a `@deprecated` export for archeological clarity; no live throw site exists.
```

**Changelog row appended:**

| 2026-05-08 | 1.1 | orchestrator | §L2 superseded by SPEC-SHOOTS-002 §L_AI-6 (v2.1). v1 count-only LISTED predicate retired alongside the v2.1 schema cleanup (L_AI-20). Code comments referencing L2 stay valid; new code references L_AI-6. Per CLAUDE §14 supersession protocol. |

**Frontmatter:** `version: 1.0 → 1.1`.

---

### Critical Files

- `specs/modules/shoots/02-shoots-ai-consistency.md`
- `specs/modules/shoots/01-shoots.md`
- `apps/staff-web/src/lib/shoots/shoots-store.ts`
- `apps/staff-web/app/api/shoots/ai-process/route.ts`
- `packages/types/src/domain/shoot.ts`
- `apps/staff-web/src/lib/shoots/shoots-listed-guard.ts`
- `apps/staff-web/src/components/shoots/shoot-asset-card.tsx`
